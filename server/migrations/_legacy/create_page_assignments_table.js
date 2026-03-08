const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createPageAssignmentsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_assignments (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        assigned_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, user_id, book_id)
      );
    `);
    
    // console.log('Page assignments table created successfully');
  } catch (error) {
    console.error('Error creating page assignments table:', error);
  } finally {
    await pool.end();
  }
}

createPageAssignmentsTable();