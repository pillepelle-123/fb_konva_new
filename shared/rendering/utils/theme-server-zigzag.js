/**
 * Server-side Wrapper für Zigzag-Theme (PoC)
 * Wrapper um shared/utils/themes-engine.js für Konva.js
 */

const { generateZigzagPath, getStrokeProps } = require('../../utils/themes-engine');

/**
 * Minimal ThemeRenderer für Zigzag-PoC
 */
const zigzagThemeRenderer = {
  generatePath: (element) => {
    // document wird von außen übergeben (aus render-element.js, etc.)
    // Für PoC verwenden wir document aus global scope oder Parameter
    const document = typeof document !== 'undefined' ? document : null;
    const options = {
      document: document,
      zoom: 1
    };
    return generateZigzagPath(element, options);
  },
  
  getStrokeProps: (element) => {
    const options = {
      document: typeof document !== 'undefined' ? document : null,
      zoom: 1
    };
    return getStrokeProps(element, 'zigzag', options);
  }
};

/**
 * Get theme renderer for Zigzag theme (PoC)
 * @param {string} theme - Currently only 'zigzag' is supported in PoC
 * @param {Object} document - Document object (injected from render context)
 * @returns {Object|null} ThemeRenderer or null
 */
function getThemeRendererZigzag(theme = 'zigzag', document = null) {
  if (theme !== 'zigzag') {
    return null;
  }
  
  // Return renderer with document injected
  return {
    generatePath: (element) => {
      const options = {
        document: document,
        zoom: 1
      };
      return generateZigzagPath(element, options);
    },
    
    getStrokeProps: (element) => {
      const options = {
        document: document,
        zoom: 1
      };
      return getStrokeProps(element, 'zigzag', options);
    }
  };
}

module.exports = {
  getThemeRendererZigzag
};

