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
    strokeDasharray?: string;
    opacity?: number;
    shadowColor?: string;
    shadowBlur?: number;
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
  zigzag: createThemeRenderer('zigzag')
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
 * Re-export ThemeRenderer interface
 */
export type { ThemeRenderer } from './themes';

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
  
  // Create a temporary element for line path generation
  const tempElement: CanvasElement = {
    type: 'line',
    id: `line-${seed}`,
    x: 0,
    y: 0,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
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
  const path = generatePath(tempElement as any, theme, options);
  
  // Transform the path to match actual coordinates
  // For simple lines, we can just return the transformed path
  if (path && path !== '') {
    // For now, return a simple transformed path
    // More complex transformation would require parsing the path string
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * Render a themed line (for backward compatibility)
 */
export function renderThemedLine(params: LinePathParams): string {
  return generateLinePath(params);
}

