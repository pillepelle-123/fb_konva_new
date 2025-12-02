/**
 * TypeScript wrapper for shared rendering modules
 * This file provides TypeScript-compatible access to the shared rendering utilities
 * 
 * NOTE: These constants must match the values in shared/rendering/utils/constants.js
 * If you update constants.js, you must also update this file.
 */

// Page dimensions in millimeters (must match shared/rendering/utils/constants.js)
export const PAGE_DIMENSIONS = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Square: { width: 210, height: 210 }
} as const;

// Canvas dimensions in pixels (must match shared/rendering/utils/constants.js)
export const CANVAS_DIMS = {
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  A3: { width: 3508, height: 4961 },
  Letter: { width: 2550, height: 3300 },
  Square: { width: 2480, height: 2480 }
} as const;

// Pattern definitions (must match shared/rendering/utils/constants.js)
export const PATTERNS = [
  { id: 'dots', name: 'Dots' },
  { id: 'grid', name: 'Grid' },
  { id: 'diagonal', name: 'Diagonal Lines' },
  { id: 'cross', name: 'Cross Hatch' },
  { id: 'waves', name: 'Waves' },
  { id: 'hexagon', name: 'Hexagons' }
] as const;

/**
 * Create pattern tile canvas (shared implementation)
 * This function matches the implementation in shared/rendering/render-background.js
 */
export function createPatternTile(
  pattern: { id: string },
  color: string,
  size: number,
  strokeWidth: number = 1
): HTMLCanvasElement {
  const tileSize = 20 * size;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  
  if (pattern.id === 'dots') {
    ctx.beginPath();
    ctx.arc(tileSize/2, tileSize/2, tileSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern.id === 'grid') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'diagonal') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();
  } else if (pattern.id === 'cross') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'waves') {
    ctx.lineWidth = strokeWidth * 2;
    ctx.beginPath();
    ctx.moveTo(0, tileSize/2);
    ctx.quadraticCurveTo(tileSize/4, 0, tileSize/2, tileSize/2);
    ctx.quadraticCurveTo(3*tileSize/4, tileSize, tileSize, tileSize/2);
    ctx.stroke();
  } else if (pattern.id === 'hexagon') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    const centerX = tileSize/2;
    const centerY = tileSize/2;
    const radius = tileSize * 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  return canvas;
}

