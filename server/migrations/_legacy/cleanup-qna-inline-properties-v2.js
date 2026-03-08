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
 * Clean up qna_inline element - removes all redundant properties
 * - Removes font properties from top-level
 * - Removes nested font objects from questionSettings/answerSettings
 * - Simplifies border/background to only enabled property
 * - Converts ruledLinesEnabled object to boolean ruledLines
 * - Moves format.textAlign to align on top-level
 * - Removes answerSettings.ruledLinesColor
 */
function cleanupQnaInlineElementV2(element) {
  if (element.textType !== 'qna_inline') {
    return element;
  }
  
  const cleaned = { ...element };
  const questionSettings = { ...(element.questionSettings || {}) };
  const answerSettings = { ...(element.answerSettings || {}) };
  
  // 1. Remove font properties from top-level (should only be in questionSettings/answerSettings)
  const fontPropertiesToRemove = ['fontSize', 'fontColor', 'fontFamily', 'fontStyle', 'fontWeight', 'fill'];
  fontPropertiesToRemove.forEach(prop => {
    if (cleaned[prop] !== undefined) {
      delete cleaned[prop];
    }
  });
  if (cleaned.font) {
    delete cleaned.font;
  }
  
  // 2. Remove nested font objects from questionSettings/answerSettings
  if (questionSettings.font && typeof questionSettings.font === 'object') {
    const fontProperties = ['fontSize', 'fontFamily', 'fontColor', 'fontBold', 'fontItalic', 'fontOpacity'];
    fontProperties.forEach(prop => {
      const nestedValue = questionSettings.font[prop];
      if (nestedValue !== undefined && nestedValue !== null) {
        // Move to questionSettings directly if not already set
        if (questionSettings[prop] === undefined || questionSettings[prop] === null) {
          questionSettings[prop] = nestedValue;
        }
      }
    });
    delete questionSettings.font;
  }
  
  if (answerSettings.font && typeof answerSettings.font === 'object') {
    const fontProperties = ['fontSize', 'fontFamily', 'fontColor', 'fontBold', 'fontItalic', 'fontOpacity'];
    fontProperties.forEach(prop => {
      const nestedValue = answerSettings.font[prop];
      if (nestedValue !== undefined && nestedValue !== null) {
        // Move to answerSettings directly if not already set
        if (answerSettings[prop] === undefined || answerSettings[prop] === null) {
          answerSettings[prop] = nestedValue;
        }
      }
    });
    delete answerSettings.font;
  }
  
  // 3. Move borderEnabled/backgroundEnabled to top-level and remove from questionSettings/answerSettings
  // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
  const borderEnabled = cleaned.borderEnabled ?? 
                       questionSettings.border?.enabled ?? 
                       answerSettings.border?.enabled ?? 
                       questionSettings.borderEnabled ?? 
                       answerSettings.borderEnabled ?? 
                       false;
  
  const backgroundEnabled = cleaned.backgroundEnabled ?? 
                           questionSettings.background?.enabled ?? 
                           answerSettings.background?.enabled ?? 
                           questionSettings.backgroundEnabled ?? 
                           answerSettings.backgroundEnabled ?? 
                           false;
  
  // Set borderEnabled/backgroundEnabled on top-level only
  cleaned.borderEnabled = borderEnabled;
  cleaned.backgroundEnabled = backgroundEnabled;
  
  // Remove border/background objects and properties from questionSettings/answerSettings completely
  if (questionSettings.border !== undefined) {
    delete questionSettings.border;
  }
  if (questionSettings.background !== undefined) {
    delete questionSettings.background;
  }
  if (questionSettings.borderEnabled !== undefined) {
    delete questionSettings.borderEnabled;
  }
  if (questionSettings.backgroundEnabled !== undefined) {
    delete questionSettings.backgroundEnabled;
  }
  if (answerSettings.border !== undefined) {
    delete answerSettings.border;
  }
  if (answerSettings.background !== undefined) {
    delete answerSettings.background;
  }
  if (answerSettings.borderEnabled !== undefined) {
    delete answerSettings.borderEnabled;
  }
  if (answerSettings.backgroundEnabled !== undefined) {
    delete answerSettings.backgroundEnabled;
  }
  
  // 4. Convert ruledLinesEnabled object to boolean ruledLines
  if (cleaned.ruledLinesEnabled && typeof cleaned.ruledLinesEnabled === 'object') {
    // Extract enabled value from object
    const enabled = cleaned.ruledLinesEnabled.enabled !== undefined 
                   ? cleaned.ruledLinesEnabled.enabled 
                   : (cleaned.ruledLinesEnabled !== null && cleaned.ruledLinesEnabled !== false);
    cleaned.ruledLines = enabled === true;
    delete cleaned.ruledLinesEnabled;
  } else if (cleaned.ruledLinesEnabled !== undefined) {
    // Convert to boolean if it's a primitive
    cleaned.ruledLines = cleaned.ruledLinesEnabled === true;
    delete cleaned.ruledLinesEnabled;
  }
  
  // Ensure ruledLines is a boolean (not an object)
  if (cleaned.ruledLines && typeof cleaned.ruledLines === 'object') {
    const enabled = cleaned.ruledLines.enabled !== undefined 
                   ? cleaned.ruledLines.enabled 
                   : (cleaned.ruledLines !== null && cleaned.ruledLines !== false);
    cleaned.ruledLines = enabled === true;
  }
  
  // 5. Move format.textAlign to align on top-level
  if (cleaned.format && cleaned.format.textAlign) {
    if (!cleaned.align) {
      cleaned.align = cleaned.format.textAlign;
    }
    // Remove textAlign from format object
    delete cleaned.format.textAlign;
    // Remove format object if it's now empty
    if (Object.keys(cleaned.format).length === 0) {
      delete cleaned.format;
    }
  }
  
  // 6. Remove answerSettings.ruledLinesColor (should only be on top-level)
  if (answerSettings.ruledLinesColor !== undefined) {
    delete answerSettings.ruledLinesColor;
  }
  
  // Clean up questionSettings and answerSettings - remove empty objects
  const cleanedQuestionSettings = {};
  Object.keys(questionSettings).forEach(key => {
    if (questionSettings[key] !== undefined) {
      cleanedQuestionSettings[key] = questionSettings[key];
    }
  });
  
  const cleanedAnswerSettings = {};
  Object.keys(answerSettings).forEach(key => {
    if (answerSettings[key] !== undefined) {
      cleanedAnswerSettings[key] = answerSettings[key];
    }
  });
  
  cleaned.questionSettings = Object.keys(cleanedQuestionSettings).length > 0 ? cleanedQuestionSettings : undefined;
  cleaned.answerSettings = Object.keys(cleanedAnswerSettings).length > 0 ? cleanedAnswerSettings : undefined;
  
  return cleaned;
}

async function cleanupQnaInlinePropertiesV2() {
  try {
    console.log('Starting QnA Inline properties cleanup v2 migration...');
    
    // Test database connection first
    try {
      await pool.query('SELECT 1');
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection failed:', error.message);
      console.error('Please check your DATABASE_URL in the .env file.');
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
            const cleaned = cleanupQnaInlineElementV2(element);
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
  cleanupQnaInlinePropertiesV2()
    .then(() => {
      console.log('QnA Inline properties cleanup v2 migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('QnA Inline properties cleanup v2 migration failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupQnaInlinePropertiesV2, cleanupQnaInlineElementV2 };
