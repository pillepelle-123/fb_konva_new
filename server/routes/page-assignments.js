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

// Get page assignments for a book
router.get('/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const result = await pool.query(`
      SELECT pa.*, u.email, u.name, p.page_number, bf.book_role
      FROM public.page_assignments pa
      JOIN public.users u ON pa.user_id = u.id
      JOIN public.pages p ON pa.page_id = p.id
      LEFT JOIN public.book_friends bf ON bf.user_id = pa.user_id AND bf.book_id = p.book_id
      WHERE p.book_id = $1
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
    
    // Get page_id from page_number and book_id
    const pageResult = await pool.query(
      'SELECT id FROM public.pages WHERE page_number = $1 AND book_id = $2',
      [pageNumber, bookId]
    );
    
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const pageId = pageResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO public.page_assignments (page_id, user_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (page_id, user_id) DO NOTHING
      RETURNING *
    `, [pageId, userId, assignedBy]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning page:', error);
    res.status(500).json({ error: 'Failed to assign page' });
  }
});

// Remove all assignments for a page
router.delete('/page/:pageNumber/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const { pageNumber, bookId } = req.params;
    
    // Get page_id from page_number and book_id
    const pageResult = await pool.query(
      'SELECT id FROM public.pages WHERE page_number = $1 AND book_id = $2',
      [pageNumber, bookId]
    );
    
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    await pool.query(`
      DELETE FROM public.page_assignments 
      WHERE page_id = $1
    `, [pageResult.rows[0].id]);
    
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
    
    // Get page_id from page_number and book_id
    const pageResult = await pool.query(
      'SELECT id FROM public.pages WHERE page_number = $1 AND book_id = $2',
      [pageNumber, bookId]
    );
    
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    await pool.query(`
      DELETE FROM public.page_assignments 
      WHERE page_id = $1 AND user_id = $2
    `, [pageResult.rows[0].id, userId]);
    
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
    await pool.query(`
      DELETE FROM public.page_assignments 
      WHERE page_id IN (SELECT id FROM public.pages WHERE book_id = $1)
    `, [bookId]);
    
    // Insert new assignments and create answer placeholders
    for (const assignment of assignments) {
      if (assignment.userId) {
        // Get page_id from page_number and book_id
        const pageResult = await pool.query(
          'SELECT id FROM public.pages WHERE page_number = $1 AND book_id = $2',
          [assignment.pageNumber, bookId]
        );
        
        if (pageResult.rows.length > 0) {
          const pageId = pageResult.rows[0].id;
          
          await pool.query(`
            INSERT INTO public.page_assignments (page_id, user_id, assigned_by)
            VALUES ($1, $2, $3)
          `, [pageId, assignment.userId, req.user.id]);
          
          // Create answer placeholders for questions on this page
          const pageData = await pool.query(
            'SELECT elements FROM public.pages WHERE id = $1',
            [pageId]
          );
          
          if (pageData.rows.length > 0) {
            const elements = pageData.rows[0].elements?.elements || [];
            const questionElements = elements.filter(el => el.textType === 'question' && el.questionId);
            
            for (const questionElement of questionElements) {
              // Check if question exists before creating answer
              const questionExists = await pool.query(
                'SELECT id FROM public.questions WHERE id = $1',
                [questionElement.questionId]
              );
              
              if (questionExists.rows.length > 0) {
                const existingAnswer = await pool.query(
                  'SELECT id FROM public.answers WHERE question_id = $1 AND user_id = $2',
                  [questionElement.questionId, assignment.userId]
                );
                
                if (existingAnswer.rows.length === 0) {
                  await pool.query(
                    'INSERT INTO public.answers (id, question_id, user_id, answer_text) VALUES (uuid_generate_v4(), $1, $2, $3)',
                    [questionElement.questionId, assignment.userId, '']
                  );
                  console.log(`Created answer placeholder for page assignment: question ${questionElement.questionId}, user ${assignment.userId}`);
                }
              } else {
                console.log(`Skipping answer creation for non-existent question: ${questionElement.questionId}`);
              }
            }
          }
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating page assignments:', error);
    res.status(500).json({ error: 'Failed to update page assignments' });
  }
});

module.exports = router;