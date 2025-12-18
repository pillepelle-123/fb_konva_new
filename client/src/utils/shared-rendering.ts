/**
 * TypeScript wrapper for shared rendering modules
 * This file provides TypeScript-compatible access to the shared rendering utilities
 * 
 * NOTE: Constants are now imported from shared/utils/constants.ts
 */

// Re-export constants from shared
export { PAGE_DIMENSIONS, CANVAS_DIMS, PATTERNS } from '../../../shared/utils/constants';

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

