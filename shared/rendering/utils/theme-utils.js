/**
 * Theme utility functions for PDF rendering
 */

const path = require('path');
const fs = require('fs');
const { getPalettePartColor } = require('./palette-utils');

// Load themes from JSON file
let THEMES_DATA = null;

function loadThemes() {
  if (THEMES_DATA) return THEMES_DATA;
  
  try {
    // Try to load from client directory (for server-side)
    const clientPath = path.join(__dirname, '../../../client/src/data/templates/themes.json');
    if (fs.existsSync(clientPath)) {
      const data = JSON.parse(fs.readFileSync(clientPath, 'utf-8'));
      THEMES_DATA = data.themes || {};
      return THEMES_DATA;
    }
  } catch (error) {
    console.warn('Could not load themes:', error);
  }
  
  // Fallback to empty object
  THEMES_DATA = {};
  return THEMES_DATA;
}

/**
 * Convert common scale to actual stroke width
 * Simplified conversion for server-side rendering
 */
function commonToActualStrokeWidth(commonSize, theme = 'default') {
  if (commonSize <= 12) return 14;
  if (commonSize <= 14) return 16;
  if (commonSize <= 16) return 18;
  if (commonSize <= 18) return 20;
  if (commonSize <= 20) return 22;
  if (commonSize <= 50) return Math.round(commonSize * 1.2);
  return Math.round(commonSize * 1.2);
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Apply palette colors to element
 */
function applyPaletteToElement(palette, elementType) {
  const updates = {};
  const get = (part, fallbackSlot, fallback) =>
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
      updates.font = { fontColor: textColor };
      updates.border = { borderColor };
      updates.background = { backgroundColor };
      updates.ruledLines = { lineColor: ruledLinesColor };
      break;
    }
      
    case 'qna_inline': {
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
    case 'triangle':
    case 'polygon':
    case 'heart':
    case 'star':
    case 'speech-bubble':
    case 'dog':
    case 'cat':
    case 'smiley':
    case 'shape': {
      updates.stroke = get('shapeStroke', 'primary', palette.colors.primary);
      updates.fill = palette.colors.surface || palette.colors.accent;
      break;
    }
  }
  return updates;
}

/**
 * Get global theme defaults for an element type
 * @param {string} themeId - Theme ID
 * @param {string} elementType - Element type (e.g., 'qna_inline', 'rect', 'text')
 * @returns {Object} Theme defaults object
 */
function getGlobalThemeDefaults(themeId, elementType) {
  const themes = loadThemes();
  const themeConfig = themes[themeId];
  if (!themeConfig) return {};
  
  const category = elementType === 'question' ? 'question' :
                  elementType === 'answer' ? 'answer' :
                  ['qna', 'qna2', 'qna_inline', 'free_text'].includes(elementType) ? 'text' :
                  elementType === 'text' ? 'text' :
                  ['image', 'placeholder'].includes(elementType) ? 'image' :
                  elementType === 'brush' ? 'brush' :
                  ['line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(elementType) ? 'shape' : 'shape';
  
  const baseDefaults = themeConfig.elementDefaults?.[category] || {};
  
  // Get theme palette
  const paletteId = themeConfig.palette;
  const { getPalette } = require('./palette-utils');
  const palette = getPalette(paletteId);
  
  // Apply palette colors if available
  if (palette) {
    const paletteUpdates = applyPaletteToElement(palette, elementType);
    return deepMerge(baseDefaults, paletteUpdates);
  }
  
  return baseDefaults;
}

/**
 * Get theme renderer (simplified version for server-side)
 * For full theme rendering, we rely on rough.js in the browser context
 * @param {string} theme - Theme name (e.g., 'rough', 'default')
 * @returns {Object} Theme renderer object
 */
function getThemeRenderer(theme = 'rough') {
  // For server-side rendering, we return a simplified renderer
  // The actual path generation happens in the browser context with rough.js
  return {
    generatePath: (element) => {
      // Return empty path - actual rendering happens in browser
      return '';
    },
    getStrokeProps: (element) => {
      return {
        stroke: element.stroke || '#1f2937',
        strokeWidth: element.strokeWidth || 0,
        fill: element.fill !== 'transparent' ? element.fill : undefined
      };
    }
  };
}

module.exports = {
  getGlobalThemeDefaults,
  getThemeRenderer,
  loadThemes,
  deepMerge,
  applyPaletteToElement,
  commonToActualStrokeWidth
};

