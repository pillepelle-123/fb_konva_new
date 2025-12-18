/**
 * Shared Core Logic for Themed Border Rendering
 * Pure JavaScript - no React dependencies
 * Used by both client-side (React) and server-side (Konva) implementations
 */

// Import theme engine functions
let generatePath, getStrokeProps;
if (typeof require !== 'undefined') {
  // CommonJS (Node.js / Server)
  const themeEngine = require('./themes-engine');
  generatePath = themeEngine.generatePath;
  getStrokeProps = themeEngine.getStrokeProps;
} else {
  // ES Module (Browser)
  // Will be imported dynamically in client code
  generatePath = null;
  getStrokeProps = null;
}

/**
 * Creates a themed border configuration
 * Extracts common logic for path type determination, element creation, and theme rendering
 * 
 * @param {Object} config - Configuration object
 * @param {number} config.width - Stroke width
 * @param {string} config.color - Stroke color
 * @param {number} config.opacity - Opacity (default: 1)
 * @param {number} config.cornerRadius - Corner radius (default: 0)
 * @param {Object} config.path - Path definition (rect, circle, line, custom)
 * @param {string} config.theme - Theme name
 * @param {Object} config.themeSettings - Theme-specific settings
 * @param {number} config.zoom - Zoom factor (default: 1)
 * @param {Function} config.getThemeRenderer - Function to get theme renderer (client-side only)
 * @param {Object} config.options - Options for theme engine (document, roughInstance, zoom)
 * @returns {Object|null} - { tempElement, pathData, strokeProps, pathOffsetX, pathOffsetY } or null
 */
function createThemedBorderConfig(config) {
  const {
    width,
    color,
    opacity = 1,
    cornerRadius = 0,
    path,
    theme,
    themeSettings = {},
    zoom = 1,
    getThemeRenderer,
    options = {}
  } = config;

  // Determine element type based on path type
  let elementType = 'rect';
  let elementWidth = path.width;
  let elementHeight = path.height;
  let elementX = path.x || 0;
  let elementY = path.y || 0;

  // For lines: path is generated relative to (0,0) and offset is applied separately as x/y on Path
  // This allows theme algorithms to work from (0,0) while the line appears at the correct position
  let pathOffsetX = 0;
  let pathOffsetY = 0;

  if (path.type === 'circle') {
    elementType = 'circle';
    // For circles: width and height are diameter
    elementWidth = (path.radius || path.width / 2) * 2;
    elementHeight = (path.radius || path.height / 2) * 2;
    elementX = (path.centerX || 0) - elementWidth / 2;
    elementY = (path.centerY || 0) - elementHeight / 2;
  } else if (path.type === 'line') {
    elementType = 'line';
    // For lines: width and height are delta values
    // The actual line goes from (x, y) to (x + width, y + height)
    // Theme engine works relative to (0,0), so we remember the offset separately
    pathOffsetX = path.x || 0;
    pathOffsetY = path.y || 0;
  } else if (path.type === 'custom' && path.pathData) {
    // For custom paths, use rect as base (will be overridden by pathData)
    elementType = 'rect';
  }

  // Create temporary element for theme renderer
  const tempElement = {
    type: elementType,
    id: `border-${themeSettings.seed || 1}`,
    x: elementX,
    y: elementY,
    width: elementWidth,
    height: elementHeight,
    cornerRadius: cornerRadius,
    stroke: color,
    strokeWidth: width,
    borderWidth: width,
    fill: 'transparent',
    theme: theme,
    roughness: themeSettings.roughness || (theme === 'rough' ? 8 : 1),
    // Theme-specific settings
    candyRandomness: themeSettings.candyRandomness,
    candyIntensity: themeSettings.candyIntensity,
    candySpacingMultiplier: themeSettings.candySpacingMultiplier,
    candyHoled: themeSettings.candyHoled,
    ...themeSettings
  };

  // Get path data and stroke properties
  let pathData = null;
  let strokeProps = {};

  // Use getThemeRenderer if provided (client-side), otherwise use theme engine directly
  if (getThemeRenderer) {
    try {
      const themeRenderer = getThemeRenderer(theme);
      pathData = themeRenderer.generatePath(tempElement, zoom);
      strokeProps = themeRenderer.getStrokeProps(tempElement, zoom);
    } catch (error) {
      console.warn('[themed-border-core] Error using getThemeRenderer, falling back to theme engine:', error);
      // Fall through to theme engine
    }
  }
  
  // Use theme engine directly if getThemeRenderer not provided or failed
  if (!pathData) {
    // Merge options with defaults
    const engineOptions = {
      document: options.document || (typeof document !== 'undefined' ? document : undefined),
      zoom: zoom,
      roughInstance: options.roughInstance || (theme === 'rough' && typeof window !== 'undefined' && window.rough ? window.rough : undefined)
    };

    if (generatePath && getStrokeProps) {
      pathData = generatePath(tempElement, theme, engineOptions);
      strokeProps = getStrokeProps(tempElement, theme, engineOptions);
    } else {
      // Try to require theme engine if not already loaded
      if (typeof require !== 'undefined') {
        try {
          const themeEngine = require('./themes-engine');
          pathData = themeEngine.generatePath(tempElement, theme, engineOptions);
          strokeProps = themeEngine.getStrokeProps(tempElement, theme, engineOptions);
        } catch (error) {
          console.warn('[themed-border-core] Theme engine not available:', error);
          return null;
        }
      } else {
        // Fallback: return null if theme engine is not available
        console.warn('[themed-border-core] Theme engine not available');
        return null;
      }
    }
  }

  if (!pathData) {
    return null;
  }

  return {
    tempElement,
    pathData,
    strokeProps,
    pathOffsetX,
    pathOffsetY
  };
}

// ES module exports for client (Vite / Browser)
export { createThemedBorderConfig };

// CommonJS exports for Node (Server)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createThemedBorderConfig
  };
}

