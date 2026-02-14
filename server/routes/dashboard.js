const express = require('express');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Auth middleware
const jwt = require('jsonwebtoken');
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [myBooks, contributedBooks, questions, answers, friends] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM public.books WHERE owner_id = $1', [userId]),
      pool.query('SELECT COUNT(DISTINCT b.id) as count FROM public.books b LEFT JOIN public.book_friends bf ON b.id = bf.book_id WHERE bf.user_id = $1 OR b.owner_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM public.questions q JOIN public.books b ON q.book_id = b.id JOIN public.book_friends bf ON b.id = bf.book_id WHERE bf.user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM public.answers a JOIN public.questions q ON a.question_id = q.id JOIN public.books b ON q.book_id = b.id JOIN public.book_friends bf ON b.id = bf.book_id WHERE bf.user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM public.friendships WHERE (user_id = $1 OR friend_id = $1) AND ended_at IS NULL', [userId])
    ]);
    
    res.json({
      myBooks: parseInt(myBooks.rows[0].count),
      contributedBooks: parseInt(contributedBooks.rows[0].count),
      totalCollaborators: parseInt(contributedBooks.rows[0].count),
      totalQuestions: parseInt(questions.rows[0].count),
      totalAnswers: parseInt(answers.rows[0].count),
      totalFriends: parseInt(friends.rows[0].count),
      weeklyActivity: 75
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent messages
router.get('/messages', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT DISTINCT ON (m.sender_id)
        m.id,
        m.content,
        m.created_at,
        u.name as sender_name,
        u.profile_picture_32,
        u.id as user_id,
        CASE WHEN mrs.read_at IS NULL THEN false ELSE true END as read_at
      FROM public.messages m
      JOIN public.users u ON m.sender_id = u.id
      JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
      LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1
      WHERE cp.user_id = $1 AND m.sender_id != $1
      ORDER BY m.sender_id, m.created_at DESC
      LIMIT 3
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.json([]);
  }
});

// Get activity data for charts
router.get('/activity', auth, async (req, res) => {
  try {
    // Mock activity data for now - in real implementation, you'd track user activities
    const activityData = [
      { week: "Week 1", books: 8, questions: 25, answers: 42 },
      { week: "Week 2", books: 12, questions: 18, answers: 38 },
      { week: "Week 3", books: 6, questions: 32, answers: 29 },
      { week: "Week 4", books: 15, questions: 28, answers: 51 }
    ];
    
    res.json(activityData);
  } catch (error) {
    console.error('Error fetching activity data:', error);
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
});

// Get all dashboard data in single request
router.get('/all', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch all data in parallel
    const [statsResult, messagesResult, booksResult] = await Promise.all([
      // Stats queries
      Promise.all([
        pool.query('SELECT COUNT(*) as count FROM public.books WHERE owner_id = $1', [userId]),
        pool.query('SELECT COUNT(DISTINCT b.id) as count FROM public.books b LEFT JOIN public.book_friends bf ON b.id = bf.book_id WHERE bf.user_id = $1 OR b.owner_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as count FROM public.questions q JOIN public.books b ON q.book_id = b.id JOIN public.book_friends bf ON b.id = bf.book_id WHERE bf.user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as count FROM public.answers a JOIN public.questions q ON a.question_id = q.id JOIN public.books b ON q.book_id = b.id JOIN public.book_friends bf ON b.id = bf.book_id WHERE bf.user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as count FROM public.friendships WHERE (user_id = $1 OR friend_id = $1) AND ended_at IS NULL', [userId])
      ]),
      // Messages query
      pool.query(`
        SELECT DISTINCT ON (m.sender_id)
          m.id,
          m.content,
          m.created_at,
          u.name as sender_name,
          u.profile_picture_32,
          u.id as user_id,
          CASE WHEN mrs.read_at IS NULL THEN false ELSE true END as read_at
        FROM public.messages m
        JOIN public.users u ON m.sender_id = u.id
        JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
        LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1
        WHERE cp.user_id = $1 AND m.sender_id != $1
        ORDER BY m.sender_id, m.created_at DESC
        LIMIT 3
      `, [userId]),
      // Recent books query
      pool.query(`
        SELECT DISTINCT b.id, b.name, b.updated_at as last_modified,
               COUNT(DISTINCT bf.user_id) as collaborator_count,
               CASE WHEN b.owner_id = $1 THEN true ELSE false END as is_owner
        FROM public.books b
        LEFT JOIN public.book_friends bf ON b.id = bf.book_id
        WHERE b.owner_id = $1 OR bf.user_id = $1
        GROUP BY b.id, b.name, b.updated_at, b.owner_id
        ORDER BY b.updated_at DESC
        LIMIT 5
      `, [userId])
    ]);
    
    const [myBooks, contributedBooks, questions, answers, friends] = statsResult;
    
    const stats = {
      myBooks: parseInt(myBooks.rows[0].count),
      contributedBooks: parseInt(contributedBooks.rows[0].count),
      totalCollaborators: parseInt(contributedBooks.rows[0].count),
      totalQuestions: parseInt(questions.rows[0].count),
      totalAnswers: parseInt(answers.rows[0].count),
      totalFriends: parseInt(friends.rows[0].count),
      weeklyActivity: 75,
      completedPages: 12,
      inProgressPages: 8,
      draftPages: 5
    };
    
    const activityData = [
      { week: "Week 1", books: 8, questions: 25, answers: 42 },
      { week: "Week 2", books: 12, questions: 18, answers: 38 },
      { week: "Week 3", books: 6, questions: 32, answers: 29 },
      { week: "Week 4", books: 15, questions: 28, answers: 51 }
    ];
    
    const recentBooks = booksResult.rows.map(book => ({
      id: book.id,
      name: book.name,
      lastModified: book.last_modified,
      collaboratorCount: parseInt(book.collaborator_count),
      isOwner: book.is_owner
    }));
    
    res.json({
      stats,
      messages: messagesResult.rows,
      activityData,
      recentBooks
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;