const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function isBlocked(blockerId, blockedId) {
  const r = await pool.query(
    'SELECT 1 FROM public.user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
    [blockerId, blockedId]
  );
  return r.rows.length > 0;
}

// Send friend invitation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required' });
    }

    const receiverIdNum = typeof receiverId === 'number' ? receiverId : parseInt(receiverId, 10);
    if (isNaN(receiverIdNum) || receiverIdNum <= 0) {
      return res.status(400).json({ error: 'receiverId must be a valid positive number' });
    }

    if (senderId === receiverIdNum) {
      return res.status(400).json({ error: 'Cannot invite yourself' });
    }

    // Check if receiver exists
    const userCheck = await pool.query('SELECT id FROM public.users WHERE id = $1', [receiverIdNum]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if receiver blocks sender
    if (await isBlocked(receiverIdNum, senderId)) {
      return res.status(403).json({ error: 'Cannot send invitation' });
    }

    // Check if already friends (aktiv)
    const existingFriendship = await pool.query(
      'SELECT 1 FROM public.friendships WHERE user_id = LEAST($1, $2) AND friend_id = GREATEST($1, $2) AND ended_at IS NULL',
      [senderId, receiverIdNum]
    );
    if (existingFriendship.rows.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check for pending invitation
    const pending = await pool.query(
      'SELECT id FROM public.friend_invitations WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
      [senderId, receiverIdNum, 'pending']
    );
    if (pending.rows.length > 0) {
      return res.status(400).json({ error: 'Invitation already pending' });
    }

    // Check for recent rejection (24h)
    const lastRejected = await pool.query(
      'SELECT responded_at FROM public.friend_invitations WHERE sender_id = $1 AND receiver_id = $2 AND status = $3 ORDER BY responded_at DESC LIMIT 1',
      [senderId, receiverIdNum, 'rejected']
    );
    if (lastRejected.rows.length > 0) {
      const respondedAt = new Date(lastRejected.rows[0].responded_at).getTime();
      if (Date.now() - respondedAt < TWENTY_FOUR_HOURS_MS) {
        return res.status(400).json({ error: 'Please wait 24 hours after rejection before inviting again' });
      }
    }

    const result = await pool.query(
      'INSERT INTO public.friend_invitations (sender_id, receiver_id, status) VALUES ($1, $2, $3) ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = $3, created_at = CURRENT_TIMESTAMP, responded_at = NULL RETURNING *',
      [senderId, receiverIdNum, 'pending']
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverIdNum}`).emit('friend_invitation_received', {
        invitationId: result.rows[0].id,
        senderId,
        receiverId: receiverIdNum
      });
    }

    res.json({ success: true, invitationId: result.rows[0].id });
  } catch (error) {
    console.error('Error sending friend invitation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Respond to invitation (accept/reject)
router.post('/:id/respond', authenticateToken, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.id, 10);
    const { accepted } = req.body;
    const userId = req.user.id;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({ error: 'accepted (boolean) is required' });
    }

    const inv = await pool.query(
      'SELECT * FROM public.friend_invitations WHERE id = $1 AND receiver_id = $2 AND status = $3',
      [invitationId, userId, 'pending']
    );

    if (inv.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }

    const invitation = inv.rows[0];
    const senderId = invitation.sender_id;
    const receiverId = invitation.receiver_id;

    if (accepted) {
      const lo = Math.min(senderId, receiverId);
      const hi = Math.max(senderId, receiverId);
      const existing = await pool.query(
        'SELECT id FROM public.friendships WHERE user_id = $1 AND friend_id = $2',
        [lo, hi]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE public.friendships SET ended_at = NULL, invitation_id = $1 WHERE id = $2',
          [invitationId, existing.rows[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO public.friendships (user_id, friend_id, created_at, invitation_id) VALUES ($1, $2, NOW(), $3)',
          [lo, hi, invitationId]
        );
      }
    }

    await pool.query(
      'UPDATE public.friend_invitations SET status = $1, responded_at = CURRENT_TIMESTAMP WHERE id = $2',
      [accepted ? 'accepted' : 'rejected', invitationId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${senderId}`).emit('friend_invitation_responded', {
        invitationId,
        receiverId,
        accepted
      });
    }

    res.json({ success: true, accepted });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get received invitations (pending)
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fi.id, fi.sender_id, fi.status, fi.created_at, fi.responded_at, u.name as sender_name
       FROM public.friend_invitations fi
       JOIN public.users u ON fi.sender_id = u.id
       WHERE fi.receiver_id = $1 AND fi.status = 'pending'
       ORDER BY fi.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching received invitations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sent invitations (for 24h check)
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fi.id, fi.receiver_id, fi.status, fi.created_at, fi.responded_at, u.name as receiver_name
       FROM public.friend_invitations fi
       JOIN public.users u ON fi.receiver_id = u.id
       WHERE fi.sender_id = $1
       ORDER BY fi.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sent invitations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all received invitations (including responded, for 24h display)
router.get('/received/all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fi.id, fi.sender_id, fi.status, fi.created_at, fi.responded_at, u.name as sender_name
       FROM public.friend_invitations fi
       JOIN public.users u ON fi.sender_id = u.id
       WHERE fi.receiver_id = $1
       ORDER BY fi.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching received invitations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
