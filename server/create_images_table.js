const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createImagesTable() {
  try {
    await pool.query('SET search_path TO public');
    
    const result = await pool.query(`
      CREATE TABLE images (
        id SERIAL PRIMARY KEY,
        book_id INTEGER,
        uploaded_by INTEGER,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Images table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating images table:', error);
    process.exit(1);
  }
}

createImagesTable();