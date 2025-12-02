// config/upload.config.ts
// =============================================================================
// UPLOAD CONFIGURATION
// =============================================================================
// Configure how music files are uploaded

export const UploadConfig = {
  // -------------------------------------------------------------------------
  // UPLOAD METHOD
  // -------------------------------------------------------------------------
  // Set to true to use AWS S3 presigned URLs (recommended for production)
  // Set to false to upload directly to your backend server
  USE_S3_UPLOAD: true,

  // -------------------------------------------------------------------------
  // BACKEND API
  // -------------------------------------------------------------------------
  // Your backend API base URL
  // Development: 'http://localhost:3000'
  // Production: 'https://api.yourdomain.com'
  API_BASE_URL: __DEV__ 
    ? 'http://localhost:3000'
    : 'https://api.yourdomain.com',

  // -------------------------------------------------------------------------
  // S3 CONFIGURATION (if USE_S3_UPLOAD = true)
  // -------------------------------------------------------------------------
  S3_CONFIG: {
    // Endpoint to request presigned URL
    PRESIGNED_URL_ENDPOINT: '/api/music/upload-url',
    
    // Endpoint to notify backend after successful S3 upload
    UPLOAD_COMPLETE_ENDPOINT: '/api/music/upload-complete',
  },

  // -------------------------------------------------------------------------
  // DIRECT UPLOAD CONFIGURATION (if USE_S3_UPLOAD = false)
  // -------------------------------------------------------------------------
  DIRECT_UPLOAD_CONFIG: {
    // Endpoint for direct file upload to backend
    UPLOAD_ENDPOINT: '/api/music/upload',
  },

  // -------------------------------------------------------------------------
  // FILE VALIDATION
  // -------------------------------------------------------------------------
  // Maximum file size in bytes (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024,

  // Supported audio MIME types
  SUPPORTED_TYPES: [
    'audio/mpeg',        // .mp3
    'audio/mp4',         // .m4a
    'audio/wav',         // .wav
    'audio/x-wav',       // .wav (alternative)
    'audio/wave',        // .wav (alternative)
    'audio/aac',         // .aac
    'audio/ogg',         // .ogg
    'audio/flac',        // .flac
    'audio/x-flac',      // .flac (alternative)
    'audio/webm',        // .webm
  ],

  // Supported file extensions (fallback if MIME type check fails)
  SUPPORTED_EXTENSIONS: [
    'mp3',
    'wav',
    'flac',
    'ogg',
    'aac',
    'm4a',
    'webm',
  ],

  // -------------------------------------------------------------------------
  // UPLOAD BEHAVIOR
  // -------------------------------------------------------------------------
  // Timeout for upload requests (in milliseconds)
  UPLOAD_TIMEOUT: 5 * 60 * 1000, // 5 minutes

  // Time before presigned URL expires (should match backend)
  PRESIGNED_URL_EXPIRY: 15 * 60, // 15 minutes in seconds

  // Whether to show detailed error messages (disable in production)
  SHOW_DETAILED_ERRORS: __DEV__,
};

// Type for upload configuration
export type UploadConfigType = typeof UploadConfig;

