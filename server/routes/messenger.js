const express = require('express');
const { Pool } = require('pg');
const { authenticateToken: auth } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Get conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT c.id, c.updated_at,
        u.id as friend_id, u.name as friend_name,
        (SELECT content FROM public.messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM public.messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM public.messages m 
         LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1
         WHERE m.conversation_id = c.id AND m.sender_id != $1 AND mrs.id IS NULL) as unread_count
      FROM public.conversations c
      JOIN public.conversation_participants cp ON c.id = cp.conversation_id
      JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != $1
      JOIN public.users u ON cp2.user_id = u.id
      WHERE cp.user_id = $1
      ORDER BY c.updated_at DESC
    `;
    
    const result = await pool.query(query, [req.user.id]);
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
    // Check if conversation already exists
    const existingQuery = `
      SELECT c.id FROM public.conversations c
      JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
      JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
    `;
    
    const existing = await pool.query(existingQuery, [req.user.id, friendId]);
    
    if (existing.rows.length > 0) {
      return res.json({ conversationId: existing.rows[0].id });
    }
    
    // Create new conversation
    const conversationResult = await pool.query(
      'INSERT INTO public.conversations DEFAULT VALUES RETURNING id'
    );
    
    const conversationId = conversationResult.rows[0].id;
    
    // Add participants
    await pool.query(
      'INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [conversationId, req.user.id, friendId]
    );
    
    res.json({ conversationId });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const query = `
      SELECT m.id, m.content, m.created_at, m.sender_id,
        u.name as sender_name,
        CASE WHEN mrs.id IS NOT NULL THEN true ELSE false END as is_read
      FROM public.messages m
      JOIN public.users u ON m.sender_id = u.id
      LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $2
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `;
    
    const result = await pool.query(query, [req.params.id, req.user.id]);
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

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) as count FROM public.messages m
      JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
      LEFT JOIN public.message_read_status mrs ON m.id = mrs.message_id AND mrs.user_id = $1
      WHERE cp.user_id = $1 AND m.sender_id != $1 AND mrs.id IS NULL
    `;
    
    const result = await pool.query(query, [req.user.id]);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;