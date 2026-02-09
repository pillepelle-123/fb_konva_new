// Page dimensions in mm for different page sizes
const PAGE_DIMENSIONS = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  'Letter': { width: 215.9, height: 279.4 },
  'Square-8x8': { width: 203.2, height: 203.2 },
  'Square-10x10': { width: 254, height: 254 },
  'Square-12x12': { width: 304.8, height: 304.8 }
};

// Canvas dimensions in pixels (at 300 DPI)
const CANVAS_DIMS = {
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  'Letter': { width: 2550, height: 3300 },
  'Square-8x8': { width: 2400, height: 2400 },
  'Square-10x10': { width: 3000, height: 3000 },
  'Square-12x12': { width: 3600, height: 3600 }
};

// Pattern definitions (if needed)
const PATTERNS = {};

module.exports = {
  PAGE_DIMENSIONS,
  CANVAS_DIMS,
  PATTERNS
};
