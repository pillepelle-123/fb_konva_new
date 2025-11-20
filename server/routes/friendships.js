const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, 'friend' as role
      FROM public.friendships f
      INNER JOIN public.users u ON f.friend_id = u.id
      WHERE f.user_id = $1
      UNION
      SELECT u.id, u.name, u.email, 'friend' as role
      FROM public.friendships f
      INNER JOIN public.users u ON f.user_id = u.id
      WHERE f.friend_id = $1
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add friend
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;
    
    if (userId === friendId) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }
    
    // Check if friendship already exists
    const existing = await pool.query(
      'SELECT id FROM public.friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [userId, friendId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Friendship already exists' });
    }
    
    await pool.query(
      'INSERT INTO public.friendships (user_id, friend_id, created_at) VALUES ($1, $2, NOW())',
      [userId, friendId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove friend
router.delete('/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;
    
    await pool.query(
      'DELETE FROM public.friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [userId, friendId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search users by email or name
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    const result = await pool.query(`
      SELECT u.id, u.name, u.email
      FROM public.users u
      WHERE (u.email ILIKE $1 OR u.name ILIKE $1) 
        AND u.id != $2
        AND NOT EXISTS (
          SELECT 1 FROM public.friendships f 
          WHERE (f.user_id = $2 AND f.friend_id = u.id) 
             OR (f.user_id = u.id AND f.friend_id = $2)
        )
      LIMIT 10
    `, [`%${query}%`, userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Invite user by email (creates user if doesn't exist)
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const { email, name } = req.body;
    const userId = req.user.id;
    
    // Check if user already exists
    let user = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      // Create new user with temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Use provided name or derive from email
      const userName = name || email.split('@')[0];
      
      user = await pool.query(
        'INSERT INTO public.users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [email, userName, hashedPassword]
      );
    }
    
    const friendId = user.rows[0].id;
    
    // Add friendship
    await pool.query(
      'INSERT INTO public.friendships (user_id, friend_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [userId, friendId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;