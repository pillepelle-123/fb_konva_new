const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

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

// Check if user already has this question assigned on any page
router.get('/check/:bookId/:userId/:questionId', authenticateToken, async (req, res) => {
  try {
    const { bookId, userId, questionId } = req.params;
    
    // Check if question exists on any page assigned to this user
    const bookResult = await pool.query('SELECT pages FROM books WHERE id = $1', [bookId]);
    if (bookResult.rows.length === 0) {
      return res.json(false);
    }
    
    const pages = bookResult.rows[0].pages;
    
    // Get page assignments for this user
    const assignmentResult = await pool.query(
      'SELECT page_number FROM page_assignments WHERE book_id = $1 AND user_id = $2',
      [bookId, userId]
    );
    
    const userPages = assignmentResult.rows.map(row => row.page_number);
    
    // Check if question exists on any of the user's assigned pages
    let hasQuestion = false;
    for (const page of pages) {
      if (userPages.includes(page.pageNumber)) {
        const questionExists = page.elements.some(el => 
          (el.textType === 'question' || el.textType === 'qna') && el.questionId === questionId
        );
        if (questionExists) {
          hasQuestion = true;
          break;
        }
      }
    }
    
    res.json(hasQuestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conflicting questions for page assignment
router.get('/conflicts/:bookId/:userId/:pageNumber', authenticateToken, async (req, res) => {
  try {
    const { bookId, userId, pageNumber } = req.params;
    
    const result = await pool.query(`
      SELECT DISTINCT q.question_text 
      FROM user_question_assignments uqa
      JOIN questions q ON uqa.question_id = q.id
      JOIN books b ON uqa.book_id = b.id
      WHERE uqa.book_id = $1 AND uqa.user_id = $2
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(b.pages) AS page
        WHERE (page->>'pageNumber')::int = $3
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(page->'elements') AS element
          WHERE element->>'textType' = 'question' 
          AND (element->>'questionId')::int = uqa.question_id
        )
      )
    `, [bookId, userId, pageNumber]);
    
    res.json(result.rows.map(row => row.question_text));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track new question assignment (deprecated - questions are now tracked via book pages)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { bookId, userId, questionId, pageNumber } = req.body;
    
    // This endpoint is kept for backward compatibility but no longer used
    // Questions are now tracked directly in the book pages JSON
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in POST /user-question-assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's question assignments for a book
router.get('/book/:bookId/user', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT question_id as "questionId", page_number as "pageNumber" FROM user_question_assignments WHERE book_id = $1 AND user_id = $2',
      [bookId, userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove question assignment
router.delete('/:bookId/:userId/:questionId', authenticateToken, async (req, res) => {
  try {
    const { bookId, userId, questionId } = req.params;
    
    await pool.query(
      'DELETE FROM user_question_assignments WHERE book_id = $1 AND user_id = $2 AND question_id = $3',
      [bookId, userId, questionId]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;