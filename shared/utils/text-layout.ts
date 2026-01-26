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
 * Measure text width for wrapping decisions
 * Uses metrics.width (not actualBoundingBoxRight) to prevent premature line breaks
 * actualBoundingBoxRight can be significantly larger than the actual rendered width,
 * causing words to break too early. Using width ensures consistent wrapping behavior.
 * 
 * CRITICAL: In PDF export context, font measurement can differ from browser rendering.
 * We use a larger tolerance to account for measurement differences between environments.
 */
function measureTextForWrapping(text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null): number {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(text);
  
  // CRITICAL FIX: Match app behavior exactly for wrapping decisions
  // The app uses actualBoundingBoxRight if available (even if smaller than width)
  // This is critical because actualBoundingBoxRight can be more accurate for some fonts
  // In PDF export, we need to match this behavior exactly to prevent premature breaks
  const isPdfExport = typeof window !== 'undefined' && (window as any).__PDF_EXPORT__ === true;
  
  let textWidth: number;
  
  if (metrics.actualBoundingBoxRight !== undefined) {
    // CRITICAL: Use actualBoundingBoxRight if available (matches app behavior exactly)
    // This is what the app does - it uses actualBoundingBoxRight whenever available,
    // regardless of whether it's larger or smaller than width
    // For fonts like "Give You Glory", actualBoundingBoxRight (1873.48) is smaller than width (1877.69),
    // which is why the app doesn't break prematurely but PDF does
    textWidth = metrics.actualBoundingBoxRight;
  } else {
    // Fallback: use width with small safety margin
    const safetyMargin = isPdfExport ? style.fontSize * 0.05 : style.fontSize * 0.05;
    textWidth = metrics.width + safetyMargin;
  }
  
  ctx.restore();
  return textWidth;
}

/**
 * Measure text width for positioning
 * Uses actualBoundingBoxRight if available to account for glyph overhangs and swashes
 * This is important for correct text positioning, especially for fonts with decorative elements
 */
export function measureText(text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null): number {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  ctx.textBaseline = 'alphabetic'; // Match rendering baseline
  const metrics = ctx.measureText(text);

  // Use actualBoundingBoxRight for positioning (to account for overhangs/swashes)
  // This ensures correct text positioning, especially for fonts with decorative elements
  let textWidth: number;
  if (metrics.actualBoundingBoxRight !== undefined) {
    textWidth = metrics.actualBoundingBoxRight;
  } else {
    // Fallback: use width with safety margin
    const safetyMargin = style.fontSize * 0.12; // 12% of font size as safety margin
    textWidth = metrics.width + safetyMargin;
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
  // DEBUG: Log maxWidth when called from PDF export
  if (typeof window !== 'undefined' && (window as any).__PDF_EXPORT__ && text.length > 0) {
    console.log('[DEBUG wrapText] Called with maxWidth:', Math.round(maxWidth * 100) / 100, 'for text:', text.substring(0, 30));
  }
  
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
        // CRITICAL FIX: Use measureTextForWrapping (metrics.width) instead of measureText (actualBoundingBoxRight)
        // for wrapping decisions. actualBoundingBoxRight can be significantly larger than width,
        // causing premature line breaks. Using width ensures words only break when they truly don't fit.
        const testWidth = measureTextForWrapping(testLine, style, ctx);
        
        // DEBUG: Log all line break checks to diagnose the issue
        if (typeof window !== 'undefined' && (window as any).__PDF_EXPORT__) {
          // Calculate tolerance using the same logic as below (only in PDF export)
          const isPdfExport = typeof window !== 'undefined' && (window as any).__PDF_EXPORT__ === true;
          let tolerance = 0;
          if (isPdfExport) {
            tolerance = style.fontSize * 0.3; // Base tolerance: 30% of fontSize
            if (style.fontSize > 100) {
              tolerance += style.fontSize * 0.4; // Additional 40% for fonts > 100px
            }
          }
          const willBreak = testWidth > maxWidth + tolerance;
          // Log all cases where testWidth is close to or exceeds maxWidth
          if (testWidth > maxWidth * 0.85 || willBreak) {
            // Also log metrics to understand measurement differences
            let metricsInfo: any = {};
            let toleranceInfo: any = {};
            if (ctx) {
              ctx.save();
              ctx.font = buildFont(style);
              ctx.textBaseline = 'alphabetic';
              const testMetrics = ctx.measureText(testLine);
              const metricsDiff = testMetrics.actualBoundingBoxRight !== undefined
                ? testMetrics.actualBoundingBoxRight - testMetrics.width
                : 0;
              
              metricsInfo = {
                width: Math.round(testMetrics.width * 100) / 100,
                actualBoundingBoxRight: testMetrics.actualBoundingBoxRight !== undefined 
                  ? Math.round(testMetrics.actualBoundingBoxRight * 100) / 100 
                  : 'undefined',
                difference: Math.round(metricsDiff * 100) / 100
              };
              
              // Calculate tolerance info (for debugging)
              if (testMetrics.actualBoundingBoxRight !== undefined) {
                toleranceInfo = {
                  width: Math.round(testMetrics.width * 100) / 100,
                  actualBoundingBoxRight: Math.round(testMetrics.actualBoundingBoxRight * 100) / 100,
                  difference: Math.round(metricsDiff * 100) / 100,
                  usedForWrapping: testMetrics.actualBoundingBoxRight !== undefined ? 'actualBoundingBoxRight' : 'width'
                };
              }
              
              ctx.restore();
            }
            
            console.log('[PDF wrapText] Line break check:', 
              'testLine:', testLine.substring(0, 50),
              'testWidth:', Math.round(testWidth * 100) / 100,
              'maxWidth:', Math.round(maxWidth * 100) / 100,
              'tolerance:', Math.round(tolerance * 100) / 100,
              'effectiveMax:', Math.round((maxWidth + tolerance) * 100) / 100,
              'difference:', Math.round((testWidth - maxWidth) * 100) / 100,
              'willBreak:', willBreak,
              'fontSize:', style.fontSize,
              'fontFamily:', style.fontFamily?.substring(0, 30),
              'metrics:', JSON.stringify(metricsInfo),
              'toleranceInfo:', JSON.stringify(toleranceInfo),
              'ratio:', Math.round((testWidth / maxWidth) * 1000) / 1000
            );
          }
        }
        
        // CRITICAL FIX: Add tolerance ONLY in PDF export context to match app behavior
        // Even though we're using actualBoundingBoxRight (like the app), there can be
        // measurement differences between browser and PDF export contexts, especially
        // for rotated textboxes and certain fonts like "Give You Glory".
        // In the app, we use testWidth > maxWidth directly (no tolerance).
        // In PDF export, we need tolerance to compensate for measurement differences.
        const isPdfExport = typeof window !== 'undefined' && (window as any).__PDF_EXPORT__ === true;
        let tolerance = 0;
        if (isPdfExport) {
          // For large font sizes, the tolerance needs to be higher to account for measurement differences.
          // Adaptive tolerance: base tolerance (30%) plus additional tolerance for large fonts
          // This ensures that large fonts (e.g., fontSize 208) get sufficient tolerance to prevent premature breaks.
          tolerance = style.fontSize * 0.3; // Base tolerance: 30% of fontSize
          if (style.fontSize > 100) {
            // For large fonts, add additional tolerance proportional to fontSize
            // This accounts for larger measurement discrepancies with large fonts
            tolerance += style.fontSize * 0.4; // Additional 40% for fonts > 100px
          }
        }
        // In app: testWidth > maxWidth (no tolerance)
        // In PDF: testWidth > maxWidth + tolerance (with adaptive tolerance)
        if (testWidth > maxWidth + tolerance && currentLine) {
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

