/**
 * Server-side Wrapper für alle Themes
 * Wrapper um shared/utils/themes-engine.js für Konva.js
 */

const { generatePath, getStrokeProps } = require('../../utils/themes-engine');
// Import utility functions from theme-utils.js (these will be moved here later)
let getGlobalThemeDefaults, loadThemes, deepMerge, applyPaletteToElement, commonToActualStrokeWidth;
try {
  const themeUtils = require('./theme-utils');
  getGlobalThemeDefaults = themeUtils.getGlobalThemeDefaults;
  loadThemes = themeUtils.loadThemes;
  deepMerge = themeUtils.deepMerge;
  applyPaletteToElement = themeUtils.applyPaletteToElement;
  commonToActualStrokeWidth = themeUtils.commonToActualStrokeWidth;
} catch (error) {
  console.warn('[theme-server] Could not load theme-utils, some functions may be unavailable:', error);
}

/**
 * Get theme renderer for a specific theme
 * @param {string} theme - Theme name
 * @param {Object} roughInstance - Rough.js instance (optional, required for rough theme)
 * @param {Object} document - Document object (required for some themes)
 * @returns {Object} ThemeRenderer object
 */
function getThemeRenderer(theme = 'default', roughInstance = null, document = null) {
  return {
    generatePath: (element) => {
      const options = {
        document: document,
        zoom: 1,
        roughInstance: theme === 'rough' ? roughInstance : undefined
      };
      return generatePath(element, theme, options);
    },
    
    getStrokeProps: (element) => {
      const options = {
        document: document,
        zoom: 1
      };
      return getStrokeProps(element, theme, options);
    }
  };
}

// Re-export utility functions from theme-utils.js
module.exports = {
  getThemeRenderer,
  getGlobalThemeDefaults,
  loadThemes,
  deepMerge,
  applyPaletteToElement,
  commonToActualStrokeWidth
};

