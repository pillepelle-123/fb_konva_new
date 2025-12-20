/**
 * Unit-Tests für Color Palette Utilities
 */

import { describe, it, expect } from 'vitest';
import { colorPalettes, getPalettePartColor, applyPaletteToElement } from '../../data/templates/color-palettes';
import type { ColorPalette } from '../../types/template-types';

describe('Color Palette Utilities', () => {
  const mockPalette: ColorPalette = {
    id: 'test-palette',
    name: 'Test Palette',
    colors: {
      primary: '#FF0000',
      secondary: '#00FF00',
      accent: '#0000FF',
      text: '#000000',
      background: '#FFFFFF',
      surface: '#F0F0F0'
    },
    parts: {
      pageBackground: 'surface',
      qnaBorder: 'primary',
      qnaBackground: 'surface',
      qnaQuestionText: 'text',
      qnaAnswerText: 'text',
      shapeStroke: 'primary'
    }
  };

  describe('colorPalettes', () => {
    it('should load color palettes from JSON', () => {
      expect(colorPalettes).toBeDefined();
      expect(Array.isArray(colorPalettes)).toBe(true);
      expect(colorPalettes.length).toBeGreaterThan(0);
    });

    it('should have valid palette structure', () => {
      if (colorPalettes.length > 0) {
        const firstPalette = colorPalettes[0];
        expect(firstPalette.id).toBeDefined();
        expect(firstPalette.name).toBeDefined();
        expect(firstPalette.colors).toBeDefined();
        expect(typeof firstPalette.colors).toBe('object');
      }
    });

    it('should have required color slots in palettes', () => {
      colorPalettes.forEach(palette => {
        expect(palette.colors.primary).toBeDefined();
        expect(palette.colors.secondary).toBeDefined();
        expect(palette.colors.accent).toBeDefined();
        expect(palette.colors.text).toBeDefined();
        expect(palette.colors.background).toBeDefined();
        expect(palette.colors.surface).toBeDefined();
      });
    });
  });

  describe('getPalettePartColor', () => {
    it('should return color for valid part name', () => {
      const color = getPalettePartColor(mockPalette, 'qnaBorder', 'primary', '#000000');
      expect(color).toBe('#FF0000'); // Should use primary color
    });

    it('should return fallback color when palette is undefined', () => {
      const color = getPalettePartColor(undefined, 'qnaBorder', 'primary', '#000000');
      expect(color).toBe('#000000');
    });

    it('should return fallback slot color when part is not found', () => {
      const color = getPalettePartColor(mockPalette, 'nonexistentPart', 'secondary', '#000000');
      expect(color).toBe('#00FF00'); // Should use fallback slot (secondary)
    });

    it('should return final fallback color when slot is not found', () => {
      const color = getPalettePartColor(mockPalette, 'nonexistentPart', 'nonexistentSlot', '#123456');
      expect(color).toBe('#123456');
    });

    it('should handle palette with missing parts configuration', () => {
      const paletteWithoutParts: ColorPalette = {
        ...mockPalette,
        parts: undefined
      };
      const color = getPalettePartColor(paletteWithoutParts, 'qnaBorder', 'primary', '#000000');
      expect(color).toBe('#FF0000'); // Should use fallback slot
    });

    it('should handle different part types', () => {
      expect(getPalettePartColor(mockPalette, 'pageBackground', 'surface', '#FFFFFF')).toBe('#F0F0F0');
      expect(getPalettePartColor(mockPalette, 'qnaQuestionText', 'text', '#000000')).toBe('#000000');
      expect(getPalettePartColor(mockPalette, 'shapeStroke', 'primary', '#000000')).toBe('#FF0000');
    });
  });

  describe('applyPaletteToElement', () => {
    it('should apply palette colors to text element', () => {
      const result = applyPaletteToElement(mockPalette, 'text');
      expect(result.fontColor).toBeDefined();
      expect(result.borderColor).toBeDefined();
      expect(result.backgroundColor).toBeDefined();
    });

    it('should apply palette colors to qna element', () => {
      const result = applyPaletteToElement(mockPalette, 'qna');
      expect(result.borderColor).toBeDefined();
      expect(result.backgroundColor).toBeDefined();
      expect(result.questionSettings).toBeDefined();
      expect(result.answerSettings).toBeDefined();
    });

    it('should apply palette colors to qna element', () => {
      const result = applyPaletteToElement(mockPalette, 'qna');
      expect(result.questionSettings).toBeDefined();
      expect(result.answerSettings).toBeDefined();
      if (result.questionSettings) {
        expect(result.questionSettings.fontColor).toBeDefined();
      }
    });

    it('should apply palette colors to shape element', () => {
      const result = applyPaletteToElement(mockPalette, 'rect');
      expect(result.stroke).toBeDefined();
      expect(result.fill).toBeDefined();
    });

    it('should handle unknown element type gracefully', () => {
      const result = applyPaletteToElement(mockPalette, 'unknown_type');
      // Should not throw error, may return empty object or default values
      expect(result).toBeDefined();
    });

    it('should respect palette part mappings', () => {
      const customPalette: ColorPalette = {
        ...mockPalette,
        parts: {
          ...mockPalette.parts,
          qnaBorder: 'accent' // Override default mapping
        }
      };
      const result = applyPaletteToElement(customPalette, 'qna');
      // Should use accent color for border instead of primary
      expect(result.borderColor).toBe('#0000FF'); // accent color
    });
  });

  describe('Palette Integration', () => {
    it('should work with actual loaded palettes', () => {
      if (colorPalettes.length > 0) {
        const firstPalette = colorPalettes[0];
        const color = getPalettePartColor(firstPalette, 'qnaBorder', 'primary', '#000000');
        expect(color).toBeDefined();
        expect(typeof color).toBe('string');
        expect(color).toMatch(/^#([0-9A-F]{6}|[0-9A-F]{3})$/i);
      }
    });

    it('should handle palette ID lookup', () => {
      if (colorPalettes.length > 0) {
        const firstPalette = colorPalettes[0];
        // Test that we can use a valid palette object
        const color = getPalettePartColor(firstPalette, 'qnaBorder', 'primary', '#000000');
        // Should return a color or fallback
        expect(color).toBeDefined();
        if (color) {
          expect(typeof color).toBe('string');
        }
      }
    });
  });
});

