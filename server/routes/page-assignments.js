const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get page assignments for a book
router.get('/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const result = await pool.query(`
      SELECT pa.*, u.email, u.name 
      FROM public.page_assignments pa
      JOIN public.users u ON pa.user_id = u.id
      WHERE pa.book_id = $1
    `, [bookId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching page assignments:', error);
    res.status(500).json({ error: 'Failed to fetch page assignments' });
  }
});

// Assign user to page
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pageNumber, userId, bookId } = req.body;
    const assignedBy = req.user.id;
    
    // Check if user is publisher/owner
    const bookCheck = await pool.query(
      'SELECT owner_id FROM public.books WHERE id = $1',
      [bookId]
    );
    
    if (bookCheck.rows[0]?.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only book owners can assign pages' });
    }
    
    const result = await pool.query(`
      INSERT INTO public.page_assignments (page_id, user_id, book_id, assigned_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (page_id, user_id, book_id) DO NOTHING
      RETURNING *
    `, [pageNumber, userId, bookId, assignedBy]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning page:', error);
    res.status(500).json({ error: 'Failed to assign page' });
  }
});

// Remove all assignments for a page
router.delete('/page/:pageNumber', authenticateToken, async (req, res) => {
  try {
    const { pageNumber } = req.params;
    
    await pool.query(`
      DELETE FROM public.page_assignments 
      WHERE page_id = $1
    `, [pageNumber]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing page assignments:', error);
    res.status(500).json({ error: 'Failed to clear page assignments' });
  }
});

// Remove user from page
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const { pageNumber, userId, bookId } = req.body;
    
    // Check if user is publisher/owner
    const bookCheck = await pool.query(
      'SELECT owner_id FROM public.books WHERE id = $1',
      [bookId]
    );
    
    if (bookCheck.rows[0]?.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only book owners can remove page assignments' });
    }
    
    await pool.query(`
      DELETE FROM public.page_assignments 
      WHERE page_id = $1 AND user_id = $2 AND book_id = $3
    `, [pageNumber, userId, bookId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing page assignment:', error);
    res.status(500).json({ error: 'Failed to remove page assignment' });
  }
});

// Bulk update page assignments
router.put('/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { assignments } = req.body;
    
    // Check if user is publisher/owner
    const bookCheck = await pool.query(
      'SELECT owner_id FROM public.books WHERE id = $1',
      [bookId]
    );
    
    if (bookCheck.rows[0]?.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only book owners can update page assignments' });
    }
    
    // Clear existing assignments for this book
    await pool.query('DELETE FROM public.page_assignments WHERE book_id = $1', [bookId]);
    
    // Insert new assignments
    for (const assignment of assignments) {
      if (assignment.userId) {
        await pool.query(`
          INSERT INTO public.page_assignments (page_id, user_id, book_id, assigned_by)
          VALUES ($1, $2, $3, $4)
        `, [assignment.pageNumber, assignment.userId, bookId, req.user.id]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating page assignments:', error);
    res.status(500).json({ error: 'Failed to update page assignments' });
  }
});

module.exports = router;