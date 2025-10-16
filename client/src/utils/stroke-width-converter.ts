// Stroke width conversion between common scale (1-100) and actual theme values

export interface ThemeStrokeRange {
  min: number;
  max: number;
}

export const THEME_STROKE_RANGES: Record<string, ThemeStrokeRange> = {
  default: { min: 1, max: 100 },
  rough: { min: 1, max: 100 },
  glow: { min: 1, max: 50 },
  candy: { min: 15, max: 100 },
  zigzag: { min: 4, max: 24 },
  wobbly: { min: 6, max: 500 }
};

// Convert from common scale (1-100) to actual theme stroke width
export function commonToActualStrokeWidth(commonWidth: number, theme: string): number {
  const range = THEME_STROKE_RANGES[theme] || THEME_STROKE_RANGES.default;
  const normalizedWidth = Math.max(1, Math.min(100, commonWidth));
    // console.log('Common: ' + commonWidth)
    // console.log('Actual Return: ' + Math.round(range.min + ((normalizedWidth - 1) / 99) * (range.max - range.min)))
return Math.round(range.min + ((normalizedWidth - 1) / 99) * (range.max - range.min));
}

// Convert from actual theme stroke width to common scale (1-100)
export function actualToCommonStrokeWidth(actualWidth: number, theme: string): number {
  const range = THEME_STROKE_RANGES[theme] || THEME_STROKE_RANGES.default;
  const clampedWidth = Math.max(range.min, Math.min(range.max, actualWidth));
  // console.log('Actual: ' + actualWidth)
  // console.log('Common Return: ' + Math.round(1 + ((clampedWidth - range.min) / (range.max - range.min)) * 99))
  return Math.round(1 + ((clampedWidth - range.min) / (range.max - range.min)) * 99);
}

// Get max common width for sliders
export function getMaxCommonWidth(): number {
  return 100;
}