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
router.get('/book/:bookId', authenticateToken, async (req, res) => {
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

// Get questions assigned to current user for a specific book
router.get('/book/:bookId/user', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const userId = req.user.id;
    
    // Get questions from pages assigned to the current user
    const result = await pool.query(`
      SELECT DISTINCT q.*
      FROM public.questions q
      JOIN public.pages p ON p.book_id = q.book_id
      JOIN public.page_assignments pa ON pa.page_id = p.id
      WHERE q.book_id = $1 AND pa.user_id = $2
      ORDER BY q.created_at DESC
    `, [bookId, userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get user questions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get questions by book ID (legacy route)
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

// Add questions from pool to book
router.post('/from-pool', authenticateToken, async (req, res) => {
  try {
    const { bookId, questionPoolIds } = req.body;
    const userId = req.user.id;
    
    // Check if user owns the book or is a publisher
    const book = await pool.query(`
      SELECT b.owner_id, bf.book_role
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1
    `, [bookId, userId]);
    
    if (book.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const isOwner = book.rows[0].owner_id === userId;
    const isPublisher = book.rows[0].book_role === 'publisher';
    
    if (!isOwner && !isPublisher) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const createdQuestions = [];
    
    for (const poolId of questionPoolIds) {
      // Get question from pool
      const poolQuestion = await pool.query(
        'SELECT * FROM public.question_pool WHERE id = $1',
        [poolId]
      );
      
      if (poolQuestion.rows.length === 0) continue;
      
      const { question_text } = poolQuestion.rows[0];
      const questionId = require('crypto').randomUUID();
      
      // Create question in questions table with question_pool_id
      const result = await pool.query(
        'INSERT INTO public.questions (id, question_text, book_id, created_by, question_pool_id, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *',
        [questionId, question_text, bookId, userId, poolId]
      );
      
      // Track in book_questions junction table
      await pool.query(
        'INSERT INTO public.book_questions (book_id, question_pool_id, question_id) VALUES ($1, $2, $3) ON CONFLICT (book_id, question_pool_id) DO NOTHING',
        [bookId, poolId, questionId]
      );
      
      createdQuestions.push(result.rows[0]);
    }
    
    res.json(createdQuestions);
  } catch (error) {
    console.error('Add questions from pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new question with UUID
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, bookId, questionText, questionPoolId } = req.body;
    const userId = req.user.id;
    
    console.log('Received question POST:', { id, bookId, questionText, questionPoolId });
    
    // Check if user owns the book or is a publisher
    const book = await pool.query(`
      SELECT b.owner_id, bf.book_role
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1
    `, [bookId, userId]);
    
    if (book.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const isOwner = book.rows[0].owner_id === userId;
    const isPublisher = book.rows[0].book_role === 'publisher';
    
    if (!isOwner && !isPublisher) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    console.log('Inserting question with params:', [id, questionText, bookId, userId, questionPoolId || null]);
    
    const result = await pool.query(
      'INSERT INTO public.questions (id, question_text, book_id, created_by, question_pool_id, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, question_pool_id = EXCLUDED.question_pool_id, updated_at = CURRENT_TIMESTAMP RETURNING *',
      [id, questionText, bookId, userId, questionPoolId || null]
    );
    
    console.log('Question inserted/updated:', result.rows[0]);
    
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

    // Prevent editing questions from pool
    if (question.rows[0].question_pool_id) {
      return res.status(403).json({ error: 'Cannot edit questions from the question pool' });
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

    // Prevent deleting questions from pool
    if (question.rows[0].question_pool_id) {
      return res.status(403).json({ error: 'Cannot delete questions from the question pool' });
    }

    await pool.query('DELETE FROM public.questions WHERE id = $1', [questionId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Question delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;