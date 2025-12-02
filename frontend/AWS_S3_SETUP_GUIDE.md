# AWS S3 Upload Setup Guide

## Overview

This guide will help you set up direct uploads to AWS S3 for music files. We'll use **presigned URLs** which is the most secure method.

## How It Works

```
┌─────────────┐         ┌──────────┐         ┌──────────┐
│   Frontend  │         │  Backend │         │  AWS S3  │
└──────┬──────┘         └─────┬────┘         └────┬─────┘
       │                      │                   │
       │ 1. Request upload    │                   │
       │─────────────────────>│                   │
       │                      │                   │
       │                      │ 2. Generate       │
       │                      │    presigned URL  │
       │                      │──────────────────>│
       │                      │                   │
       │ 3. Return presigned  │<──────────────────│
       │    URL               │                   │
       │<─────────────────────│                   │
       │                      │                   │
       │ 4. Upload file       │                   │
       │    directly to S3    │                   │
       │──────────────────────────────────────────>│
       │                      │                   │
       │ 5. Notify success    │                   │
       │─────────────────────>│                   │
       │                      │                   │
       │                      │ 6. Save metadata  │
       │                      │    to database    │
       │                      │                   │
```

## What You Need to Provide

### 1. AWS Account Setup

#### A. Create an S3 Bucket
1. Go to AWS Console → S3
2. Click "Create bucket"
3. **Bucket name:** Choose a unique name (e.g., `disco-music-uploads`)
4. **Region:** Choose closest to your users (e.g., `us-east-1`)
5. **Block Public Access:** Keep ENABLED (we'll use presigned URLs)
6. **Versioning:** Optional (recommended for backup)
7. **Encryption:** Enable (AES-256 or AWS KMS)
8. Click "Create bucket"

#### B. Configure CORS for Your Bucket
1. Go to your bucket → Permissions → CORS
2. Add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST"],
    "AllowedOrigins": [
      "http://localhost:8081",
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

⚠️ **Important:** Replace `https://your-production-domain.com` with your actual domain!

#### C. Create IAM User for Backend
1. Go to AWS Console → IAM → Users
2. Click "Add users"
3. **Username:** `disco-s3-uploader`
4. **Access type:** Programmatic access (for API keys)
5. Click "Next: Permissions"

#### D. Set Permissions
Choose one of these options:

**Option 1: Use Existing Policy (Simpler)**
- Attach policy: `AmazonS3FullAccess`
- ⚠️ Less secure, gives access to all S3 buckets

**Option 2: Create Custom Policy (Recommended)**
- Click "Create policy"
- Use this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::disco-music-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::disco-music-uploads"
    }
  ]
}
```

Replace `disco-music-uploads` with your bucket name!

#### E. Save Credentials
After creating the user, AWS will show:
- **Access Key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
- **Secret Access Key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

⚠️ **CRITICAL:** Save these immediately! You can't see the secret key again!

### 2. Backend Environment Variables

Add these to your backend `.env` file:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=disco-music-uploads

# Optional: Custom endpoint for testing with LocalStack
# AWS_S3_ENDPOINT=http://localhost:4566
```

### 3. Frontend Configuration

You'll need to provide:
- **Backend API URL** (e.g., `https://api.yourdomain.com`)
- **Endpoint for presigned URL** (e.g., `/api/music/upload-url`)

## Backend Implementation

### Step 1: Install AWS SDK

```bash
# For Node.js
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# For Python
pip install boto3

# For other languages, see AWS SDK documentation
```

### Step 2: Create Presigned URL Endpoint

#### Node.js/Express Example:

```javascript
// backend/routes/music.js
const express = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate presigned URL for S3 upload
 * POST /api/music/upload-url
 */
router.post('/api/music/upload-url', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!fileName || !fileType) {
      return res.status(400).json({
        success: false,
        error: 'fileName and fileType are required',
      });
    }

    // Validate file type
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/flac',
      'audio/ogg',
      'audio/aac',
      'audio/mp4',
      'audio/webm',
    ];

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
      });
    }

    // Validate file size (100MB limit)
    if (fileSize && fileSize > 100 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 100MB',
      });
    }

    // Generate unique file key
    const fileExtension = fileName.split('.').pop();
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const key = `music/${userId}/${uniqueId}.${fileExtension}`;

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      // Optional: Add metadata
      Metadata: {
        userId: userId.toString(),
        originalName: fileName,
      },
    });

    // URL expires in 15 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900, // 15 minutes
    });

    // Return presigned URL and file key
    res.json({
      success: true,
      uploadUrl: presignedUrl,
      key: key,
      expiresIn: 900,
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate upload URL',
    });
  }
});

/**
 * Confirm upload and save metadata
 * POST /api/music/upload-complete
 */
router.post('/api/music/upload-complete', authenticateToken, async (req, res) => {
  try {
    const { key, fileName, fileSize, fileType, duration } = req.body;
    const userId = req.user.id;

    // Verify the key belongs to this user
    if (!key.startsWith(`music/${userId}/`)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Construct public URL (if bucket is public) or CloudFront URL
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    // Or use CloudFront:
    // const fileUrl = `https://your-cloudfront-domain.cloudfront.net/${key}`;

    // Save to database
    const result = await pool.query(
      `INSERT INTO music (user_id, title, file_url, file_size, file_type, s3_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        fileName.replace(/\.[^/.]+$/, ''), // Remove extension for title
        fileUrl,
        fileSize,
        fileType,
        key,
      ]
    );

    const music = result.rows[0];

    res.json({
      success: true,
      music: {
        id: music.id,
        title: music.title,
        url: music.file_url,
        createdAt: music.created_at,
      },
    });

  } catch (error) {
    console.error('Error saving music metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save music information',
    });
  }
});

module.exports = router;
```

#### Python/Flask Example:

```python
import boto3
import os
from flask import Blueprint, request, jsonify
from botocore.config import Config
from datetime import timedelta
import uuid

music_bp = Blueprint('music', __name__)

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=os.getenv('AWS_REGION'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    config=Config(signature_version='s3v4')
)

@music_bp.route('/api/music/upload-url', methods=['POST'])
def generate_upload_url():
    try:
        data = request.get_json()
        file_name = data.get('fileName')
        file_type = data.get('fileType')
        user_id = request.user_id  # From auth middleware
        
        # Generate unique key
        file_extension = file_name.split('.')[-1]
        unique_id = str(uuid.uuid4())
        key = f'music/{user_id}/{unique_id}.{file_extension}'
        
        # Generate presigned URL
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': os.getenv('AWS_S3_BUCKET_NAME'),
                'Key': key,
                'ContentType': file_type,
            },
            ExpiresIn=900  # 15 minutes
        )
        
        return jsonify({
            'success': True,
            'uploadUrl': presigned_url,
            'key': key,
            'expiresIn': 900
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

### Step 3: Update Database Schema

Add S3 key column to track files:

```sql
ALTER TABLE music ADD COLUMN s3_key VARCHAR(500);
CREATE INDEX idx_music_s3_key ON music(s3_key);
```

## Testing Your Setup

### 1. Test Backend Locally

```bash
# Test presigned URL generation
curl -X POST http://localhost:3000/api/music/upload-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test-song.mp3",
    "fileType": "audio/mpeg",
    "fileSize": 5242880
  }'
```

Expected response:
```json
{
  "success": true,
  "uploadUrl": "https://disco-music-uploads.s3.amazonaws.com/music/123/abc123.mp3?X-Amz-Algorithm=...",
  "key": "music/123/abc123.mp3",
  "expiresIn": 900
}
```

### 2. Test S3 Upload

```bash
# Use the presigned URL to upload
curl -X PUT "PRESIGNED_URL_FROM_ABOVE" \
  -H "Content-Type: audio/mpeg" \
  --data-binary @test-song.mp3
```

### 3. Verify in AWS Console
1. Go to S3 Console
2. Open your bucket
3. Check `music/123/` folder
4. You should see your uploaded file

## Security Best Practices

1. ✅ **Never expose AWS credentials** in frontend code
2. ✅ **Use presigned URLs** with short expiration (15 minutes)
3. ✅ **Validate file types** on backend before generating URL
4. ✅ **Check file sizes** before allowing upload
5. ✅ **Use HTTPS only** for all transfers
6. ✅ **Enable S3 bucket encryption**
7. ✅ **Keep bucket private** (use presigned URLs for downloads too)
8. ✅ **Set up CloudWatch alerts** for unusual activity
9. ✅ **Use IAM roles** in production (instead of access keys)
10. ✅ **Enable S3 versioning** for file recovery

## Cost Estimation

AWS S3 Pricing (as of 2024, us-east-1):
- **Storage:** $0.023 per GB/month
- **PUT requests:** $0.005 per 1,000 requests
- **Data transfer out:** First 100 GB free, then $0.09/GB

Example for 1000 users:
- 1000 songs × 5MB average = 5GB storage = **$0.12/month**
- 1000 uploads = **$0.005**
- Total: **~$0.13/month**

## Troubleshooting

### Error: "Access Denied"
- Check IAM permissions
- Verify bucket CORS configuration
- Ensure presigned URL hasn't expired

### Error: "SignatureDoesNotMatch"
- Verify AWS credentials are correct
- Check system time is synchronized
- Ensure Content-Type matches in request

### Upload is slow
- Check AWS region (use closest to users)
- Consider using AWS Transfer Acceleration
- Implement multipart upload for large files

### File appears in S3 but can't be accessed
- Check bucket permissions
- Generate presigned URL for downloads
- Or set up CloudFront distribution

## Advanced: CloudFront Setup (Optional)

For faster downloads and better caching:

1. Create CloudFront distribution
2. Set S3 bucket as origin
3. Use CloudFront URL instead of S3 URL
4. Benefits: Faster global access, lower S3 costs

## What I Need From You

Please provide:

1. ✅ **AWS S3 Bucket Name** (e.g., `disco-music-uploads`)
2. ✅ **AWS Region** (e.g., `us-east-1`)
3. ✅ **Backend API Base URL** (e.g., `https://api.yourdomain.com`)
4. ❓ **CloudFront domain** (if using) - Optional

I'll update the frontend code once you provide these!

## Summary Checklist

- [ ] AWS account created
- [ ] S3 bucket created with encryption
- [ ] CORS configured on bucket
- [ ] IAM user created with S3 permissions
- [ ] AWS credentials saved securely
- [ ] Backend environment variables set
- [ ] AWS SDK installed in backend
- [ ] Presigned URL endpoint implemented
- [ ] Upload complete endpoint implemented
- [ ] Database schema updated
- [ ] Tested locally
- [ ] Frontend configuration updated

Once you complete this checklist and provide the information above, your S3 upload will be ready!

