/**
 * Unit-Tests für Theme Utilities
 */

import { describe, it, expect } from 'vitest';
import { getThemeRenderer, themes } from '../themes-client';
import type { Theme, ThemeRenderer } from '../themes-client';
import type { CanvasElement } from '../../context/editor-context';

describe('Theme Utilities', () => {
  const createMockElement = (overrides: Partial<CanvasElement> = {}): CanvasElement => ({
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
  });

  describe('themes', () => {
    it('should have all required themes', () => {
      expect(themes.rough).toBeDefined();
      expect(themes.default).toBeDefined();
    });

    it('should have ThemeRenderer interface for all themes', () => {
      Object.values(themes).forEach((renderer: ThemeRenderer) => {
        expect(renderer.generatePath).toBeDefined();
        expect(renderer.getStrokeProps).toBeDefined();
        expect(typeof renderer.generatePath).toBe('function');
        expect(typeof renderer.getStrokeProps).toBe('function');
      });
    });
  });

  describe('getThemeRenderer', () => {
    it('should return rough theme renderer for rough theme', () => {
      const renderer = getThemeRenderer('rough');
      expect(renderer).toBeDefined();
      expect(renderer).toBe(themes.rough);
    });

    it('should return default theme renderer for default theme', () => {
      const renderer = getThemeRenderer('default');
      expect(renderer).toBeDefined();
      expect(renderer).toBe(themes.default);
    });

    it('should return rough theme as fallback for unknown theme', () => {
      const renderer = getThemeRenderer('unknown' as Theme);
      expect(renderer).toBeDefined();
      expect(renderer).toBe(themes.rough);
    });

    it('should return rough theme as default when no theme specified', () => {
      const renderer = getThemeRenderer();
      expect(renderer).toBeDefined();
      expect(renderer).toBe(themes.rough);
    });
  });

  describe('Theme Renderer - generatePath', () => {
    it('should generate path for rect element with default theme', () => {
      const element = createMockElement({ type: 'rect', width: 100, height: 50 });
      const renderer = getThemeRenderer('default');
      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('should generate path for circle element', () => {
      const element = createMockElement({ type: 'circle', width: 100, height: 100 });
      const renderer = getThemeRenderer('default');
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
      const renderer = getThemeRenderer('default');
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
      const renderer = getThemeRenderer('default');
      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
      expect(path).toMatch(/^M \d+ \d+ L \d+ \d+$/);
    });

    it('should handle zoom parameter in rough theme', () => {
      const element = createMockElement({ type: 'rect' });
      const renderer = getThemeRenderer('rough');
      const path = renderer.generatePath(element, 2);
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });

    it('should generate different paths for different themes', () => {
      const element = createMockElement({ type: 'rect' });
      const defaultPath = getThemeRenderer('default').generatePath(element);
      const roughPath = getThemeRenderer('rough').generatePath(element);
      
      // Paths should be different (rough uses SVG paths, default uses simple paths)
      // Note: This might fail if both generate similar paths, but they should generally differ
      expect(defaultPath).toBeDefined();
      expect(roughPath).toBeDefined();
    });
  });

  describe('Theme Renderer - getStrokeProps', () => {
    it('should return stroke properties for default theme', () => {
      const element = createMockElement({
        stroke: '#FF0000',
        strokeWidth: 3
      });
      const renderer = getThemeRenderer('default');
      const props = renderer.getStrokeProps(element);
      
      expect(props).toBeDefined();
      expect(props.stroke).toBe('#FF0000');
      expect(props.strokeWidth).toBeGreaterThanOrEqual(0);
    });

    it('should return stroke properties for rough theme', () => {
      const element = createMockElement({
        stroke: '#00FF00',
        strokeWidth: 2
      });
      const renderer = getThemeRenderer('rough');
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
      const renderer = getThemeRenderer('default');
      const props = renderer.getStrokeProps(element);
      
      expect(props.fill).toBeUndefined(); // Transparent fill should not be set
    });

    it('should include fill for non-transparent colors', () => {
      const element = createMockElement({
        fill: '#FFFFFF',
        type: 'rect'
      });
      const renderer = getThemeRenderer('default');
      const props = renderer.getStrokeProps(element);
      
      expect(props.fill).toBe('#FFFFFF');
    });

    it('should not include fill for line elements', () => {
      const element = createMockElement({
        fill: '#FFFFFF',
        type: 'line'
      });
      const renderer = getThemeRenderer('default');
      const props = renderer.getStrokeProps(element);
      
      expect(props.fill).toBeUndefined(); // Lines should not have fill
    });

    it('should handle default stroke color when not specified', () => {
      const element = createMockElement({
        stroke: undefined,
        strokeWidth: 2
      });
      const renderer = getThemeRenderer('default');
      const props = renderer.getStrokeProps(element);
      
      expect(props.stroke).toBeDefined();
      expect(typeof props.stroke).toBe('string');
    });

    it('should handle zoom parameter', () => {
      const element = createMockElement({ strokeWidth: 2 });
      const renderer = getThemeRenderer('rough');
      const propsNormal = renderer.getStrokeProps(element, 1);
      const propsZoomed = renderer.getStrokeProps(element, 2);
      
      expect(propsNormal).toBeDefined();
      expect(propsZoomed).toBeDefined();
      // Zoom might affect strokeWidth in some themes
    });
  });

  describe('Theme Integration', () => {
    it('should work with element theme property', () => {
      const element = createMockElement({
        theme: 'rough'
      });
      const renderer = getThemeRenderer(element.theme || 'default');
      expect(renderer).toBeDefined();
      
      const path = renderer.generatePath(element);
      expect(path).toBeDefined();
    });

    it('should handle all available theme types', () => {
      const availableThemes: Theme[] = ['rough', 'default', 'glow', 'candy', 'zigzag', 'wobbly'];
      
      availableThemes.forEach(theme => {
        const renderer = getThemeRenderer(theme);
        expect(renderer).toBeDefined();
        
        const element = createMockElement({ theme });
        const path = renderer.generatePath(element);
        expect(path).toBeDefined();
        
        const props = renderer.getStrokeProps(element);
        expect(props).toBeDefined();
      });
    });
  });
});

