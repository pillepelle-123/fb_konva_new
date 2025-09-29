const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'editor',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create books table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.books (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        page_size VARCHAR(50) NOT NULL,
        orientation VARCHAR(50) NOT NULL,
        archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create book_collaborators table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.book_collaborators (
        book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        PRIMARY KEY (book_id, user_id)
      )
    `);

    // Create pages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.pages (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        elements JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id, page_number)
      )
    `);

    // Create questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.questions (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES public.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create answers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
        page_id INTEGER NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
        answered_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        answer_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(question_id, page_id, answered_by)
      )
    `);

    // Create photos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.photos (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
        uploaded_by INTEGER NOT NULL REFERENCES public.users(id),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists
    const adminExists = await pool.query('SELECT id FROM public.users WHERE email = $1', ['admin@example.com']);
    
    if (adminExists.rows.length === 0) {
      // Create admin user (password: admin123)
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO public.users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Admin User', 'admin@example.com', hashedPassword, 'admin']
      );
      console.log('Admin user created: admin@example.com / admin123');

      // Create sample books for testing
      const bookResult = await pool.query(
        'INSERT INTO public.books (name, owner_id, page_size, orientation) VALUES ($1, $2, $3, $4) RETURNING id',
        ['My First Book', 1, 'A4', 'portrait']
      );
      
      await pool.query(
        'INSERT INTO public.books (name, owner_id, page_size, orientation) VALUES ($1, $2, $3, $4)',
        ['Photo Album', 1, 'Square', 'portrait']
      );

      // Add a collaborator
      await pool.query(
        'INSERT INTO public.book_collaborators (book_id, user_id, role) VALUES ($1, $2, $3)',
        [bookResult.rows[0].id, 1, 'admin']
      );

      console.log('Sample data created');
    }

    console.log('Database schema created successfully');
    console.log('Tables created: users, books, book_collaborators, pages, questions, answers, photos');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initializeDatabase();