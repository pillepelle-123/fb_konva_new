const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addUser() {
  try {
    const hashedPassword = await bcrypt.hash('djembe32', 10);
    
    await pool.query(
      'INSERT INTO public.users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Anni', 'anni@anni.de', hashedPassword, 'admin']
    );
    
    console.log('Successfully created user: Anni (anni@anni.de) with admin role');
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

addUser();