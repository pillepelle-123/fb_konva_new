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
 * Build font string from style
 */
export function buildFont(style: RichTextStyle): string {
  const weight = style.fontBold ? 'bold ' : '';
  const italic = style.fontItalic ? 'italic ' : '';
  return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
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
        if (testWidth > maxWidth && currentLine) {
          lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
    }
    if (paragraphIdx < paragraphs.length - 1) {
      lines.push({ text: '', width: 0 });
    }
  });
  return lines;
}

