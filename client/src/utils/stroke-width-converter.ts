// Stroke width conversion between common scale (1-100) and actual theme values
// Client-side re-export of shared utility for compatibility

import {
  commonToActualStrokeWidth as sharedCommonToActualStrokeWidth,
  actualToCommonStrokeWidth as sharedActualToCommonStrokeWidth,
  getMaxCommonWidth as sharedGetMaxCommonWidth,
  getMinActualStrokeWidth as sharedGetMinActualStrokeWidth,
  themeJsonToActualStrokeWidth as sharedThemeJsonToActualStrokeWidth,
  actualToThemeJsonStrokeWidth as sharedActualToThemeJsonStrokeWidth,
  THEME_STROKE_RANGES as sharedThemeStrokeRanges
} from '../../../shared/utils/stroke-width-converter';

export interface ThemeStrokeRange {
  min: number;
  max: number;
}

export const THEME_STROKE_RANGES: Record<string, ThemeStrokeRange> = sharedThemeStrokeRanges;

export function commonToActualStrokeWidth(commonWidth: number, theme: string): number {
  // Use shared implementation for consistency between client and server
  return sharedCommonToActualStrokeWidth(commonWidth, theme);
}

// Convert from actual theme stroke width to common scale (0-100)
// 0 = no border, 1 = min value of theme, 100 = max value of theme
export function actualToCommonStrokeWidth(actualWidth: number, theme: string): number {
  // Use shared implementation for consistency between client and server
  return sharedActualToCommonStrokeWidth(actualWidth, theme);
}

// Get max common width for sliders
export function getMaxCommonWidth(): number {
  return sharedGetMaxCommonWidth();
}

// Get minimum actual stroke width for a theme
export function getMinActualStrokeWidth(theme: string): number {
  return sharedGetMinActualStrokeWidth(theme);
}

// Convert themes.json stroke width (common scale) to actual theme stroke width
// This ensures themes.json values are treated as common scale values
export function themeJsonToActualStrokeWidth(themeJsonWidth: number, theme: string): number {
  return sharedThemeJsonToActualStrokeWidth(themeJsonWidth, theme);
}

// Convert actual theme stroke width back to themes.json format (common scale)
export function actualToThemeJsonStrokeWidth(actualWidth: number, theme: string): number {
  return sharedActualToThemeJsonStrokeWidth(actualWidth, theme);
}