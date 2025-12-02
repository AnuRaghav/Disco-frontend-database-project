const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const jwt = require('jsonwebtoken');
// Note: RDS connection will be added here - using mysql2 or pg depending on your DB

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.BUCKET_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

// RDS Configuration (add these environment variables when deploying)
// const DB_HOST = process.env.DB_HOST;
// const DB_USER = process.env.DB_USER;
// const DB_PASSWORD = process.env.DB_PASSWORD;
// const DB_NAME = process.env.DB_NAME;

function verifyToken(token) {
  if (!token) throw new Error('No authorization token provided');
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    return jwt.verify(actualToken, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

async function verifyS3Object(key) {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const response = await s3Client.send(command);
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error('S3 verification error:', error);
    throw new Error('File not found in S3');
  }
}

function extractMetadata(fileName, s3Metadata) {
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  const parts = nameWithoutExt.split(' - ');
  let title = nameWithoutExt;
  let artist = 'Unknown Artist';
  if (parts.length === 2) {
    artist = parts[0].trim();
    title = parts[1].trim();
  }
  return { title, artist, originalFileName: s3Metadata?.originalfilename || fileName };
}

async function saveMusicRecord(musicData) {
  // TODO: Replace with actual RDS connection
  // For now, just log the data
  console.log('Music metadata to save:', JSON.stringify(musicData, null, 2));
  
  // Example RDS query (uncomment and adapt based on your DB):
  /*
  const query = `
    INSERT INTO music (id, user_id, title, artist, s3_key, s3_bucket, file_size, content_type, public_url, uploaded_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.execute(query, [
    musicData.id,
    musicData.userId,
    musicData.title,
    musicData.artist,
    musicData.s3Key,
    musicData.s3Bucket,
    musicData.fileSize,
    musicData.contentType,
    musicData.publicUrl,
    musicData.uploadedAt,
    musicData.status
  ]);
  */
  
  // For now, return success (you'll integrate RDS later)
  return true;
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const user = verifyToken(authHeader);
    
    if (!user || !user.id) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }
    
    const { key, fileName, fileSize, fileType } = body;
    if (!key) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'key is required' }),
      };
    }
    
    const s3Info = await verifyS3Object(key);
    const metadata = extractMetadata(fileName || key.split('/').pop(), s3Info.metadata);
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    const musicRecord = {
      id: `music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      title: metadata.title,
      artist: metadata.artist,
      originalFileName: metadata.originalFileName,
      s3Key: key,
      s3Bucket: BUCKET_NAME,
      fileSize: s3Info.size,
      contentType: s3Info.contentType,
      publicUrl: publicUrl,
      uploadedAt: new Date().toISOString(),
      status: 'active',
    };
    
    await saveMusicRecord(musicRecord);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        music: {
          id: musicRecord.id,
          title: musicRecord.title,
          artist: musicRecord.artist,
          url: publicUrl,
          uploadedAt: musicRecord.uploadedAt,
        },
      }),
    };
    
  } catch (error) {
    console.error('Error:', error);
    let statusCode = 500;
    if (error.message.includes('token') || error.message === 'Unauthorized') statusCode = 401;
    else if (error.message.includes('required') || error.message.includes('not found')) statusCode = 400;
    
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

