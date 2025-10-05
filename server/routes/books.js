const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get owned books count
    const ownedBooks = await pool.query(
      'SELECT COUNT(*) FROM public.books WHERE owner_id = $1 AND archived = FALSE',
      [userId]
    );

    // Get collaborated books count
    const collaboratedBooks = await pool.query(
      'SELECT COUNT(*) FROM public.book_friends WHERE user_id = $1',
      [userId]
    );

    // Get total collaborators across all user's books
    const collaborators = await pool.query(`
      SELECT COUNT(DISTINCT bf.user_id) 
      FROM public.book_friends bf
      JOIN public.books b ON bf.book_id = b.id
      WHERE b.owner_id = $1 OR bf.user_id = $1
    `, [userId]);

    // Get recent books (owned + collaborated)
    const recentBooks = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.updated_at, b.owner_id,
        (SELECT COUNT(*) FROM public.book_friends WHERE book_id = b.id) as collaborator_count
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = FALSE
      ORDER BY b.updated_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      stats: {
        myBooks: parseInt(ownedBooks.rows[0].count),
        contributedBooks: parseInt(collaboratedBooks.rows[0].count),
        totalCollaborators: parseInt(collaborators.rows[0].count)
      },
      recentBooks: recentBooks.rows.map(book => ({
        id: book.id,
        name: book.name,
        lastModified: book.updated_at,
        collaboratorCount: parseInt(book.collaborator_count),
        isOwner: book.owner_id === userId
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all books (non-archived)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const books = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at,
        COALESCE((SELECT COUNT(*) FROM public.pages WHERE book_id = b.id), 0) as page_count,
        COALESCE((SELECT COUNT(*) FROM public.book_friends WHERE book_id = b.id), 0) as collaborator_count
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = FALSE
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(books.rows.map(book => ({
      id: book.id,
      name: book.name,
      pageSize: book.page_size,
      orientation: book.orientation,
      pageCount: parseInt(book.page_count) || 0,
      collaboratorCount: parseInt(book.collaborator_count) || 0,
      isOwner: book.owner_id === userId,
      createdAt: book.created_at
    })));
  } catch (error) {
    console.error('Books fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get archived books
router.get('/archived', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const books = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = TRUE
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(books.rows.map(book => ({
      id: book.id,
      name: book.name,
      pageSize: book.page_size,
      orientation: book.orientation,
      isOwner: book.owner_id === userId,
      createdAt: book.created_at
    })));
  } catch (error) {
    console.error('Archived books fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single book with pages
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const book = bookAccess.rows[0];

    // Get pages for this book
    const pages = await pool.query(
      'SELECT * FROM public.pages WHERE book_id = $1 ORDER BY page_number ASC',
      [bookId]
    );

    res.json({
      id: book.id,
      name: book.name,
      pageSize: book.page_size,
      orientation: book.orientation,
      pages: pages.rows.map(page => ({
        id: page.id,
        pageNumber: page.page_number,
        elements: page.elements || []
      }))
    });
  } catch (error) {
    console.error('Book fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update book and pages
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;
    const { name, pageSize, orientation, pages } = req.body;

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update book metadata
    await pool.query(
      'UPDATE public.books SET name = $1, page_size = $2, orientation = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [name, pageSize, orientation, bookId]
    );

    // Delete existing pages
    await pool.query('DELETE FROM public.pages WHERE book_id = $1', [bookId]);

    // Insert updated pages
    for (const page of pages) {
      await pool.query(
        'INSERT INTO public.pages (book_id, page_number, elements) VALUES ($1, $2, $3)',
        [bookId, page.pageNumber, JSON.stringify(page.elements)]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Book update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new book
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, pageSize, orientation } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'INSERT INTO public.books (name, owner_id, page_size, orientation) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, userId, pageSize, orientation]
    );

    const bookId = result.rows[0].id;

    // Create initial page
    await pool.query(
      'INSERT INTO public.pages (book_id, page_number, elements) VALUES ($1, $2, $3)',
      [bookId, 1, JSON.stringify([])]
    );

    // Add owner as publisher collaborator
    await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, role) VALUES ($1, $2, $3)',
      [bookId, userId, 'publisher']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Book creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive/Restore book
router.put('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      'UPDATE public.books SET archived = NOT archived, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [bookId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete book permanently
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM public.books WHERE id = $1', [bookId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add collaborator
router.post('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { email } = req.body;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Find user by email
    const user = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add collaborator
    await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [bookId, user.rows[0].id, 'author']
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:userId', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const collaboratorId = req.params.userId;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      'DELETE FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, collaboratorId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get questions for a book
router.get('/:id/questions', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user is admin of the book
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const questions = await pool.query(
      'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY created_at ASC',
      [bookId]
    );

    res.json(questions.rows);
  } catch (error) {
    console.error('Questions fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create question for a book
router.post('/:id/questions', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { questionText } = req.body;
    const userId = req.user.id;

    // Check if user is admin of the book
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'INSERT INTO public.questions (book_id, question_text, created_by) VALUES ($1, $2, $3) RETURNING *',
      [bookId, questionText, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Question create error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friends for a book
router.get('/:id/friends', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const friends = await pool.query(`
      SELECT u.id, u.name, u.email, bf.role
      FROM public.book_friends bf
      JOIN public.users u ON bf.user_id = u.id
      WHERE bf.book_id = $1 AND bf.user_id != $2
      ORDER BY u.name ASC
    `, [bookId, userId]);

    res.json(friends.rows);
  } catch (error) {
    console.error('Friends fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update friend role
router.put('/:id/friends/:friendId/role', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const friendId = req.params.friendId;
    const { role } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.role as user_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      'UPDATE public.book_friends SET role = $1 WHERE book_id = $2 AND user_id = $3',
      [role, bookId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove friend from book
router.delete('/:id/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const friendId = req.params.friendId;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.role as user_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      'DELETE FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Friend removal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
