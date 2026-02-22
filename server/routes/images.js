const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const { getUploadsDir, getUploadsSubdir, isPathWithinUploads } = require('../utils/uploads-path');
const { validateImageMagicBytes } = require('../utils/image-validation');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Rate limiting for uploads: 20 requests per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many upload requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Create images directory structure: uploads/images/{user_id}/
const imagesBaseDir = getUploadsSubdir('images');
if (!fs.existsSync(imagesBaseDir)) {
  fs.mkdirSync(imagesBaseDir, { recursive: true });
}

// Multer memory storage - we validate and write manually for magic-byte check
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype?.toLowerCase());
    if (!mimetype || !extname) {
      return cb(new Error('Only JPG, PNG, GIF, and WebP files are allowed'));
    }
    cb(null, true);
  }
});

function generateSignedUrl(imageId, thumb = false, expiresIn = '1h') {
  return jwt.sign(
    { imageId, thumb },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

// Upload images to local storage (with rate limiting)
router.post('/upload', uploadLimiter, authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { bookId } = req.body;
    const files = req.files;
    const finalBookId = bookId && bookId !== '' ? parseInt(bookId) : null;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const userDir = path.join(imagesBaseDir, String(req.user.id));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const images = [];
    for (const file of files) {
      // Magic-byte validation
      const { valid, ext } = validateImageMagicBytes(file.buffer);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid file type. File content does not match image format.' });
      }

      // Secure filename: UUID + validated extension
      const secureFilename = `${randomUUID()}.${ext}`;
      const filePath = path.join(userDir, secureFilename);
      const dbFilePath = `images/${req.user.id}/${secureFilename}`;

      fs.writeFileSync(filePath, file.buffer);

      const thumbFilename = `${path.basename(secureFilename, '.' + ext)}_thumb.${ext}`;
      const thumbPath = path.join(userDir, thumbFilename);
      
      try {
        await sharp(filePath)
          .resize(200, 200, { fit: 'cover' })
          .toFile(thumbPath);
      } catch (error) {
        console.error('Thumbnail generation failed:', error);
      }
      
      const result = await pool.query(
        'INSERT INTO public.images (book_id, uploaded_by, filename, original_name, file_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [finalBookId, req.user.id, secureFilename, file.originalname || secureFilename, dbFilePath]
      );
      
      const row = result.rows[0];
      images.push({
        ...row,
        fileUrl: `/api/images/file/${row.id}`,
        signedUrl: generateSignedUrl(row.id, false),
        signedThumbUrl: generateSignedUrl(row.id, true)
      });
    }

    res.json({ images });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Proxy: Serve image by ID when user has access to book (Editor-Kontext)
// Ermöglicht allen Buch-Kollaborateuren, Bilder auf Buchseiten zu sehen (unabhängig vom Uploader)
router.get('/file/:id/for-book/:bookId', authenticateToken, async (req, res) => {
  try {
    const imageId = parseInt(req.params.id, 10);
    const bookId = parseInt(req.params.bookId, 10);
    if (isNaN(imageId) || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid image or book ID' });
    }

    const userId = req.user.id;

    // Prüfen: User hat Zugriff auf das Buch (Owner oder Book-Friend)
    const bookAccess = await pool.query(
      `SELECT 1 FROM public.books b
       LEFT JOIN public.book_friends bf ON b.id = bf.book_id
       WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)`,
      [bookId, userId]
    );
    if (bookAccess.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const result = await pool.query(
      'SELECT * FROM public.images WHERE id = $1',
      [imageId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = result.rows[0];
    const fullPath = path.resolve(path.join(getUploadsDir(), image.file_path));
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const ext = path.extname(image.filename).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Error serving image via book proxy:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

// Protected: Serve image by ID (requires Authorization header)
// Access: eigene Bilder ODER Bilder zu Büchern, auf die der User Zugriff hat (Owner/Book-Friend)
router.get('/file/:id', authenticateToken, async (req, res) => {
  try {
    const imageId = parseInt(req.params.id, 10);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const result = await pool.query(
      'SELECT * FROM public.images WHERE id = $1',
      [imageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = result.rows[0];
    const userId = req.user.id;

    // Zugriff: eigene Bilder ODER Bild gehört zu Buch, auf das User Zugriff hat
    const isOwner = image.uploaded_by === userId;
    let hasBookAccess = false;
    if (!isOwner && image.book_id) {
      const bookAccess = await pool.query(
        `SELECT 1 FROM public.books b
         LEFT JOIN public.book_friends bf ON b.id = bf.book_id
         WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)`,
        [image.book_id, userId]
      );
      hasBookAccess = bookAccess.rows.length > 0;
    }
    if (!isOwner && !hasBookAccess) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const fullPath = path.resolve(path.join(getUploadsDir(), image.file_path));
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const ext = path.extname(image.filename).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

// Signed URL: Serve image (requires auth + valid token)
// Token identifies image; auth ensures only users with access can load it (prevents sharing links)
router.get('/serve', authenticateToken, async (req, res) => {
  try {
    const { s } = req.query;
    if (!s) {
      return res.status(400).json({ error: 'Token required' });
    }

    let payload;
    try {
      payload = jwt.verify(s, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { imageId, thumb } = payload;
    if (!imageId) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const result = await pool.query(
      'SELECT * FROM public.images WHERE id = $1',
      [imageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = result.rows[0];
    const userId = req.user.id;

    // Zugriff: eigene Bilder ODER Bild gehört zu Buch, auf das User Zugriff hat
    const isOwner = image.uploaded_by === userId;
    let hasBookAccess = false;
    if (!isOwner && image.book_id) {
      const bookAccess = await pool.query(
        `SELECT 1 FROM public.books b
         LEFT JOIN public.book_friends bf ON b.id = bf.book_id
         WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)`,
        [image.book_id, userId]
      );
      hasBookAccess = bookAccess.rows.length > 0;
    }
    if (!isOwner && !hasBookAccess) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const ext = path.extname(image.filename).toLowerCase();
    const filename = thumb ? image.filename.replace(ext, '') + '_thumb' + ext : image.filename;
    const dirPath = path.dirname(path.join(getUploadsDir(), image.file_path));
    const fullPath = path.resolve(path.join(dirPath, filename));

    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

// Get images with pagination - includes signed URLs for grid/lightbox
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
    
    const apiUrl = `${req.protocol}://${req.get('host')}/api`;
    const images = result.rows.map(img => ({
      ...img,
      fileUrl: `${apiUrl}/images/file/${img.id}`,
      signedUrl: generateSignedUrl(img.id, false),
      signedThumbUrl: generateSignedUrl(img.id, true)
    }));
    
    res.json({
      images,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete images from local storage and database
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await pool.query('SET search_path TO public');
    
    const { imageIds } = req.body;
    
    if (!imageIds || !Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'Image IDs required' });
    }

    const imagesResult = await pool.query(
      'SELECT * FROM public.images WHERE id = ANY($1) AND uploaded_by = $2',
      [imageIds, req.user.id]
    );
    
    const uploadsDir = getUploadsDir();

    for (const image of imagesResult.rows) {
      try {
        const fullPath = path.resolve(path.join(uploadsDir, image.file_path));
        if (!isPathWithinUploads(fullPath)) continue;
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }

        const ext = path.extname(image.filename);
        const thumbFilename = image.filename.replace(ext, '') + '_thumb' + ext;
        const thumbPath = path.resolve(path.join(path.dirname(fullPath), thumbFilename));
        if (isPathWithinUploads(thumbPath) && fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      } catch (fsError) {
        console.error('File deletion error:', fsError);
      }
    }
    
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
