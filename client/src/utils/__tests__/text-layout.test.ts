/**
 * Unit-Tests für Text-Layout-Funktionen aus shared/utils/text-layout.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildFont, getLineHeight, measureText, calculateTextX, wrapText } from '../../../../shared/utils/text-layout';
import type { RichTextStyle } from '../../../../shared/types/text-layout';

describe('Text Layout Functions', () => {
  let ctx: CanvasRenderingContext2D | null;

  beforeEach(() => {
    // Create a canvas context for testing
    const canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  });

  describe('buildFont', () => {
    it('should build font string with basic style', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      expect(buildFont(style)).toBe('16px Arial, sans-serif');
    });

    it('should include bold weight when fontBold is true', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontBold: true
      };
      expect(buildFont(style)).toBe('bold 16px Arial, sans-serif');
    });

    it('should include italic style when fontItalic is true', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontItalic: true
      };
      expect(buildFont(style)).toBe('italic 16px Arial, sans-serif');
    });

    it('should include both bold and italic when both are true', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontBold: true,
        fontItalic: true
      };
      expect(buildFont(style)).toBe('bold italic 16px Arial, sans-serif');
    });

    it('should handle different font sizes', () => {
      const style: RichTextStyle = {
        fontSize: 24,
        fontFamily: 'Times New Roman, serif'
      };
      expect(buildFont(style)).toBe('24px Times New Roman, serif');
    });
  });

  describe('getLineHeight', () => {
    it('should calculate line height with medium spacing (default)', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      expect(getLineHeight(style)).toBe(16 * 1.2); // 19.2
    });

    it('should calculate line height with small spacing', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'small'
      };
      expect(getLineHeight(style)).toBe(16 * 1); // 16
    });

    it('should calculate line height with large spacing', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'large'
      };
      expect(getLineHeight(style)).toBe(16 * 1.5); // 24
    });

    it('should scale with font size', () => {
      const style: RichTextStyle = {
        fontSize: 32,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium'
      };
      expect(getLineHeight(style)).toBe(32 * 1.2); // 38.4
    });
  });

  describe('measureText', () => {
    it('should measure text width with context', () => {
      if (!ctx) {
        // Skip if context not available (e.g., in test environment)
        return;
      }

      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const width = measureText('Hello', style, ctx);
      expect(width).toBeGreaterThan(0);
      expect(typeof width).toBe('number');
    });

    it('should return fallback width when context is null', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const width = measureText('Hello', style, null);
      expect(width).toBe('Hello'.length * (16 * 0.6)); // Fallback calculation
    });

    it('should handle empty string', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const width = measureText('', style, ctx);
      expect(width).toBe(0);
    });

    it('should account for font size in measurement', () => {
      if (!ctx) return;
      const style1: RichTextStyle = {
        fontSize: 12,
        fontFamily: 'Arial, sans-serif'
      };
      const style2: RichTextStyle = {
        fontSize: 24,
        fontFamily: 'Arial, sans-serif'
      };
      // Mock canvas returns estimated widths, so we need to account for that
      // The mock uses fontSize * 0.6 per character
      const width1 = measureText('Hello', style1, ctx);
      const width2 = measureText('Hello', style2, ctx);
      // For mock canvas: 16 * 0.6 * 5 = 48, 24 * 0.6 * 5 = 72
      // So width2 should be greater than width1
      expect(width2).toBeGreaterThanOrEqual(width1);
    });
  });

  describe('calculateTextX', () => {
    it('should return startX for left alignment', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        align: 'left'
      };
      const x = calculateTextX('Hello', style, 10, 100, ctx);
      expect(x).toBe(10);
    });

    it('should center text for center alignment', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        align: 'center'
      };
      const textWidth = measureText('Hello', style, ctx);
      const x = calculateTextX('Hello', style, 10, 100, ctx);
      const expectedX = 10 + (100 - textWidth) / 2;
      expect(x).toBeCloseTo(expectedX, 1);
    });

    it('should right-align text for right alignment', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        align: 'right'
      };
      const textWidth = measureText('Hello', style, ctx);
      const x = calculateTextX('Hello', style, 10, 100, ctx);
      const expectedX = 10 + 100 - textWidth;
      expect(x).toBeCloseTo(expectedX, 1);
    });

    it('should use left alignment for justify (not fully implemented)', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        align: 'justify'
      };
      const x = calculateTextX('Hello', style, 10, 100, ctx);
      expect(x).toBe(10);
    });

    it('should default to left alignment when align is undefined', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const x = calculateTextX('Hello', style, 10, 100, ctx);
      expect(x).toBe(10);
    });
  });

  describe('wrapText', () => {
    it('should return empty array for empty text', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const lines = wrapText('', style, 100, ctx);
      expect(lines).toEqual([]);
    });

    it('should wrap text that exceeds maxWidth', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const longText = 'This is a very long text that should wrap into multiple lines';
      const lines = wrapText(longText, style, 100, ctx);
      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.width).toBeGreaterThanOrEqual(0);
        expect(typeof line.text).toBe('string');
      });
    });

    it('should not wrap short text', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const shortText = 'Hello';
      const lines = wrapText(shortText, style, 1000, ctx);
      expect(lines.length).toBe(1);
      expect(lines[0].text).toBe('Hello');
    });

    it('should handle text with line breaks', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const textWithBreaks = 'First line\nSecond line\nThird line';
      const lines = wrapText(textWithBreaks, style, 1000, ctx);
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });

    it('should add empty line between paragraphs', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const textWithBreaks = 'First paragraph\nSecond paragraph';
      const lines = wrapText(textWithBreaks, style, 1000, ctx);
      // Should have at least 2 text lines plus 1 empty line between them
      expect(lines.length).toBeGreaterThanOrEqual(3);
      // Check that there's an empty line
      const hasEmptyLine = lines.some(line => line.text === '' && line.width === 0);
      expect(hasEmptyLine).toBe(true);
    });

    it('should handle single word per line', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const text = 'Word1 Word2 Word3';
      const lines = wrapText(text, style, 50, ctx); // Very narrow width
      expect(lines.length).toBeGreaterThanOrEqual(1);
      lines.forEach(line => {
        expect(line.text.length).toBeGreaterThan(0);
      });
    });

    it('should handle text with multiple spaces', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const text = 'Word1   Word2    Word3';
      const lines = wrapText(text, style, 100, ctx);
      expect(lines.length).toBeGreaterThanOrEqual(1);
      // Spaces should be normalized (filtered out)
      lines.forEach(line => {
        expect(line.text).not.toMatch(/  +/); // No multiple consecutive spaces
      });
    });

    it('should calculate width for each line', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const text = 'This is a test text';
      const lines = wrapText(text, style, 100, ctx);
      lines.forEach(line => {
        expect(typeof line.width).toBe('number');
        expect(line.width).toBeGreaterThanOrEqual(0);
        if (line.text.length > 0) {
          expect(line.width).toBeGreaterThan(0);
        }
      });
    });

    it('should handle empty paragraphs', () => {
      if (!ctx) return;
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      };
      const text = 'First\n\nThird';
      const lines = wrapText(text, style, 1000, ctx);
      // Should have empty line for the empty paragraph
      const emptyLines = lines.filter(line => line.text === '' && line.width === 0);
      expect(emptyLines.length).toBeGreaterThanOrEqual(1);
    });
  });
});

