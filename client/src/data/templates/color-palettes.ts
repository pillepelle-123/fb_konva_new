import type { ColorPalette } from '../../types/template-types';
import colorPalettesJson from './color-palettes.json';

// Load palettes from JSON file
export const colorPalettes: ColorPalette[] = colorPalettesJson.palettes as ColorPalette[];

// Helper function to apply palette colors to elements
export function applyPaletteToElement(palette: ColorPalette, elementType: string): Partial<any> {
  const updates: any = {};
  
  switch (elementType) {
    case 'text':
      updates.fontColor = palette.colors.text || palette.colors.primary;
      updates.stroke = palette.colors.text || palette.colors.primary;
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.surface || palette.colors.background;
      updates.ruledLinesColor = palette.colors.accent || palette.colors.primary;
      // Nested properties
      updates.font = { fontColor: palette.colors.text || palette.colors.primary };
      updates.border = { borderColor: palette.colors.secondary };
      updates.background = { backgroundColor: palette.colors.surface || palette.colors.background };
      updates.ruledLines = { lineColor: palette.colors.accent || palette.colors.primary };
      break;
      
    case 'question':
      updates.fontColor = palette.colors.text || palette.colors.primary;
      updates.stroke = palette.colors.text || palette.colors.primary;
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.surface || palette.colors.background;
      updates.ruledLinesColor = palette.colors.accent || palette.colors.primary;
      updates.font = { fontColor: palette.colors.text || palette.colors.primary };
      updates.border = { borderColor: palette.colors.secondary };
      updates.background = { backgroundColor: palette.colors.surface || palette.colors.background };
      updates.ruledLines = { lineColor: palette.colors.accent || palette.colors.primary };
      break;
      
    case 'answer':
      updates.fontColor = palette.colors.accent || palette.colors.text || palette.colors.primary;
      updates.stroke = palette.colors.accent || palette.colors.text || palette.colors.primary;
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.background;
      updates.ruledLinesColor = palette.colors.primary;
      updates.font = { fontColor: palette.colors.accent || palette.colors.text || palette.colors.primary };
      updates.border = { borderColor: palette.colors.secondary };
      updates.background = { backgroundColor: palette.colors.background };
      updates.ruledLines = { lineColor: palette.colors.primary };
      break;
      
    case 'qna_inline':
      updates.questionSettings = {
        fontColor: palette.colors.text || palette.colors.primary,
        font: { fontColor: palette.colors.text || palette.colors.primary },
        borderColor: palette.colors.primary,
        border: { borderColor: palette.colors.primary },
        backgroundColor: palette.colors.accent,
        background: { backgroundColor: palette.colors.accent },
        ruledLinesColor: palette.colors.primary
      };
      updates.answerSettings = {
        fontColor: palette.colors.text || palette.colors.primary,
        font: { fontColor: palette.colors.text || palette.colors.primary },
        borderColor: palette.colors.primary,
        border: { borderColor: palette.colors.primary },
        backgroundColor: palette.colors.accent,
        background: { backgroundColor: palette.colors.accent },
        ruledLinesColor: palette.colors.primary,
        ruledLines: { lineColor: palette.colors.primary }
      };
      updates.fontColor = palette.colors.text || palette.colors.primary;
      updates.borderColor = palette.colors.primary;
      updates.backgroundColor = palette.colors.accent;
      updates.ruledLinesColor = palette.colors.primary;
      break;
      
    case 'free_text':
      updates.textSettings = {
        fontColor: palette.colors.text || palette.colors.primary,
        font: { fontColor: palette.colors.text || palette.colors.primary },
        borderColor: palette.colors.primary,
        border: { borderColor: palette.colors.primary },
        backgroundColor: palette.colors.accent,
        background: { backgroundColor: palette.colors.accent },
        ruledLinesColor: palette.colors.primary,
        ruledLines: { lineColor: palette.colors.primary }
      };
      // Also set top-level properties for backward compatibility
      updates.fontColor = palette.colors.text || palette.colors.primary;
      updates.borderColor = palette.colors.primary;
      updates.backgroundColor = palette.colors.accent;
      break;
      
    case 'brush':
    case 'line':
      updates.stroke = palette.colors.primary;
      break;
      
    case 'rect':
    case 'circle':
    case 'heart':
    case 'star':
    case 'speech-bubble':
    case 'dog':
    case 'cat':
    case 'smiley':
    case 'triangle':
    case 'polygon':
    case 'sticker':
    case 'shape':
      updates.stroke = palette.colors.primary;
      updates.fill = palette.colors.surface || palette.colors.accent;
      break;
      
    case 'image':
    case 'placeholder':
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.background;
      break;
  }
  
  return updates;
}

// Helper function to get palette by ID
export function getColorPalette(id: string): ColorPalette | undefined {
  return colorPalettes.find(p => p.id === id);
}

// Alias for compatibility
export const getPalette = getColorPalette;

// Helper functions for palette management
export function getAllCategories(): string[] {
  // Return empty array for now - categories can be added if needed
  return [];
}

export function getPalettesByCategory(_category: string): ColorPalette[] {
  // Return all palettes for now - can be filtered by category if needed
  return colorPalettes;
}

// Export all palettes as GLOBAL_PALETTES for backward compatibility
export const GLOBAL_PALETTES = colorPalettes;
