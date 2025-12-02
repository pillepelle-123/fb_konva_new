/**
 * Color utility functions for PDF rendering
 */

/**
 * Convert hex color to RGBA
 * @param {string} hex - Hex color (e.g., '#ff0000' or 'ff0000')
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} RGBA color string
 */
function hexToRgba(hex, opacity) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Apply fill opacity to a color
 * @param {string} fill - Fill color (hex, rgb, rgba, or named color)
 * @param {number} fillOpacity - Opacity value (0-1)
 * @param {number} elementOpacity - Element opacity value (0-1), defaults to 1
 * @returns {string} Color with opacity applied
 */
function applyFillOpacity(fill, fillOpacity, elementOpacity = 1) {
  if (!fill || fill === 'transparent' || fillOpacity === undefined) {
    return fill;
  }
  
  const finalFillOpacity = fillOpacity * elementOpacity;
  
  // Check if already rgba
  if (fill.startsWith('rgba')) {
    // Extract RGB values from rgba and replace alpha with finalFillOpacity
    const rgbaMatch = fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${finalFillOpacity})`;
    }
    return fill;
  }
  
  // Check if rgb (without alpha)
  if (fill.startsWith('rgb')) {
    // Extract RGB values from rgb and add alpha with finalFillOpacity
    const rgbMatch = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalFillOpacity})`;
    }
    return fill;
  }
  
  // Check if hex
  if (fill.startsWith('#')) {
    return hexToRgba(fill, finalFillOpacity);
  }
  
  // Named colors or other formats - return as is
  return fill;
}

/**
 * Apply stroke opacity to a color
 * @param {string} stroke - Stroke color (hex, rgb, rgba, or named color)
 * @param {number} strokeOpacity - Opacity value (0-1)
 * @param {number} elementOpacity - Element opacity value (0-1), defaults to 1
 * @returns {string} Color with opacity applied
 */
function applyStrokeOpacity(stroke, strokeOpacity, elementOpacity = 1) {
  if (!stroke || strokeOpacity === undefined || strokeOpacity === 1) {
    return stroke;
  }
  
  const finalStrokeOpacity = strokeOpacity * elementOpacity;
  
  // Check if already rgba/rgb
  if (stroke.startsWith('rgba') || stroke.startsWith('rgb')) {
    // Extract RGB values and apply opacity
    const rgbMatch = stroke.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalStrokeOpacity})`;
    }
    return stroke;
  }
  
  // Check if hex
  if (stroke.startsWith('#')) {
    return hexToRgba(stroke, finalStrokeOpacity);
  }
  
  // Named colors or other formats - return as is
  return stroke;
}

module.exports = {
  hexToRgba,
  applyFillOpacity,
  applyStrokeOpacity
};

