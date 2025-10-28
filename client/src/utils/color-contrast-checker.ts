import type { ColorPalette } from '../types/template-types';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

export function meetsWCAGStandard(ratio: number, level: 'AA' | 'AAA'): boolean {
  const thresholds = {
    'AA': 4.5,
    'AAA': 7.0
  };
  return ratio >= thresholds[level];
}

export function suggestTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export function validatePaletteAccessibility(palette: ColorPalette): {
  valid: boolean;
  issues: string[];
  ratios: Record<string, number>;
} {
  const issues: string[] = [];
  const ratios: Record<string, number> = {};
  
  // Check text on background
  const textBgRatio = calculateContrastRatio(palette.colors.text, palette.colors.background);
  ratios.textBackground = textBgRatio;
  if (!meetsWCAGStandard(textBgRatio, 'AA')) {
    issues.push(`Text on background contrast ratio (${textBgRatio.toFixed(2)}) fails WCAG AA`);
  }
  
  // Check primary on background
  const primaryBgRatio = calculateContrastRatio(palette.colors.primary, palette.colors.background);
  ratios.primaryBackground = primaryBgRatio;
  if (!meetsWCAGStandard(primaryBgRatio, 'AA')) {
    issues.push(`Primary on background contrast ratio (${primaryBgRatio.toFixed(2)}) fails WCAG AA`);
  }
  
  // Check secondary on background
  const secondaryBgRatio = calculateContrastRatio(palette.colors.secondary, palette.colors.background);
  ratios.secondaryBackground = secondaryBgRatio;
  if (!meetsWCAGStandard(secondaryBgRatio, 'AA')) {
    issues.push(`Secondary on background contrast ratio (${secondaryBgRatio.toFixed(2)}) fails WCAG AA`);
  }
  
  // Check text on primary
  const textPrimaryRatio = calculateContrastRatio(palette.colors.text, palette.colors.primary);
  ratios.textPrimary = textPrimaryRatio;
  if (!meetsWCAGStandard(textPrimaryRatio, 'AA')) {
    issues.push(`Text on primary contrast ratio (${textPrimaryRatio.toFixed(2)}) fails WCAG AA`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    ratios
  };
}