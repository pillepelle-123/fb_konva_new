/**
 * Client-side Wrapper für alle Linien-/Border-Styles
 * Wrapper um shared/utils/styles-engine.js für React-Konva
 */

import type { CanvasElement } from '../context/editor-context';
import type { Style } from '../../../shared/types/style-types';
import * as styleEngine from '../../../shared/utils/styles-engine';
import rough from 'roughjs';
import { getStroke as perfectFreehandGetStroke } from 'perfect-freehand';

/**
 * StyleRenderer Interface
 */
export interface StyleRenderer {
  generatePath: (element: CanvasElement, zoom?: number) => string;
  getStrokeProps: (element: CanvasElement, zoom?: number) => {
    stroke: string;
    strokeWidth: number;
    fill?: string;
    strokeDasharray?: number[] | string;
    dash?: number[];
    opacity?: number;
    shadowColor?: string;
    shadowBlur?: number;
    useGlowLayers?: boolean;
    glowLayerWidthMultiplier?: number;
    glowLayerOpacity?: number;
    shadowOpacity?: number;
    lineCap?: string;
    lineJoin?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
  };
}

/**
 * Get rough instance - try window.rough first (browser context), then fallback to imported rough
 */
function getRoughInstance() {
  if (typeof window !== 'undefined' && (window as any).rough) {
    return (window as any).rough;
  }
  return rough;
}

/**
 * Create a StyleRenderer for a specific style
 */
function createStyleRenderer(style: Style): StyleRenderer {
  return {
    generatePath: (element: CanvasElement, zoom = 1) => {
      const options = {
        document: typeof document !== 'undefined' ? document : undefined,
        zoom,
        roughInstance: style === 'rough' ? getRoughInstance() : undefined,
        getStroke: style === 'freehand' ? perfectFreehandGetStroke : undefined
      };
      return styleEngine.generatePath(element as any, style, options);
    },
    
    getStrokeProps: (element: CanvasElement, zoom = 1) => {
      const options = {
        document: typeof document !== 'undefined' ? document : undefined,
        zoom
      };
      return styleEngine.getStrokeProps(element as any, style, options);
    }
  };
}

// Cache style renderers
const styleRenderers: Record<Style, StyleRenderer> = {
  default: createStyleRenderer('default'),
  rough: createStyleRenderer('rough'),
  glow: createStyleRenderer('glow'),
  candy: createStyleRenderer('candy'),
  wobbly: createStyleRenderer('wobbly'),
  zigzag: createStyleRenderer('zigzag'),
  dashed: createStyleRenderer('dashed'),
  marker: createStyleRenderer('marker'),
  crayon: createStyleRenderer('crayon'),
  pencil: createStyleRenderer('pencil'),
  'paint-brush': createStyleRenderer('paint-brush'),
  freehand: createStyleRenderer('freehand')
};

/**
 * Get style renderer for a specific style
 * @param style - Style name
 * @returns StyleRenderer
 */
export function getStyleRenderer(style: Style = 'default'): StyleRenderer {
  return styleRenderers[style] || styleRenderers.default;
}

/**
 * Export all styles as a record
 */
export const styles: Record<Style, StyleRenderer> = styleRenderers;

/**
 * Re-export Style type
 */
export type { Style } from '../../../shared/types/style-types';

/**
 * Interface for line path generation parameters
 */
export interface LinePathParams {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
  stroke: string;
  style: Style;
  seed?: number;
  roughness?: number;
  element?: CanvasElement; // For style-specific settings like candyRandomness
}

/**
 * Generates a styled path for a straight line (horizontal, vertical, or diagonal).
 * Used for: Ruled Lines, Borders (rectangles), Lines (Line Tool), Frames (images).
 */
export function generateLinePath(params: LinePathParams): string {
  const { x1, y1, x2, y2, strokeWidth, stroke, style, seed = 1, roughness = 1, element } = params;
  
  // Calculate line length and direction
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const isHorizontal = Math.abs(dy) < 0.001; // Horizontal line (y1 === y2)
  const isVertical = Math.abs(dx) < 0.001; // Vertical line (x1 === x2)
  
  // Create a temporary element for line path generation
  const tempElement: CanvasElement = {
    type: 'line',
    id: `line-${seed}`,
    x: 0,
    y: 0,
    width: isHorizontal ? length : (isVertical ? 0 : dx),
    height: isVertical ? length : (isHorizontal ? 0 : dy),
    strokeWidth,
    stroke,
    fill: 'transparent',
    roughness,
    ...(element || {})
  };
  
  const options = {
    document: typeof document !== 'undefined' ? document : undefined,
    zoom: 1,
    roughInstance: style === 'rough' ? getRoughInstance() : undefined
  };
  
  // Generate path using the style engine
  const path = styleEngine.generatePath(tempElement as any, style, options);
  
  // Transform the path to match actual coordinates
  if (path && path !== '') {
    const offsetX = x1;
    const offsetY = y1;
    
    const transformCoords = (px: number, py: number): { x: number; y: number } => {
      if (isHorizontal || isVertical) {
        return { x: px + offsetX, y: py + offsetY };
      } else {
        const angle = Math.atan2(dy, dx);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rotatedX = px * cos - py * sin;
        const rotatedY = px * sin + py * cos;
        return { x: rotatedX + offsetX, y: rotatedY + offsetY };
      }
    };
    
    let transformedPath = path.replace(/([ML])\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, x, y) => {
      const coords = transformCoords(parseFloat(x), parseFloat(y));
      return `${cmd} ${coords.x} ${coords.y}`;
    });
    
    transformedPath = transformedPath.replace(/([A])\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([01])\s+([01])\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, rx, ry, rotation, largeArc, sweep, arcX, arcY) => {
      const coords = transformCoords(parseFloat(arcX), parseFloat(arcY));
      return `${cmd} ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${coords.x} ${coords.y}`;
    });
    
    transformedPath = transformedPath.replace(/([C])\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, x1, y1, x2, y2, x, y) => {
      const coords1 = transformCoords(parseFloat(x1), parseFloat(y1));
      const coords2 = transformCoords(parseFloat(x2), parseFloat(y2));
      const coords = transformCoords(parseFloat(x), parseFloat(y));
      return `${cmd} ${coords1.x} ${coords1.y} ${coords2.x} ${coords2.y} ${coords.x} ${coords.y}`;
    });
    
    transformedPath = transformedPath.replace(/([Q])\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, x1, y1, x, y) => {
      const coords1 = transformCoords(parseFloat(x1), parseFloat(y1));
      const coords = transformCoords(parseFloat(x), parseFloat(y));
      return `${cmd} ${coords1.x} ${coords1.y} ${coords.x} ${coords.y}`;
    });
    
    return transformedPath;
  }
  
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * Render a styled line (for backward compatibility)
 */
export function renderStyledLine(params: LinePathParams): string {
  return generateLinePath(params);
}
