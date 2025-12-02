const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const jwt = require('jsonwebtoken');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME;
const JWT_SECRET = process.env.JWT_SECRET;
const PRESIGNED_URL_EXPIRY = 900; // 15 minutes in seconds

/**
 * Verify JWT token
 */
function verifyToken(token) {
  if (!token) {
    throw new Error('No authorization token provided');
  }

  // Remove 'Bearer ' prefix if present
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  try {
    return jwt.verify(actualToken, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Validate file upload request
 */
function validateRequest(body) {
  const { fileName, fileType, fileSize } = body;

  if (!fileName) {
    throw new Error('fileName is required');
  }

  if (!fileType) {
    throw new Error('fileType is required');
  }

  // Validate file size (max 100MB)
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed (100MB)`);
  }

  // Validate file type
  const ALLOWED_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/x-flac',
    'audio/webm',
    'application/octet-stream', // Sometimes browsers send this
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/json',
  ];

  if (!ALLOWED_TYPES.includes(fileType)) {
    console.log('Rejected file type:', fileType);
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  return { fileName, fileType, fileSize };
}

/**
 * Generate unique S3 key for uploaded file
 */
function generateS3Key(userId, fileName) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return `music/${userId}/${timestamp}-${randomString}-${sanitizedFileName}`;
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request
    const body = typeof event.body === 'string' 
      ? JSON.parse(event.body) 
      : event.body;

    // Verify authentication
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const user = verifyToken(authHeader);

    if (!user || !user.id) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Validate request
    const { fileName, fileType, fileSize } = validateRequest(body);

    // Generate S3 key - use custom path if provided, otherwise generate unique path
    let key;
    if (body.s3Key) {
      // Use the custom path provided by the frontend (for album uploads)
      key = body.s3Key;
      console.log('Using custom S3 key:', key);
    } else {
      // Generate unique path for single uploads
      key = generateS3Key(user.id, fileName);
      console.log('Generated S3 key:', key);
    }

    // Create presigned URL for PUT
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Metadata: {
        userId: user.id.toString(),
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    // Return presigned URL
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        uploadUrl,
        key,
        expiresIn: PRESIGNED_URL_EXPIRY,
      }),
    };

  } catch (error) {
    console.error('Error:', error);

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('token') || error.message === 'Unauthorized') {
      statusCode = 401;
    } else if (error.message.includes('required') || error.message.includes('exceeds') || error.message.includes('Unsupported')) {
      statusCode = 400;
    }

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error.message || 'Internal server error',
      }),
    };
  }
};