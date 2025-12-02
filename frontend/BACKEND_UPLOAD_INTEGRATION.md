# Music Upload - Backend Integration Guide

This document provides detailed instructions for backend developers to integrate the music upload functionality.

## Overview

The music upload modal (`components/music-upload-modal.tsx`) allows users to:
- Select music files from their device
- Drag and drop music files (web only)
- See upload progress in real-time
- Receive success/error feedback

## Backend Requirements

### 1. Upload Endpoint

**Endpoint:** `POST /api/music/upload`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: File (audio file)
Optional fields:
  - title: string
  - artist: string
  - album: string
  - genre: string
  - userId: number (or extract from auth token)
```

**Success Response (200):**
```json
{
  "success": true,
  "music": {
    "id": 123,
    "title": "Song Title",
    "artist": "Artist Name",
    "url": "https://cdn.example.com/music/123.mp3",
    "duration": 180,
    "createdAt": "2025-12-02T12:00:00Z"
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### 2. Database Schema

Add a `music` or `songs` table with these fields:

```sql
CREATE TABLE music (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  album VARCHAR(255),
  genre VARCHAR(100),
  duration INTEGER,  -- in seconds
  file_url TEXT NOT NULL,
  file_size INTEGER,  -- in bytes
  file_type VARCHAR(50),  -- e.g., 'audio/mpeg'
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  play_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for common queries
CREATE INDEX idx_music_user_id ON music(user_id);
CREATE INDEX idx_music_upload_date ON music(upload_date DESC);
```

### 3. File Storage

You need to set up file storage for uploaded music files. Options:

#### Option A: Cloud Storage (Recommended)
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Cloudinary

**Pros:** Scalable, CDN support, no server storage limits
**Cons:** Additional cost

#### Option B: Local Server Storage
Store files in a dedicated directory on your server.

**Pros:** No additional service cost
**Cons:** Storage limits, no CDN, backup complexity

### 4. Backend Implementation Example (Node.js/Express)

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./middleware/auth');
const { pool } = require('./db');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/music';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/aac',
      'audio/flac',
      'audio/x-flac',
      'audio/ogg',
      'audio/webm',
      'audio/mp4'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Upload endpoint
router.post('/api/music/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const userId = req.user.id; // From auth token
    const file = req.file;

    // Extract metadata (optional - requires music-metadata package)
    // const metadata = await mm.parseFile(file.path);
    // const title = metadata.common.title || file.originalname;
    // const artist = metadata.common.artist || 'Unknown Artist';
    // const duration = metadata.format.duration;

    // For now, use basic info
    const title = req.body.title || file.originalname.replace(/\.[^/.]+$/, '');
    const artist = req.body.artist || 'Unknown Artist';
    const fileUrl = `/uploads/music/${file.filename}`;

    // Save to database
    const result = await pool.query(
      `INSERT INTO music (user_id, title, artist, album, genre, file_url, file_size, file_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        title,
        artist,
        req.body.album || null,
        req.body.genre || null,
        fileUrl,
        file.size,
        file.mimetype
      ]
    );

    const music = result.rows[0];

    res.json({
      success: true,
      music: {
        id: music.id,
        title: music.title,
        artist: music.artist,
        album: music.album,
        url: music.file_url,
        duration: music.duration,
        createdAt: music.created_at
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
});

module.exports = router;
```

### 5. Frontend Integration Points

Once your backend is ready, update these sections in `components/music-upload-modal.tsx`:

#### A. Update API Base URL (Line ~138)
```typescript
const API_BASE_URL = 'https://your-backend-url.com'; // Replace with your backend URL
```

#### B. Add Authentication Token
The frontend needs to send the auth token with the upload request. Update the upload function to include:
```typescript
const token = await AsyncStorage.getItem('authToken'); // or however you store it
```

#### C. For Web Uploads with Progress (Uncomment lines ~228-265)
The XMLHttpRequest implementation is commented out. Once backend is ready:
1. Uncomment the `uploadFileWithXHR` function
2. Update the endpoint URL
3. Add your authentication token

#### D. For Native Uploads with Progress (Uncomment lines ~161-195)
The expo-file-system implementation is commented out. Once backend is ready:
1. Uncomment the FileSystem.createUploadTask code
2. Update the endpoint URL
3. Add your authentication token
4. Install expo-file-system if not already installed:
   ```bash
   npx expo install expo-file-system
   ```

### 6. Testing the Upload

#### Test Cases:
1. **Valid file upload** - Upload supported audio file (MP3, WAV, etc.)
2. **Invalid file type** - Try uploading non-audio file (should fail with error)
3. **File too large** - Try uploading file > 100MB (should fail with error)
4. **Network error** - Test with backend offline (should show error)
5. **Upload cancellation** - Start upload and close modal (should abort)
6. **Progress tracking** - Upload large file and verify progress updates

#### Manual Testing:
```bash
# Test with curl
curl -X POST http://localhost:3000/api/music/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/music.mp3" \
  -F "title=My Song" \
  -F "artist=My Artist"
```

### 7. Optional Enhancements

#### A. Metadata Extraction
Use libraries to extract ID3 tags:
- Node.js: `music-metadata` package
- Python: `mutagen` library

#### B. Audio Processing
- **Transcoding:** Convert all uploads to standard format (e.g., MP3 320kbps)
- **Normalization:** Adjust audio levels for consistent playback
- **Waveform generation:** Create visual waveforms for display

#### C. Content Validation
- **Duration check:** Reject very short (<10s) or very long (>30min) files
- **Malware scanning:** Use ClamAV or cloud service
- **Copyright detection:** Use audio fingerprinting (AcoustID, Shazam API)

#### D. Chunked Uploads
For very large files, implement resumable uploads:
- Split file into chunks
- Upload chunks sequentially
- Allow resume from last successful chunk

### 8. Error Handling

Common errors to handle:

| Error | HTTP Code | Response |
|-------|-----------|----------|
| No file provided | 400 | "No file uploaded" |
| Invalid file type | 400 | "Invalid file type. Only audio files allowed." |
| File too large | 413 | "File too large. Max size is 100MB." |
| Disk full | 507 | "Server storage full. Please try again later." |
| Database error | 500 | "Failed to save file information." |
| Auth error | 401 | "Authentication required." |

### 9. Security Considerations

1. **Validate file types** on backend (don't trust client)
2. **Scan for malware** before saving
3. **Rate limit** uploads per user (e.g., 10 files per hour)
4. **Check storage quotas** per user
5. **Sanitize filenames** to prevent path traversal
6. **Use HTTPS** for all uploads
7. **Implement CORS** properly for web uploads

### 10. Performance Optimization

1. **Use streaming** for large file uploads
2. **Compress files** if possible
3. **Use CDN** for serving uploaded files
4. **Implement caching** for frequently accessed files
5. **Queue processing** for metadata extraction

## Support

For questions or issues:
1. Check the code comments in `components/music-upload-modal.tsx`
2. Review the error messages in browser/app console
3. Test endpoint with curl/Postman before frontend integration

## Quick Start Checklist

- [ ] Database table created
- [ ] Upload endpoint implemented
- [ ] File storage configured
- [ ] Authentication middleware added
- [ ] File type validation added
- [ ] Error handling implemented
- [ ] Tested with curl/Postman
- [ ] Frontend API_BASE_URL updated
- [ ] Auth token integration added
- [ ] Progress tracking enabled
- [ ] Tested end-to-end

