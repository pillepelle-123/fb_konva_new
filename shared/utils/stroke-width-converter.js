// Stroke width conversion between common scale (1-100) and actual style values
// Universal version for both client and server

const STYLE_STROKE_RANGES = {
  default: { min: 1, max: 100 },
  rough: { min: 1, max: 100 },
  glow: { min: 1, max: 50 },
  candy: { min: 12, max: 50 },
  zigzag: { min: 3, max: 40 },    // Increased from 20 for faster stroke width scaling
  wobbly: { min: 1, max: 50 },
  sketchy: { min: 1, max: 100 },   // alias for rough
  dashed: { min: 1, max: 100 },   // Gestrichlete Linien für alle Elementtypen
  marker: { min: 1, max: 100 },
  crayon: { min: 1, max: 100 },
  ink: { min: 1, max: 100 },
  'paint-brush': { min: 1, max: 100 }
};

function commonToActualStrokeWidth(commonWidth, style = 'default') {
  // If 0, return 0 (no border)
  if (commonWidth === 0) {
    return 0;
  }

  const range = STYLE_STROKE_RANGES[style] || STYLE_STROKE_RANGES.default;

  // Clamp to 1-100 range (0 is handled above)
  const normalizedWidth = Math.max(1, Math.min(100, commonWidth));

  // Map 1-100 to range.min - range.max
  return range.min + ((normalizedWidth - 1) / 99) * (range.max - range.min);
}

// Convert from actual style stroke width to common scale (0-100)
// 0 = no border, 1 = min value of style, 100 = max value of style
function actualToCommonStrokeWidth(actualWidth, style = 'default') {
  // If 0, return 0 (no border)
  if (actualWidth === 0) {
    return 0;
  }

  const range = STYLE_STROKE_RANGES[style] || STYLE_STROKE_RANGES.default;

  // Clamp to style range
  const clampedWidth = Math.max(range.min, Math.min(range.max, actualWidth));

  // Map range.min - range.max to 1-100
  // If actualWidth is below min, return 1
  if (actualWidth < range.min) {
    return 1;
  }

  // If actualWidth is above max, return 100
  if (actualWidth > range.max) {
    return 100;
  }

  // Map to 1-100 scale
  return Math.round(1 + ((clampedWidth - range.min) / (range.max - range.min)) * 99);
}

// Get max common width for sliders
function getMaxCommonWidth() {
  return 100;
}

// Get minimum actual stroke width for a style
function getMinActualStrokeWidth(style = 'default') {
  const range = STYLE_STROKE_RANGES[style] || STYLE_STROKE_RANGES.default;
  return range.min;
}

// Convert themes.json stroke width (common scale) to actual style stroke width
// This ensures themes.json values are treated as common scale values
function styleJsonToActualStrokeWidth(styleJsonWidth, style = 'default') {
  return commonToActualStrokeWidth(styleJsonWidth, style);
}

// Convert actual style stroke width back to themes.json format (common scale)
function actualToStyleJsonStrokeWidth(actualWidth, style = 'default') {
  return actualToCommonStrokeWidth(actualWidth, style);
}

// ES6 exports for client compatibility
export {
  commonToActualStrokeWidth,
  actualToCommonStrokeWidth,
  getMaxCommonWidth,
  getMinActualStrokeWidth,
  styleJsonToActualStrokeWidth,
  actualToStyleJsonStrokeWidth,
  STYLE_STROKE_RANGES
};

// CommonJS exports for server compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    commonToActualStrokeWidth,
    actualToCommonStrokeWidth,
    getMaxCommonWidth,
    getMinActualStrokeWidth,
    styleJsonToActualStrokeWidth,
    actualToStyleJsonStrokeWidth,
    STYLE_STROKE_RANGES
  };
}
