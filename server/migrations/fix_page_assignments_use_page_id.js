const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // console.log('Starting migration: fix page_assignments to use proper page_id foreign key...');
    
    // Check if migration already completed
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'page_assignments' 
      AND column_name = 'page_id'
      AND data_type = 'integer'
    `);
    
    const checkConstraint = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'page_assignments' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%page_id%'
    `);
    
    if (checkColumn.rows.length > 0 && checkConstraint.rows.length > 0) {
      // console.log('Migration already completed.');
      return;
    }
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Create new table with proper structure
    await pool.query(`
      CREATE TABLE page_assignments_new (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, user_id)
      )
    `);
    
    // Migrate existing data by converting page_number + book_id to page_id
    await pool.query(`
      INSERT INTO page_assignments_new (page_id, user_id, assigned_by, created_at)
      SELECT p.id, pa.user_id, pa.assigned_by, pa.created_at
      FROM page_assignments pa
      JOIN pages p ON p.page_number = pa.page_number AND p.book_id = pa.book_id
    `);
    
    // Drop old table and rename new one
    await pool.query('DROP TABLE page_assignments');
    await pool.query('ALTER TABLE page_assignments_new RENAME TO page_assignments');
    
    // Create indexes
    await pool.query('CREATE INDEX idx_page_assignments_page_id ON page_assignments(page_id)');
    await pool.query('CREATE INDEX idx_page_assignments_user_id ON page_assignments(user_id)');
    
    await pool.query('COMMIT');
    // console.log('Migration completed successfully: page_assignments now uses proper page_id foreign key');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = runMigration;