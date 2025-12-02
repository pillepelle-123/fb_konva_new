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
 * Clean up font properties for a single qna_inline element
 * Moves font properties from element.font*, element.questionSettings.font.*, element.answerSettings.font.*
 * to element.questionSettings.* and element.answerSettings.* directly
 */
function cleanupFontProperties(element) {
  if (element.textType !== 'qna_inline') {
    return element;
  }
  
  const cleaned = { ...element };
  const questionSettings = { ...(element.questionSettings || {}) };
  const answerSettings = { ...(element.answerSettings || {}) };
  
  // List of font properties to consolidate
  const fontProperties = ['fontSize', 'fontFamily', 'fontColor', 'fontBold', 'fontItalic', 'fontOpacity'];
  
  // Move font properties from element.font* to questionSettings and answerSettings (if not already set)
  if (element.font) {
    fontProperties.forEach(prop => {
      const value = element.font[prop];
      if (value !== undefined && value !== null) {
        // Move to questionSettings if not already set there
        if (questionSettings[prop] === undefined || questionSettings[prop] === null) {
          questionSettings[prop] = value;
        }
        // Move to answerSettings if not already set there
        if (answerSettings[prop] === undefined || answerSettings[prop] === null) {
          answerSettings[prop] = value;
        }
      }
    });
  }
  
  // Move font properties from element.fontSize, element.fontColor, etc. to questionSettings/answerSettings
  fontProperties.forEach(prop => {
    const topLevelValue = element[prop];
    if (topLevelValue !== undefined && topLevelValue !== null) {
      // Move to questionSettings if not already set there
      if (questionSettings[prop] === undefined || questionSettings[prop] === null) {
        questionSettings[prop] = topLevelValue;
      }
      // Move to answerSettings if not already set there
      if (answerSettings[prop] === undefined || answerSettings[prop] === null) {
        answerSettings[prop] = topLevelValue;
      }
    }
  });
  
  // Move font properties from questionSettings.font.* to questionSettings.* directly
  if (questionSettings.font && typeof questionSettings.font === 'object') {
    fontProperties.forEach(prop => {
      const nestedValue = questionSettings.font[prop];
      if (nestedValue !== undefined && nestedValue !== null) {
        // Use nested value if direct property doesn't exist or nested value has higher priority
        if (questionSettings[prop] === undefined || questionSettings[prop] === null) {
          questionSettings[prop] = nestedValue;
        }
      }
    });
    // Remove nested font object
    delete questionSettings.font;
  }
  
  // Move font properties from answerSettings.font.* to answerSettings.* directly
  if (answerSettings.font && typeof answerSettings.font === 'object') {
    fontProperties.forEach(prop => {
      const nestedValue = answerSettings.font[prop];
      if (nestedValue !== undefined && nestedValue !== null) {
        // Use nested value if direct property doesn't exist or nested value has higher priority
        if (answerSettings[prop] === undefined || answerSettings[prop] === null) {
          answerSettings[prop] = nestedValue;
        }
      }
    });
    // Remove nested font object
    delete answerSettings.font;
  }
  
  // Remove font properties from top-level element
  fontProperties.forEach(prop => {
    if (cleaned[prop] !== undefined) {
      delete cleaned[prop];
    }
  });
  
  // Remove element.font object
  if (cleaned.font) {
    delete cleaned.font;
  }
  
  // Keep border.enabled and background.enabled in questionSettings/answerSettings for rendering check
  // These should already be in the settings objects, but ensure they're preserved
  if (element.questionSettings?.border?.enabled !== undefined) {
    if (!questionSettings.border) questionSettings.border = {};
    questionSettings.border.enabled = element.questionSettings.border.enabled;
  }
  if (element.questionSettings?.background?.enabled !== undefined) {
    if (!questionSettings.background) questionSettings.background = {};
    questionSettings.background.enabled = element.questionSettings.background.enabled;
  }
  if (element.answerSettings?.border?.enabled !== undefined) {
    if (!answerSettings.border) answerSettings.border = {};
    answerSettings.border.enabled = element.answerSettings.border.enabled;
  }
  if (element.answerSettings?.background?.enabled !== undefined) {
    if (!answerSettings.background) answerSettings.background = {};
    answerSettings.background.enabled = element.answerSettings.background.enabled;
  }
  
  // Update cleaned element with consolidated settings
  cleaned.questionSettings = Object.keys(questionSettings).length > 0 ? questionSettings : undefined;
  cleaned.answerSettings = Object.keys(answerSettings).length > 0 ? answerSettings : undefined;
  
  return cleaned;
}

async function cleanupFontPropertiesQnaInline() {
  try {
    console.log('Starting Font Properties cleanup migration for QnA Inline elements...');
    
    // Test database connection first
    try {
      await pool.query('SELECT 1');
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection failed:', error.message);
      console.error('Please check your DATABASE_URL in the .env file.');
      console.error('The DATABASE_URL should be in the format: postgresql://username:password@host:port/database');
      throw error;
    }
    
    // Get all pages
    const pages = await pool.query('SELECT id, elements FROM public.pages WHERE elements IS NOT NULL');
    
    let updatedPagesCount = 0;
    let updatedElementsCount = 0;
    
    for (const page of pages.rows) {
      let elements = page.elements;
      let hasChanges = false;
      
      // Handle both array and object with elements property
      if (typeof elements === 'object' && elements !== null) {
        if (Array.isArray(elements)) {
          // Elements is already an array
        } else if (elements.elements && Array.isArray(elements.elements)) {
          // Elements is an object with an elements array
          elements = elements.elements;
        } else {
          // Skip if not a valid structure
          continue;
        }
        
        // Process each element
        const cleanedElements = elements.map(element => {
          if (element && element.textType === 'qna_inline') {
            const cleaned = cleanupFontProperties(element);
            // Check if element was actually changed
            if (JSON.stringify(cleaned) !== JSON.stringify(element)) {
              hasChanges = true;
              updatedElementsCount++;
              return cleaned;
            }
          }
          return element;
        });
        
        if (hasChanges) {
          // Update the page with cleaned elements
          // Handle both array and object structures
          let updatedPageData;
          if (Array.isArray(page.elements)) {
            updatedPageData = cleanedElements;
          } else {
            updatedPageData = {
              ...page.elements,
              elements: cleanedElements
            };
          }
          
          await pool.query(
            'UPDATE public.pages SET elements = $1 WHERE id = $2',
            [JSON.stringify(updatedPageData), page.id]
          );
          updatedPagesCount++;
          console.log(`Updated page ${page.id} (${updatedElementsCount} elements cleaned so far)`);
        }
      }
    }
    
    console.log(`Migration completed. Updated ${updatedPagesCount} pages with ${updatedElementsCount} cleaned elements.`);
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  cleanupFontPropertiesQnaInline()
    .then(() => {
      console.log('Font properties cleanup migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Font properties cleanup migration failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupFontPropertiesQnaInline, cleanupFontProperties };

