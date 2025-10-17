const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // console.log('Connecting to database...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrate_messenger.sql'), 
      'utf8'
    );

    // console.log('Running migration...');
    await pool.query(migrationSQL);
    
    // console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();