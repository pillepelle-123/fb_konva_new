const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fb_konva'
});

async function runUuidMigration() {
  try {
    const sqlFile = path.join(__dirname, 'migrations', 'migrate_to_uuid_questions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running UUID migration...');
    await pool.query(sql);
    console.log('UUID migration completed successfully');
  } catch (error) {
    console.error('UUID migration failed:', error);
  } finally {
    await pool.end();
  }
}

runUuidMigration();