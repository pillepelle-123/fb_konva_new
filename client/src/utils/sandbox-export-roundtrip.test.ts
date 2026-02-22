import { describe, it, expect } from 'vitest';
import {
  buildPartsFromElements,
  buildElementColorUpdates,
  getEffectivePartOverrides,
  DEFAULT_SANDBOX_COLORS,
  type PaletteColorSlot,
} from './sandbox-utils';
import { getElementPaletteColors } from './global-palettes';
import { DEFAULT_PALETTE_PARTS } from '../data/templates/color-palettes';
import type { ColorPalette } from '../types/template-types';

const SANDBOX_COLORS: Record<PaletteColorSlot, string> = {
  ...DEFAULT_SANDBOX_COLORS,
};

function createTestPalette(parts?: Record<string, PaletteColorSlot>): ColorPalette {
  return {
    id: 'test-palette',
    name: 'Test',
    colors: {
      ...SANDBOX_COLORS,
      text: SANDBOX_COLORS.text,
    },
    parts: parts ? { ...DEFAULT_PALETTE_PARTS, ...parts } : DEFAULT_PALETTE_PARTS,
  } as ColorPalette;
}

describe('Sandbox Palette Export Roundtrip', () => {
  it('buildPartsFromElements produces parts that getElementPaletteColors can resolve for all Sandbox element types', () => {
    const elements = [
      { id: 'qna-1', type: 'text', textType: 'qna2' as const },
      { id: 'ft-1', type: 'text', textType: 'free_text' as const },
      { id: 'rect-1', type: 'rect' },
      { id: 'ph-1', type: 'placeholder' },
      { id: 'img-1', type: 'image' },
      { id: 'sticker-1', type: 'sticker' },
      { id: 'line-1', type: 'line' },
      { id: 'brush-1', type: 'brush' },
    ];

    const parts = buildPartsFromElements(elements, {}, {
      pageBackground: 'surface',
      pagePattern: 'primary',
    });

    const palette = createTestPalette(parts as Record<string, PaletteColorSlot>);

    const elementTypes = ['qna2', 'free_text', 'rect', 'placeholder', 'image', 'sticker', 'line', 'brush'];
    for (const elementType of elementTypes) {
      const colors = getElementPaletteColors(palette, elementType);
      const colorValues = Object.values(colors).filter((v): v is string => typeof v === 'string' && v.startsWith('#'));
      expect(colorValues.length).toBeGreaterThan(0);
      expect(colorValues.every((c) => /^#[0-9A-Fa-f]{6}$/.test(c))).toBe(true);
    }
  });

  it('buildPartsFromElements covers all expected parts from DEFAULT_PALETTE_PARTS', () => {
    const elements = [
      { id: 'qna-1', type: 'text', textType: 'qna2' as const },
      { id: 'ft-1', type: 'text', textType: 'free_text' as const },
      { id: 'rect-1', type: 'rect' },
      { id: 'ph-1', type: 'placeholder' },
      { id: 'sticker-1', type: 'sticker' },
      { id: 'line-1', type: 'line' },
      { id: 'brush-1', type: 'brush' },
    ];

    const parts = buildPartsFromElements(elements, {}, {
      pageBackground: 'surface',
      pagePattern: 'primary',
    });

    const expectedPartNames = Object.keys(DEFAULT_PALETTE_PARTS);
    for (const partName of expectedPartNames) {
      expect(parts).toHaveProperty(partName);
      expect(['background', 'primary', 'secondary', 'accent', 'text', 'surface']).toContain(parts[partName]);
    }
  });

  it('buildElementColorUpdates applies colors to qna2, rect, placeholder, line, brush, sticker', () => {
    const getColor = (slot: PaletteColorSlot) => SANDBOX_COLORS[slot] ?? '#000000';

    const testCases: Array<{
      element: Record<string, unknown>;
      expectedPropertyPaths: string[];
    }> = [
      {
        element: { id: 'qna-1', type: 'text', textType: 'qna2' },
        expectedPropertyPaths: ['borderColor', 'backgroundColor', 'questionSettings', 'answerSettings'],
      },
      {
        element: { id: 'rect-1', type: 'rect' },
        expectedPropertyPaths: ['stroke', 'fill'],
      },
      {
        element: { id: 'ph-1', type: 'placeholder' },
        expectedPropertyPaths: ['borderColor'],
      },
      {
        element: { id: 'line-1', type: 'line' },
        expectedPropertyPaths: ['stroke'],
      },
      {
        element: { id: 'brush-1', type: 'brush' },
        expectedPropertyPaths: ['stroke'],
      },
      {
        element: { id: 'sticker-1', type: 'sticker' },
        expectedPropertyPaths: ['stickerColor', 'stickerTextSettings'],
      },
    ];

    for (const { element, expectedPropertyPaths } of testCases) {
      const overrides = getEffectivePartOverrides(
        element as { id: string; type?: string; textType?: string },
        { [element.id as string]: DEFAULT_PALETTE_PARTS as Record<string, PaletteColorSlot> }
      );
      const updates = buildElementColorUpdates(element, overrides, getColor);

      expect(Object.keys(updates).length).toBeGreaterThan(0);
      for (const path of expectedPropertyPaths) {
        const hasPath = path.includes('.')
          ? path.split('.').reduce((obj: unknown, key) => (obj as Record<string, unknown>)?.[key], updates) !== undefined
          : path in updates;
        expect(hasPath, `Expected updates to include ${path} for element ${element.id}`).toBe(true);
      }
    }
  });

  it('buildElementColorUpdates works for image element type', () => {
    const getColor = (slot: PaletteColorSlot) => SANDBOX_COLORS[slot] ?? '#000000';
    const element = { id: 'img-1', type: 'image' };
    const overrides = getEffectivePartOverrides(
      element as { id: string; type?: string; textType?: string },
      { 'img-1': { imageBorder: 'primary' } }
    );
    const updates = buildElementColorUpdates(element, overrides, getColor);
    expect(updates).toHaveProperty('borderColor');
    expect(updates.borderColor).toBe(SANDBOX_COLORS.primary);
  });

  it('buildPartsFromElements includes pageBackground and pagePattern when provided', () => {
    const elements = [{ id: 'rect-1', type: 'rect' }];
    const parts = buildPartsFromElements(elements, {}, {
      pageBackground: 'background',
      pagePattern: 'accent',
    });
    expect(parts.pageBackground).toBe('background');
    expect(parts.pagePattern).toBe('accent');
  });

  it('buildPartsFromElements uses partSlotOverrides when provided', () => {
    const elements = [
      { id: 'qna-1', type: 'text', textType: 'qna2' as const },
      { id: 'rect-1', type: 'rect' },
    ];
    const partSlotOverrides = {
      'qna-1': { qnaQuestionText: 'accent' as PaletteColorSlot, qnaAnswerText: 'text' as PaletteColorSlot },
      'rect-1': { shapeStroke: 'secondary' as PaletteColorSlot },
    };
    const parts = buildPartsFromElements(elements, partSlotOverrides, {});

    expect(parts.qnaQuestionText).toBe('accent');
    expect(parts.qnaAnswerText).toBe('text');
    expect(parts.shapeStroke).toBe('secondary');
  });
});
