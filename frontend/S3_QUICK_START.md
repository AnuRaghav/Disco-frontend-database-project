# AWS S3 Upload - Quick Start

## ✅ What's Already Done

The frontend is **fully configured** to upload music files directly to AWS S3 using presigned URLs. The code is production-ready!

## 🎯 What I Need From You

Please provide these 3 things to complete the integration:

### 1. AWS S3 Bucket Name
Example: `disco-music-uploads` or `my-app-music-files`

### 2. AWS Region  
Example: `us-east-1`, `us-west-2`, `eu-west-1`, etc.

### 3. Backend API URL
- **Development:** `http://localhost:3000` (or your local backend port)
- **Production:** `https://api.yourdomain.com`

## 📝 How to Configure

Once you provide the above information, update this file:

**`frontend/config/upload.config.ts`**

```typescript
export const UploadConfig = {
  USE_S3_UPLOAD: true, // ✅ Already enabled
  
  API_BASE_URL: __DEV__ 
    ? 'http://localhost:3000'              // ← Update if different
    : 'https://api.yourdomain.com',        // ← Update with your domain
  
  // Rest is already configured!
};
```

## 🔧 Backend Setup Required

Your backend team needs to implement 2 endpoints:

### 1. Generate Presigned URL
**POST** `/api/music/upload-url`

**Request:**
```json
{
  "fileName": "my-song.mp3",
  "fileType": "audio/mpeg",
  "fileSize": 5242880
}
```

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://your-bucket.s3.amazonaws.com/...",
  "key": "music/123/abc.mp3",
  "expiresIn": 900
}
```

### 2. Confirm Upload Complete
**POST** `/api/music/upload-complete`

**Request:**
```json
{
  "key": "music/123/abc.mp3",
  "fileName": "my-song.mp3",
  "fileSize": 5242880,
  "fileType": "audio/mpeg"
}
```

**Response:**
```json
{
  "success": true,
  "music": {
    "id": 123,
    "title": "My Song",
    "url": "https://...",
    "createdAt": "2025-12-02T12:00:00Z"
  }
}
```

## 📚 Complete Documentation

For detailed backend implementation with code examples:
- **Full AWS Setup Guide:** `AWS_S3_SETUP_GUIDE.md`
- **Backend Code Examples:** Node.js, Python, and more!

## 🎬 How Upload Works

1. User selects/drags music file
2. **Frontend** → Backend: "Give me upload URL"
3. **Backend** → AWS: Generates presigned URL
4. **Backend** → Frontend: Returns presigned URL
5. **Frontend** → AWS S3: Uploads file directly (with progress bar!)
6. **Frontend** → Backend: "Upload complete"
7. **Backend**: Saves metadata to database

## ✨ Features Included

- ✅ Direct S3 upload (fast!)
- ✅ Real-time progress bar
- ✅ Secure (presigned URLs)
- ✅ Automatic authentication
- ✅ Error handling
- ✅ File validation
- ✅ Drag & drop support
- ✅ Mobile & web compatible

## 🔄 Switching Between Upload Methods

Want to upload directly to your backend instead of S3? 

In `config/upload.config.ts`, change:
```typescript
USE_S3_UPLOAD: false, // Upload directly to backend
```

## 🧪 Testing (After Backend is Ready)

1. Start your backend server
2. Start frontend: `npx expo start`
3. Click upload button (⬆️ icon)
4. Select/drag a music file
5. Watch the progress bar!

## ❓ Questions?

Check these files:
- **This guide:** Quick overview
- **`AWS_S3_SETUP_GUIDE.md`:** Complete AWS setup
- **`UPLOAD_FEATURE_README.md`:** User guide
- **`BACKEND_UPLOAD_INTEGRATION.md`:** Backend implementation

---

**Status:** ✅ Frontend Ready | ⏳ Waiting for AWS Info & Backend

**Need:** 
1. S3 bucket name
2. AWS region  
3. Backend URL

Once you provide these, just update `upload.config.ts` and you're done!

