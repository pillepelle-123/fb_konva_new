const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const { createLoadBookPermissionsMiddleware } = require('../middleware/load-book-permissions');
const { requireBookPermission } = require('../middleware/require-book-permission');

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

const loadBookPermissionsFromParams = createLoadBookPermissionsMiddleware(pool, { bookIdParam: 'bookId' });

// Create or update answer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, questionId, answerText, userId: requestUserId } = req.body;
    let userId = req.user.id;

    // Only allow requestUserId when requester is publisher/owner and target user is in the book
    if (requestUserId !== undefined && requestUserId !== null && Number(requestUserId) !== req.user.id) {
      const questionAndBook = await pool.query(`
        SELECT q.id, b.owner_id, bf.book_role
        FROM public.questions q
        JOIN public.books b ON q.book_id = b.id
        LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
        WHERE q.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
      `, [questionId, req.user.id]);

      if (questionAndBook.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to access this question' });
      }

      const isOwner = questionAndBook.rows[0].owner_id === req.user.id;
      const isPublisher = questionAndBook.rows[0].book_role === 'publisher';
      if (!isOwner && !isPublisher) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Verify target user is assigned to the book (page_assignment or book_friend as author)
      const targetUserInBook = await pool.query(`
        SELECT 1 FROM (
          SELECT pa.user_id FROM public.page_assignments pa
          JOIN public.pages p ON pa.page_id = p.id
          WHERE p.book_id = (SELECT book_id FROM public.questions WHERE id = $1) AND pa.user_id = $2
          UNION
          SELECT bf.user_id FROM public.book_friends bf
          JOIN public.books b ON bf.book_id = b.id
          JOIN public.questions q ON q.book_id = b.id
          WHERE q.id = $1 AND bf.user_id = $2
        ) sub
      `, [questionId, requestUserId]);

      if (targetUserInBook.rows.length === 0) {
        return res.status(403).json({ error: 'Target user is not assigned to this book' });
      }

      userId = Number(requestUserId);
    }

    // Strip HTML tags from answer text
    const cleanAnswerText = (typeof answerText === 'string' ? answerText : '').replace(/<[^>]*>/g, '').trim();

    if (!questionId || cleanAnswerText === undefined || cleanAnswerText === null) {
      return res.status(400).json({ error: 'Missing questionId or answerText' });
    }

    // Validate that the question exists
    const questionExists = await pool.query(
      'SELECT id FROM public.questions WHERE id = $1',
      [questionId]
    );
    
    if (questionExists.rows.length === 0) {
      return res.status(400).json({ error: 'Question does not exist' });
    }

    let result;
    if (id) {
      // Use provided UUID - check if answer already exists
      const existingAnswer = await pool.query(
        'SELECT id, user_id FROM public.answers WHERE id = $1',
        [id]
      );

      if (existingAnswer.rows.length > 0) {
        // Update existing answer - verify it belongs to the target userId
        if (existingAnswer.rows[0].user_id !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
        result = await pool.query(
          'UPDATE public.answers SET answer_text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [cleanAnswerText, id]
        );
      } else {
        // Create new answer with provided UUID
        result = await pool.query(
          'INSERT INTO public.answers (id, user_id, question_id, answer_text) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, question_id) DO UPDATE SET answer_text = EXCLUDED.answer_text RETURNING *',
          [id, userId, questionId, cleanAnswerText]
        );
      }
    } else {
      // Fallback: Check if answer already exists for this user and question
      const existingAnswer = await pool.query(
        'SELECT id FROM public.answers WHERE user_id = $1 AND question_id = $2',
        [userId, questionId]
      );

      if (existingAnswer.rows.length > 0) {
        // Update existing answer
        result = await pool.query(
          'UPDATE public.answers SET answer_text = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND question_id = $3 RETURNING *',
          [cleanAnswerText, userId, questionId]
        );
      } else {
        // Create new answer with generated UUID
        result = await pool.query(
          'INSERT INTO public.answers (id, user_id, question_id, answer_text) VALUES (uuid_generate_v4(), $1, $2, $3) ON CONFLICT (user_id, question_id) DO UPDATE SET answer_text = EXCLUDED.answer_text RETURNING *',
          [userId, questionId, cleanAnswerText]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Answer save error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update answer (for publishers editing their own answers)
router.put('/:answerId', authenticateToken, async (req, res) => {
  try {
    const { answerId } = req.params;
    const { answerText } = req.body;
    const userId = req.user.id;

    // Strip HTML tags from answer text
    const cleanAnswerText = answerText.replace(/<[^>]*>/g, '').trim();

    // Check if user owns this answer
    const answerCheck = await pool.query(
      'SELECT id FROM public.answers WHERE id = $1 AND user_id = $2',
      [answerId, userId]
    );

    if (answerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE public.answers SET answer_text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [cleanAnswerText, answerId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Answer update error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get answers for a book (by question IDs)
router.get('/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    // Check if user has access to this book and get their role
    const bookAccess = await pool.query(
      `SELECT b.*, bf.book_role FROM public.books b
       LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
       WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)`,
      [bookId, userId]
    );

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isOwner = bookAccess.rows[0].owner_id === userId;
    const userRole = isOwner ? 'owner' : bookAccess.rows[0].book_role;

    // Get all questions for this book first
    const questions = await pool.query(
      'SELECT id FROM public.questions WHERE book_id = $1',
      [bookId]
    );

    if (questions.rows.length === 0) {
      return res.json([]);
    }

    const questionIds = questions.rows.map(q => q.id);

    let answers;
    if (userRole === 'author') {
      // For authors, return only their own answers with user information
      answers = await pool.query(
        `SELECT a.*, u.name as user_name, u.email as user_email 
         FROM public.answers a
         JOIN public.users u ON a.user_id = u.id
         WHERE a.user_id = $1 AND a.question_id = ANY($2::uuid[])`,
        [userId, questionIds]
      );
    } else {
      // For owners and publishers, return all answers for all users with user information
      answers = await pool.query(
        `SELECT a.*, u.name as user_name, u.email as user_email 
         FROM public.answers a
         JOIN public.users u ON a.user_id = u.id
         WHERE a.question_id = ANY($1::uuid[])`,
        [questionIds]
      );
    }

    res.json(answers.rows);
  } catch (error) {
    console.error('Answers fetch error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get all answers for a question (for publishers) or user's own answer (for authors)
router.get('/question/:questionId', authenticateToken, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    // Check if user has access to this question's book
    const bookCheck = await pool.query(
      `SELECT b.id, b.owner_id, bf.book_role 
       FROM public.questions q 
       JOIN public.books b ON q.book_id = b.id 
       LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $1
       WHERE q.id = $2 AND (b.owner_id = $1 OR bf.user_id = $1)`,
      [userId, questionId]
    );

    if (bookCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isOwner = bookCheck.rows[0].owner_id === userId;
    const userRole = isOwner ? 'owner' : bookCheck.rows[0].book_role;

    if (userRole === 'author') {
      // For authors, return only their own answer
      const answers = await pool.query(
        `SELECT a.*, u.name as user_name, u.email as user_email
         FROM public.answers a
         JOIN public.users u ON a.user_id = u.id
         WHERE a.question_id = $1 AND a.user_id = $2
         ORDER BY a.created_at DESC`,
        [questionId, userId]
      );
      res.json(answers.rows);
    } else {
      // For owners and publishers, return all answers
      const answers = await pool.query(
        `SELECT a.*, u.name as user_name, u.email as user_email
         FROM public.answers a
         JOIN public.users u ON a.user_id = u.id
         WHERE a.question_id = $1
         ORDER BY a.created_at DESC`,
        [questionId]
      );
      res.json(answers.rows);
    }
  } catch (error) {
    console.error('Question answers fetch error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get answer statistics for a book (for publishers) or user's own answers (for authors)
router.get('/book/:bookId/stats', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    // Check if user has access to this book
    const bookCheck = await pool.query(
      `SELECT b.id, b.owner_id, bf.book_role FROM public.books b
       LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
       WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)`,
      [bookId, userId]
    );

    if (bookCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isOwner = bookCheck.rows[0].owner_id === userId;
    const userRole = isOwner ? 'owner' : bookCheck.rows[0].book_role;

    if (userRole === 'author') {
      // For authors, return questions with their own answer status
      const stats = await pool.query(
        `SELECT 
           q.id as question_id,
           q.question_text,
           q.created_at as question_created_at,
           CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as answer_count,
           CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as unique_users
         FROM public.questions q
         LEFT JOIN public.answers a ON q.id = a.question_id AND a.user_id = $2
         WHERE q.book_id = $1
         ORDER BY q.created_at DESC`,
        [bookId, userId]
      );
      res.json(stats.rows);
    } else {
      // For owners and publishers, return full statistics
      const stats = await pool.query(
        `SELECT 
           q.id as question_id,
           q.question_text,
           q.created_at as question_created_at,
           COUNT(a.id) as answer_count,
           COUNT(DISTINCT a.user_id) as unique_users
         FROM public.questions q
         LEFT JOIN public.answers a ON q.id = a.question_id
         WHERE q.book_id = $1
         GROUP BY q.id, q.question_text, q.created_at
         ORDER BY q.created_at DESC`,
        [bookId]
      );
      res.json(stats.rows);
    }
  } catch (error) {
    console.error('Answer stats fetch error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Delete answer by question ID (for current user)
router.delete('/question/:questionId', authenticateToken, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    // Delete user's answer for this question
    const result = await pool.query(
      'DELETE FROM public.answers WHERE question_id = $1 AND user_id = $2 RETURNING id',
      [questionId, userId]
    );

    res.json({ success: true, deleted: result.rows.length > 0 });
  } catch (error) {
    console.error('Answer delete error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Delete answer (for publishers deleting their own answers)
router.delete('/:answerId', authenticateToken, async (req, res) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.id;

    // Check if user owns this answer
    const answerCheck = await pool.query(
      'SELECT id FROM public.answers WHERE id = $1 AND user_id = $2',
      [answerId, userId]
    );

    if (answerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM public.answers WHERE id = $1', [answerId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Answer delete error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Deactivate answers for a user when removed from book
router.put('/deactivate-user/:userId/book/:bookId', authenticateToken, loadBookPermissionsFromParams, requireBookPermission('manage', 'Book'), async (req, res) => {
  try {
    const { userId: targetUserId, bookId } = req.params;

    // Get all questions for this book
    const questions = await pool.query(
      'SELECT id FROM public.questions WHERE book_id = $1',
      [bookId]
    );

    if (questions.rows.length > 0) {
      const questionIds = questions.rows.map(q => q.id);
      
      // Deactivate answers for this user in this book
      const result = await pool.query(
        'UPDATE public.answers SET is_active = false WHERE user_id = $1 AND question_id = ANY($2::uuid[])',
        [targetUserId, questionIds]
      );
      
      res.json({ success: true, deactivated: result.rowCount });
    } else {
      res.json({ success: true, deactivated: 0 });
    }
  } catch (error) {
    console.error('Answer deactivation error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;