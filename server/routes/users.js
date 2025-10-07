const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(__dirname, '../uploads/profile_pictures', req.user.id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const ext = path.extname(file.originalname);
    const resolution = file.fieldname === 'profile192' ? '_192x192_' : '_32x32_';
    cb(null, `profile_${req.user.id}${resolution}${timestamp}${ext}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    cb(null, mimetype && extname);
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;
    
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }
    
    const searchTerm = `%${q.trim()}%`;
    const result = await pool.query(
      'SELECT id, name, email FROM public.users WHERE (name ILIKE $1 OR email ILIKE $1) AND id != $2 LIMIT 20',
      [searchTerm, currentUserId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, email, role, created_at, profile_picture_192, profile_picture_32 FROM public.users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get shared books between current user and target user
router.get('/:userId/shared-books', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

        console.log('Fetching shared books for users:', currentUserId, userId);

    
    const result = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at, b.updated_at,
        COALESCE((SELECT COUNT(*) FROM public.pages WHERE book_id = b.id), 0) as page_count,
        COALESCE((SELECT COUNT(*) FROM public.book_friends WHERE book_id = b.id), 0) as collaborator_count
      FROM public.books b
      INNER JOIN public.book_friends bf1 ON b.id = bf1.book_id AND bf1.user_id = $1
      INNER JOIN public.book_friends bf2 ON b.id = bf2.book_id AND bf2.user_id = $2
      WHERE b.archived = FALSE
    `, [currentUserId, userId]);
    
    res.json(result.rows.map(book => ({
      id: book.id,
      name: book.name,
      pageSize: book.page_size,
      orientation: book.orientation,
      pageCount: parseInt(book.page_count) || 0,
      collaboratorCount: parseInt(book.collaborator_count) || 0,
      isOwner: book.owner_id === currentUserId,
      created_at: book.created_at,
      updated_at: book.updated_at
    })));
  } catch (error) {
    console.error('Error fetching shared books:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/profile-picture', authenticateToken, profileUpload.fields([{ name: 'profile192' }, { name: 'profile32' }]), async (req, res) => {
  try {
    if (!req.files || !req.files.profile192 || !req.files.profile32) {
      return res.status(400).json({ error: 'Both profile picture sizes required' });
    }

    const profile192 = req.files.profile192[0];
    const profile32 = req.files.profile32[0];
    
    await pool.query(
      'UPDATE public.users SET profile_picture_192 = $1, profile_picture_32 = $2 WHERE id = $3',
      [profile192.filename, profile32.filename, req.user.id]
    );

    res.json({
      profilePicture192: `/uploads/profile_pictures/${req.user.id}/${profile192.filename}`,
      profilePicture32: `/uploads/profile_pictures/${req.user.id}/${profile32.filename}`
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;