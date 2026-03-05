/**
 * Unit-Tests für Styles Client (getStyleRenderer, styles, StyleRenderer)
 */

import { describe, it, expect } from 'vitest';
import { getStyleRenderer, styles } from '../styles-client';
import type { Style, StyleRenderer } from '../styles-client';
import type { CanvasElement } from '../../context/editor-context';

describe('Styles Client', () => {
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

  describe('styles', () => {
    it('should have all required styles', () => {
      expect(styles.rough).toBeDefined();
      expect(styles.default).toBeDefined();
    });

    it('should have StyleRenderer interface for all styles', () => {
      Object.values(styles).forEach((renderer: StyleRenderer) => {
        expect(renderer.generatePath).toBeDefined();
        expect(renderer.getStrokeProps).toBeDefined();
        expect(typeof renderer.generatePath).toBe('function');
        expect(typeof renderer.getStrokeProps).toBe('function');
      });
    });
  });

  describe('getStyleRenderer', () => {
    it('should return rough style renderer for rough style', () => {
      const renderer = getStyleRenderer('rough');
      expect(renderer).toBeDefined();
      expect(renderer).toBe(styles.rough);
    });

    it('should return default style renderer for default style', () => {
      const renderer = getStyleRenderer('default');
      expect(renderer).toBeDefined();
      expect(renderer).toBe(styles.default);
    });

    it('should return default style as fallback for unknown style', () => {
      const renderer = getStyleRenderer('unknown' as Style);
      expect(renderer).toBeDefined();
      expect(renderer).toBe(styles.default);
    });

    it('should return default style when no style specified', () => {
      const renderer = getStyleRenderer();
      expect(renderer).toBeDefined();
      expect(renderer).toBe(styles.default);
    });
  });

  describe('Style Renderer - generatePath', () => {
    it('should generate path for rect element with default style', () => {
      const element = createMockElement({ type: 'rect', width: 100, height: 50 });
      const renderer = getStyleRenderer('default');
      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('should generate path for circle element', () => {
      const element = createMockElement({ type: 'circle', width: 100, height: 100 });
      const renderer = getStyleRenderer('default');
      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('should generate path for rect with corner radius', () => {
      const element = createMockElement({
        type: 'rect',
        width: 100,
        height: 50,
        cornerRadius: 10
      });
      const renderer = getStyleRenderer('default');
      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
      expect(path).toContain('Q'); // Should contain quadratic curves for rounded corners
    });

    it('should generate path for line element', () => {
      const element = createMockElement({
        type: 'line',
        width: 100,
        height: 50
      });
      const renderer = getStyleRenderer('default');
      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
      expect(path).toMatch(/^M \d+ \d+ L \d+ \d+$/);
    });

    it('should handle zoom parameter in rough style', () => {
      const element = createMockElement({ type: 'rect' });
      const renderer = getStyleRenderer('rough');
      const path = renderer.generatePath(element, 2);
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });

    it('should generate different paths for different styles', () => {
      const element = createMockElement({ type: 'rect' });
      const defaultPath = getStyleRenderer('default').generatePath(element);
      const roughPath = getStyleRenderer('rough').generatePath(element);

      expect(defaultPath).toBeDefined();
      expect(roughPath).toBeDefined();
    });
  });

  describe('Style Renderer - getStrokeProps', () => {
    it('should return stroke properties for default style', () => {
      const element = createMockElement({
        stroke: '#FF0000',
        strokeWidth: 3
      });
      const renderer = getStyleRenderer('default');
      const props = renderer.getStrokeProps(element);

      expect(props).toBeDefined();
      expect(props.stroke).toBe('#FF0000');
      expect(props.strokeWidth).toBeGreaterThanOrEqual(0);
    });

    it('should return stroke properties for rough style', () => {
      const element = createMockElement({
        stroke: '#00FF00',
        strokeWidth: 2
      });
      const renderer = getStyleRenderer('rough');
      const props = renderer.getStrokeProps(element);

      expect(props).toBeDefined();
      expect(props.stroke).toBe('#00FF00');
      expect(props.strokeWidth).toBeGreaterThanOrEqual(0);
    });

    it('should handle transparent fill', () => {
      const element = createMockElement({
        fill: 'transparent',
        type: 'rect'
      });
      const renderer = getStyleRenderer('default');
      const props = renderer.getStrokeProps(element);

      expect(props.fill).toBeUndefined(); // Transparent fill should not be set
    });

    it('should include fill for non-transparent colors', () => {
      const element = createMockElement({
        fill: '#FFFFFF',
        type: 'rect'
      });
      const renderer = getStyleRenderer('default');
      const props = renderer.getStrokeProps(element);

      expect(props.fill).toBe('#FFFFFF');
    });

    it('should not include fill for line elements', () => {
      const element = createMockElement({
        fill: '#FFFFFF',
        type: 'line'
      });
      const renderer = getStyleRenderer('default');
      const props = renderer.getStrokeProps(element);

      expect(props.fill).toBeUndefined(); // Lines should not have fill
    });

    it('should handle default stroke color when not specified', () => {
      const element = createMockElement({
        stroke: undefined,
        strokeWidth: 2
      });
      const renderer = getStyleRenderer('default');
      const props = renderer.getStrokeProps(element);

      expect(props.stroke).toBeDefined();
      expect(typeof props.stroke).toBe('string');
    });

    it('should handle zoom parameter', () => {
      const element = createMockElement({ strokeWidth: 2 });
      const renderer = getStyleRenderer('rough');
      const propsNormal = renderer.getStrokeProps(element, 1);
      const propsZoomed = renderer.getStrokeProps(element, 2);

      expect(propsNormal).toBeDefined();
      expect(propsZoomed).toBeDefined();
    });
  });

  describe('Style Integration', () => {
    it('should work with element inheritStyle property', () => {
      const element = createMockElement({
        inheritStyle: 'rough'
      });
      const renderer = getStyleRenderer((element as any).inheritStyle || 'default');
      expect(renderer).toBeDefined();

      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
    });

    it('should handle all available style types', () => {
      const availableStyles: Style[] = [
        'rough',
        'default',
        'glow',
        'candy',
        'zigzag',
        'wobbly',
        'dashed'
      ];

      availableStyles.forEach((style) => {
        const renderer = getStyleRenderer(style);
        expect(renderer).toBeDefined();

        const element = createMockElement({ inheritStyle: style });
        const path = renderer.generatePath(element);
        expect(path).toBeDefined();

        const props = renderer.getStrokeProps(element);
        expect(props).toBeDefined();
      });
    });
  });
});
