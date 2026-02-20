/**
 * Client-side Wrapper für alle Themes
 * Wrapper um shared/utils/themes-engine.js für React-Konva
 */

import type { CanvasElement } from '../context/editor-context';
import type { Theme } from '../../../shared/types/theme-types';
import * as themeEngine from '../../../shared/utils/themes-engine';
import rough from 'roughjs';

/**
 * ThemeRenderer Interface
 */
export interface ThemeRenderer {
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
 * Create a ThemeRenderer for a specific theme
 */
function createThemeRenderer(theme: Theme): ThemeRenderer {
  return {
    generatePath: (element: CanvasElement, zoom = 1) => {
      const options = {
        document: typeof document !== 'undefined' ? document : undefined,
        zoom,
        roughInstance: theme === 'rough' ? getRoughInstance() : undefined
      };
      return themeEngine.generatePath(element as any, theme, options);
    },
    
    getStrokeProps: (element: CanvasElement, zoom = 1) => {
      const options = {
        document: typeof document !== 'undefined' ? document : undefined,
        zoom
      };
      return themeEngine.getStrokeProps(element as any, theme, options);
    }
  };
}

// Cache theme renderers
const themeRenderers: Record<Theme, ThemeRenderer> = {
  default: createThemeRenderer('default'),
  rough: createThemeRenderer('rough'),
  glow: createThemeRenderer('glow'),
  candy: createThemeRenderer('candy'),
  wobbly: createThemeRenderer('wobbly'),
  zigzag: createThemeRenderer('zigzag'),
  dashed: createThemeRenderer('dashed')
};

/**
 * Get theme renderer for a specific theme
 * @param theme - Theme name
 * @returns ThemeRenderer
 */
export function getThemeRenderer(theme: Theme = 'default'): ThemeRenderer {
  return themeRenderers[theme] || themeRenderers.default;
}

/**
 * Export all themes as a record
 */
export const themes: Record<Theme, ThemeRenderer> = themeRenderers;

/**
 * Re-export Theme type
 */
export type { Theme } from '../../shared/types/theme-types';

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
  theme: Theme;
  seed?: number;
  roughness?: number;
  element?: CanvasElement; // For theme-specific settings like candyRandomness
}

/**
 * Generates a themed path for a straight line (horizontal, vertical, or diagonal).
 * Used for: Ruled Lines, Borders (rectangles), Lines (Line Tool), Frames (images).
 */
export function generateLinePath(params: LinePathParams): string {
  const { x1, y1, x2, y2, strokeWidth, stroke, theme, seed = 1, roughness = 1, element } = params;
  
  // Calculate line length and direction
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const isHorizontal = Math.abs(dy) < 0.001; // Horizontal line (y1 === y2)
  const isVertical = Math.abs(dx) < 0.001; // Vertical line (x1 === x2)
  
  // Create a temporary element for line path generation
  // For horizontal lines, width = length, height = 0
  // For vertical lines, width = 0, height = length
  // For diagonal lines, width = dx, height = dy
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
    theme,
    ...(element || {})
  };
  
  const options = {
    document: typeof document !== 'undefined' ? document : undefined,
    zoom: 1,
    roughInstance: theme === 'rough' ? getRoughInstance() : undefined
  };
  
  // Generate path using the theme engine
  const path = themeEngine.generatePath(tempElement as any, theme, options);
  
  // Transform the path to match actual coordinates
  if (path && path !== '') {
    // Store offset coordinates to avoid variable name conflicts in regex replacements
    const offsetX = x1;
    const offsetY = y1;
    
    // Helper function to transform coordinates
    const transformCoords = (px: number, py: number): { x: number; y: number } => {
      if (isHorizontal) {
        // Simple translation for horizontal lines
        return { x: px + offsetX, y: py + offsetY };
      } else if (isVertical) {
        // Simple translation for vertical lines
        return { x: px + offsetX, y: py + offsetY };
      } else {
        // Rotate and translate for diagonal lines
        const angle = Math.atan2(dy, dx);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rotatedX = px * cos - py * sin;
        const rotatedY = px * sin + py * cos;
        return { x: rotatedX + offsetX, y: rotatedY + offsetY };
      }
    };
    
    // Transform all coordinates in the path
    // Handle M, L commands (most common)
    let transformedPath = path.replace(/([ML])\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, x, y) => {
      const coords = transformCoords(parseFloat(x), parseFloat(y));
      return `${cmd} ${coords.x} ${coords.y}`;
    });
    
    // Handle A (arc) commands - format: A rx ry rotation largeArc sweep x y
    transformedPath = transformedPath.replace(/([A])\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([01])\s+([01])\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, rx, ry, rotation, largeArc, sweep, arcX, arcY) => {
      const coords = transformCoords(parseFloat(arcX), parseFloat(arcY));
      return `${cmd} ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${coords.x} ${coords.y}`;
    });
    
    // Handle C (cubic bezier) commands - format: C x1 y1 x2 y2 x y
    transformedPath = transformedPath.replace(/([C])\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, x1, y1, x2, y2, x, y) => {
      const coords1 = transformCoords(parseFloat(x1), parseFloat(y1));
      const coords2 = transformCoords(parseFloat(x2), parseFloat(y2));
      const coords = transformCoords(parseFloat(x), parseFloat(y));
      return `${cmd} ${coords1.x} ${coords1.y} ${coords2.x} ${coords2.y} ${coords.x} ${coords.y}`;
    });
    
    // Handle Q (quadratic bezier) commands - format: Q x1 y1 x y
    transformedPath = transformedPath.replace(/([Q])\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g, (match, cmd, x1, y1, x, y) => {
      const coords1 = transformCoords(parseFloat(x1), parseFloat(y1));
      const coords = transformCoords(parseFloat(x), parseFloat(y));
      return `${cmd} ${coords1.x} ${coords1.y} ${coords.x} ${coords.y}`;
    });
    
    // Handle Z (close path) commands - no transformation needed, but preserve them
    // Z is already preserved in the path
    
    return transformedPath;
  }
  
  // Fallback to simple line if path generation fails
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * Render a themed line (for backward compatibility)
 */
export function renderThemedLine(params: LinePathParams): string {
  return generateLinePath(params);
}

