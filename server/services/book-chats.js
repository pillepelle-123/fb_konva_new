const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const url = new URL(databaseUrl);
const schema = url.searchParams.get('schema') || 'public';

const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

const mapConversation = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    bookId: row.book_id,
    isGroup: row.is_group,
    active: row.active,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

async function getBookConversation(bookId) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM public.conversations
      WHERE book_id = $1
      LIMIT 1
    `,
    [bookId],
  );

  return mapConversation(rows[0]);
}

async function addParticipants(conversationId, userIds = []) {
  if (!userIds.length) return;

  for (const userId of userIds) {
    await pool.query(
      `
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [conversationId, userId],
    );
  }
}

async function removeParticipants(conversationId, userIds = []) {
  if (!userIds.length) return;
  await pool.query(
    `
      DELETE FROM public.conversation_participants
      WHERE conversation_id = $1
        AND user_id = ANY($2::int[])
    `,
    [conversationId, userIds],
  );
}

async function createOrUpdateBookConversation({
  bookId,
  title,
  participantIds = [],
  metadata = {},
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const conversationResult = await client.query(
      `
        INSERT INTO public.conversations (title, book_id, is_group, active, metadata)
        VALUES ($1, $2, TRUE, TRUE, $3::jsonb)
        ON CONFLICT (book_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          metadata = COALESCE(public.conversations.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          active = TRUE
        RETURNING *
      `,
      [title, bookId, JSON.stringify(metadata || {})],
    );

    const conversation = conversationResult.rows[0];

    if (participantIds.length) {
      for (const userId of participantIds) {
        await client.query(
          `
            INSERT INTO public.conversation_participants (conversation_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (conversation_id, user_id) DO NOTHING
          `,
          [conversation.id, userId],
        );
      }
    }

    await client.query('COMMIT');
    return mapConversation(conversation);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function setBookConversationActive(bookId, active) {
  const { rows } = await pool.query(
    `
      UPDATE public.conversations
      SET active = $2
      WHERE book_id = $1
      RETURNING *
    `,
    [bookId, active],
  );

  return mapConversation(rows[0]);
}

async function getConversationParticipantIds(conversationId) {
  const { rows } = await pool.query(
    `
      SELECT user_id
      FROM public.conversation_participants
      WHERE conversation_id = $1
    `,
    [conversationId],
  );

  return rows.map((row) => row.user_id);
}

async function addUsersToBookConversation({
  bookId,
  bookTitle,
  userIds = [],
  metadata = {},
}) {
  if (!bookId || !userIds.length) {
    return null;
  }

  return createOrUpdateBookConversation({
    bookId,
    title: bookTitle || `Chat for Book ${bookId}`,
    participantIds: userIds,
    metadata,
  });
}

async function removeUsersFromBookConversation(bookId, userIds = []) {
  if (!bookId || !userIds.length) {
    return;
  }

  const conversation = await getBookConversation(bookId);
  if (!conversation) {
    return;
  }

  await removeParticipants(conversation.id, userIds);
}

async function syncGroupChatForBook(bookId) {
  if (!bookId) {
    return;
  }

  // Get all users who are friends/collaborators of the book
  const bookFriendsResult = await pool.query(
    `
      SELECT user_id
      FROM public.book_friends
      WHERE book_id = $1
    `,
    [bookId]
  );

  const bookUserIds = bookFriendsResult.rows.map(row => row.user_id);
  
  if (!bookUserIds.length) {
    return;
  }

  // Get or create the conversation for this book
  let conversation = await getBookConversation(bookId);
  
  if (!conversation) {
    // Get book title for conversation
    const bookResult = await pool.query(
      'SELECT name FROM public.books WHERE id = $1',
      [bookId]
    );
    
    const bookTitle = bookResult.rows[0]?.name || `Chat for Book ${bookId}`;
    
    // Create the conversation
    conversation = await createOrUpdateBookConversation({
      bookId,
      title: bookTitle,
      participantIds: bookUserIds,
      metadata: {},
    });
  } else {
    // Get current participants
    const currentParticipantIds = await getConversationParticipantIds(conversation.id);
    
    // Find users who are not yet participants
    const missingUserIds = bookUserIds.filter(
      userId => !currentParticipantIds.includes(userId)
    );
    
    // Add missing users
    if (missingUserIds.length > 0) {
      await addParticipants(conversation.id, missingUserIds);
    }
  }
}

module.exports = {
  getBookConversation,
  createOrUpdateBookConversation,
  addParticipants,
  removeParticipants,
  getConversationParticipantIds,
  setBookConversationActive,
  addUsersToBookConversation,
  removeUsersFromBookConversation,
  syncGroupChatForBook,
};

