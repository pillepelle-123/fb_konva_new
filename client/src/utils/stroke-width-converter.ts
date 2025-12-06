// Stroke width conversion between common scale (1-100) and actual theme values

export interface ThemeStrokeRange {
  min: number;
  max: number;
}

export const THEME_STROKE_RANGES: Record<string, ThemeStrokeRange> = {
  default: { min: 1, max: 100 },
  rough: { min: 1, max: 100 },
  glow: { min: 1, max: 50 },
  candy: { min: 14, max: 50 },
  zigzag: { min: 1, max: 20 },
  wobbly: { min: 1, max: 50 }
};

export function commonToActualStrokeWidth(commonWidth: number, theme: string): number {
  // If 0, return 0 (no border)
  if (commonWidth === 0) {
    return 0;
  }
  const range = THEME_STROKE_RANGES[theme] || THEME_STROKE_RANGES.default;
  // Clamp to 1-100 range (0 is handled above)
  const normalizedWidth = Math.max(1, Math.min(100, commonWidth));
  // Map 1-100 to range.min - range.max
  return range.min + ((normalizedWidth - 1) / 99) * (range.max - range.min);
}

// Convert from actual theme stroke width to common scale (0-100)
// 0 = no border, 1 = min value of theme, 100 = max value of theme
export function actualToCommonStrokeWidth(actualWidth: number, theme: string): number {
  // If 0, return 0 (no border)
  if (actualWidth === 0) {
    return 0;
  }
  const range = THEME_STROKE_RANGES[theme] || THEME_STROKE_RANGES.default;
  // Clamp to theme range
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
export function getMaxCommonWidth(): number {
  return 100;
}

// Get minimum actual stroke width for a theme
export function getMinActualStrokeWidth(theme: string): number {
  const range = THEME_STROKE_RANGES[theme] || THEME_STROKE_RANGES.default;
  return range.min;
}

// Convert themes.json stroke width (common scale) to actual theme stroke width
// This ensures themes.json values are treated as common scale values
export function themeJsonToActualStrokeWidth(themeJsonWidth: number, theme: string): number {
  return commonToActualStrokeWidth(themeJsonWidth, theme);
}

// Convert actual theme stroke width back to themes.json format (common scale)
export function actualToThemeJsonStrokeWidth(actualWidth: number, theme: string): number {
  return actualToCommonStrokeWidth(actualWidth, theme);
}