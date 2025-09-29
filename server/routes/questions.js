const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Update question
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { questionText } = req.body;
    const userId = req.user.id;

    // Check if user is admin of the book that owns this question
    const question = await pool.query(`
      SELECT q.*, b.owner_id 
      FROM public.questions q 
      JOIN public.books b ON q.book_id = b.id 
      WHERE q.id = $1
    `, [questionId]);

    if (question.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.rows[0].owner_id !== userId) {
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

    // Check if user is admin of the book that owns this question
    const question = await pool.query(`
      SELECT q.*, b.owner_id 
      FROM public.questions q 
      JOIN public.books b ON q.book_id = b.id 
      WHERE q.id = $1
    `, [questionId]);

    if (question.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.rows[0].owner_id !== userId) {
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