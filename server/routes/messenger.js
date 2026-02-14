const express = require('express');
const { Pool } = require('pg');
const { authenticateToken: auth } = require('../middleware/auth');
const {
  getBookConversation,
  createOrUpdateBookConversation,
  addUsersToBookConversation,
} = require('../services/book-chats');

const router = express.Router();
const url = new URL(process.env.DATABASE_URL);
const schema = url.searchParams.get('schema') || 'public';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

async function assertConversationParticipant(conversationId, userId) {
  const participant = await pool.query(
    'SELECT joined_at FROM public.conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );

  if (participant.rows.length === 0) {
    throw Object.assign(new Error('Not authorized for this conversation'), { statusCode: 403 });
  }

  return participant.rows[0];
}

// Get conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const archivedFilter = req.query.archived === 'true';
    const query = `
      WITH last_messages AS (
        SELECT DISTINCT ON (conversation_id)
          conversation_id,
          id,
          content,
          sender_id,
          created_at
        FROM public.messages
        ORDER BY conversation_id, created_at DESC
      )
      SELECT 
        c.id,
        c.title,
        c.book_id,
        c.is_group,
        c.active,
        b.name AS book_name,
        lm.content AS last_message,
        lm.created_at AS last_message_time,
        lm.sender_id AS last_message_sender_id,
        u_lm.name AS last_message_sender_name,
        COALESCE(cps.muted, FALSE) AS muted,
        COALESCE(cps.archived, FALSE) AS archived,
        (
          SELECT COUNT(*) FROM public.messages m 
          LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1
          WHERE m.conversation_id = c.id AND m.sender_id != $1 AND mrs.id IS NULL
        ) AS unread_count,
        (
          SELECT json_agg(json_build_object('id', u.id, 'name', u.name))
          FROM public.conversation_participants cp_all
          JOIN public.users u ON cp_all.user_id = u.id
          WHERE cp_all.conversation_id = c.id
        ) AS participants,
        (
          SELECT json_build_object('id', u.id, 'name', u.name)
          FROM public.conversation_participants cp_other
          JOIN public.users u ON cp_other.user_id = u.id
          WHERE cp_other.conversation_id = c.id AND cp_other.user_id != $1
          LIMIT 1
        ) AS direct_partner,
        (
          SELECT EXISTS(
            SELECT 1 FROM public.conversation_participants cp2
            JOIN public.user_blocks ub ON ub.blocker_id = cp2.user_id AND ub.blocked_id = $1
            WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
          )
        ) AS blocked_by_other
      FROM public.conversations c
      JOIN public.conversation_participants cp_self ON c.id = cp_self.conversation_id AND cp_self.user_id = $1
      LEFT JOIN public.conversation_participant_settings cps ON cps.conversation_id = c.id AND cps.user_id = $1
      LEFT JOIN public.books b ON c.book_id = b.id
      LEFT JOIN last_messages lm ON lm.conversation_id = c.id
      LEFT JOIN public.users u_lm ON u_lm.id = lm.sender_id
      WHERE ($2::boolean IS NULL OR COALESCE(cps.archived, FALSE) = $2)
      ORDER BY c.updated_at DESC
    `;
    
    const archivedParam = req.query.archived === undefined ? null : archivedFilter;
    const result = await pool.query(query, [req.user.id, archivedParam]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get or create conversation with a friend
router.post('/conversations', auth, async (req, res) => {
  const { friendId } = req.body;
  
  try {
    // Check friendship or book collaboration before allowing conversation
    const relationshipCheck = await pool.query(`
      SELECT 1 FROM public.friendships f
      WHERE f.user_id = LEAST($1, $2) AND f.friend_id = GREATEST($1, $2) AND f.ended_at IS NULL
      UNION
      SELECT 1 FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.owner_id = $1
      UNION
      SELECT 1 FROM public.books b
      INNER JOIN public.book_friends bf1 ON b.id = bf1.book_id AND bf1.user_id = $1
      INNER JOIN public.book_friends bf2 ON b.id = bf2.book_id AND bf2.user_id = $2
      WHERE bf1.book_id = bf2.book_id
      LIMIT 1
    `, [req.user.id, friendId]);

    if (relationshipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized - must be friends or book collaborators' });
    }

    // Check neither blocks the other
    const blockCheck = await pool.query(
      'SELECT 1 FROM public.user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [req.user.id, friendId]
    );
    if (blockCheck.rows.length > 0) {
      return res.status(403).json({ error: 'Not authorized - cannot message blocked users' });
    }

    // Check if direct (non-book) conversation already exists between these two users
    const existingQuery = `
      SELECT c.id FROM public.conversations c
      JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
      JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
      WHERE c.book_id IS NULL AND c.is_group = FALSE
    `;
    
    const existing = await pool.query(existingQuery, [req.user.id, friendId]);
    
    if (existing.rows.length > 0) {
      return res.json({ conversationId: existing.rows[0].id });
    }

    // Check for pending conversation invitation
    const pendingInv = await pool.query(
      `SELECT ci.id, ci.conversation_id FROM public.conversation_invitations ci
       WHERE ci.inviter_id = $1 AND ci.invitee_id = $2 AND ci.status = 'pending'`,
      [req.user.id, friendId]
    );
    if (pendingInv.rows.length > 0) {
      return res.json({ conversationId: pendingInv.rows[0].conversation_id, pendingInvitation: true });
    }

    const pendingFromThem = await pool.query(
      `SELECT ci.id, ci.conversation_id FROM public.conversation_invitations ci
       WHERE ci.inviter_id = $2 AND ci.invitee_id = $1 AND ci.status = 'pending'`,
      [req.user.id, friendId]
    );
    if (pendingFromThem.rows.length > 0) {
      return res.json({ conversationId: pendingFromThem.rows[0].conversation_id, pendingInvitation: true });
    }
    
    // Create new conversation with only inviter as participant
    const conversationResult = await pool.query(
      'INSERT INTO public.conversations DEFAULT VALUES RETURNING id'
    );
    
    const conversationId = conversationResult.rows[0].id;
    
    await pool.query(
      'INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES ($1, $2)',
      [conversationId, req.user.id]
    );

    const invResult = await pool.query(
      'INSERT INTO public.conversation_invitations (conversation_id, inviter_id, invitee_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [conversationId, req.user.id, friendId, 'pending']
    );
    const invitationId = invResult.rows[0].id;

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${friendId}`).emit('conversation_invitation_received', {
        invitationId,
        conversationId,
        inviterId: req.user.id,
        inviteeId: friendId
      });
    }
    
    res.json({ conversationId, requiresAcceptance: true });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    let participant;
    try {
      participant = await assertConversationParticipant(req.params.id, req.user.id);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Failed to fetch messages' });
    }

    const query = `
      SELECT m.id, m.content, m.created_at, m.sender_id,
        u.name as sender_name,
        CASE WHEN mrs.id IS NOT NULL THEN true ELSE false END as is_read
      FROM public.messages m
      JOIN public.users u ON m.sender_id = u.id
      LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $2
      WHERE m.conversation_id = $1
        AND m.created_at >= $3
      ORDER BY m.created_at ASC
    `;
    
    const result = await pool.query(query, [req.params.id, req.user.id, participant.joined_at]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:id/messages', auth, async (req, res) => {
  const { content } = req.body;
  
  try {
    try {
      await assertConversationParticipant(req.params.id, req.user.id);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Failed to send message' });
    }

    const messageResult = await pool.query(
      'INSERT INTO public.messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, content]
    );
    
    const message = messageResult.rows[0];
    
    // Mark as read for sender
    await pool.query(
      'INSERT INTO public.message_read_status (message_id, user_id) VALUES ($1, $2)',
      [message.id, req.user.id]
    );
    
    // Get sender name and emit to conversation participants
    const senderResult = await pool.query('SELECT name FROM public.users WHERE id = $1', [req.user.id]);
    const messageWithSender = {
      ...message,
      sender_name: senderResult.rows[0].name
    };
    
    // Emit to conversation room
    const io = req.app.get('io');
    io.to(`conversation_${req.params.id}`).emit('new_message', messageWithSender);
    
    // Get conversation participants for notifications
    const participantsResult = await pool.query(
      'SELECT user_id FROM public.conversation_participants WHERE conversation_id = $1 AND user_id != $2',
      [req.params.id, req.user.id]
    );
    
    // Emit notification to other participants
    participantsResult.rows.forEach(participant => {
      io.to(`user_${participant.user_id}`).emit('message_notification', {
        conversationId: req.params.id,
        senderName: senderResult.rows[0].name,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
      });
    });
    
    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.post('/conversations/:id/read', auth, async (req, res) => {
  try {
    try {
      await assertConversationParticipant(req.params.id, req.user.id);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Failed to mark as read' });
    }

    const query = `
      INSERT INTO public.message_read_status (message_id, user_id)
      SELECT m.id, $2 FROM public.messages m
      LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $2
      WHERE m.conversation_id = $1 AND m.sender_id != $2 AND mrs.id IS NULL
    `;
    
    await pool.query(query, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Mark messages as unread
router.post('/conversations/:id/unread', auth, async (req, res) => {
  try {
    try {
      await assertConversationParticipant(req.params.id, req.user.id);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Failed to mark as unread' });
    }

    const query = `
      DELETE FROM public.message_read_status mrs
      USING public.messages m
      WHERE mrs.message_id = m.id
        AND m.conversation_id = $1
        AND mrs.user_id = $2
        AND m.sender_id != $2
    `;
    await pool.query(query, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as unread:', error);
    res.status(500).json({ error: 'Failed to mark as unread' });
  }
});

// Get conversation invitations (received)
router.get('/conversation-invitations', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.conversation_id, ci.inviter_id, ci.status, ci.created_at, ci.responded_at, u.name as inviter_name
       FROM public.conversation_invitations ci
       JOIN public.users u ON ci.inviter_id = u.id
       WHERE ci.invitee_id = $1
       ORDER BY ci.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversation invitations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update conversation participant settings (muted, archived)
router.patch('/conversations/:id/settings', auth, async (req, res) => {
  try {
    await assertConversationParticipant(req.params.id, req.user.id);
    const { muted, archived } = req.body;
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (typeof muted !== 'boolean' && typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'muted or archived (boolean) required' });
    }

    const existing = await pool.query(
      'SELECT muted, archived FROM public.conversation_participant_settings WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    const currentMuted = existing.rows[0]?.muted ?? false;
    const currentArchived = existing.rows[0]?.archived ?? false;
    const newMuted = typeof muted === 'boolean' ? muted : currentMuted;
    const newArchived = typeof archived === 'boolean' ? archived : currentArchived;

    await pool.query(
      `INSERT INTO public.conversation_participant_settings (conversation_id, user_id, muted, archived)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET muted = $3, archived = $4`,
      [conversationId, userId, newMuted, newArchived]
    );

    res.json({ success: true });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Server error' });
  }
});

// Block other participant in direct chat
router.post('/conversations/:id/block', auth, async (req, res) => {
  try {
    await assertConversationParticipant(req.params.id, req.user.id);
    const conversationId = parseInt(req.params.id, 10);
    const blockerId = req.user.id;

    const conv = await pool.query(
      `SELECT c.id, c.book_id, c.is_group,
        (SELECT user_id FROM public.conversation_participants WHERE conversation_id = c.id AND user_id != $2 LIMIT 1) as other_user_id
       FROM public.conversations c
       WHERE c.id = $1`,
      [conversationId, blockerId]
    );

    if (conv.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const row = conv.rows[0];
    if (row.is_group || row.book_id) {
      return res.status(400).json({ error: 'Can only block in direct chats' });
    }

    const blockedId = row.other_user_id;
    if (!blockedId) {
      return res.status(400).json({ error: 'No other participant to block' });
    }

    const blockerIdNum = typeof blockerId === 'number' ? blockerId : parseInt(blockerId, 10);
    const blockedIdNum = typeof blockedId === 'number' ? blockedId : parseInt(blockedId, 10);
    const friendship = await pool.query(
      'SELECT id FROM public.friendships WHERE user_id = LEAST($1::int, $2::int) AND friend_id = GREATEST($1::int, $2::int) AND ended_at IS NULL LIMIT 1',
      [blockerIdNum, blockedIdNum]
    );
    const friendshipId = friendship.rows[0]?.id || null;

    await pool.query(
      'INSERT INTO public.user_blocks (blocker_id, blocked_id, friendship_id) VALUES ($1, $2, $3) ON CONFLICT (blocker_id, blocked_id) DO NOTHING',
      [blockerIdNum, blockedIdNum, friendshipId]
    );

    await pool.query(
      `INSERT INTO public.conversation_participant_settings (conversation_id, user_id, muted, archived)
       VALUES ($1, $2, FALSE, TRUE)
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET archived = TRUE`,
      [conversationId, blockerIdNum]
    );

    res.json({ success: true });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Server error' });
  }
});

// Respond to conversation invitation
router.post('/conversation-invitations/:id/respond', auth, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.id, 10);
    const { accepted } = req.body;
    const userId = req.user.id;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({ error: 'accepted (boolean) is required' });
    }

    const inv = await pool.query(
      'SELECT * FROM public.conversation_invitations WHERE id = $1 AND invitee_id = $2 AND status = $3',
      [invitationId, userId, 'pending']
    );

    if (inv.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }

    const invitation = inv.rows[0];
    const conversationId = invitation.conversation_id;
    const inviterId = invitation.inviter_id;

    if (accepted) {
      await pool.query(
        'INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT (conversation_id, user_id) DO NOTHING',
        [conversationId, userId]
      );
    }

    await pool.query(
      'UPDATE public.conversation_invitations SET status = $1, responded_at = CURRENT_TIMESTAMP WHERE id = $2',
      [accepted ? 'accepted' : 'rejected', invitationId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${inviterId}`).emit('conversation_invitation_responded', {
        invitationId,
        inviteeId: userId,
        accepted
      });
    }

    res.json({ success: true, accepted, conversationId: accepted ? conversationId : undefined });
  } catch (error) {
    console.error('Error responding to conversation invitation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread message count (excludes muted/archived conversations)
router.get('/unread-count', auth, async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) as count FROM public.messages m
      JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = $1
      LEFT JOIN public.conversation_participant_settings cps ON cps.conversation_id = m.conversation_id AND cps.user_id = $1
      LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1
      WHERE m.sender_id != $1 AND mrs.id IS NULL
        AND COALESCE(cps.muted, FALSE) = FALSE
        AND COALESCE(cps.archived, FALSE) = FALSE
    `;
    
    const result = await pool.query(query, [req.user.id]);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Add users to an existing conversation
router.post('/conversations/:id/users', auth, async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds array is required' });
  }

  try {
    await assertConversationParticipant(req.params.id, req.user.id);

    const added = [];
    for (const userId of userIds) {
      if (!Number.isInteger(userId)) continue;

      await pool.query(
        `
          INSERT INTO public.conversation_participants (conversation_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [req.params.id, userId]
      );
      added.push(userId);
    }

    res.json({ success: true, added });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('Error adding users to conversation:', error);
    res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Failed to add users' });
  }
});

// Remove user from conversation
router.delete('/conversations/:id/users/:userId', auth, async (req, res) => {
  try {
    await assertConversationParticipant(req.params.id, req.user.id);

    await pool.query(
      `
        DELETE FROM public.conversation_participants
        WHERE conversation_id = $1 AND user_id = $2
      `,
      [req.params.id, req.params.userId]
    );

    res.json({ success: true });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('Error removing user from conversation:', error);
    res.status(status).json({ error: status === 403 ? 'Not authorized' : 'Failed to remove user' });
  }
});

// Get or create book conversation metadata for the requesting user
router.get('/books/:bookId/conversation', auth, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    if (Number.isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book id' });
    }

    const bookResult = await pool.query(
      `
        SELECT b.id, b.name, b.owner_id,
          CASE
            WHEN b.owner_id = $2 THEN TRUE
            WHEN EXISTS (
              SELECT 1 FROM public.book_friends bf
              WHERE bf.book_id = b.id AND bf.user_id = $2
            ) THEN TRUE
            ELSE FALSE
          END AS has_access
        FROM public.books b
        WHERE b.id = $1
      `,
      [bookId, req.user.id]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult.rows[0];
    if (!book.has_access) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let conversation = await getBookConversation(bookId);

    if (!conversation) {
      const participantsResult = await pool.query(
        'SELECT user_id FROM public.book_friends WHERE book_id = $1',
        [bookId]
      );
      const participantIds = [
        book.owner_id,
        ...participantsResult.rows.map((row) => row.user_id),
      ].filter(Boolean);

      conversation = await createOrUpdateBookConversation({
        bookId,
        title: book.name,
        participantIds,
        metadata: { createdVia: 'book_conversation_lookup' },
      });
    } else {
      await addUsersToBookConversation({
        bookId,
        bookTitle: conversation.title || book.name,
        userIds: [req.user.id],
      });
      conversation = await getBookConversation(bookId);
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Error fetching book conversation:', error);
    res.status(500).json({ error: 'Failed to fetch book conversation' });
  }
});

module.exports = router;