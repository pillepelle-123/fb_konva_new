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
      recentBooks: recentBooks.rows.map(book => {
        const isOwner = book.owner_id === userId;
        return {
          id: book.id,
          name: book.name,
          lastModified: book.updated_at,
          collaboratorCount: parseInt(book.collaborator_count),
          isOwner: isOwner,
          userRole: isOwner ? 'owner' : 'author' // Default for dashboard, could be enhanced
        };
      })
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
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at, b.updated_at,
        COALESCE((SELECT COUNT(*) FROM public.pages WHERE book_id = b.id), 0) as page_count,
        COALESCE((SELECT COUNT(*) FROM public.book_friends WHERE book_id = b.id), 0) as collaborator_count,
        bf.book_role
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $1
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = FALSE
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(books.rows.map(book => {
      const isOwner = book.owner_id === userId;
      const userRole = isOwner ? 'owner' : book.book_role;
      
      return {
        id: book.id,
        name: book.name,
        pageSize: book.page_size,
        orientation: book.orientation,
        pageCount: parseInt(book.page_count) || 0,
        collaboratorCount: parseInt(book.collaborator_count) || 0,
        isOwner: isOwner,
        userRole: userRole,
        created_at: book.created_at,
        updated_at: book.updated_at
      };
    }));
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
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at, bf.book_role
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $1
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = TRUE
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(books.rows.map(book => {
      const isOwner = book.owner_id === userId;
      const userRole = isOwner ? 'owner' : book.book_role;
      
      return {
        id: book.id,
        name: book.name,
        pageSize: book.page_size,
        orientation: book.orientation,
        isOwner: isOwner,
        userRole: userRole,
        createdAt: book.created_at
      };
    }));
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
      owner_id: book.owner_id,
      pages: pages.rows.map(page => {
        const pageData = page.elements || {};
        return {
          id: page.id,
          pageNumber: page.page_number,
          elements: pageData.elements || [],
          background: pageData.background
        };
      })
    });
  } catch (error) {
    console.error('Book fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update book pages for authors (only assigned pages)
router.put('/:id/author-save', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;
    const { pages } = req.body;

    // Check if user is author
    const collaborator = await pool.query(
      'SELECT book_role FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, userId]
    );

    if (collaborator.rows.length === 0 || collaborator.rows[0].book_role !== 'author') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get assigned pages
    const assignments = await pool.query(`
      SELECT p.page_number FROM public.page_assignments pa
      JOIN public.pages p ON pa.page_id = p.id
      WHERE p.book_id = $1 AND pa.user_id = $2
    `, [bookId, userId]);
    const assignedPageIds = assignments.rows.map(row => row.page_number);

    // Update only assigned pages and handle question associations
    for (const page of pages) {
      if (assignedPageIds.includes(page.pageNumber)) {
        // Get the page ID
        const pageResult = await pool.query(
          'SELECT id FROM public.pages WHERE book_id = $1 AND page_number = $2',
          [bookId, page.pageNumber]
        );
        
        if (pageResult.rows.length > 0) {
          const pageId = pageResult.rows[0].id;
          
          // Update page data (elements and background)
          await pool.query(
            'UPDATE public.pages SET elements = $1 WHERE id = $2',
            [JSON.stringify(page), pageId]
          );

          // Remove existing question associations for this page
          await pool.query(
            'DELETE FROM public.question_pages WHERE page_id = $1',
            [pageId]
          );

          // Add new question associations
          const elements = page.elements || [];
          for (const element of elements) {
            if (element.textType === 'question' && element.questionId) {
              await pool.query(
                'INSERT INTO public.question_pages (question_id, page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [element.questionId, pageId]
              );
            }
          }
        }
      }
    }

    // Update book timestamp
    await pool.query(
      'UPDATE public.books SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [bookId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Author save error:', error);
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

    // Delete existing pages and their question associations
    await pool.query('DELETE FROM public.pages WHERE book_id = $1', [bookId]);

    // Insert updated pages and handle question associations
    for (const page of pages) {
      const pageResult = await pool.query(
        'INSERT INTO public.pages (book_id, page_number, elements) VALUES ($1, $2, $3) RETURNING id',
        [bookId, page.pageNumber, JSON.stringify(page)]
      );
      const pageId = pageResult.rows[0].id;

      // Find question elements and create question_pages associations
      const elements = page.elements || [];
      for (const element of elements) {
        if (element.textType === 'question' && element.questionId) {
          await pool.query(
            'INSERT INTO public.question_pages (question_id, page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [element.questionId, pageId]
          );
        }
      }
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
      'INSERT INTO public.book_friends (book_id, user_id, book_role) VALUES ($1, $2, $3)',
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

// Add collaborator by email
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
      'INSERT INTO public.book_friends (book_id, user_id, book_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [bookId, user.rows[0].id, 'author']
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add friend to book by friend ID
router.post('/:id/friends', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { friendId, userId: targetUserId, role = 'author' } = req.body;
    const userId = req.user.id;
    const userToAdd = friendId || targetUserId;

    // Check if user has access to manage this book
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify the friend relationship exists
    const friendship = await pool.query(
      'SELECT * FROM public.friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [userId, userToAdd]
    );

    if (friendship.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    // Add friend to book
    await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, book_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [bookId, userToAdd, role]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Add friend to book error:', error);
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

    // Check if user has access to this book (owner, publisher, or author)
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
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

// Get questions with page information
router.get('/:id/questions-with-pages', authenticateToken, async (req, res) => {
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

    const questions = await pool.query(`
      SELECT q.*, 
             COALESCE(array_agg(p.page_number) FILTER (WHERE p.page_number IS NOT NULL), '{}') as page_numbers,
             CASE WHEN COUNT(qp.page_id) = 0 THEN 'draft' ELSE 'published' END as status
      FROM public.questions q
      LEFT JOIN public.question_pages qp ON q.id = qp.question_id
      LEFT JOIN public.pages p ON qp.page_id = p.id
      WHERE q.book_id = $1
      GROUP BY q.id
      ORDER BY q.created_at ASC
    `, [bookId]);

    res.json(questions.rows);
  } catch (error) {
    console.error('Questions with pages fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create question for a book
router.post('/:id/questions', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { questionText } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
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

// Get user role and page assignments for a book
router.get('/:id/user-role', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT owner_id FROM public.books WHERE id = $1', [bookId]);
    if (book.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.rows[0].owner_id === userId) {
      return res.json({ role: 'publisher', assignedPages: [] });
    }

    // Check if user is collaborator
    const collaborator = await pool.query(
      'SELECT book_role FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, userId]
    );

    if (collaborator.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get assigned pages for authors
    let assignedPages = [];
    if (collaborator.rows[0].book_role === 'author') {
      const assignments = await pool.query(`
        SELECT p.page_number FROM public.page_assignments pa
        JOIN public.pages p ON pa.page_id = p.id
        WHERE p.book_id = $1 AND pa.user_id = $2
      `, [bookId, userId]);
      assignedPages = assignments.rows.map(row => row.page_number);
    }

    res.json({ role: collaborator.rows[0].book_role, assignedPages });
  } catch (error) {
    console.error('User role fetch error:', error);
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
      SELECT u.id, u.name, u.email, bf.book_role as role
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
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      'UPDATE public.book_friends SET book_role = $1 WHERE book_id = $2 AND user_id = $3',
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
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove page assignments first
    await pool.query(`
      DELETE FROM public.page_assignments 
      WHERE page_id IN (SELECT id FROM public.pages WHERE book_id = $1) AND user_id = $2
    `, [bookId, friendId]);

    // Remove from book_friends
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

// Update page order
router.put('/:id/page-order', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { pageOrder } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // First, set all page numbers to negative values to avoid conflicts
    await pool.query(
      'UPDATE public.pages SET page_number = -page_number WHERE book_id = $1',
      [bookId]
    );
    
    // Then update to new page numbers based on order
    for (let i = 0; i < pageOrder.length; i++) {
      const newPageNumber = i + 1;
      const oldPageNumber = pageOrder[i];
      
      await pool.query(
        'UPDATE public.pages SET page_number = $1 WHERE book_id = $2 AND page_number = $3',
        [newPageNumber, bookId, -oldPageNumber]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Page order update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
