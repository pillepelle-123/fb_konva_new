import { describe, expect, it } from 'vitest';
import {
  deriveLayoutStrategyFlags,
  derivePageLayoutVariation
} from '../layout-strategy';

describe('layout strategy helpers', () => {
  it('keeps layouts stable for "same" strategy', () => {
    const flags = deriveLayoutStrategyFlags('same', 'single');
    expect(flags).toEqual({
      mirrorRightLayouts: false,
      randomizeLayouts: false,
      mirrorRightBackground: false,
      randomizeBackground: false
    });
    expect(derivePageLayoutVariation(flags, 'left')).toBe('normal');
    expect(derivePageLayoutVariation(flags, 'right')).toBe('normal');
  });

  it('mirrors right page for mirrored strategy', () => {
    const flags = deriveLayoutStrategyFlags('mirrored', 'single');
    expect(flags.mirrorRightLayouts).toBe(true);
    expect(flags.randomizeLayouts).toBe(false);
    expect(derivePageLayoutVariation(flags, 'right')).toBe('mirrored');
  });

  it('randomizes both pages for random-single strategy', () => {
    const flags = deriveLayoutStrategyFlags('random', 'single');
    expect(flags.randomizeLayouts).toBe(true);
    expect(flags.mirrorRightLayouts).toBe(false);
    expect(derivePageLayoutVariation(flags, 'left')).toBe('randomized');
    expect(derivePageLayoutVariation(flags, 'right')).toBe('randomized');
  });

  it('mirrors layouts when random pair mode is active', () => {
    const flags = deriveLayoutStrategyFlags('random', 'pair');
    expect(flags.randomizeLayouts).toBe(true);
    expect(flags.mirrorRightLayouts).toBe(true);
    expect(derivePageLayoutVariation(flags, 'right')).toBe('mirrored');
  });
});

