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
    
    const receiverId = user.rows[0].id;

    // Create friend invitation instead of direct friendship
    const blocked = await pool.query('SELECT 1 FROM public.user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [receiverId, userId]);
    if (blocked.rows.length > 0) {
      return res.status(403).json({ error: 'Cannot send invitation' });
    }
    const existingFriendship = await pool.query(
      'SELECT 1 FROM public.friendships WHERE user_id = LEAST($1::int, $2::int) AND friend_id = GREATEST($1::int, $2::int) AND ended_at IS NULL',
      [userId, receiverId]
    );
    if (existingFriendship.rows.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }
    const pending = await pool.query(
      'SELECT id FROM public.friend_invitations WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
      [userId, receiverId, 'pending']
    );
    if (pending.rows.length > 0) {
      return res.status(400).json({ error: 'Invitation already pending' });
    }
    const result = await pool.query(
      'INSERT INTO public.friend_invitations (sender_id, receiver_id, status) VALUES ($1, $2, $3) ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = $3, created_at = CURRENT_TIMESTAMP, responded_at = NULL RETURNING *',
      [userId, receiverId, 'pending']
    );
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('friend_invitation_received', { invitationId: result.rows[0].id, senderId: userId, receiverId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;