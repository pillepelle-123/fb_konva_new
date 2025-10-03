const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const sharp = require('sharp');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(__dirname, '../uploads', req.user.id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const ext = path.extname(file.originalname);
    const filename = `photo_${req.user.id}_${dateStr}_${timeStr}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    cb(mimetype && extname ? null : new Error('Only image files allowed'), mimetype && extname);
  }
});

// Upload photos
router.post('/upload', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { bookId } = req.body;
    const files = req.files;
    const finalBookId = bookId && bookId !== '' ? parseInt(bookId) : null;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const photos = [];
    for (const file of files) {
      const filePath = path.join(req.user.id.toString(), file.filename);
      
      // Generate thumbnail
      const ext = path.extname(file.filename);
      const nameWithoutExt = file.filename.replace(ext, '');
      const thumbFilename = `${nameWithoutExt}_thumb${ext}`;
      const thumbPath = path.join(path.dirname(file.path), thumbFilename);
      
      try {
        await sharp(file.path)
          .resize(200, 200, { fit: 'cover' })
          .toFile(thumbPath);
      } catch (error) {
        console.error('Thumbnail generation failed:', error);
      }
      
      const result = await pool.query(
        'INSERT INTO public.photos (book_id, uploaded_by, filename, original_name, file_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [finalBookId, req.user.id, file.filename, file.originalname, filePath]
      );
      
      photos.push(result.rows[0]);
    }

    res.json({ photos });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get photos with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { page = 1, limit = 15, bookId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT p.*, b.name as book_name 
      FROM public.photos p 
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
      ? 'SELECT COUNT(*) FROM public.photos WHERE uploaded_by = $1 AND book_id = $2'
      : 'SELECT COUNT(*) FROM public.photos WHERE uploaded_by = $1';
    const countParams = bookId ? [req.user.id, bookId] : [req.user.id];
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      photos: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Delete photos
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { photoIds } = req.body;
    
    if (!photoIds || !Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'Photo IDs required' });
    }

    // Get photo details for file deletion
    const photosResult = await pool.query(
      'SELECT * FROM public.photos WHERE id = ANY($1) AND uploaded_by = $2',
      [photoIds, req.user.id]
    );
    
    // Delete files and thumbnails
    for (const photo of photosResult.rows) {
      const filePath = path.join(__dirname, '../uploads', photo.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete thumbnail
      const ext = path.extname(photo.filename);
      const nameWithoutExt = photo.filename.replace(ext, '');
      const thumbFilename = `${nameWithoutExt}_thumb${ext}`;
      const thumbPath = path.join(__dirname, '../uploads', photo.file_path.replace(photo.filename, thumbFilename));
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }
    
    // Delete from database
    await pool.query(
      'DELETE FROM public.photos WHERE id = ANY($1) AND uploaded_by = $2',
      [photoIds, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photos:', error);
    res.status(500).json({ error: 'Failed to delete photos' });
  }
});

module.exports = router;