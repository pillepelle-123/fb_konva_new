const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const dummyUsers = [
  'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown',
  'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Ivy Chen', 'Jack Anderson',
  'Kate Thompson', 'Liam Garcia', 'Maya Patel', 'Noah Martinez', 'Olivia White',
  'Paul Rodriguez', 'Quinn Jackson', 'Ruby Kim', 'Sam Cooper', 'Tina Lopez'
];

async function createDummyUsers() {
  try {
    const hashedPassword = await bcrypt.hash('djembe32', 10);
    
    for (let i = 0; i < dummyUsers.length; i++) {
      const name = dummyUsers[i];
      const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
      
      await pool.query(
        'INSERT INTO public.users (name, email, password_hash) VALUES ($1, $2, $3)',
        [name, email, hashedPassword]
      );
      
      // console.log(`Created user: ${name} (${email})`);
    }
    
    // console.log('Successfully created 20 dummy users with password "djembe32"');
    process.exit(0);
  } catch (error) {
    console.error('Error creating dummy users:', error);
    process.exit(1);
  }
}

createDummyUsers();
