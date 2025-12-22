import type { Page } from '../../context/editor-context';
import { getPalettePartColor } from '../data/templates/color-palettes';
import { colorPalettes } from '../data/templates/color-palettes';
import { getThemePaletteId } from './global-themes';

/**
 * Converts a hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Converts RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(Math.round(r)) + toHex(Math.round(g)) + toHex(Math.round(b));
}

/**
 * Calculates the relative luminance of a color (0-1)
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Adjusts a color to create a subtle contrast (darker or lighter)
 * Returns a color that is slightly different from the background for visibility
 * 
 * @param color - The base color (hex, rgb, or rgba format)
 * @param amount - The adjustment amount (0-1), default 0.15
 * @returns A hex color string with adjusted contrast
 */
export function adjustColorForContrast(color: string, amount: number = 0.15): string {
  // Normalize color format - handle hex, rgb, rgba, named colors
  let rgb: { r: number; g: number; b: number } | null = null;
  
  // Handle hex colors
  if (color.startsWith('#')) {
    rgb = hexToRgb(color);
  }
  // Handle rgb/rgba colors
  else if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      rgb = {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }
  }
  
  // Fallback to default if color couldn't be parsed
  if (!rgb) {
    return '#e5e7eb'; // Default light gray
  }
  
  // Calculate luminance to determine if we should darken or lighten
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  
  // If background is light (luminance > 0.5), darken the stroke
  // If background is dark (luminance <= 0.5), lighten the stroke
  const adjustFactor = luminance > 0.5 ? -amount : amount;
  
  // Adjust each RGB channel
  const adjustedR = Math.max(0, Math.min(255, rgb.r + (adjustFactor * 255)));
  const adjustedG = Math.max(0, Math.min(255, rgb.g + (adjustFactor * 255)));
  const adjustedB = Math.max(0, Math.min(255, rgb.b + (adjustFactor * 255)));
  
  return rgbToHex(adjustedR, adjustedG, adjustedB);
}

/**
 * Gets the background color of a page for calculating contrast
 * 
 * @param page - The page object
 * @param getPaletteForPage - Optional function to get palette for a page (for dependency injection)
 * @returns The background color as a hex string
 */
export function getPageBackgroundColor(
  page?: Page | null,
  getPaletteForPage?: (page?: Page | null) => { paletteId: string | null | undefined; palette: any | null }
): string {
  if (!page?.background) {
    return '#ffffff'; // Default white
  }
  
  const background = page.background;
  
  if (background.type === 'color') {
    return background.value || '#ffffff';
  }
  
  if (background.type === 'pattern') {
    // For patterns, use the space color (background between pattern elements)
    if (!getPaletteForPage) {
      return '#ffffff';
    }
    const { palette } = getPaletteForPage(page);
    const normalizedPalette = palette || undefined;
    const palettePatternFill = getPalettePartColor(
      normalizedPalette,
      'pagePatternBackground',
      'background',
      '#ffffff'
    ) || '#ffffff';
    return background.patternForegroundColor || palettePatternFill;
  }
  
  if (background.type === 'image') {
    // For images, use the palette background color as fallback
    if (!getPaletteForPage) {
      return '#ffffff';
    }
    const { palette } = getPaletteForPage(page);
    const normalizedPalette = palette || undefined;
    return getPalettePartColor(
      normalizedPalette,
      'pageBackground',
      'background',
      '#ffffff'
    ) || '#ffffff';
  }
  
  return '#ffffff'; // Default fallback
}

/**
 * Calculates a contrast color for UI elements (like borders, strokes) based on a page background
 * This ensures UI elements are visible but not too intrusive against the page background
 * 
 * @param page - The page object to calculate contrast for
 * @param getPaletteForPage - Optional function to get palette for a page (for dependency injection)
 * @param contrastAmount - The adjustment amount (0-1), default 0.15
 * @returns A hex color string with appropriate contrast
 */
export function calculateContrastColor(
  page?: Page | null,
  getPaletteForPage?: (page?: Page | null) => { paletteId: string | null | undefined; palette: any | null },
  contrastAmount: number = 0.15
): string {
  const bgColor = getPageBackgroundColor(page, getPaletteForPage);
  return adjustColorForContrast(bgColor, contrastAmount);
}

