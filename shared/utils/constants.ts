/**
 * TypeScript wrapper for constants.js
 * Provides type-safe access to shared constants
 */

export const PAGE_DIMENSIONS = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Square: { width: 210, height: 210 }
} as const;

export const CANVAS_DIMS = {
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  A3: { width: 3508, height: 4961 },
  Letter: { width: 2550, height: 3300 },
  Square: { width: 2480, height: 2480 }
} as const;

export const PATTERNS = [
  { id: 'dots', name: 'Dots' },
  { id: 'grid', name: 'Grid' },
  { id: 'diagonal', name: 'Diagonal Lines' },
  { id: 'cross', name: 'Cross Hatch' },
  { id: 'waves', name: 'Waves' },
  { id: 'hexagon', name: 'Hexagons' }
] as const;


