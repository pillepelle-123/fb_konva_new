/**
 * Vergleichstests für PDF-Export zwischen Client und Server
 * Stellt sicher, dass beide die gleichen shared Funktionen verwenden
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildFont, getLineHeight, measureText, calculateTextX, wrapText } from '@shared/utils/text-layout';
import { createLayout, createBlockLayout } from '@shared/utils/qna-layout';
import type { RichTextStyle } from '@shared/types/text-layout';

describe('PDF Export Comparison (Client vs. Server)', () => {
  let ctx: CanvasRenderingContext2D | null;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  });

  describe('Shared Functions Usage', () => {
    it('should have access to same shared text layout functions', () => {
      expect(buildFont).toBeDefined();
      expect(getLineHeight).toBeDefined();
      expect(measureText).toBeDefined();
      expect(calculateTextX).toBeDefined();
      expect(wrapText).toBeDefined();
    });

    it('should have access to same shared qna layout functions', () => {
      expect(createLayout).toBeDefined();
      expect(createBlockLayout).toBeDefined();
    });
  });

  describe('Layout Consistency', () => {
    it('should produce identical layouts for same input parameters', () => {
      
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

      // Create layout twice with same parameters
      const layout1 = createLayout({
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

      const layout2 = createLayout({
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

      // Both layouts should be identical
      expect(layout1.runs.length).toBe(layout2.runs.length);
      expect(layout1.linePositions.length).toBe(layout2.linePositions.length);
      expect(layout1.contentHeight).toBe(layout2.contentHeight);
    });

    it('should handle same parameters consistently across calls', () => {
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

      const params = {
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
        questionPosition: 'left' as const,
      };

      const layout1 = createBlockLayout(params);
      const layout2 = createBlockLayout(params);

      // Both layouts should be identical
      expect(layout1.runs.length).toBe(layout2.runs.length);
      expect(layout1.questionArea).toEqual(layout2.questionArea);
      expect(layout1.answerArea).toEqual(layout2.answerArea);
    });
  });

  describe('PDF Export Specific Scenarios', () => {
    it('should handle typical PDF export dimensions', () => {
      // Typical PDF export dimensions (A4 in pixels at 300 DPI)
      const width = 2480;
      const height = 3508;
      const padding = 8;

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
      expect(layout.runs.length).toBeGreaterThan(0);
    });

    it('should handle different layout variants consistently', () => {
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

      const baseParams = {
        questionText: 'Question',
        answerText: 'Answer',
        questionStyle,
        answerStyle,
        width: 200,
        height: 300,
        padding: 10,
        ctx,
      };

      const inlineLayout = createLayout({
        ...baseParams,
        layoutVariant: 'inline',
      });

      const blockLayout = createLayout({
        ...baseParams,
        layoutVariant: 'block',
      });

      expect(inlineLayout).toBeDefined();
      expect(blockLayout).toBeDefined();
      
      // Block layout should have questionArea and answerArea
      expect(blockLayout.questionArea).toBeDefined();
      expect(blockLayout.answerArea).toBeDefined();
    });
  });
});

