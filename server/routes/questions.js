const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Parse schema from DATABASE_URL
const url = new URL(process.env.DATABASE_URL);
const schema = url.searchParams.get('schema') || 'public';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set search path from DATABASE_URL schema parameter
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

// Get questions by book ID
router.get('/:bookId', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const result = await pool.query(
      'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY created_at DESC',
      [bookId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new question with UUID
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, bookId, questionText } = req.body;
    const userId = req.user.id;
    
    // Check if user owns the book
    const book = await pool.query('SELECT owner_id FROM public.books WHERE id = $1', [bookId]);
    if (book.rows.length === 0 || book.rows[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const result = await pool.query(
      'INSERT INTO public.questions (id, question_text, book_id, created_by, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET question_text = $2, updated_at = CURRENT_TIMESTAMP RETURNING *',
      [id, questionText, bookId, userId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update question
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { questionText } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher of the book that owns this question
    const question = await pool.query(`
      SELECT q.*, b.owner_id, bf.book_role
      FROM public.questions q 
      JOIN public.books b ON q.book_id = b.id 
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE q.id = $1
    `, [questionId, userId]);

    if (question.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const isOwner = question.rows[0].owner_id === userId;
    const isPublisher = question.rows[0].book_role === 'publisher';

    if (!isOwner && !isPublisher) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'UPDATE public.questions SET question_text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [questionText, questionId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Question update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete question
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const questionId = req.params.id;
    const userId = req.user.id;

    // Check if user is owner or publisher of the book that owns this question
    const question = await pool.query(`
      SELECT q.*, b.owner_id, bf.book_role
      FROM public.questions q 
      JOIN public.books b ON q.book_id = b.id 
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE q.id = $1
    `, [questionId, userId]);

    if (question.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const isOwner = question.rows[0].owner_id === userId;
    const isPublisher = question.rows[0].book_role === 'publisher';

    if (!isOwner && !isPublisher) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM public.questions WHERE id = $1', [questionId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Question delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;