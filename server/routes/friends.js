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

// Invite user by email (creates user if doesn't exist)
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;
    
    // Check if user already exists
    let user = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      // Create new user with temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      user = await pool.query(
        'INSERT INTO public.users (email, name, password) VALUES ($1, $2, $3) RETURNING id',
        [email, email.split('@')[0], hashedPassword]
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