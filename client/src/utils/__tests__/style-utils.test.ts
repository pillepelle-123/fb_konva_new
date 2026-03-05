/**
 * Unit-Tests für Style Utilities (getElementStyle, getBorderStyle, getRuledLinesStyle, getStyleConfig)
 */

import { describe, it, expect } from 'vitest';
import { getElementStyle, getBorderStyle, getRuledLinesStyle, getStyleConfig } from '../style-utils';
import type { CanvasElement } from '../../context/editor-context';

describe('Style Utilities', () => {
  const createMockElement = (overrides: Partial<CanvasElement> = {}): CanvasElement =>
    ({
      id: 'test-element-1',
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      stroke: '#1f2937',
      strokeWidth: 2,
      fill: '#ffffff',
      ...overrides
    }) as CanvasElement;

  describe('getElementStyle', () => {
    it('should return inheritStyle when set', () => {
      const element = createMockElement({ inheritStyle: 'rough' });
      expect(getElementStyle(element)).toBe('rough');
    });

    it('should return rough as default when inheritStyle is not set', () => {
      const element = createMockElement({});
      expect(getElementStyle(element)).toBe('rough');
    });

    it('should return glow when inheritStyle is glow', () => {
      const element = createMockElement({ inheritStyle: 'glow' });
      expect(getElementStyle(element)).toBe('glow');
    });
  });

  describe('getBorderStyle', () => {
    it('should return borderStyle from border when set', () => {
      const element = createMockElement({
        border: { borderStyle: 'dashed', stroke: '#000', strokeWidth: 1 }
      });
      expect(getBorderStyle(element)).toBe('dashed');
    });

    it('should return style from border when borderStyle not set', () => {
      const element = createMockElement({
        border: { style: 'zigzag', stroke: '#000', strokeWidth: 1 }
      });
      expect(getBorderStyle(element)).toBe('zigzag');
    });

    it('should return inheritStyle from border when style not set', () => {
      const element = createMockElement({
        border: { inheritStyle: 'wobbly', stroke: '#000', strokeWidth: 1 }
      });
      expect(getBorderStyle(element)).toBe('wobbly');
    });

    it('should return default when no border style properties', () => {
      const element = createMockElement({
        border: { stroke: '#000', strokeWidth: 1 }
      });
      expect(getBorderStyle(element)).toBe('default');
    });

    it('should return default when no border', () => {
      const element = createMockElement({});
      expect(getBorderStyle(element)).toBe('default');
    });
  });

  describe('getRuledLinesStyle', () => {
    it('should return ruledLinesStyle from ruledLines when set', () => {
      const element = createMockElement({
        ruledLines: { ruledLinesStyle: 'candy', stroke: '#000', strokeWidth: 1 }
      });
      expect(getRuledLinesStyle(element)).toBe('candy');
    });

    it('should return style from ruledLines when ruledLinesStyle not set', () => {
      const element = createMockElement({
        ruledLines: { style: 'glow', stroke: '#000', strokeWidth: 1 }
      });
      expect(getRuledLinesStyle(element)).toBe('glow');
    });

    it('should return inheritStyle from ruledLines when style not set', () => {
      const element = createMockElement({
        ruledLines: { inheritStyle: 'wobbly', stroke: '#000', strokeWidth: 1 }
      });
      expect(getRuledLinesStyle(element)).toBe('wobbly');
    });

    it('should return ruledLinesStyle from element when ruledLines not set', () => {
      const element = createMockElement({ ruledLinesStyle: 'zigzag' });
      expect(getRuledLinesStyle(element)).toBe('zigzag');
    });

    it('should return rough as default when no ruled lines style', () => {
      const element = createMockElement({});
      expect(getRuledLinesStyle(element)).toBe('rough');
    });
  });

  describe('getStyleConfig', () => {
    it('should return combined style config', () => {
      const element = createMockElement({
        inheritStyle: 'rough',
        border: { borderStyle: 'dashed', stroke: '#000', strokeWidth: 1 },
        ruledLines: { ruledLinesStyle: 'candy', stroke: '#000', strokeWidth: 1 }
      });
      const config = getStyleConfig(element);
      expect(config).toEqual({
        elementStyle: 'rough',
        borderStyle: 'dashed',
        ruledLinesStyle: 'candy'
      });
    });

    it('should return defaults for minimal element', () => {
      const element = createMockElement({});
      const config = getStyleConfig(element);
      expect(config).toEqual({
        elementStyle: 'rough',
        borderStyle: 'default',
        ruledLinesStyle: 'rough'
      });
    });
  });
});
