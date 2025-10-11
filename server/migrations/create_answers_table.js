const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAnswersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.answers (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          question_id INTEGER NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
          answer_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_answers_user_id ON public.answers(user_id);
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION public.update_answers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_answers_updated_at ON public.answers;
      CREATE TRIGGER update_answers_updated_at
          BEFORE UPDATE ON public.answers
          FOR EACH ROW
          EXECUTE FUNCTION public.update_answers_updated_at();
    `);

    console.log('Answers table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating answers table:', error);
    process.exit(1);
  }
}

createAnswersTable();