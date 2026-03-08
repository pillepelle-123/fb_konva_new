const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please configure server/.env first.');
  process.exit(1);
}

async function seedTest() {
  const seedFile = path.join(__dirname, '..', 'seeds', 'test_seed.sql');
  
  if (!fs.existsSync(seedFile)) {
    console.error(`Test seed file not found: ${seedFile}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🧪 Reading test seed file...');
    const sql = fs.readFileSync(seedFile, 'utf8');
    
    console.log('🧪 Seeding test data...');
    const result = await client.query(sql);
    
    console.log('✅ Test seed completed successfully');
    if (result.rows && result.rows.length > 0) {
      console.log('   Result:', result.rows[0]);
    }
  } catch (error) {
    console.error('❌ Test seeding failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTest();
