const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Block a user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { blockedId } = req.body;
    const blockerId = typeof req.user.id === 'number' ? req.user.id : parseInt(req.user.id, 10);

    if (!blockedId) {
      return res.status(400).json({ error: 'blockedId is required' });
    }

    const blockedIdNum = typeof blockedId === 'number' ? blockedId : parseInt(blockedId, 10);
    if (isNaN(blockedIdNum) || blockedIdNum <= 0 || isNaN(blockerId) || blockerId <= 0) {
      return res.status(400).json({ error: 'blockedId must be a valid positive number' });
    }

    if (blockerId === blockedIdNum) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if blocked user exists
    const userCheck = await pool.query('SELECT id FROM public.users WHERE id = $1', [blockedIdNum]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If blocking a friend, get friendship_id for the link (nur aktive Freundschaften)
    let friendshipId = null;
    const friendship = await pool.query(
      'SELECT id FROM public.friendships WHERE user_id = LEAST($1::int, $2::int) AND friend_id = GREATEST($1::int, $2::int) AND ended_at IS NULL LIMIT 1',
      [blockerId, blockedIdNum]
    );
    if (friendship.rows.length > 0) {
      friendshipId = friendship.rows[0].id;
    }

    await pool.query(
      'INSERT INTO public.user_blocks (blocker_id, blocked_id, friendship_id) VALUES ($1, $2, $3) ON CONFLICT (blocker_id, blocked_id) DO NOTHING',
      [blockerId, blockedIdNum, friendshipId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unblock a user
router.delete('/:blockedId', authenticateToken, async (req, res) => {
  try {
    const blockerId = typeof req.user.id === 'number' ? req.user.id : parseInt(req.user.id, 10);
    const blockedId = parseInt(req.params.blockedId, 10);

    if (isNaN(blockedId)) {
      return res.status(400).json({ error: 'Invalid blockedId' });
    }

    await pool.query(
      'DELETE FROM public.user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get list of blocked user IDs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT blocked_id FROM public.user_blocks WHERE blocker_id = $1',
      [req.user.id]
    );
    res.json(result.rows.map((r) => r.blocked_id));
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
