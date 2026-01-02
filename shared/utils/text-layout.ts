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
 * Resolve font family string (matches client-side resolveFontFamily logic)
 * If fontFamily is already a full CSS string (contains comma), use it directly
 * Otherwise, normalize it
 */
export function resolveFontFamily(
  fontFamily: string | undefined,
  isBold: boolean = false,
  isItalic: boolean = false
): string {
  if (!fontFamily) {
    return 'Arial, sans-serif';
  }
  
  // Remove outer quotes but keep internal structure
  let cleaned = fontFamily.replace(/^['"]|['"]$/g, '').trim();
  
  // If it's already a full CSS font family string (contains comma), use it directly
  // This matches client-side behavior where fontFamily is stored as full CSS string
  if (cleaned.includes(',')) {
    // Already a full CSS font family string - use it directly (like client does)
    // Ensure font names with spaces are properly quoted for CSS
    const parts = cleaned.split(',').map(part => part.trim());
    if (parts.length > 0) {
      let fontName = parts[0];
      // Remove any existing quotes first (might be malformed like "Mynerve')
      fontName = fontName.replace(/^['"]|['"]$/g, '');
      // If font name contains spaces, quote it
      if (fontName.includes(' ')) {
        parts[0] = `'${fontName}'`;
      } else {
        parts[0] = fontName;
      }
      cleaned = parts.join(', ');
    }
    // Match client-side: fontFamily.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '')
    // Client removes all quotes after processing
    cleaned = cleaned.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '').trim();
    return cleaned;
  }
  
  // Otherwise, treat it as a font name
  // In server context, we don't have getFontFamilyByName, so we just normalize
  // The font should already be a full CSS string in most cases
  // Match client-side normalization: remove all quotes and normalize
  let normalized = cleaned.replace(/['"]/g, '').trim();
  
  // Normalize spacing around commas (if any)
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
 * Normalize font family string to ensure consistent rendering
 * Removes quotes and normalizes spacing
 * @deprecated Use resolveFontFamily instead for better compatibility with client
 */
export function normalizeFontFamily(fontFamily: string | undefined): string {
  return resolveFontFamily(fontFamily);
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
  ctx.textBaseline = 'alphabetic'; // Match rendering baseline
  const metrics = ctx.measureText(text);

  // Use actualBoundingBoxRight to account for glyph overhangs and swashes
  // This is critical for fonts like "Tourney", "Audiowide", and "Bilbo Swash Caps"
  // actualBoundingBoxRight is the distance from text origin to the right edge
  // This includes all overhangs, which width does not
  let textWidth: number;
  if (metrics.actualBoundingBoxRight !== undefined) {
    // actualBoundingBoxRight is the actual rendered right edge including all overhangs/swashes
    textWidth = metrics.actualBoundingBoxRight;

    // DEBUG: Log when actualBoundingBoxRight is used
    if (typeof window !== 'undefined' && (window as any).__PDF_EXPORT__) {
      console.log('[PDF measureText] Using actualBoundingBoxRight:', {
        text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
        font: ctx.font,
        actualBoundingBoxRight: metrics.actualBoundingBoxRight,
        width: metrics.width,
        difference: metrics.actualBoundingBoxRight - metrics.width
      });
    }
  } else {
    // Fallback: use standard width measurement with safety margin for glyph overhangs
    // Some fonts have significant overhangs that width doesn't account for
    // Add a safety margin based on font size (typically 5-10% for fonts with overhangs)
    const safetyMargin = style.fontSize * 0.12; // 12% of font size as safety margin
    textWidth = metrics.width + safetyMargin;

    // DEBUG: Log when fallback is used
    if (typeof window !== 'undefined' && (window as any).__PDF_EXPORT__) {
      console.log('[PDF measureText] Using fallback with safety margin:', {
        text: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
        font: ctx.font,
        width: metrics.width,
        safetyMargin: safetyMargin,
        totalWidth: textWidth
      });
    }
  }

  ctx.restore();
  return textWidth;
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
 * List of fonts known to have glyph overhangs that can cause text to overflow
 * These fonts need special handling in PDF export
 */
const FONTS_WITH_GLYPH_OVERHANGS = [
  'Tourney',
  'Audiowide',
  'Bilbo Swash Caps',
  'Silkscreen',
  'Turret Road',
  'Bungee Hairline',
  'Rubik Glitch',
  'Bonheur Royale',
  'Dr Sugiyama',
  'Aguafina Script'
];

/**
 * Check if a font family has glyph overhangs
 */
function hasGlyphOverhangs(fontFamily: string): boolean {
  // Extract font name from CSS string (remove quotes and take first font)
  const fontName = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
  const result = FONTS_WITH_GLYPH_OVERHANGS.includes(fontName);

  // DEBUG: Log result for Times New Roman
  if (typeof window !== 'undefined' && (window as any).__PDF_EXPORT__ && fontFamily.includes('Times New Roman')) {
    console.log('[PDF hasGlyphOverhangs] fontFamily:', fontFamily, 'fontName:', fontName, 'result:', result);
  }

  return result;
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
        
        // IMPORTANT: Add safety margin for glyph overhangs when actualBoundingBoxRight is not available
        // Some fonts (like "Tourney") have significant overhangs that width doesn't account for
        // We add a small percentage-based margin to ensure text doesn't overflow
        let adjustedTestWidth = testWidth;
        if (ctx) {
          ctx.save();
          ctx.font = buildFont(style);
          ctx.textBaseline = 'alphabetic';
          const metrics = ctx.measureText(testLine);
          ctx.restore();
          
          // If actualBoundingBoxRight is not available, add a safety margin
          // This accounts for glyph overhangs that width doesn't measure
          // Use a percentage of font size (typically 5-10% for fonts with overhangs)
          if (metrics.actualBoundingBoxRight === undefined) {
            const safetyMargin = style.fontSize * 0.12; // 12% of font size as safety margin
            adjustedTestWidth = testWidth + safetyMargin;

            // DEBUG: Log wrapText safety margin usage
            if (typeof window !== 'undefined' && (window as any).__PDF_EXPORT__) {
              console.log('[PDF wrapText] Adding safety margin:', {
                testLine: testLine.substring(0, 30) + (testLine.length > 30 ? '...' : ''),
                font: ctx.font,
                originalWidth: testWidth,
                safetyMargin: safetyMargin,
                adjustedWidth: adjustedTestWidth,
                maxWidth: maxWidth
              });
            }
          }
        }
        
        // IMPORTANT: Use Math.ceil to round up testWidth to account for sub-pixel rendering differences
        // Canvas2D measureText can have small rounding errors that cause premature line breaks
        // Rounding up ensures we don't break too early, matching client-side behavior
        // This is more reliable than a fixed tolerance

        // CRITICAL FIX: For PDF export only, reduce available width by 15% for fonts with glyph overhangs
        // Only applies to known problematic fonts to avoid affecting normal fonts like Times New Roman
        const hasOverhangs = hasGlyphOverhangs(style.fontFamily);
        const effectiveMaxWidth = (typeof window !== 'undefined' && (window as any).__PDF_EXPORT__ && hasOverhangs)
          ? maxWidth * 0.85
          : maxWidth;

        const roundedTestWidth = Math.ceil(testWidth);
        if (roundedTestWidth > effectiveMaxWidth && currentLine) {
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

