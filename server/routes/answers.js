const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create or update answer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { questionId, answerText } = req.body;
    const userId = req.user.id;

    // Strip HTML tags from answer text
    const cleanAnswerText = answerText.replace(/<[^>]*>/g, '').trim();

    console.log('Saving answer:', { userId, questionId, cleanAnswerText });

    if (!questionId || cleanAnswerText === undefined || cleanAnswerText === null) {
      return res.status(400).json({ error: 'Missing questionId or answerText' });
    }

    // Check if answer already exists for this user and question
    const existingAnswer = await pool.query(
      'SELECT id FROM public.answers WHERE user_id = $1 AND question_id = $2',
      [userId, questionId]
    );

    let result;
    if (existingAnswer.rows.length > 0) {
      // Update existing answer
      result = await pool.query(
        'UPDATE public.answers SET answer_text = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND question_id = $3 RETURNING *',
        [cleanAnswerText, userId, questionId]
      );
    } else {
      // Create new answer
      result = await pool.query(
        'INSERT INTO public.answers (user_id, question_id, answer_text) VALUES ($1, $2, $3) RETURNING *',
        [userId, questionId, cleanAnswerText]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Answer save error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get answers for a book (by question IDs)
router.get('/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    console.log('Fetching answers for book:', bookId, 'user:', userId);

    // Get all questions for this book first
    const questions = await pool.query(
      'SELECT id FROM public.questions WHERE book_id = $1',
      [bookId]
    );

    console.log('Found questions:', questions.rows.length);

    if (questions.rows.length === 0) {
      return res.json([]);
    }

    const questionIds = questions.rows.map(q => q.id);

    // Get answers for these questions by this user
    const answers = await pool.query(
      'SELECT * FROM public.answers WHERE user_id = $1 AND question_id = ANY($2::int[])',
      [userId, questionIds]
    );

    console.log('Found answers:', answers.rows.length);
    res.json(answers.rows);
  } catch (error) {
    console.error('Answers fetch error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;