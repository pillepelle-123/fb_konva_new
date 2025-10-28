const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get all active questions from the pool
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, language } = req.query;
    
    let query = 'SELECT * FROM public.question_pool WHERE is_active = true';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    if (language) {
      params.push(language);
      query += ` AND language = $${params.length}`;
    }
    
    query += ' ORDER BY category, question_text';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get question pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM public.question_pool WHERE is_active = true AND category IS NOT NULL ORDER BY category'
    );
    res.json(result.rows.map(row => row.category));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Add question to pool
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { questionText, category, language } = req.body;
    
    const result = await pool.query(
      'INSERT INTO public.question_pool (question_text, category, language) VALUES ($1, $2, $3) RETURNING *',
      [questionText, category || null, language || 'en']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create question pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update question in pool
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, category, language, isActive } = req.body;
    
    const result = await pool.query(
      'UPDATE public.question_pool SET question_text = $1, category = $2, language = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [questionText, category, language, isActive, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update question pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete question from pool
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM public.question_pool WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete question pool error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
