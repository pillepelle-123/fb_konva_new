const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please configure server/.env first.');
  process.exit(1);
}

async function checkConnection() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const versionResult = await pool.query('SELECT version() AS version');
    const nowResult = await pool.query('SELECT NOW() AS now');

    console.log('Database connection OK');
    console.log(`Server time: ${nowResult.rows[0].now.toISOString()}`);
    console.log(`PostgreSQL: ${versionResult.rows[0].version}`);
  } catch (error) {
    console.error('Database connection FAILED');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkConnection();
