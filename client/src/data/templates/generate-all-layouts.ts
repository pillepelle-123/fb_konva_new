/**
 * Script zum Generieren aller Layout-Templates
 * Verwendet die Generator-Funktion aus layout-template-generator.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateLayoutTemplate } from '../../utils/layout-template-generator';
import type { PageTemplate } from '../../types/template-types';

// Lese das bestehende Template
const layoutPath = path.join(__dirname, 'layout.json');
const existingData: PageTemplate[] = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
const existingTemplate = existingData[0];

// Template-Konfigurationen (30 verschiedene Layouts)
const layoutConfigs = [
  // Structured (40% = 12 Layouts)
  { columns: 1 as const, heights: [1, 2, 3, 4, 2], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }], category: 'structured' as const },
  { columns: 1 as const, heights: [2, 3, 2, 3, 4], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'structured' as const },
  { columns: 1 as const, heights: [1, 1, 2, 2, 3, 3], images: [], category: 'structured' as const },
  { columns: 1 as const, heights: [2, 3, 4, 3, 2], images: [{ position: 'tl', ratio: '4:3', widthCm: 4.5 }], category: 'structured' as const },
  { columns: 2 as const, heights: [2, 2, 3, 3, 2, 2], images: [], category: 'structured' as const },
  { columns: 1 as const, heights: [3, 4, 3, 4, 5], images: [{ position: 'tr', ratio: '4:3', widthCm: 4.5 }], category: 'structured' as const },
  { columns: 2 as const, heights: [1, 1, 2, 2, 3, 3, 2, 2], images: [], category: 'structured' as const },
  { columns: 1 as const, heights: [2, 3, 2, 3, 2, 3, 4], images: [{ position: 'bl', ratio: '3:4', widthCm: 3.5 }], category: 'structured' as const },
  { columns: 1 as const, heights: [1, 2, 3, 4, 3, 2], images: [], category: 'structured' as const },
  { columns: 2 as const, heights: [3, 3, 4, 4, 3, 3], images: [{ position: 'tl', ratio: '1:1', widthCm: 5 }], category: 'structured' as const },
  { columns: 1 as const, heights: [2, 4, 3, 4, 5, 3], images: [{ position: 'tr', ratio: '1:1', widthCm: 5 }], category: 'structured' as const },
  { columns: 1 as const, heights: [3, 3, 4, 4, 5, 4], images: [], category: 'structured' as const },
  
  // Playful (25% = 7-8 Layouts)
  { columns: 1 as const, heights: [1, 2, 1, 3, 2, 4], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }], category: 'playful' as const },
  { columns: 1 as const, heights: [2, 3, 4, 3, 5], images: [{ position: 'tr', ratio: '1:1', widthCm: 5 }], category: 'playful' as const },
  { columns: 2 as const, heights: [1, 2, 2, 3, 3, 4], images: [], category: 'playful' as const },
  { columns: 1 as const, heights: [3, 2, 4, 3, 6], images: [{ position: 'bl', ratio: '4:3', widthCm: 4.5 }], category: 'playful' as const },
  { columns: 1 as const, heights: [2, 1, 3, 2, 4, 3], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'playful' as const },
  { columns: 2 as const, heights: [2, 3, 3, 4, 4, 5], images: [{ position: 'tl', ratio: '1:1', widthCm: 5 }], category: 'playful' as const },
  { columns: 1 as const, heights: [1, 3, 2, 4, 3, 5, 2], images: [], category: 'playful' as const },
  { columns: 1 as const, heights: [2, 4, 3, 5, 4], images: [{ position: 'ml', ratio: '3:4', widthCm: 3.5 }], category: 'playful' as const },
  
  // Creative (20% = 6 Layouts)
  { columns: 1 as const, heights: [3, 4, 5, 4, 3], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }, { position: 'mr', ratio: '1:1', widthCm: 5 }], category: 'creative' as const },
  { columns: 2 as const, heights: [2, 4, 3, 5, 4, 6], images: [{ position: 'tr', ratio: '4:3', widthCm: 4.5 }], category: 'creative' as const },
  { columns: 1 as const, heights: [4, 3, 5, 4, 6], images: [{ position: 'bl', ratio: '1:1', widthCm: 5 }], category: 'creative' as const },
  { columns: 1 as const, heights: [2, 3, 4, 5, 4, 3], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'creative' as const },
  { columns: 2 as const, heights: [3, 3, 4, 4, 5, 5], images: [{ position: 'tl', ratio: '3:4', widthCm: 3.5 }, { position: 'br', ratio: '1:1', widthCm: 5 }], category: 'creative' as const },
  { columns: 1 as const, heights: [3, 5, 4, 6, 5], images: [{ position: 'mr', ratio: '4:3', widthCm: 4.5 }], category: 'creative' as const },
  
  // Minimal (15% = 5 Layouts)
  { columns: 1 as const, heights: [2, 3, 4, 3, 2], images: [], category: 'minimal' as const },
  { columns: 1 as const, heights: [3, 4, 3, 4, 3], images: [{ position: 'tr', ratio: '3:4', widthCm: 3.5 }], category: 'minimal' as const },
  { columns: 1 as const, heights: [2, 2, 3, 3, 4, 4], images: [], category: 'minimal' as const },
  { columns: 1 as const, heights: [3, 3, 4, 4, 5], images: [{ position: 'tl', ratio: '1:1', widthCm: 5 }], category: 'minimal' as const },
  { columns: 1 as const, heights: [2, 4, 3, 4, 2], images: [], category: 'minimal' as const }
];

console.log(`Generiere ${layoutConfigs.length} Layout-Templates...`);

// Generiere alle Templates
const generatedTemplates: PageTemplate[] = [existingTemplate];

for (const config of layoutConfigs) {
  try {
    const template = generateLayoutTemplate(config);
    generatedTemplates.push(template);
    console.log(`✓ Generiert: ${template.id}`);
  } catch (error) {
    console.error(`✗ Fehler beim Generieren von Layout:`, error);
  }
}

// Schreibe alle Templates in die Datei
fs.writeFileSync(layoutPath, JSON.stringify(generatedTemplates, null, 2));
console.log(`\n${generatedTemplates.length} Templates erfolgreich in layout.json geschrieben!`);


