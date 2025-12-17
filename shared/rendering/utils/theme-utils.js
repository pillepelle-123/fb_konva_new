/**
 * Theme utility functions for PDF rendering
 */

const path = require('path');
const fs = require('fs');
const { getPalettePartColor } = require('./palette-utils');
const { commonToActualStrokeWidth } = require('../../utils/stroke-width-converter');

// Load themes from JSON file
let THEMES_DATA = null;

function loadThemes() {
  if (THEMES_DATA) return THEMES_DATA;
  
  try {
    // Try to load from shared directory first (preferred)
    const sharedPath = path.join(__dirname, '../../data/templates/themes.json');
    if (fs.existsSync(sharedPath)) {
      const data = JSON.parse(fs.readFileSync(sharedPath, 'utf-8'));
      THEMES_DATA = data.themes || data || {};
      return THEMES_DATA;
    }
    
    // Fallback to client directory (for backward compatibility)
    const clientPath = path.join(__dirname, '../../../client/src/data/templates/themes.json');
    if (fs.existsSync(clientPath)) {
      const data = JSON.parse(fs.readFileSync(clientPath, 'utf-8'));
      THEMES_DATA = data.themes || data || {};
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
 * Get theme renderer (full version with rough.js support)
 * Uses rough.js in the browser context for theme rendering
 * @param {string} theme - Theme name (e.g., 'rough', 'default')
 * @returns {Object} Theme renderer object
 */
function getThemeRenderer(theme = 'rough', roughInstanceParam = null) {
  // Get rough instance from parameter first, then from window (browser context)
  const roughInstance = roughInstanceParam || (typeof window !== 'undefined' && window.rough) || null;
  
  // Default theme renderer
  const defaultTheme = {
    generatePath: (element) => {
      if (element.type === 'rect') {
        if (element.cornerRadius && element.cornerRadius > 0) {
          const r = Math.min(element.cornerRadius, element.width / 2, element.height / 2);
          return `M ${r} 0 L ${element.width - r} 0 Q ${element.width} 0 ${element.width} ${r} L ${element.width} ${element.height - r} Q ${element.width} ${element.height} ${element.width - r} ${element.height} L ${r} ${element.height} Q 0 ${element.height} 0 ${element.height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
        }
        return `M 0 0 L ${element.width} 0 L ${element.width} ${element.height} L 0 ${element.height} Z`;
      }
      return '';
    },
    getStrokeProps: (element) => {
      return {
        stroke: element.stroke || '#1f2937',
        strokeWidth: element.strokeWidth ? commonToActualStrokeWidth(element.strokeWidth, element.theme || 'default') : 0,
        fill: element.type === 'line' ? undefined : (element.fill !== 'transparent' ? element.fill : undefined)
      };
    }
  };
  
  // Rough theme renderer with full rough.js support
  const roughTheme = {
    generatePath: (element) => {
      if (!roughInstance) {
        console.warn('[theme-utils] Rough.js not available, falling back to default theme');
        return defaultTheme.generatePath(element);
      }
      
      const roughness = element.roughness || 1;
      const strokeWidth = element.strokeWidth || 0;
      const stroke = element.stroke || '#1f2937';
      const fill = element.fill || 'transparent';
      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rc = roughInstance.svg(svg);
      
      try {
        let roughElement;
        
        if (element.type === 'rect') {
          if (element.cornerRadius && element.cornerRadius > 0) {
            const r = Math.min(element.cornerRadius, element.width / 2, element.height / 2);
            const roundedRectPath = `M ${r} 0 L ${element.width - r} 0 Q ${element.width} 0 ${element.width} ${r} L ${element.width} ${element.height - r} Q ${element.width} ${element.height} ${element.width - r} ${element.height} L ${r} ${element.height} Q 0 ${element.height} 0 ${element.height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
            roughElement = rc.path(roundedRectPath, {
              roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed
            });
          } else {
            roughElement = rc.rectangle(0, 0, element.width, element.height, {
              roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed
            });
          }
        } else {
          return defaultTheme.generatePath(element);
        }
        
        if (roughElement) {
          const paths = roughElement.querySelectorAll('path');
          let combinedPath = '';
          paths.forEach(path => {
            const d = path.getAttribute('d');
            if (d) combinedPath += d + ' ';
          });
          return combinedPath.trim();
        }
      } catch (error) {
        console.error('[theme-utils] Error generating rough path:', error);
      }
      
      return defaultTheme.generatePath(element);
    },
    getStrokeProps: (element) => {
      return {
        stroke: element.stroke || '#1f2937',
        strokeWidth: element.strokeWidth ? commonToActualStrokeWidth(element.strokeWidth, element.theme || 'rough') : 0,
        fill: element.type === 'line' ? undefined : (element.fill !== 'transparent' ? element.fill : undefined)
      };
    }
  };
  
  // Return appropriate theme renderer
  const themes = {
    default: defaultTheme,
    rough: roughTheme,
    sketchy: roughTheme, // Use rough theme for sketchy too
    wobbly: roughTheme, // Use rough theme for wobbly too
    glow: defaultTheme,
    candy: defaultTheme,
    zigzag: defaultTheme
  };
  
  return themes[theme] || themes.rough;
}

module.exports = {
  getGlobalThemeDefaults,
  getThemeRenderer,
  loadThemes,
  deepMerge,
  applyPaletteToElement,
  commonToActualStrokeWidth
};






