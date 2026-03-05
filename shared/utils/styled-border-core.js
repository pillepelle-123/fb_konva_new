/**
 * Shared Core Logic for Styled Border Rendering
 * Pure JavaScript - no React dependencies
 * Used by both client-side (React) and server-side (Konva) implementations
 */

// Import style engine functions
let generatePath, getStrokeProps;
if (typeof require !== 'undefined') {
  // CommonJS (Node.js / Server)
  const styleEngine = require('./styles-engine');
  generatePath = styleEngine.generatePath;
  getStrokeProps = styleEngine.getStrokeProps;
} else {
  // ES Module (Browser)
  // Will be imported dynamically in client code
  generatePath = null;
  getStrokeProps = null;
}

/**
 * Creates a styled border configuration
 * Extracts common logic for path type determination, element creation, and style rendering
 * 
 * @param {Object} config - Configuration object
 * @param {number} config.width - Stroke width
 * @param {string} config.color - Stroke color
 * @param {number} config.opacity - Opacity (default: 1)
 * @param {number} config.cornerRadius - Corner radius (default: 0)
 * @param {Object} config.path - Path definition (rect, circle, line, custom)
 * @param {string} config.style - Style name
 * @param {Object} config.styleSettings - Style-specific settings
 * @param {number} config.zoom - Zoom factor (default: 1)
 * @param {Function} config.getStyleRenderer - Function to get style renderer (client-side only)
 * @param {Object} config.options - Options for style engine (document, roughInstance, zoom)
 * @returns {Object|null} - { tempElement, pathData, strokeProps, pathOffsetX, pathOffsetY } or null
 */
function createStyledBorderConfig(config) {
  const {
    width,
    color,
    opacity = 1,
    cornerRadius = 0,
    path,
    style,
    styleSettings = {},
    zoom = 1,
    getStyleRenderer,
    options = {}
  } = config;

  // Determine element type based on path type
  let elementType = 'rect';
  let elementWidth = path.width;
  let elementHeight = path.height;
  let elementX = path.x || 0;
  let elementY = path.y || 0;

  // For lines: path is generated relative to (0,0) and offset is applied separately as x/y on Path
  // This allows style algorithms to work from (0,0) while the line appears at the correct position
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
    // Style engine works relative to (0,0), so we remember the offset separately
    pathOffsetX = path.x || 0;
    pathOffsetY = path.y || 0;
  } else if (path.type === 'custom' && path.pathData) {
    // For custom paths, use rect as base (will be overridden by pathData)
    elementType = 'rect';
  }

  // Create temporary element for style renderer
  const tempElement = {
    type: elementType,
    id: `border-${styleSettings.seed || 1}`,
    x: elementX,
    y: elementY,
    width: elementWidth,
    height: elementHeight,
    cornerRadius: cornerRadius,
    stroke: color,
    strokeWidth: width,
    borderWidth: width,
    fill: 'transparent',
    style: style,
    roughness: styleSettings.roughness || (style === 'rough' ? 8 : 1),
    // Style-specific settings
    candyRandomness: styleSettings.candyRandomness,
    candyIntensity: styleSettings.candyIntensity,
    candySpacingMultiplier: styleSettings.candySpacingMultiplier,
    candyHoled: styleSettings.candyHoled,
    ...styleSettings
  };

  // Get path data and stroke properties
  let pathData = null;
  let strokeProps = {};

  // Use getStyleRenderer if provided (client-side), otherwise use style engine directly
  if (getStyleRenderer) {
    try {
      const styleRenderer = getStyleRenderer(style);
      pathData = styleRenderer.generatePath(tempElement, zoom);
      strokeProps = styleRenderer.getStrokeProps(tempElement, zoom);
    } catch (error) {
      console.warn('[styled-border-core] Error using getStyleRenderer, falling back to style engine:', error);
      // Fall through to style engine
    }
  }
  
  // Use style engine directly if getStyleRenderer not provided or failed
  if (!pathData) {
    // Merge options with defaults
    const engineOptions = {
      document: options.document || (typeof document !== 'undefined' ? document : undefined),
      zoom: zoom,
      roughInstance: options.roughInstance || (style === 'rough' && typeof window !== 'undefined' && window.rough ? window.rough : undefined)
    };

    if (generatePath && getStrokeProps) {
      pathData = generatePath(tempElement, style, engineOptions);
      strokeProps = getStrokeProps(tempElement, style, engineOptions);
    } else {
      // Try to require style engine if not already loaded
      if (typeof require !== 'undefined') {
        try {
          const styleEngine = require('./styles-engine');
          pathData = styleEngine.generatePath(tempElement, style, engineOptions);
          strokeProps = styleEngine.getStrokeProps(tempElement, style, engineOptions);
        } catch (error) {
          console.warn('[styled-border-core] Style engine not available:', error);
          return null;
        }
      } else {
        // Fallback: return null if style engine is not available
        console.warn('[styled-border-core] Style engine not available');
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
export { createStyledBorderConfig };

// CommonJS exports for Node (Server)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createStyledBorderConfig
  };
}

