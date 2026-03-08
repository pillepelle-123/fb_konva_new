const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'fb_konva_new',
  user: 'postgres'
});

async function createUserQuestionAssignmentsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.user_question_assignments (
        id SERIAL PRIMARY KEY,
        book_id INTEGER REFERENCES public.books(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id, user_id, question_id)
      );
    `);
    
    // console.log('User question assignments table created successfully');
  } catch (error) {
    console.error('Error creating user question assignments table:', error);
  } finally {
    await pool.end();
  }
}

createUserQuestionAssignmentsTable();