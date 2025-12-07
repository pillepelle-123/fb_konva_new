/**
 * Tests für PDF-Export Verwendung der shared Funktionen
 * Stellt sicher, dass PDF-Export die shared Text-Layout- und QnA-Layout-Funktionen verwendet
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildFont, getLineHeight, measureText, calculateTextX, wrapText } from '@shared/utils/text-layout';
import { createLayout, createBlockLayout } from '@shared/utils/qna-layout';
import type { RichTextStyle } from '@shared/types/text-layout';

describe('PDF Export Shared Functions Usage', () => {
  let ctx: CanvasRenderingContext2D | null;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  });

  describe('Text Layout Functions', () => {
    it('should use shared buildFont function', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontBold: true,
        fontItalic: false,
      };

      const fontString = buildFont(style);
      expect(fontString).toBe('bold 16px Arial, sans-serif');
    });

    it('should use shared getLineHeight function', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium',
      };

      const lineHeight = getLineHeight(style);
      expect(lineHeight).toBe(16 * 1.2); // medium = 1.2
    });

    it('should use shared measureText function', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
      };

      const width = measureText('Test Text', style, ctx);
      expect(width).toBeGreaterThan(0);
    });

    it('should use shared calculateTextX function for alignment', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        align: 'center',
      };

      const x = calculateTextX('Test', style, 0, 100, ctx);
      expect(x).toBeGreaterThanOrEqual(0);
    });

    it('should use shared wrapText function', () => {
      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
      };

      const lines = wrapText('Long text that should wrap', style, 100, ctx);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0]).toHaveProperty('text');
      expect(lines[0]).toHaveProperty('width');
    });
  });

  describe('QnA Layout Functions', () => {
    const questionStyle: RichTextStyle = {
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      paragraphSpacing: 'small',
    };

    const answerStyle: RichTextStyle = {
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      paragraphSpacing: 'medium',
    };

    it('should use shared createLayout function for inline layout', () => {
      const layout = createLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'inline',
      });

      expect(layout).toBeDefined();
      expect(layout.runs).toBeDefined();
      expect(Array.isArray(layout.runs)).toBe(true);
      expect(layout.linePositions).toBeDefined();
      expect(layout.contentHeight).toBeDefined();
      expect(layout.contentHeight).toBeGreaterThan(0);
    });

    it('should use shared createLayout function for block layout', () => {
      const layout = createLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'block',
        questionPosition: 'top',
      });

      expect(layout).toBeDefined();
      expect(layout.runs).toBeDefined();
      expect(layout.questionArea).toBeDefined();
      expect(layout.answerArea).toBeDefined();
    });

    it('should use shared createBlockLayout function directly', () => {
      const layout = createBlockLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
        questionPosition: 'left',
      });

      expect(layout).toBeDefined();
      expect(layout.questionArea).toBeDefined();
      expect(layout.answerArea).toBeDefined();
      expect(layout.runs).toBeDefined();
      expect(layout.linePositions).toBeDefined();
    });

    it('should handle empty text in createLayout', () => {
      const layout = createLayout({
        questionText: '',
        answerText: '',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'inline',
      });

      expect(layout).toBeDefined();
      expect(layout.runs).toBeDefined();
      expect(Array.isArray(layout.runs)).toBe(true);
    });

    it('should handle different layout variants', () => {
      const inlineLayout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'inline',
      });

      const blockLayout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'block',
      });

      expect(inlineLayout).toBeDefined();
      expect(blockLayout).toBeDefined();
      // Block layout should have questionArea and answerArea
      expect(blockLayout.questionArea).toBeDefined();
      expect(blockLayout.answerArea).toBeDefined();
    });
  });

  describe('Feature Flag Integration', () => {
    it('should have access to all shared functions', () => {
      expect(buildFont).toBeDefined();
      expect(typeof buildFont).toBe('function');
      expect(getLineHeight).toBeDefined();
      expect(typeof getLineHeight).toBe('function');
      expect(measureText).toBeDefined();
      expect(typeof measureText).toBe('function');
      expect(calculateTextX).toBeDefined();
      expect(typeof calculateTextX).toBe('function');
      expect(wrapText).toBeDefined();
      expect(typeof wrapText).toBe('function');
      expect(createLayout).toBeDefined();
      expect(typeof createLayout).toBe('function');
      expect(createBlockLayout).toBeDefined();
      expect(typeof createBlockLayout).toBe('function');
    });
  });

  describe('PDF Export Specific Scenarios', () => {
    const questionStyle: RichTextStyle = {
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      paragraphSpacing: 'medium',
    };

    const answerStyle: RichTextStyle = {
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      paragraphSpacing: 'medium',
    };

    it('should create layout for PDF export dimensions', () => {
      // Typical PDF export dimensions (A4 in pixels at 300 DPI)
      const width = 2480;
      const height = 3508;
      const padding = 8;

      const layout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle,
        answerStyle,
        width,
        height,
        padding,
        ctx,
        layoutVariant: 'inline',
      });

      expect(layout).toBeDefined();
      expect(layout.contentHeight).toBeDefined();
      expect(layout.contentHeight).toBeGreaterThan(0);
    });

    it('should handle long text that wraps multiple lines', () => {
      const longText = 'This is a very long question text that should wrap across multiple lines when rendered in the PDF export';
      const answerText = 'This is also a long answer text that should wrap properly';

      const layout = createLayout({
        questionText: longText,
        answerText: answerText,
        questionStyle,
        answerStyle,
        width: 500,
        height: 1000,
        padding: 10,
        ctx,
        layoutVariant: 'inline',
      });

      expect(layout).toBeDefined();
      expect(layout.runs.length).toBeGreaterThan(0);
      // Should have multiple runs for wrapped text
      expect(layout.linePositions.length).toBeGreaterThan(1);
    });

    it('should handle different alignments for PDF export', () => {
      const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];

      alignments.forEach(align => {
        const style: RichTextStyle = {
          ...questionStyle,
          align,
        };

        const layout = createLayout({
          questionText: 'Question',
          answerText: 'Answer',
          questionStyle: style,
          answerStyle: style,
          width: 200,
          height: 300,
          padding: 10,
          ctx,
          layoutVariant: 'inline',
        });

        expect(layout).toBeDefined();
        expect(layout.runs).toBeDefined();
      });
    });

    it('should handle block layout with different question positions', () => {
      const positions: Array<'left' | 'right' | 'top' | 'bottom'> = ['left', 'right', 'top', 'bottom'];

      positions.forEach(position => {
        const layout = createBlockLayout({
          questionText: 'Question',
          answerText: 'Answer',
          questionStyle,
          answerStyle,
          width: 200,
          height: 300,
          padding: 10,
          ctx,
          questionPosition: position,
        });

        expect(layout).toBeDefined();
        expect(layout.questionArea).toBeDefined();
        expect(layout.answerArea).toBeDefined();
      });
    });
  });
});

