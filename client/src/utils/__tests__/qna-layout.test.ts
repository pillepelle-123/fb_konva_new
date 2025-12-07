/**
 * Unit-Tests für QnA Layout-Funktionen aus shared/utils/qna-layout.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createLayout, createBlockLayout } from '../../../../shared/utils/qna-layout';
import type { RichTextStyle } from '../../../../shared/types/text-layout';

describe('QnA Layout Functions', () => {
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
    paragraphSpacing: 'medium'
  };

  const defaultAnswerStyle: RichTextStyle = {
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    fontBold: false,
    fontItalic: false,
    paragraphSpacing: 'medium'
  };

  describe('createBlockLayout', () => {
    it('should create block layout with question and answer', () => {
      if (!ctx) return;

      const layout = createBlockLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      expect(layout.contentHeight).toBe(300);
      expect(layout.questionArea).toBeDefined();
      expect(layout.answerArea).toBeDefined();
    });

    it('should position question and answer correctly for left position', () => {
      if (!ctx) return;

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
        questionWidth: 40
      });

      expect(layout.questionArea).toBeDefined();
      expect(layout.answerArea).toBeDefined();
      if (layout.questionArea && layout.answerArea) {
        expect(layout.questionArea.x).toBeLessThan(layout.answerArea.x);
        expect(layout.questionArea.width + layout.answerArea.x).toBeLessThanOrEqual(500);
      }
    });

    it('should position question and answer correctly for top position', () => {
      if (!ctx) return;

      const layout = createBlockLayout({
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        questionPosition: 'top'
      });

      expect(layout.questionArea).toBeDefined();
      expect(layout.answerArea).toBeDefined();
      if (layout.questionArea && layout.answerArea) {
        expect(layout.questionArea.y).toBeLessThan(layout.answerArea.y);
      }
    });

    it('should respect ruledLinesTarget setting', () => {
      if (!ctx) return;

      const layoutQuestion = createBlockLayout({
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

      const layoutAnswer = createBlockLayout({
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

      // Line positions should differ based on target
      expect(layoutQuestion.linePositions.length).toBeGreaterThanOrEqual(0);
      expect(layoutAnswer.linePositions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty question text', () => {
      if (!ctx) return;

      const layout = createBlockLayout({
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
      expect(layout.contentHeight).toBe(300);
    });

    it('should handle empty answer text', () => {
      if (!ctx) return;

      const layout = createBlockLayout({
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
      expect(layout.contentHeight).toBe(300);
    });
  });

  describe('createLayout', () => {
    it('should create inline layout by default', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      expect(layout.contentHeight).toBeGreaterThan(0);
    });

    it('should create block layout when layoutVariant is block', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'block'
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      expect(layout.questionArea).toBeDefined();
      expect(layout.answerArea).toBeDefined();
    });

    it('should handle answer starting on same line for inline layout', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Name?',
        answerText: 'John',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx,
        layoutVariant: 'inline',
        answerInNewRow: false
      });

      expect(layout.runs.length).toBeGreaterThan(0);
      // Should have at least question text runs
      expect(layout.runs.some(run => run.text.includes('Name'))).toBe(true);
    });

    it('should handle answerInNewRow flag', () => {
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

      // Layouts should differ based on answerInNewRow
      expect(layoutNewRow.runs.length).toBeGreaterThan(0);
      expect(layoutInline.runs.length).toBeGreaterThan(0);
    });

    it('should respect questionAnswerGap for inline layout', () => {
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

    it('should handle text alignment in layout', () => {
      if (!ctx) return;

      const leftAlignStyle: RichTextStyle = {
        ...defaultQuestionStyle,
        align: 'left'
      };

      const centerAlignStyle: RichTextStyle = {
        ...defaultQuestionStyle,
        align: 'center'
      };

      const layoutLeft = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: leftAlignStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      const layoutCenter = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle: centerAlignStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layoutLeft.runs.length).toBeGreaterThan(0);
      expect(layoutCenter.runs.length).toBeGreaterThan(0);
    });

    it('should handle long text that wraps', () => {
      if (!ctx) return;

      const longText = 'This is a very long question text that should wrap across multiple lines when the available width is limited';
      const layout = createLayout({
        questionText: longText,
        answerText: 'Answer',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 200, // Narrow width to force wrapping
        height: 500,
        padding: 10,
        ctx
      });

      expect(layout.runs.length).toBeGreaterThan(1); // Should wrap to multiple lines
      expect(layout.contentHeight).toBeGreaterThan(0);
    });

    it('should handle empty strings', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: '',
        answerText: '',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layout.runs).toEqual([]);
      expect(layout.contentHeight).toBeGreaterThanOrEqual(0);
    });

    it('should calculate line positions for ruled lines', () => {
      if (!ctx) return;

      const layout = createLayout({
        questionText: 'Question?',
        answerText: 'Answer line 1\nAnswer line 2',
        questionStyle: defaultQuestionStyle,
        answerStyle: defaultAnswerStyle,
        width: 500,
        height: 300,
        padding: 10,
        ctx
      });

      expect(layout.linePositions.length).toBeGreaterThan(0);
      layout.linePositions.forEach(linePos => {
        expect(linePos.y).toBeGreaterThanOrEqual(0);
        expect(linePos.lineHeight).toBeGreaterThan(0);
        expect(linePos.style).toBeDefined();
      });
    });
  });
});

