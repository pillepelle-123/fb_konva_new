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
 * Clean up a single qna_inline element by moving shared properties to top-level
 * and removing redundant properties from questionSettings/answerSettings
 */
function cleanupQnaInlineElement(element) {
  if (element.textType !== 'qna_inline') {
    return element;
  }
  
  const cleaned = { ...element };
  const questionSettings = element.questionSettings || {};
  const answerSettings = element.answerSettings || {};
  
  // List of shared properties to move to top-level
  const sharedProperties = [
    'borderWidth', 'borderColor', 'borderTheme', 'borderOpacity', 'borderEnabled',
    'backgroundColor', 'backgroundOpacity', 'backgroundEnabled',
    'cornerRadius', 'padding', 'paragraphSpacing', 'align',
    'layoutVariant', 'questionPosition', 'questionWidth',
    'ruledLinesColor', 'ruledLinesTheme', 'ruledLinesWidth', 'ruledLinesOpacity', 'ruledLines'
  ];
  
  // Move shared properties from questionSettings/answerSettings to top-level
  // Priority: existing top-level > questionSettings > answerSettings
  sharedProperties.forEach(prop => {
    if (cleaned[prop] === undefined || cleaned[prop] === null) {
      // Try to get from questionSettings first, then answerSettings
      let value = questionSettings[prop];
      if (value === undefined || value === null) {
        value = answerSettings[prop];
      }
      
      // Special handling for nested properties
      if (value === undefined || value === null) {
        if (prop === 'borderColor') {
          value = questionSettings.border?.borderColor || answerSettings.border?.borderColor;
        } else if (prop === 'borderEnabled') {
          value = questionSettings.border?.enabled ?? answerSettings.border?.enabled ?? questionSettings.borderEnabled ?? answerSettings.borderEnabled;
        } else if (prop === 'backgroundColor') {
          value = questionSettings.background?.backgroundColor || answerSettings.background?.backgroundColor;
        } else if (prop === 'backgroundEnabled') {
          value = questionSettings.background?.enabled ?? answerSettings.background?.enabled ?? questionSettings.backgroundEnabled ?? answerSettings.backgroundEnabled;
        } else if (prop === 'ruledLinesColor') {
          value = element.ruledLinesColor || answerSettings.ruledLines?.lineColor || answerSettings.ruledLinesColor;
        }
      }
      
      if (value !== undefined && value !== null) {
        cleaned[prop] = value;
      }
    }
  });
  
  // Clean questionSettings: keep only font properties and border.enabled/background.enabled
  const cleanedQuestionSettings = {};
  
  // Font properties
  if (questionSettings.fontSize !== undefined) cleanedQuestionSettings.fontSize = questionSettings.fontSize;
  if (questionSettings.fontFamily !== undefined) cleanedQuestionSettings.fontFamily = questionSettings.fontFamily;
  if (questionSettings.fontBold !== undefined) cleanedQuestionSettings.fontBold = questionSettings.fontBold;
  if (questionSettings.fontItalic !== undefined) cleanedQuestionSettings.fontItalic = questionSettings.fontItalic;
  if (questionSettings.fontColor !== undefined) cleanedQuestionSettings.fontColor = questionSettings.fontColor;
  if (questionSettings.fontOpacity !== undefined) cleanedQuestionSettings.fontOpacity = questionSettings.fontOpacity;
  if (questionSettings.font !== undefined) cleanedQuestionSettings.font = questionSettings.font;
  
  // Keep border.enabled and background.enabled for rendering check
  const borderEnabled = cleaned.borderEnabled ?? questionSettings.border?.enabled ?? questionSettings.borderEnabled ?? false;
  const backgroundEnabled = cleaned.backgroundEnabled ?? questionSettings.background?.enabled ?? questionSettings.backgroundEnabled ?? false;
  
  cleanedQuestionSettings.border = {
    ...(questionSettings.border || {}),
    enabled: borderEnabled
  };
  cleanedQuestionSettings.background = {
    ...(questionSettings.background || {}),
    enabled: backgroundEnabled
  };
  
  // Clean answerSettings: keep only font properties, border.enabled/background.enabled
  const cleanedAnswerSettings = {};
  
  // Font properties
  if (answerSettings.fontSize !== undefined) cleanedAnswerSettings.fontSize = answerSettings.fontSize;
  if (answerSettings.fontFamily !== undefined) cleanedAnswerSettings.fontFamily = answerSettings.fontFamily;
  if (answerSettings.fontBold !== undefined) cleanedAnswerSettings.fontBold = answerSettings.fontBold;
  if (answerSettings.fontItalic !== undefined) cleanedAnswerSettings.fontItalic = answerSettings.fontItalic;
  if (answerSettings.fontColor !== undefined) cleanedAnswerSettings.fontColor = answerSettings.fontColor;
  if (answerSettings.fontOpacity !== undefined) cleanedAnswerSettings.fontOpacity = answerSettings.fontOpacity;
  if (answerSettings.font !== undefined) cleanedAnswerSettings.font = answerSettings.font;
  
  // Keep border.enabled and background.enabled for rendering check
  cleanedAnswerSettings.border = {
    ...(answerSettings.border || {}),
    enabled: borderEnabled
  };
  cleanedAnswerSettings.background = {
    ...(answerSettings.background || {}),
    enabled: backgroundEnabled
  };
  
  // Ruled lines are now only on element level, not in answerSettings
  
  // Update cleaned element
  cleaned.questionSettings = Object.keys(cleanedQuestionSettings).length > 0 ? cleanedQuestionSettings : undefined;
  cleaned.answerSettings = Object.keys(cleanedAnswerSettings).length > 0 ? cleanedAnswerSettings : undefined;
  
  return cleaned;
}

async function cleanupQnaInlineProperties() {
  try {
    console.log('Starting QnA Inline properties cleanup migration...');
    
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
            const cleaned = cleanupQnaInlineElement(element);
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
          console.log(`Updated page ${page.id} (${updatedElementsCount} elements cleaned)`);
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
  cleanupQnaInlineProperties()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupQnaInlineProperties, cleanupQnaInlineElement };

