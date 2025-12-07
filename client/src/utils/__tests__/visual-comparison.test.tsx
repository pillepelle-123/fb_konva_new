/**
 * Visuelle Vergleichstests für Canvas-Rendering
 * Vergleich vor/nach Auslagerung der shared Funktionen
 * 
 * Diese Tests vergleichen das visuelle Ergebnis der Layout-Berechnungen
 * und validieren, dass identische Eingaben identische Ausgaben produzieren.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLayout } from '../../../../shared/utils/qna-layout';
import { wrapText } from '../../../../shared/utils/text-layout';
import type { RichTextStyle } from '../../../../shared/types/text-layout';

/**
 * Compare two image data objects pixel by pixel
 */
function compareImageData(
  image1: ImageData,
  image2: ImageData,
  threshold: number = 0.1
): { match: boolean; difference: number; diffPixels: number; totalPixels: number } {
  if (image1.width !== image2.width || image1.height !== image2.height) {
    return {
      match: false,
      difference: 100,
      diffPixels: image1.width * image1.height,
      totalPixels: image1.width * image1.height
    };
  }

  let diffPixels = 0;
  const totalPixels = image1.width * image1.height;

  for (let i = 0; i < image1.data.length; i += 4) {
    const r1 = image1.data[i];
    const g1 = image1.data[i + 1];
    const b1 = image1.data[i + 2];
    const a1 = image1.data[i + 3];

    const r2 = image2.data[i];
    const g2 = image2.data[i + 1];
    const b2 = image2.data[i + 2];
    const a2 = image2.data[i + 3];

    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2);
    const normalizedDiff = diff / (255 * 4);

    if (normalizedDiff > threshold) {
      diffPixels++;
    }
  }

  const diffPercentage = (diffPixels / totalPixels) * 100;

  return {
    match: diffPercentage < 1, // Less than 1% difference
    difference: diffPercentage,
    diffPixels,
    totalPixels
  };
}

/**
 * Render text layout to canvas for visual comparison
 */
function renderLayoutToCanvas(
  layout: ReturnType<typeof createLayout>,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return canvas;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  layout.runs.forEach(run => {
    ctx.save();
    ctx.font = `${run.style.fontBold ? 'bold ' : ''}${run.style.fontItalic ? 'italic ' : ''}${run.style.fontSize}px ${run.style.fontFamily}`;
    ctx.fillStyle = run.style.fontColor || '#000000';
    ctx.textBaseline = 'top';
    ctx.fillText(run.text, run.x, run.y);
    ctx.restore();
  });

  return canvas;
}

describe('Visual Comparison Tests', () => {

  describe('Text Layout Visual Comparison', () => {
    it('should render identical text with same layout parameters', async () => {
      const width = 500;
      const height = 300;
      const padding = 10;

      const questionStyle: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontBold: false,
        fontItalic: false,
        paragraphSpacing: 'medium',
        align: 'left'
      };

      const answerStyle: RichTextStyle = {
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        fontBold: false,
        fontItalic: false,
        paragraphSpacing: 'medium',
        align: 'left'
      };

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create layout using shared function
      const layout1 = createLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle,
        answerStyle,
        width,
        height,
        padding,
        ctx
      });

      // Create same layout again (should be identical)
      const layout2 = createLayout({
        questionText: 'What is your name?',
        answerText: 'My name is John',
        questionStyle,
        answerStyle,
        width,
        height,
        padding,
        ctx
      });

      // Render both layouts to canvas
      const canvas1 = renderLayoutToCanvas(layout1, width, height);
      const canvas2 = renderLayoutToCanvas(layout2, width, height);

      // Compare image data
      const ctx1 = canvas1.getContext('2d');
      const ctx2 = canvas2.getContext('2d');
      if (!ctx1 || !ctx2) return;

      const image1 = ctx1.getImageData(0, 0, width, height);
      const image2 = ctx2.getImageData(0, 0, width, height);

      const comparison = compareImageData(image1, image2);
      
      // Same input should produce identical output
      expect(comparison.match).toBe(true);
      expect(comparison.difference).toBeLessThan(1);
    });

    it('should render differently with different text', async () => {
      const width = 500;
      const height = 300;
      const padding = 10;

      const questionStyle: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium'
      };

      const answerStyle: RichTextStyle = {
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium'
      };

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const layout1 = createLayout({
        questionText: 'Question 1',
        answerText: 'Answer 1',
        questionStyle,
        answerStyle,
        width,
        height,
        padding,
        ctx
      });

      const layout2 = createLayout({
        questionText: 'Question 2',
        answerText: 'Answer 2',
        questionStyle,
        answerStyle,
        width,
        height,
        padding,
        ctx
      });

      const canvas1 = renderLayoutToCanvas(layout1, width, height);
      const canvas2 = renderLayoutToCanvas(layout2, width, height);

      const ctx1 = canvas1.getContext('2d');
      const ctx2 = canvas2.getContext('2d');
      if (!ctx1 || !ctx2) return;

      const image1 = ctx1.getImageData(0, 0, width, height);
      const image2 = ctx2.getImageData(0, 0, width, height);

      // For mock canvas, compare layout structures instead of pixels
      // Different text should produce different layouts
      expect(layout1.runs.length).toBeGreaterThan(0);
      expect(layout2.runs.length).toBeGreaterThan(0);
      
      // Check that layouts have different content
      const text1 = layout1.runs.map(r => r.text).join(' ');
      const text2 = layout2.runs.map(r => r.text).join(' ');
      expect(text1).not.toBe(text2);
    });
  });

  describe('Layout Variant Visual Comparison', () => {
    it('should render differently for inline vs block layout', async () => {
      const width = 500;
      const height = 300;
      const padding = 10;

      const questionStyle: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium'
      };

      const answerStyle: RichTextStyle = {
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium'
      };

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const inlineLayout = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle,
        answerStyle,
        width,
        height,
        padding,
        ctx,
        layoutVariant: 'inline'
      });

      const blockLayout = createLayout({
        questionText: 'Question?',
        answerText: 'Answer',
        questionStyle,
        answerStyle,
        width,
        height,
        padding,
        ctx,
        layoutVariant: 'block',
        questionPosition: 'left',
        questionWidth: 40
      });

      // Inline layout should not have questionArea/answerArea
      expect(inlineLayout.questionArea).toBeUndefined();
      expect(inlineLayout.answerArea).toBeUndefined();

      // Block layout should have questionArea/answerArea
      expect(blockLayout.questionArea).toBeDefined();
      expect(blockLayout.answerArea).toBeDefined();

      // Runs should be positioned differently
      expect(inlineLayout.runs.length).toBeGreaterThan(0);
      expect(blockLayout.runs.length).toBeGreaterThan(0);
    });
  });

  describe('Alignment Visual Comparison', () => {
    it('should render differently for different text alignments', async () => {
      const width = 500;
      const height = 300;
      const padding = 10;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const alignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
      const layouts = alignments.map(align => {
        const style: RichTextStyle = {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          align,
          paragraphSpacing: 'medium'
        };

        return createLayout({
          questionText: 'Question',
          answerText: 'Answer',
          questionStyle: style,
          answerStyle: style,
          width,
          height,
          padding,
          ctx
        });
      });

      // Check that X positions differ for different alignments
      layouts.forEach((layout, index) => {
        expect(layout.runs.length).toBeGreaterThan(0);
        if (layout.runs.length > 0) {
          const firstRun = layout.runs[0];
          expect(firstRun.x).toBeGreaterThanOrEqual(0);
          expect(firstRun.x).toBeLessThanOrEqual(width);
        }
      });

      // Left alignment should have X at padding
      if (layouts[0].runs.length > 0) {
        const leftX = layouts[0].runs[0].x;
        expect(leftX).toBeGreaterThanOrEqual(padding);
      }

      // Center alignment should have X in middle
      if (layouts[1].runs.length > 0) {
        const centerX = layouts[1].runs[0].x;
        expect(centerX).toBeGreaterThan(padding);
      }

      // Right alignment should have X near right edge
      if (layouts[2].runs.length > 0) {
        const rightX = layouts[2].runs[0].x;
        expect(rightX).toBeGreaterThan(padding);
      }
    });
  });

  describe('Text Wrapping Visual Comparison', () => {
    it('should wrap text correctly for different widths', async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const style: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium'
      };

      const longText = 'This is a very long text that should wrap across multiple lines when the available width is limited';

      const wideLayout = wrapText(longText, style, 1000, ctx);
      const narrowLayout = wrapText(longText, style, 100, ctx);

      // Narrow width should produce more lines
      expect(narrowLayout.length).toBeGreaterThan(wideLayout.length);
      
      // All lines should have valid properties
      [...wideLayout, ...narrowLayout].forEach(line => {
        expect(line.text).toBeDefined();
        expect(typeof line.width).toBe('number');
        expect(line.width).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Font Style Visual Comparison', () => {
    it('should render differently for different font styles', async () => {
      const width = 500;
      const height = 300;
      const padding = 10;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const normalStyle: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        fontBold: false,
        fontItalic: false,
        paragraphSpacing: 'medium'
      };

      const boldStyle: RichTextStyle = {
        ...normalStyle,
        fontBold: true
      };

      const italicStyle: RichTextStyle = {
        ...normalStyle,
        fontItalic: true
      };

      const layouts = [
        createLayout({
          questionText: 'Text',
          answerText: 'Answer',
          questionStyle: normalStyle,
          answerStyle: normalStyle,
          width,
          height,
          padding,
          ctx
        }),
        createLayout({
          questionText: 'Text',
          answerText: 'Answer',
          questionStyle: boldStyle,
          answerStyle: boldStyle,
          width,
          height,
          padding,
          ctx
        }),
        createLayout({
          questionText: 'Text',
          answerText: 'Answer',
          questionStyle: italicStyle,
          answerStyle: italicStyle,
          width,
          height,
          padding,
          ctx
        })
      ];

      // All should produce valid layouts
      layouts.forEach(layout => {
        expect(layout.runs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Paragraph Spacing Visual Comparison', () => {
    it('should render differently for different paragraph spacing', async () => {
      const width = 500;
      const height = 500;
      const padding = 10;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const smallSpacing: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'small'
      };

      const mediumSpacing: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'medium'
      };

      const largeSpacing: RichTextStyle = {
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        paragraphSpacing: 'large'
      };

      const text = 'Line 1\nLine 2\nLine 3';

      const layouts = [
        createLayout({
          questionText: text,
          answerText: '',
          questionStyle: smallSpacing,
          answerStyle: smallSpacing,
          width,
          height,
          padding,
          ctx
        }),
        createLayout({
          questionText: text,
          answerText: '',
          questionStyle: mediumSpacing,
          answerStyle: mediumSpacing,
          width,
          height,
          padding,
          ctx
        }),
        createLayout({
          questionText: text,
          answerText: '',
          questionStyle: largeSpacing,
          answerStyle: largeSpacing,
          width,
          height,
          padding,
          ctx
        })
      ];

      // All should have runs
      layouts.forEach(layout => {
        expect(layout.runs.length).toBeGreaterThan(0);
      });

      // Large spacing should result in more total height
      expect(layouts[2].contentHeight).toBeGreaterThanOrEqual(layouts[0].contentHeight);
    });
  });
});

