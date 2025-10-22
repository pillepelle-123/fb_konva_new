const { Pool } = require('pg');
require('dotenv').config();

// Parse schema from DATABASE_URL
let schema = 'public';
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  schema = url.searchParams.get('schema') || 'public';
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set search path from DATABASE_URL schema parameter
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

async function migrateQnaElements() {
  try {
    console.log('Starting QnA element migration...');
    
    // Get all pages
    const pages = await pool.query('SELECT id, elements FROM public.pages');
    
    let updatedCount = 0;
    
    for (const page of pages.rows) {
      let pageData = page.elements;
      let hasChanges = false;
      
      if (pageData && pageData.elements) {
        // Update elements array
        pageData.elements = pageData.elements.map(element => {
          if (element.type === 'qna_textbox') {
            console.log(`Converting qna_textbox element ${element.id} to text with textType: qna`);
            hasChanges = true;
            return {
              ...element,
              type: 'text',
              textType: 'qna'
            };
          }
          return element;
        });
        
        if (hasChanges) {
          // Update the page with modified elements
          await pool.query(
            'UPDATE public.pages SET elements = $1 WHERE id = $2',
            [JSON.stringify(pageData), page.id]
          );
          updatedCount++;
          console.log(`Updated page ${page.id}`);
        }
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} pages.`);
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

migrateQnaElements();