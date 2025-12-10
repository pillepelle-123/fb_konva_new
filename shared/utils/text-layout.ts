/**
 * Plattformunabhängige Text-Layout-Funktionen
 * Exakte Kopie der Client-Implementierung für gemeinsame Nutzung
 */

import type { RichTextStyle, TextLine } from '../types/text-layout';

const LINE_HEIGHT: Record<'small' | 'medium' | 'large', number> = {
  small: 1,
  medium: 1.2,
  large: 1.5
};

/**
 * Normalize font family string to ensure consistent rendering
 * Removes quotes and normalizes spacing
 */
export function normalizeFontFamily(fontFamily: string | undefined): string {
  if (!fontFamily) return 'Arial, sans-serif';
  
  // Remove outer quotes but keep internal structure
  let normalized = fontFamily.replace(/^['"]|['"]$/g, '').trim();
  
  // Remove all internal quotes (they can cause issues)
  normalized = normalized.replace(/['"]/g, '');
  
  // Normalize spacing around commas
  normalized = normalized.replace(/\s*,\s*/g, ', ');
  
  // Trim again after normalization
  normalized = normalized.trim();
  
  // Ensure we have a valid font family
  if (!normalized || normalized === '') {
    return 'Arial, sans-serif';
  }
  
  return normalized;
}

/**
 * Build font string from style
 */
export function buildFont(style: RichTextStyle): string {
  const weight = style.fontBold ? 'bold ' : '';
  const italic = style.fontItalic ? 'italic ' : '';
  const normalizedFamily = normalizeFontFamily(style.fontFamily);
  return `${weight}${italic}${style.fontSize}px ${normalizedFamily}`;
}

/**
 * Get line height based on paragraph spacing
 */
export function getLineHeight(style: RichTextStyle): number {
  const spacing = style.paragraphSpacing || 'medium';
  return style.fontSize * (LINE_HEIGHT[spacing] ?? 1.2);
}

/**
 * Measure text width
 */
export function measureText(text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null): number {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

/**
 * Calculate text X position based on alignment
 */
export function calculateTextX(text: string, style: RichTextStyle, startX: number, availableWidth: number, ctx: CanvasRenderingContext2D | null): number {
  const align = style.align || 'left';
  const textWidth = measureText(text, style, ctx);
  
  switch (align) {
    case 'center':
      return startX + (availableWidth - textWidth) / 2;
    case 'right':
      return startX + availableWidth - textWidth;
    case 'justify':
      // For justify, we'll use left alignment for now
      // Full justify implementation would require word spacing adjustment
      return startX;
    case 'left':
    default:
      return startX;
  }
}

/**
 * Wrap text into lines
 */
export function wrapText(text: string, style: RichTextStyle, maxWidth: number, ctx: CanvasRenderingContext2D | null): TextLine[] {
  const lines: TextLine[] = [];
  if (!text) return lines;
  const paragraphs = text.split('\n');
  paragraphs.forEach((paragraph, paragraphIdx) => {
    const words = paragraph.split(' ').filter(Boolean);
    if (words.length === 0) {
      lines.push({ text: '', width: 0 });
    } else {
      let currentLine = words[0];
      for (let i = 1; i < words.length; i += 1) {
        const word = words[i];
        const testLine = `${currentLine} ${word}`;
        const testWidth = measureText(testLine, style, ctx);
        // IMPORTANT: Use Math.ceil to round up testWidth to account for sub-pixel rendering differences
        // Canvas2D measureText can have small rounding errors that cause premature line breaks
        // Rounding up ensures we don't break too early, matching client-side behavior
        // This is more reliable than a fixed tolerance
        const roundedTestWidth = Math.ceil(testWidth);
        if (roundedTestWidth > maxWidth && currentLine) {
          lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
    }
  });
  return lines;
}

/**
 * Calculate precise baseline offset for text rendering
 * Uses font metrics if available, otherwise falls back to approximation
 * @param fontSize - Font size in pixels
 * @param ctx - Optional canvas context for font metrics
 * @param fontFamily - Font family string
 * @param fontWeight - Optional font weight ('normal' or 'bold', default: 'normal')
 * @param fontStyle - Optional font style ('normal' or 'italic', default: 'normal')
 * @returns Baseline offset from top of text box
 */
export function getBaselineOffset(
  fontSize: number,
  ctx: CanvasRenderingContext2D | null = null,
  fontFamily: string = 'Arial, sans-serif',
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): number {
  // Try to get actual font metrics if context is available
  if (ctx) {
    try {
      // Build font string with weight and style for accurate metrics
      // Format: "weight style size family" (e.g., "bold italic 16px Arial, sans-serif")
      const weightStr = fontWeight !== 'normal' ? `${fontWeight} ` : '';
      const styleStr = fontStyle !== 'normal' ? `${fontStyle} ` : '';
      const testFont = `${weightStr}${styleStr}${fontSize}px ${fontFamily}`;
      
      ctx.save();
      ctx.font = testFont;
      ctx.textBaseline = 'alphabetic';
      
      // Measure text to get actual metrics
      // Use a representative character that has both ascenders and typical height
      // 'M' is good for ascent, but we can also try 'A' or use the first character of actual text
      // For now, use 'M' as it's a good reference for most fonts
      const metrics = ctx.measureText('M'); // Use 'M' as reference character
      
      // For alphabetic baseline, the offset is typically the distance from top to baseline
      // This is approximately fontSize * 0.8 for most fonts, but can vary
      // We can use actualBoundingBoxAscent if available (newer browsers)
      // actualBoundingBoxAscent is more accurate for actual text rendering
      // However, we need to ensure it matches the calculation used in textbox-qna.tsx
      // which uses fontSize * 0.8. If actualBoundingBoxAscent differs significantly,
      // we might need to use a weighted average or stick with fontSize * 0.8
      if (metrics.actualBoundingBoxAscent !== undefined) {
        const metricBasedOffset = metrics.actualBoundingBoxAscent;
        const fallbackOffset = fontSize * 0.8;
        // If the metric-based offset is very different from the fallback, 
        // we might need to use the fallback to match client-side behavior
        // For now, use the metric-based offset as it should be more accurate
        ctx.restore();
        // Return the actual ascent (distance from baseline to top of text)
        return metricBasedOffset;
      }
      
      ctx.restore();
    } catch (error) {
      // Fall through to approximation if measurement fails
    }
  }
  
  // Fallback: Use standard approximation (consistent with client)
  // This matches the 0.8 factor used throughout the codebase
  return fontSize * 0.8;
}

