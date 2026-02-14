const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let result;
    try {
      result = await pool.query(`
        SELECT u.id, u.name, 'friend' as role
        FROM public.friendships f
        INNER JOIN public.users u ON f.friend_id = u.id
        WHERE f.user_id = $1 AND f.ended_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM public.user_blocks ub WHERE ub.blocker_id = $1 AND ub.blocked_id = u.id)
        UNION
        SELECT u.id, u.name, 'friend' as role
        FROM public.friendships f
        INNER JOIN public.users u ON f.user_id = u.id
        WHERE f.friend_id = $1 AND f.ended_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM public.user_blocks ub WHERE ub.blocker_id = $1 AND ub.blocked_id = u.id)
      `, [userId]);
    } catch (err) {
      if (err.code === '42P01') {
        result = await pool.query(`
          SELECT u.id, u.name, 'friend' as role
          FROM public.friendships f
          INNER JOIN public.users u ON f.friend_id = u.id
          WHERE f.user_id = $1 AND f.ended_at IS NULL
          UNION
          SELECT u.id, u.name, 'friend' as role
          FROM public.friendships f
          INNER JOIN public.users u ON f.user_id = u.id
          WHERE f.friend_id = $1 AND f.ended_at IS NULL
        `, [userId]);
      } else {
        throw err;
      }
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add friend - creates friend invitation instead of direct friendship
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    if (friendId === undefined || friendId === null) {
      return res.status(400).json({ error: 'friendId is required' });
    }

    const friendIdNum = typeof friendId === 'number' ? friendId : parseInt(friendId, 10);
    if (isNaN(friendIdNum) || friendIdNum <= 0) {
      return res.status(400).json({ error: 'friendId must be a valid positive number' });
    }

    // Forward to friend-invitation logic
    const invitationRes = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/friend-invitations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: friendIdNum })
      }
    );
    // We can't easily forward - create invitation inline
    const receiverId = friendIdNum;
    if (userId === receiverId) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }
    const userCheck = await pool.query('SELECT id FROM public.users WHERE id = $1', [receiverId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const blocked = await pool.query('SELECT 1 FROM public.user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [receiverId, userId]);
    if (blocked.rows.length > 0) {
      return res.status(403).json({ error: 'Cannot send invitation' });
    }
    const existingFriendship = await pool.query(
      'SELECT 1 FROM public.friendships WHERE user_id = LEAST($1, $2) AND friend_id = GREATEST($1, $2) AND ended_at IS NULL',
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
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const lastRejected = await pool.query(
      'SELECT responded_at FROM public.friend_invitations WHERE sender_id = $1 AND receiver_id = $2 AND status = $3 ORDER BY responded_at DESC LIMIT 1',
      [userId, receiverId, 'rejected']
    );
    if (lastRejected.rows.length > 0) {
      const respondedAt = new Date(lastRejected.rows[0].responded_at).getTime();
      if (Date.now() - respondedAt < TWENTY_FOUR_HOURS_MS) {
        return res.status(400).json({ error: 'Please wait 24 hours after rejection before inviting again' });
      }
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
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Remove friend (soft delete)
router.delete('/:friendId', authenticateToken, async (req, res) => {
  try {
    const friendId = parseInt(req.params.friendId, 10);
    const userId = typeof req.user.id === 'number' ? req.user.id : parseInt(req.user.id, 10);
    if (isNaN(friendId) || friendId <= 0 || isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid friendId' });
    }
    
    await pool.query(
      'UPDATE public.friendships SET ended_at = NOW() WHERE user_id = LEAST($1::int, $2::int) AND friend_id = GREATEST($1::int, $2::int) AND ended_at IS NULL',
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
      SELECT u.id, u.name
      FROM public.users u
      WHERE (u.email ILIKE $1 OR u.name ILIKE $1) 
        AND u.id != $2
        AND NOT EXISTS (
          SELECT 1 FROM public.friendships f 
          WHERE f.user_id = LEAST($2, u.id) AND f.friend_id = GREATEST($2, u.id) AND f.ended_at IS NULL
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
    
    // Add friendship (oder reaktivieren falls ended_at gesetzt)
    const lo = Math.min(userId, friendId);
    const hi = Math.max(userId, friendId);
    const existing = await pool.query(
      'SELECT id FROM public.friendships WHERE user_id = $1 AND friend_id = $2',
      [lo, hi]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE public.friendships SET ended_at = NULL, invitation_id = NULL WHERE id = $1',
        [existing.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO public.friendships (user_id, friend_id, created_at) VALUES ($1, $2, NOW())',
        [lo, hi]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;