const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please configure server/.env first.');
  process.exit(1);
}

async function seedDatabase() {
  const seedFile = path.join(__dirname, '..', 'seeds', 'database_seed.sql');
  
  if (!fs.existsSync(seedFile)) {
    console.error(`Seed file not found: ${seedFile}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🌱 Reading seed file...');
    const sql = fs.readFileSync(seedFile, 'utf8');
    
    console.log('🌱 Seeding database...');
    // Use client instead of pool for multi-statement SQL
    await client.query(sql);
    
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
