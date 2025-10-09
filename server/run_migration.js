const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log('Running migration: Rename role to book_role in book_friends table...');
    
    // First check if table exists and what schema it's in
    const tableCheck = await pool.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename = 'book_friends'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.error('Table book_friends not found');
      return;
    }
    
    const schema = tableCheck.rows[0].schemaname;
    console.log(`Found table in schema: ${schema}`);
    
    await pool.query(`ALTER TABLE ${schema}.book_friends RENAME COLUMN role TO book_role;`);
    
    console.log('Migration completed successfully!');
    console.log('The book_friends.role column has been renamed to book_friends.book_role');
    
  } catch (error) {
    if (error.message.includes('column "role" does not exist')) {
      console.log('Migration already applied - book_role column already exists');
    } else {
      console.error('Migration failed:', error.message);
    }
  } finally {
    await pool.end();
  }
}

runMigration();