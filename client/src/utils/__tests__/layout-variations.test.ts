import { describe, it, expect } from 'vitest';
import type { CanvasElement } from '../../context/editor-context';
import { applyMirroredLayout, applyRandomLayout } from '../layout-variations';

const baseElements: CanvasElement[] = [
  { id: '1', type: 'rect', x: 50, y: 50, width: 100, height: 100 } as CanvasElement,
  { id: '2', type: 'rect', x: 200, y: 200, width: 120, height: 80 } as CanvasElement
];

describe('layout-variations', () => {
  it('mirrors element positions across the page width', () => {
    const mirrored = applyMirroredLayout(baseElements, 400);
    expect(mirrored[0]?.x).toBeCloseTo(250); // 400 - (50 + 100)
    expect(mirrored[1]?.x).toBeCloseTo(80);  // 400 - (200 + 120)
  });

  it('produces deterministic random layouts based on seed', () => {
    const firstRun = applyRandomLayout(baseElements, {
      seed: 123,
      pageWidth: 400,
      pageHeight: 400
    });
    const secondRun = applyRandomLayout(baseElements, {
      seed: 123,
      pageWidth: 400,
      pageHeight: 400
    });

    expect(firstRun).toEqual(secondRun);
  });
});

