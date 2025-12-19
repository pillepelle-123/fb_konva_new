const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  console.error('Please make sure your .env file contains DATABASE_URL.');
  process.exit(1);
}

// Parse schema from DATABASE_URL
let schema = 'public';
try {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    schema = url.searchParams.get('schema') || 'public';
  }
} catch (error) {
  console.warn('Warning: Could not parse DATABASE_URL for schema, using default "public"');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set search path from DATABASE_URL schema parameter
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`).catch(err => {
    console.warn('Warning: Could not set search_path:', err.message);
  });
});

/**
 * Migration: Convert qna_inline and qna2 textType to qna
 * 
 * This migration converts all elements with textType 'qna_inline' or 'qna2' to 'qna'.
 * The qna component (textbox-qna.tsx) now handles all QnA layouts.
 */
async function migrateQnaInlineToQna() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting migration: qna_inline and qna2 → qna');
    
    // Get all pages
    const pagesResult = await client.query('SELECT id, elements FROM pages WHERE elements IS NOT NULL');
    const pages = pagesResult.rows;
    
    let totalElementsUpdated = 0;
    let pagesUpdated = 0;
    
    for (const page of pages) {
      if (!page.elements || !Array.isArray(page.elements)) {
        continue;
      }
      
      let pageModified = false;
      const updatedElements = page.elements.map(element => {
        if (element.textType === 'qna_inline' || element.textType === 'qna2') {
          console.log(`  Converting element ${element.id} from ${element.textType} to qna`);
          totalElementsUpdated++;
          pageModified = true;
          return {
            ...element,
            textType: 'qna'
          };
        }
        return element;
      });
      
      if (pageModified) {
        await client.query(
          'UPDATE pages SET elements = $1 WHERE id = $2',
          [JSON.stringify(updatedElements), page.id]
        );
        pagesUpdated++;
        console.log(`  Updated page ${page.id} (${updatedElements.length - page.elements.length} elements changed)`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\nMigration completed successfully!`);
    console.log(`  - Total elements updated: ${totalElementsUpdated}`);
    console.log(`  - Total pages updated: ${pagesUpdated}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
migrateQnaInlineToQna()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

