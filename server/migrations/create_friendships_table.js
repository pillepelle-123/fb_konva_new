const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createFriendshipsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.friendships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        friend_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      );
    `);
    
    console.log('Friendships table created successfully');
  } catch (error) {
    console.error('Error creating friendships table:', error);
  } finally {
    await pool.end();
  }
}

createFriendshipsTable();