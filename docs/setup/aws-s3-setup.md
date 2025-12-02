# AWS S3 Setup Guide

## Prerequisites
- AWS Account with S3 access
- S3 bucket: `fb-konva` (already created)

## Environment Configuration

Add these variables to your `server/.env` file:

```env
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=fb-konva
```

## Database Migration

Run the migration to add S3 URL support:

```sql
-- Connect to your PostgreSQL database and run:
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS s3_url TEXT;
```

## S3 Bucket Configuration

Ensure your S3 bucket has:
1. **Public read access** for uploaded images
2. **CORS configuration** for web uploads:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

## Features
- ✅ Images uploaded directly to S3
- ✅ Automatic thumbnail generation (200x200px)
- ✅ Public URLs for image access
- ✅ Backward compatibility with existing local images
- ✅ Proper cleanup when images are deleted

## File Structure in S3
```
fb-konva/
├── images/
│   ├── {user_id}/
│   │   ├── image_{user_id}_{date}_{time}.jpg
│   │   ├── image_{user_id}_{date}_{time}_thumb.jpg
│   │   └── ...
```