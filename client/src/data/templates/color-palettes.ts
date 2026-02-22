import type { ColorPalette } from '../../types/template-types';
import { getColorPalettesData } from './templates-data';

type PaletteColorSlot = keyof ColorPalette['colors'];

export const DEFAULT_PALETTE_PARTS: Record<string, PaletteColorSlot> = {
  pageBackground: 'surface',
  pagePattern: 'primary',
  qnaBorder: 'primary',
  imageBorder: 'primary',
  qnaBackground: 'surface',
  qnaQuestionText: 'text',
  qnaQuestionBackground: 'surface',
  qnaQuestionBorder: 'secondary',
  qnaAnswerText: 'text',
  qnaAnswerBackground: 'surface',
  qnaAnswerBorder: 'primary',
  qnaAnswerRuledLines: 'primary',
  freeTextText: 'text',
  freeTextBorder: 'secondary',
  freeTextBackground: 'surface',
  freeTextRuledLines: 'accent',
  shapeStroke: 'primary',
  shapeFill: 'surface',
  lineStroke: 'primary',
  brushStroke: 'primary',
  stickerColor: 'primary',
};

export type PalettePartName = keyof typeof DEFAULT_PALETTE_PARTS | string;

const normalizePalette = (palette: ColorPalette): ColorPalette => ({
  ...palette,
  parts: { ...DEFAULT_PALETTE_PARTS, ...(palette.parts || {}) }
});

// Palettes loaded from API via templates-data. Use getColorPalettes() for current data.
function getColorPalettes(): ColorPalette[] {
  return getColorPalettesData().map(normalizePalette);
}

export const colorPalettes = {
  get length() { return getColorPalettes().length; },
  find: (f: (p: ColorPalette) => boolean) => getColorPalettes().find(f),
  map: <T>(f: (p: ColorPalette) => T) => getColorPalettes().map(f),
  filter: (f: (p: ColorPalette) => boolean) => getColorPalettes().filter(f),
  forEach: (f: (p: ColorPalette) => void) => getColorPalettes().forEach(f),
  [Symbol.iterator]: () => getColorPalettes()[Symbol.iterator](),
} as ColorPalette[];

export function getPalettePartColor(
  palette: ColorPalette | undefined,
  partName: PalettePartName,
  fallbackSlot?: PaletteColorSlot,
  fallbackColor?: string
): string | undefined {
  if (!palette) return fallbackColor;
  const slot = palette.parts?.[partName] as PaletteColorSlot | undefined;
  if (slot && palette.colors[slot]) {
    return palette.colors[slot];
  }
  if (fallbackSlot && palette.colors[fallbackSlot]) {
    return palette.colors[fallbackSlot];
  }
  return fallbackColor;
}

// Helper function to apply palette colors to elements
export function applyPaletteToElement(palette: ColorPalette, elementType: string): Partial<any> {
  const updates: any = {};
  const get = (part: PalettePartName, fallbackSlot?: PaletteColorSlot, fallback?: string) =>
    getPalettePartColor(palette, part, fallbackSlot, fallback);
  
  switch (elementType) {
    case 'text':
    case 'question':
    case 'answer': {
      const textColor = get('freeTextText', 'text', palette.colors.text);
      const borderColor = get('freeTextBorder', 'secondary', palette.colors.secondary);
      const backgroundColor = get('freeTextBackground', 'surface', palette.colors.surface);
      const ruledLinesColor = get('freeTextRuledLines', 'accent', palette.colors.accent);
      updates.fontColor = textColor;
      updates.stroke = textColor;
      updates.borderColor = borderColor;
      updates.backgroundColor = backgroundColor;
      updates.ruledLinesColor = ruledLinesColor;
      // Nested properties
      updates.font = { fontColor: textColor };
      updates.border = { borderColor };
      updates.background = { backgroundColor };
      updates.ruledLines = { lineColor: ruledLinesColor };
      break;
    }
      
    case 'qna':
      const questionFont = get('qnaQuestionText', 'text', palette.colors.text);
      const questionBg = get('qnaQuestionBackground', 'surface', palette.colors.surface);
      const questionBorder = get('qnaQuestionBorder', 'secondary', palette.colors.secondary);
      const answerFont = get('qnaAnswerText', 'text', palette.colors.text);
      const answerBg = get('qnaAnswerBackground', 'surface', palette.colors.surface);
      const answerBorder = get('qnaAnswerBorder', 'primary', palette.colors.primary);
      const answerLines = get('qnaAnswerRuledLines', 'primary', palette.colors.primary);
      const containerBorder = get('qnaBorder', 'primary', palette.colors.primary);
      const containerBackground = get('qnaBackground', 'surface', palette.colors.surface);
      updates.questionSettings = {
        fontColor: questionFont,
        font: { fontColor: questionFont },
        borderColor: questionBorder,
        border: { borderColor: questionBorder },
        backgroundColor: questionBg,
        background: { backgroundColor: questionBg },
        ruledLinesColor: answerLines
      };
      updates.answerSettings = {
        fontColor: answerFont,
        font: { fontColor: answerFont },
        borderColor: answerBorder,
        border: { borderColor: answerBorder },
        backgroundColor: answerBg,
        background: { backgroundColor: answerBg },
        ruledLinesColor: answerLines,
        ruledLines: { lineColor: answerLines }
      };
      updates.fontColor = answerFont;
      updates.borderColor = containerBorder;
      updates.backgroundColor = containerBackground;
      updates.ruledLinesColor = answerLines;
      break;

    case 'free_text': {
      const textColor = get('freeTextText', 'text', palette.colors.text);
      const borderColor = get('freeTextBorder', 'secondary', palette.colors.secondary);
      const backgroundColor = get('freeTextBackground', 'surface', palette.colors.surface);
      const ruledLinesColor = get('freeTextRuledLines', 'accent', palette.colors.accent);
      updates.textSettings = {
        fontColor: textColor,
        font: { fontColor: textColor },
        borderColor,
        border: { borderColor },
        backgroundColor,
        background: { backgroundColor },
        ruledLinesColor,
        ruledLines: { lineColor: ruledLinesColor }
      };
      // Also set top-level properties for backward compatibility
      updates.fontColor = textColor;
      updates.borderColor = borderColor;
      updates.backgroundColor = backgroundColor;
      break;
    }
      
    case 'brush': {
      updates.stroke = get('brushStroke', 'primary', palette.colors.primary);
      break;
    }
    case 'line': {
      updates.stroke = get('lineStroke', 'primary', palette.colors.primary);
      break;
    }
      
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
    case 'shape': {
      updates.stroke = get('shapeStroke', 'primary', palette.colors.primary);
      updates.fill = get('shapeFill', 'surface', palette.colors.surface || palette.colors.accent);
      break;
    }
      
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
  return getColorPalettes().find(p => p.id === id);
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
  return getColorPalettes();
}

// Export all palettes as GLOBAL_PALETTES for backward compatibility (dynamic)
export const GLOBAL_PALETTES = colorPalettes;
