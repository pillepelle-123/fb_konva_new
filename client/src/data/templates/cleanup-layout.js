const fs = require('fs');
const path = require('path');

// Read layout.json
const layoutPath = path.join(__dirname, 'layout.json');
const data = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));

// Extract columns from ID (e.g., "qna-1col-..." or "qna-2col-...")
function extractColumns(id) {
  const match = id.match(/qna-(\d)col/);
  return match ? parseInt(match[1], 10) : 1;
}

// Clean up each template
const cleanedData = data.map(template => {
  const cleanedTemplate = {
    ...template,
    columns: extractColumns(template.id)
  };
  
  // Clean up textboxes
  cleanedTemplate.textboxes = template.textboxes.map(textbox => {
    const cleanedTextbox = {
      type: textbox.type,
      position: textbox.position,
      size: textbox.size
    };
    
    // Keep layoutVariant
    if (textbox.layoutVariant) {
      cleanedTextbox.layoutVariant = textbox.layoutVariant;
    }
    
    // Keep questionPosition and questionWidth (layout properties)
    if (textbox.questionPosition) {
      cleanedTextbox.questionPosition = textbox.questionPosition;
    }
    if (textbox.questionWidth !== undefined) {
      cleanedTextbox.questionWidth = textbox.questionWidth;
    }
    
    // Keep only format section from style (primary layout properties)
    if (textbox.style && textbox.style.format) {
      cleanedTextbox.style = {
        format: {
          textAlign: textbox.style.format.textAlign,
          paragraphSpacing: textbox.style.format.paragraphSpacing,
          padding: textbox.style.format.padding
        }
      };
    }
    
    // Keep only fontSize from questionSettings/answerSettings (layout property)
    if (textbox.questionSettings) {
      const questionFontSize = textbox.questionSettings.fontSize || 
                              (textbox.questionSettings.font && textbox.questionSettings.font.fontSize);
      if (questionFontSize) {
        cleanedTextbox.questionSettings = {
          fontSize: questionFontSize
        };
      }
    }
    
    if (textbox.answerSettings) {
      const answerFontSize = textbox.answerSettings.fontSize || 
                            (textbox.answerSettings.font && textbox.answerSettings.font.fontSize);
      if (answerFontSize) {
        cleanedTextbox.answerSettings = {
          fontSize: answerFontSize
        };
      }
    }
    
    return cleanedTextbox;
  });
  
  return cleanedTemplate;
});

// Write cleaned data back
fs.writeFileSync(layoutPath, JSON.stringify(cleanedData, null, 2), 'utf8');
console.log(`Cleaned ${cleanedData.length} templates in layout.json`);
console.log('Removed non-layout properties from style, questionSettings, and answerSettings');
console.log('Added columns property extracted from template IDs');


