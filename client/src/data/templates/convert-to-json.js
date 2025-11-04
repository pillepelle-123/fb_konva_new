const fs = require('fs');
const path = require('path');

// Read the TypeScript file
const tsContent = fs.readFileSync(path.join(__dirname, 'page-templates.ts'), 'utf8');

// Extract the array content (everything between export const pageTemplates: PageTemplate[] = [ and ];)
const arrayStart = tsContent.indexOf('export const pageTemplates: PageTemplate[] = [');
const arrayContent = tsContent.substring(arrayStart + 'export const pageTemplates: PageTemplate[] = '.length);

// Remove the final ]; and comments
let jsonContent = arrayContent.trim();
// Remove trailing ];
if (jsonContent.endsWith('];')) {
  jsonContent = jsonContent.substring(0, jsonContent.length - 2);
}

// Parse as JavaScript to convert to JSON
// We need to evaluate it, but we'll need to handle the comments
// Better approach: remove single-line comments and evaluate
const cleaned = jsonContent
  .replace(/\/\/.*$/gm, '') // Remove single-line comments
  .trim();

// Evaluate as JavaScript and stringify as JSON
try {
  const array = eval(`(${cleaned})`);
  const json = JSON.stringify(array, null, 2);
  fs.writeFileSync(path.join(__dirname, 'layout.json'), json, 'utf8');
  console.log('Successfully converted to layout.json');
} catch (error) {
  console.error('Error converting:', error);
  process.exit(1);
}

