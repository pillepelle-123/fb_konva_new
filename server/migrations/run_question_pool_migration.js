const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running question pool migration...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'create_question_pool_tables.sql'),
      'utf8'
    );
    
    await client.query(sql);
    
    console.log('Question pool migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
