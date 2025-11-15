const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const { sendInvitationEmail } = require('../services/email');
const { syncGroupChatForBook } = require('../services/book-chats');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Send invitation
router.post('/send', authenticateToken, async (req, res) => {
  const { name, email, bookId } = req.body;
  const inviterId = req.user.id;

  try {
    // Get inviter and book info
    const [inviterResult, bookResult] = await Promise.all([
      pool.query('SELECT name FROM public.users WHERE id = $1', [inviterId]),
      pool.query('SELECT name FROM public.books WHERE id = $1', [bookId])
    ]);

    if (!inviterResult.rows[0] || !bookResult.rows[0]) {
      return res.status(404).json({ error: 'Inviter or book not found' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id, registered FROM public.users WHERE email = $1', [email]);
    
    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      // If user is already registered, just add to book
      if (existingUser.rows[0].registered) {
        // Update invited_by if not already set
        await pool.query(
          'UPDATE public.users SET invited_by = $1 WHERE id = $2 AND invited_by IS NULL',
          [inviterId, userId]
        );
        await pool.query(
          'INSERT INTO public.book_friends (book_id, user_id, book_role, page_access_level, editor_interaction_level) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
          [bookId, userId, 'author', 'all_pages', 'answer_only']
        );
        return res.json({ message: 'User already registered and added to book' });
      } else {
        // Update invited_by for existing temporary user
        await pool.query(
          'UPDATE public.users SET invited_by = $1 WHERE id = $2 AND invited_by IS NULL',
          [inviterId, userId]
        );
      }
    } else {
      // Create temporary user with invitation token
      const newUser = await pool.query(
        'INSERT INTO public.users (name, email, password_hash, registered, invitation_token, invited_by) VALUES ($1, $2, $3, $4, gen_random_uuid(), $5) RETURNING id, invitation_token',
        [name, email, '', false, inviterId]
      );
      userId = newUser.rows[0].id;
    }

    // Add user to book with default permissions
    await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, book_role, page_access_level, editor_interaction_level) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      [bookId, userId, 'author', 'all_pages', 'answer_only']
    );

    await syncGroupChatForBook(bookId);

    // Get invitation token
    const tokenResult = await pool.query('SELECT invitation_token FROM public.users WHERE id = $1', [userId]);
    const invitationToken = tokenResult.rows[0].invitation_token;
    
    // Log invitation link to console instead of sending email
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invitations/respond?token=${invitationToken}`;
    console.log('\n=== INVITATION LINK ===');
    console.log(`Invitee: ${name} (${email})`);
    console.log(`Book: ${bookResult.rows[0].name}`);
    console.log(`Link: ${inviteUrl}`);
    console.log('=====================\n');

    res.json({ message: 'Invitation created successfully (check console for link)' });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Get pending questions for invitee
router.get('/questions/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        q.id, q.question_text, q.book_id,
        b.name as book_name,
        u.id as user_id,
        a.answer_text
      FROM public.questions q
      JOIN public.books b ON q.book_id = b.id
      JOIN public.book_friends bf ON b.id = bf.book_id
      JOIN public.users u ON bf.user_id = u.id
      LEFT JOIN public.answers a ON q.id = a.question_id AND u.id = a.user_id
      WHERE u.invitation_token = $1
      ORDER BY b.name, q.id
    `, [token]);

    const questionsByBook = result.rows.reduce((acc, row) => {
      if (!acc[row.book_name]) {
        acc[row.book_name] = [];
      }
      acc[row.book_name].push({
        id: row.id,
        question_text: row.question_text,
        book_id: row.book_id,
        user_id: row.user_id,
        answer_text: row.answer_text
      });
      return acc;
    }, {});

    res.json(questionsByBook);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Save answers from temporary user
router.post('/answer', async (req, res) => {
  const { token, answers } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM public.users WHERE invitation_token = $1', [token]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'Temporary user not found' });
    }

    const userId = userResult.rows[0].id;

    // Save answers
    for (const answer of answers) {
      await pool.query(
        'INSERT INTO public.answers (question_id, user_id, answer_text) VALUES ($1, $2, $3) ON CONFLICT (question_id, user_id) DO UPDATE SET answer_text = $3',
        [answer.questionId, userId, answer.answerText]
      );
    }

    res.json({ message: 'Answers saved successfully' });
  } catch (error) {
    console.error('Error saving answers:', error);
    res.status(500).json({ error: 'Failed to save answers' });
  }
});

// Get user info by token
router.get('/user/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const userResult = await pool.query('SELECT name, email, registered FROM public.users WHERE invitation_token = $1', [token]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }
    
    res.json(userResult.rows[0]);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Convert temporary user to registered
router.post('/register', async (req, res) => {
  const { token, name, password, email } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update temporary user with new details (keep invitation_token)
    const updateQuery = email ? 
      'UPDATE public.users SET name = $1, email = $2, password_hash = $3, registered = true WHERE invitation_token = $4' :
      'UPDATE public.users SET name = $1, password_hash = $2, registered = true WHERE invitation_token = $3';
    
    const updateParams = email ? [name, email, hashedPassword, token] : [name, hashedPassword, token];
    
    await pool.query(updateQuery, updateParams);

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

module.exports = router;