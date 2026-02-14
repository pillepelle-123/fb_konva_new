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

// Helper: Check if user has access to book (owner or book_friend)
async function checkBookAccess(bookId, userId) {
  const bookAccess = await pool.query(`
    SELECT b.id FROM public.books b
    LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
    WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
  `, [bookId, userId]);
  return bookAccess.rows.length > 0;
}

// Get questions by book ID
router.get('/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const userId = req.user.id;

    if (!(await checkBookAccess(bookId, userId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY display_order ASC NULLS LAST, created_at ASC',
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

    if (!(await checkBookAccess(bookId, userId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get questions from pages assigned to the current user
    const result = await pool.query(`
      SELECT DISTINCT q.*
      FROM public.questions q
      JOIN public.pages p ON p.book_id = q.book_id
      JOIN public.page_assignments pa ON pa.page_id = p.id
      WHERE q.book_id = $1 AND pa.user_id = $2
      ORDER BY q.display_order ASC NULLS LAST, q.created_at ASC
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
    const userId = req.user.id;

    if (!(await checkBookAccess(bookId, userId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY display_order ASC NULLS LAST, created_at ASC',
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
      
      // Get next display_order for this book
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM public.questions WHERE book_id = $1',
        [bookId]
      );
      const displayOrder = maxOrderResult.rows[0]?.next_order || 0;
      
      // Create question in questions table with question_pool_id
      const result = await pool.query(
        'INSERT INTO public.questions (id, question_text, book_id, created_by, question_pool_id, display_order, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *',
        [questionId, question_text, bookId, userId, poolId, displayOrder]
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
    const { id, bookId, questionText, questionPoolId, displayOrder } = req.body;
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
    
    // If displayOrder is not provided, get next order
    let finalDisplayOrder = displayOrder;
    if (finalDisplayOrder === undefined || finalDisplayOrder === null) {
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM public.questions WHERE book_id = $1',
        [bookId]
      );
      finalDisplayOrder = maxOrderResult.rows[0]?.next_order || 0;
    }
    
    // Validate questionPoolId - must be a valid integer or null
    // Curated questions from the wizard don't have a question_pool_id (they're hardcoded)
    let finalQuestionPoolId = null;
    if (questionPoolId !== null && questionPoolId !== undefined) {
      const poolIdNum = parseInt(questionPoolId, 10);
      if (!isNaN(poolIdNum)) {
        finalQuestionPoolId = poolIdNum;
      }
    }
    
    const result = await pool.query(
      'INSERT INTO public.questions (id, question_text, book_id, created_by, question_pool_id, display_order, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, question_pool_id = EXCLUDED.question_pool_id, display_order = EXCLUDED.display_order, updated_at = CURRENT_TIMESTAMP RETURNING *',
      [id, questionText, bookId, userId, finalQuestionPoolId, finalDisplayOrder]
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

// Update question display order (bulk update)
router.put('/book/:bookId/order', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const { questionOrders } = req.body; // Array of { questionId, displayOrder }
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
    
    // Update display_order for each question
    for (const { questionId, displayOrder } of questionOrders) {
      await pool.query(
        'UPDATE public.questions SET display_order = $1 WHERE id = $2 AND book_id = $3',
        [displayOrder, questionId, bookId]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update question order error:', error);
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