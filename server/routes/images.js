const express = require('express');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const sharp = require('sharp');
const AWS = require('aws-sdk');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Configure AWS S3
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('AWS credentials missing in environment variables');
}

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  signatureVersion: 'v4'
});
const s3 = new AWS.S3();
const bucketName = process.env.AWS_S3_BUCKET || 'fb-konva';

// Configure multer for memory storage (S3 upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    
    if (!mimetype || !extname) {
      return cb(new Error('Only JPG, PNG, GIF, and WebP files are allowed'));
    }
    cb(null, true);
  }
});

// Upload images to S3
router.post('/upload', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { bookId } = req.body;
    const files = req.files;
    const finalBookId = bookId && bookId !== '' ? parseInt(bookId) : null;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const images = [];
    for (const file of files) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const ext = path.extname(file.originalname);
      const filename = `image_${req.user.id}_${dateStr}_${timeStr}${ext}`;
      const s3Key = `images/${req.user.id}/${filename}`;
      
      // Upload original image to S3
      const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype
      };
      
      const s3Result = await s3.upload(uploadParams).promise();
      
      // Generate and upload thumbnail
      const thumbFilename = `${filename.replace(ext, '')}_thumb${ext}`;
      const thumbS3Key = `images/${req.user.id}/${thumbFilename}`;
      
      try {
        const thumbnailBuffer = await sharp(file.buffer)
          .resize(200, 200, { fit: 'cover' })
          .toBuffer();
        
        const thumbUploadParams = {
          Bucket: bucketName,
          Key: thumbS3Key,
          Body: thumbnailBuffer,
          ContentType: file.mimetype
        };
        
        await s3.upload(thumbUploadParams).promise();
      } catch (error) {
        console.error('Thumbnail generation failed:', error);
      }
      
      const result = await pool.query(
        'INSERT INTO public.images (book_id, uploaded_by, filename, original_name, file_path, s3_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [finalBookId, req.user.id, filename, file.originalname, s3Key, s3Result.Location]
      );
      
      images.push(result.rows[0]);
    }

    res.json({ images });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get images with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { page = 1, limit = 15, bookId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT p.*, b.name as book_name 
      FROM public.images p 
      LEFT JOIN public.books b ON p.book_id = b.id 
      WHERE p.uploaded_by = $1
    `;
    let params = [req.user.id];
    
    if (bookId) {
      query += ' AND p.book_id = $2';
      params.push(bookId);
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(query, params);
    
    const countQuery = bookId 
      ? 'SELECT COUNT(*) FROM public.images WHERE uploaded_by = $1 AND book_id = $2'
      : 'SELECT COUNT(*) FROM public.images WHERE uploaded_by = $1';
    const countParams = bookId ? [req.user.id, bookId] : [req.user.id];
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      images: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete images from S3 and database
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { imageIds } = req.body;
    
    if (!imageIds || !Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'Image IDs required' });
    }

    // Get image details for S3 deletion
    const imagesResult = await pool.query(
      'SELECT * FROM public.images WHERE id = ANY($1) AND uploaded_by = $2',
      [imageIds, req.user.id]
    );
    
    // Delete files from S3
    for (const image of imagesResult.rows) {
      try {
        // Delete original image
        await s3.deleteObject({
          Bucket: bucketName,
          Key: image.file_path
        }).promise();
        
        // Delete thumbnail
        const ext = path.extname(image.filename);
        const nameWithoutExt = image.filename.replace(ext, '');
        const thumbFilename = `${nameWithoutExt}_thumb${ext}`;
        const thumbS3Key = `images/${req.user.id}/${thumbFilename}`;
        
        await s3.deleteObject({
          Bucket: bucketName,
          Key: thumbS3Key
        }).promise();
      } catch (s3Error) {
        console.error('S3 deletion error:', s3Error);
      }
    }
    
    // Delete from database
    await pool.query(
      'DELETE FROM public.images WHERE id = ANY($1) AND uploaded_by = $2',
      [imageIds, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting images:', error);
    res.status(500).json({ error: 'Failed to delete images' });
  }
});

module.exports = router;