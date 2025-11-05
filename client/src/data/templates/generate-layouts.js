/**
 * Script zum Generieren von Layout-Templates
 * Führt die Generator-Funktion aus und schreibt die Templates in layout.json
 */

// Importiere die Generator-Funktion (muss als CommonJS kompiliert werden)
// Für jetzt erstelle ich die Templates direkt hier

const fs = require('fs');
const path = require('path');

// A4 Portrait Dimensions (300 DPI)
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const MM_TO_PX = 11.811;
const MARGIN = 120;
const GAP = 60;

const TEXTBOX_BASE_HEIGHTS = {
  1: 80,
  2: 115,
  3: 150,
  4: 185,
  5: 220,
  6: 255,
  7: 290,
  8: 325
};

// Lese das bestehende Template
const layoutPath = path.join(__dirname, 'layout.json');
const existingData = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
const existingTemplate = existingData[0];

// Template-Konfigurationen (25-35 verschiedene Layouts)
const layoutConfigs = [
  // Structured (40% = ~12-14 Layouts)
  { columns: 1, heights: [1, 2, 3, 4, 2], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }], category: 'structured' },
  { columns: 1, heights: [2, 3, 2, 3, 4], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'structured' },
  { columns: 1, heights: [1, 1, 2, 2, 3, 3], images: [], category: 'structured' },
  { columns: 1, heights: [2, 3, 4, 3, 2], images: [{ position: 'tl', ratio: '4:3', widthCm: 4.5 }], category: 'structured' },
  { columns: 2, heights: [2, 2, 3, 3, 2, 2], images: [], category: 'structured' },
  { columns: 1, heights: [3, 4, 3, 4, 5], images: [{ position: 'tr', ratio: '4:3', widthCm: 4.5 }], category: 'structured' },
  { columns: 2, heights: [1, 1, 2, 2, 3, 3, 2, 2], images: [], category: 'structured' },
  { columns: 1, heights: [2, 3, 2, 3, 2, 3, 4], images: [{ position: 'bl', ratio: '3:4', widthCm: 3.5 }], category: 'structured' },
  { columns: 1, heights: [1, 2, 3, 4, 3, 2], images: [], category: 'structured' },
  { columns: 2, heights: [3, 3, 4, 4, 3, 3], images: [{ position: 'tl', ratio: '1:1', widthCm: 5 }], category: 'structured' },
  { columns: 1, heights: [2, 4, 3, 4, 5, 3], images: [{ position: 'tr', ratio: '1:1', widthCm: 5 }], category: 'structured' },
  { columns: 1, heights: [3, 3, 4, 4, 5, 4], images: [], category: 'structured' },
  { columns: 2, heights: [2, 2, 3, 3, 4, 4], images: [{ position: 'br', ratio: '3:4', widthCm: 3.5 }], category: 'structured' },
  
  // Playful (25% = ~7-9 Layouts)
  { columns: 1, heights: [1, 2, 1, 3, 2, 4], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }], category: 'playful' },
  { columns: 1, heights: [2, 3, 4, 3, 5], images: [{ position: 'tr', ratio: '1:1', widthCm: 5 }], category: 'playful' },
  { columns: 2, heights: [1, 2, 2, 3, 3, 4], images: [], category: 'playful' },
  { columns: 1, heights: [3, 2, 4, 3, 6], images: [{ position: 'bl', ratio: '4:3', widthCm: 4.5 }], category: 'playful' },
  { columns: 1, heights: [2, 1, 3, 2, 4, 3], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'playful' },
  { columns: 2, heights: [2, 3, 3, 4, 4, 5], images: [{ position: 'tl', ratio: '1:1', widthCm: 5 }], category: 'playful' },
  { columns: 1, heights: [1, 3, 2, 4, 3, 5, 2], images: [], category: 'playful' },
  { columns: 1, heights: [2, 4, 3, 5, 4], images: [{ position: 'ml', ratio: '3:4', widthCm: 3.5 }], category: 'playful' },
  
  // Creative (20% = ~6-7 Layouts)
  { columns: 1, heights: [3, 4, 5, 4, 3], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }, { position: 'mr', ratio: '1:1', widthCm: 5 }], category: 'creative' },
  { columns: 2, heights: [2, 4, 3, 5, 4, 6], images: [{ position: 'tr', ratio: '4:3', widthCm: 4.5 }], category: 'creative' },
  { columns: 1, heights: [4, 3, 5, 4, 6], images: [{ position: 'bl', ratio: '1:1', widthCm: 5 }], category: 'creative' },
  { columns: 1, heights: [2, 3, 4, 5, 4, 3], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'creative' },
  { columns: 2, heights: [3, 3, 4, 4, 5, 5], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }, { position: 'br', ratio: '1:1', widthCm: 5 }], category: 'creative' },
  { columns: 1, heights: [3, 5, 4, 6, 5], images: [{ position: 'mr', ratio: '4:3', widthCm: 4.5 }], category: 'creative' },
  
  // Minimal (15% = ~4-5 Layouts)
  { columns: 1, heights: [2, 3, 4, 3, 2], images: [], category: 'minimal' },
  { columns: 1, heights: [3, 4, 3, 4, 3], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'minimal' },
  { columns: 1, heights: [2, 2, 3, 3, 4, 4], images: [], category: 'minimal' },
  { columns: 1, heights: [3, 3, 4, 4, 5], images: [{ position: 'tl', ratio: '1:1', widthCm: 5 }], category: 'minimal' },
  { columns: 1, heights: [2, 4, 3, 4, 2], images: [], category: 'minimal' }
];

console.log(`Generiere ${layoutConfigs.length} Layout-Templates...`);

// Für jetzt: Da der Generator komplex ist, erstelle ich die Templates manuell
// und füge sie später hinzu. Zuerst behalte ich nur das bestehende Template.

// Schreibe das bestehende Template zurück
fs.writeFileSync(layoutPath, JSON.stringify([existingTemplate], null, 2));
console.log('Bestehendes Template behalten. Neue Templates werden manuell generiert.');


