import { describe, it, expect } from 'vitest';
import type { CanvasElement } from '../../../../context/editor-context';

// Mock the editor context
const mockEditorState = {
  activeTool: 'select' as const,
};

describe('Canvas Listening Optimization (Phase 2.3)', () => {
  // Test the shouldElementBeInteractive logic
  function shouldElementBeInteractive(element: CanvasElement, activeTool: string): boolean {
    // Always interactive in select mode (for selection, dragging, etc.)
    if (activeTool === 'select') {
      return true;
    }

    // In brush mode: Only shapes can be painted on
    if (activeTool === 'brush') {
      return ['rect', 'circle', 'line', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type);
    }

    // In text mode: Only text elements are interactive
    if (activeTool === 'text') {
      return element.type === 'text';
    }

    // In image mode: Only image elements are interactive
    if (activeTool === 'image') {
      return element.type === 'image' || element.type === 'placeholder';
    }

    // In sticker mode: Only sticker elements are interactive
    if (activeTool === 'sticker') {
      return element.type === 'sticker';
    }

    // For any other tool mode: Elements are not interactive
    // This reduces event listener overhead when using specialized tools
    return false;
  }

  describe('Select Tool Mode', () => {
    it('should make all elements interactive in select mode', () => {
      const elements: CanvasElement[] = [
        { id: '1', type: 'text', x: 0, y: 0, width: 100, height: 50 },
        { id: '2', type: 'rect', x: 0, y: 0, width: 100, height: 100 },
        { id: '3', type: 'image', x: 0, y: 0, width: 200, height: 200 },
        { id: '4', type: 'sticker', x: 0, y: 0, width: 50, height: 50 },
      ];

      elements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'select')).toBe(true);
      });
    });
  });

  describe('Brush Tool Mode', () => {
    it('should only make shapes interactive in brush mode', () => {
      const shapeElements: CanvasElement[] = [
        { id: '1', type: 'rect', x: 0, y: 0, width: 100, height: 100 },
        { id: '2', type: 'circle', x: 0, y: 0, width: 100, height: 100 },
        { id: '3', type: 'line', x: 0, y: 0, width: 100, height: 100 },
        { id: '4', type: 'triangle', x: 0, y: 0, width: 100, height: 100 },
        { id: '5', type: 'star', x: 0, y: 0, width: 100, height: 100 },
      ];

      const nonShapeElements: CanvasElement[] = [
        { id: '6', type: 'text', x: 0, y: 0, width: 100, height: 50 },
        { id: '7', type: 'image', x: 0, y: 0, width: 200, height: 200 },
        { id: '8', type: 'sticker', x: 0, y: 0, width: 50, height: 50 },
      ];

      shapeElements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'brush')).toBe(true);
      });

      nonShapeElements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'brush')).toBe(false);
      });
    });
  });

  describe('Text Tool Mode', () => {
    it('should only make text elements interactive in text mode', () => {
      const textElement: CanvasElement = { id: '1', type: 'text', x: 0, y: 0, width: 100, height: 50 };
      const otherElements: CanvasElement[] = [
        { id: '2', type: 'rect', x: 0, y: 0, width: 100, height: 100 },
        { id: '3', type: 'image', x: 0, y: 0, width: 200, height: 200 },
      ];

      expect(shouldElementBeInteractive(textElement, 'text')).toBe(true);
      otherElements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'text')).toBe(false);
      });
    });
  });

  describe('Image Tool Mode', () => {
    it('should only make image/placeholder elements interactive in image mode', () => {
      const imageElements: CanvasElement[] = [
        { id: '1', type: 'image', x: 0, y: 0, width: 200, height: 200 },
        { id: '2', type: 'placeholder', x: 0, y: 0, width: 200, height: 200 },
      ];

      const otherElements: CanvasElement[] = [
        { id: '3', type: 'text', x: 0, y: 0, width: 100, height: 50 },
        { id: '4', type: 'rect', x: 0, y: 0, width: 100, height: 100 },
      ];

      imageElements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'image')).toBe(true);
      });

      otherElements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'image')).toBe(false);
      });
    });
  });

  describe('Sticker Tool Mode', () => {
    it('should only make sticker elements interactive in sticker mode', () => {
      const stickerElement: CanvasElement = { id: '1', type: 'sticker', x: 0, y: 0, width: 50, height: 50 };
      const otherElements: CanvasElement[] = [
        { id: '2', type: 'text', x: 0, y: 0, width: 100, height: 50 },
        { id: '3', type: 'rect', x: 0, y: 0, width: 100, height: 100 },
      ];

      expect(shouldElementBeInteractive(stickerElement, 'sticker')).toBe(true);
      otherElements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'sticker')).toBe(false);
      });
    });
  });

  describe('Unknown Tool Mode', () => {
    it('should make no elements interactive in unknown tool modes', () => {
      const elements: CanvasElement[] = [
        { id: '1', type: 'text', x: 0, y: 0, width: 100, height: 50 },
        { id: '2', type: 'rect', x: 0, y: 0, width: 100, height: 100 },
        { id: '3', type: 'image', x: 0, y: 0, width: 200, height: 200 },
      ];

      elements.forEach(element => {
        expect(shouldElementBeInteractive(element, 'unknown')).toBe(false);
        expect(shouldElementBeInteractive(element, 'custom-tool')).toBe(false);
      });
    });
  });
});