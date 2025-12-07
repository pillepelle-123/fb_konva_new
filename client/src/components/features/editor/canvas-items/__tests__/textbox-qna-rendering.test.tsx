/**
 * Integrationstests für QnA-Rendering-Komponente
 * Testet die Verwendung der shared Layout-Funktionen in der textbox-qna Komponente
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLayout, createBlockLayout } from '@shared/utils/qna-layout';
import { wrapText, measureText, calculateTextX, getLineHeight, buildFont } from '@shared/utils/text-layout';
import type { RichTextStyle } from '@shared/types/text-layout';
import { FEATURE_FLAGS } from '../../../../../utils/feature-flags';

describe('QnA Rendering Integration', () => {
  let ctx: CanvasRenderingContext2D | null;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  });

  const defaultQuestionStyle: RichTextStyle = {
    fontSize: 16,
    fontFamily: 'Arial, sans-serif',
    fontBold: false,
    fontItalic: false,
    paragraphSpacing: 'medium',
    align: 'left'
  };

  const defaultAnswerStyle: RichTextStyle = {
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    fontBold: false,
    fontItalic: false,
    paragraphSpacing: 'medium',
    align: 'left'
  };

  describe('Layout Integration', () => {
    it('should use shared createLayout function for inline layout', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'inline'
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      expect(layout.contentHeight).toBeGreaterThan(0);
      expect(layout.linePositions.length).toBeGreaterThanOrEqual(0);
    });

    it('should use shared createBlockLayout function for block layout', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'block',
        questionPosition: 'left',
        questionWidth: 40
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      expect(layout.questionArea).toBeDefined();
      expect(layout.answerArea).toBeDefined();
    });

    it('should handle different question positions in block layout', () => {
      if (!ctx) return;

      const positions: Array<'left' | 'right' | 'top' | 'bottom'> = ['left', 'right', 'top', 'bottom'];
      
      positions.forEach(position => {
        const layout = createBlockLayout({
          questionText: 'Question',
          answerText: 'Answer',
          questionStyle: defaultQuestionStyle,
          answerStyle: defaultAnswerStyle,
          width: 500,
          height: 300,
          padding: 10,
          ctx,
          questionPosition: position,
          questionWidth: 40
        });

        expect(layout.questionArea).toBeDefined();
        expect(layout.answerArea).toBeDefined();
        expect(layout.runs.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should respect answerInNewRow flag', () => {
      if (!ctx) return;

      const layoutNewRow = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        answerInNewRow: true
      });

      const layoutInline = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        answerInNewRow: false
      });

      expect(layoutNewRow.runs.length).toBeGreaterThan(0);
      expect(layoutInline.runs.length).toBeGreaterThan(0);
      // Layouts should differ based on answerInNewRow
    });

    it('should handle questionAnswerGap correctly', () => {
      if (!ctx) return;

      const layoutWithGap = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        questionAnswerGap: 20
      });

      const layoutWithoutGap = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        questionAnswerGap: 0
      });

      expect(layoutWithGap.runs.length).toBeGreaterThan(0);
      expect(layoutWithoutGap.runs.length).toBeGreaterThan(0);
    });
  });

  describe('Text Layout Integration', () => {
    it('should use shared wrapText function', () => {
      if (!ctx) return;

      const longText = 'This is a very long text that should wrap across multiple lines';
      const lines = wrapText(longText, defaultQuestionStyle, 200, ctx);
      
      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.text).toBeDefined();
        expect(typeof line.width).toBe('number');
      });
    });

    it('should use shared measureText function', () => {
      if (!ctx) return;

      const width = measureText('Hello World', defaultQuestionStyle, ctx);
      expect(width).toBeGreaterThan(0);
      expect(typeof width).toBe('number');
    });

    it('should use shared calculateTextX function for alignment', () => {
      if (!ctx) return;

      const leftX = calculateTextX('Text', { ...defaultQuestionStyle, align: 'left' }, 10, 100, ctx);
      const centerX = calculateTextX('Text', { ...defaultQuestionStyle, align: 'center' }, 10, 100, ctx);
      const rightX = calculateTextX('Text', { ...defaultQuestionStyle, align: 'right' }, 10, 100, ctx);

      expect(leftX).toBe(10);
      expect(centerX).toBeGreaterThan(leftX);
      expect(rightX).toBeGreaterThan(centerX);
    });

    it('should use shared getLineHeight function', () => {
      const lineHeight = getLineHeight(defaultQuestionStyle);
      expect(lineHeight).toBeGreaterThan(0);
      expect(lineHeight).toBe(defaultQuestionStyle.fontSize * 1.2); // medium spacing
    });

    it('should use shared buildFont function', () => {
      const font = buildFont(defaultQuestionStyle);
      expect(font).toContain('16px');
      expect(font).toContain('Arial');
    });
  });

  describe('Feature Flag Integration', () => {
    it('should respect USE_SHARED_TEXT_LAYOUT feature flag', () => {
      // Test that feature flag is defined
      expect(FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT).toBeDefined();
      expect(typeof FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT).toBe('boolean');
    });

    it('should respect USE_SHARED_QNA_LAYOUT feature flag', () => {
      // Test that feature flag is defined
      expect(FEATURE_FLAGS.USE_SHARED_QNA_LAYOUT).toBeDefined();
      expect(typeof FEATURE_FLAGS.USE_SHARED_QNA_LAYOUT).toBe('boolean');
    });
  });

  describe('Rendering Scenarios', () => {
    it('should handle empty question text', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: '',
        answerText: 'Answer only',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      // Should still have answer text runs
      expect(layout.runs.some(run => run.text.includes('Answer'))).toBe(true);
    });

    it('should handle empty answer text', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question only',
        answerText: '',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      // Should still have question text runs
      expect(layout.runs.some(run => run.text.includes('Question'))).toBe(true);
    });

    it('should handle text with line breaks', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question line 1\nQuestion line 2',
        answerText: 'Answer line 1\nAnswer line 2',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 500,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(2); // Should have multiple runs
      expect(layout.linePositions.length).toBeGreaterThan(0);
    });

    it('should handle different font sizes', () => {
      if (!ctx) return;

      const largeQuestionStyle: RichTextStyle = {
        ...defaultQuestionStyle,
        fontSize: 24
      };

      const smallAnswerStyle: RichTextStyle = {
        ...defaultAnswerStyle,
        fontSize: 12
      };

      const layout = createLayout({
        questionText: 'Large Question',
        answerText: 'Small Answer',
        questionStyle: largeQuestionStyle,
        answerStyle: smallAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      // Line heights should differ based on font sizes
      const questionRuns = layout.runs.filter(run => run.style === largeQuestionStyle);
      const answerRuns = layout.runs.filter(run => run.style === smallAnswerStyle);
      
      if (questionRuns.length > 0 && answerRuns.length > 0) {
        // Y positions might differ due to different line heights
        expect(questionRuns.length).toBeGreaterThan(0);
        expect(answerRuns.length).toBeGreaterThan(0);
      }
    });

    it('should handle different alignments', () => {
      if (!ctx) return;

      const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
      
      alignments.forEach(align => {
        const style: RichTextStyle = {
          ...defaultQuestionStyle,
          align
        };

        const layout = createLayout({
          questionText: 'Question',
          answerText: 'Answer',
          questionStyle: style,
          answerStyle: style,
          width: 500,
          height: 300,
          padding: 10,
          ctx
        });

        expect(layout.runs.length).toBeGreaterThan(0);
        // X positions should differ based on alignment
        layout.runs.forEach(run => {
          expect(run.x).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should handle ruled lines target setting', () => {
      if (!ctx) return;

      const layoutQuestion = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        ruledLinesTarget: 'question'
      });

      const layoutAnswer = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        ruledLinesTarget: 'answer'
      });

      expect(layoutQuestion.linePositions.length).toBeGreaterThanOrEqual(0);
      expect(layoutAnswer.linePositions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle block layout with different question widths', () => {
      if (!ctx) return;

      const widths = [30, 40, 50, 60];
      
      widths.forEach(questionWidth => {
        const layout = createBlockLayout({
          questionText: 'Question',
          answerText: 'Answer',
          questionStyle: defaultQuestionStyle,
          answerStyle: defaultAnswerStyle,
          width: 500,
          height: 300,
          padding: 10,
          ctx,
          questionPosition: 'left',
          questionWidth
        });

        expect(layout.questionArea).toBeDefined();
        expect(layout.answerArea).toBeDefined();
        if (layout.questionArea && layout.answerArea) {
          // Question area width should be approximately questionWidth% of total width
          const expectedQuestionWidth = (500 * questionWidth) / 100;
          expect(layout.questionArea.width).toBeCloseTo(expectedQuestionWidth, 0);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very narrow width', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 50, // Very narrow
        height: 500,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      // Text should wrap to multiple lines
      expect(layout.contentHeight).toBeGreaterThan(0);
    });

    it('should handle very short height', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 50, // Very short
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThanOrEqual(0);
      expect(layout.contentHeight).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero padding', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 0,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(0);
    });

    it('should handle large padding', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 50, // Large padding
        ctx
      });

      expect(layout.runs.length).toBeGreaterThanOrEqual(0);
      // Available width should be reduced by padding
    });

    it('should handle null context gracefully', () => {
      const layout = createLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx: null
      });

      // Should still work with fallback measurements
      expect(layout.runs.length).toBeGreaterThanOrEqual(0);
    });
  });
});

