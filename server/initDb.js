const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fb_konva'
});

async function initializeDatabase() {
  try {
    const sqlFile = path.join(__dirname, 'database.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await pool.query(sql);
    console.log('Database initialized successfully');
  } catch (error) {
    console.log('Database initialization failed');
  } finally {
    await pool.end();
  }
}

initializeDatabase();