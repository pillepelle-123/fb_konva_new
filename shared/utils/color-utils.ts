/**
 * TypeScript wrapper for color-utils.js
 * Provides type-safe access to color utility functions
 */

/**
 * Normalize color to hex format for consistent rendering
 * Converts various color formats (rgb, rgba, hsl, named colors) to hex
 */
export function normalizeColor(color: string | undefined | null): string {
  if (!color) return '#000000';
  
  // Already hex format
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    // Normalize 3-digit hex to 6-digit
    if (hex.length === 3) {
      return '#' + hex.split('').map(c => c + c).join('').toLowerCase();
    }
    // Normalize 6-digit hex
    if (hex.length === 6) {
      return '#' + hex.toLowerCase();
    }
    return '#000000';
  }
  
  // RGB/RGBA format
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      // Convert to hex (ignore alpha for now, as Konva handles opacity separately)
      const toHex = (n: number) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return '#' + toHex(r) + toHex(g) + toHex(b);
    }
  }
  
  // HSL format (simplified - convert to RGB then hex)
  if (color.startsWith('hsl')) {
    // For now, return as-is and let Konva handle it
    // Full HSL to RGB conversion would be more complex
    return color;
  }
  
  // Named colors - return as-is (Konva supports CSS named colors)
  return color;
}

/**
 * Convert hex color to RGBA
 */
export function hexToRgba(hex: string, opacity: number): string {
  // Normalize hex first
  const normalized = normalizeColor(hex);
  const cleanHex = normalized.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Apply fill opacity to a color
 */
export function applyFillOpacity(
  fill: string | undefined | null,
  fillOpacity: number | undefined,
  elementOpacity: number = 1
): string | undefined | null {
  if (!fill || fill === 'transparent' || fillOpacity === undefined) {
    return fill;
  }
  
  const finalFillOpacity = fillOpacity * elementOpacity;
  
  // Check if already rgba
  if (fill.startsWith('rgba')) {
    // Extract RGB values from rgba and replace alpha with finalFillOpacity
    const rgbaMatch = fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${finalFillOpacity})`;
    }
    return fill;
  }
  
  // Check if rgb (without alpha)
  if (fill.startsWith('rgb')) {
    // Extract RGB values from rgb and add alpha with finalFillOpacity
    const rgbMatch = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalFillOpacity})`;
    }
    return fill;
  }
  
  // Check if hex
  if (fill.startsWith('#')) {
    return hexToRgba(fill, finalFillOpacity);
  }
  
  // Named colors or other formats - return as is
  return fill;
}

/**
 * Apply stroke opacity to a color
 */
export function applyStrokeOpacity(
  stroke: string | undefined | null,
  strokeOpacity: number | undefined,
  elementOpacity: number = 1
): string | undefined | null {
  if (!stroke || strokeOpacity === undefined || strokeOpacity === 1) {
    return stroke;
  }
  
  const finalStrokeOpacity = strokeOpacity * elementOpacity;
  
  // Check if already rgba/rgb
  if (stroke.startsWith('rgba') || stroke.startsWith('rgb')) {
    // Extract RGB values and apply opacity
    const rgbMatch = stroke.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalStrokeOpacity})`;
    }
    return stroke;
  }
  
  // Check if hex
  if (stroke.startsWith('#')) {
    return hexToRgba(stroke, finalStrokeOpacity);
  }
  
  // Named colors or other formats - return as is
  return stroke;
}

