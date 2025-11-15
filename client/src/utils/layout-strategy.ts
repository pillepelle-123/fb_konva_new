import type { Page } from '../context/editor-context';

export type LayoutStrategy = 'same' | 'pair' | 'mirrored' | 'random';

export type RandomMode = 'single' | 'pair';

export interface LayoutStrategyFlags {
  mirrorRightLayouts: boolean;
  randomizeLayouts: boolean;
  mirrorRightBackground: boolean;
  randomizeBackground: boolean;
}

export function deriveLayoutStrategyFlags(
  strategy: LayoutStrategy,
  randomMode: RandomMode = 'single'
): LayoutStrategyFlags {
  const isRandom = strategy === 'random';
  const mirroredOrRandomPair =
    strategy === 'mirrored' || (isRandom && randomMode === 'pair');

  return {
    mirrorRightLayouts: mirroredOrRandomPair,
    randomizeLayouts: isRandom,
    mirrorRightBackground: mirroredOrRandomPair,
    randomizeBackground: isRandom
  };
}

export function derivePageLayoutVariation(
  flags: LayoutStrategyFlags,
  side: 'left' | 'right'
): NonNullable<Page['layoutVariation']> {
  if (side === 'left') {
    return flags.randomizeLayouts ? 'randomized' : 'normal';
  }
  if (flags.mirrorRightLayouts) {
    return 'mirrored';
  }
  return flags.randomizeLayouts ? 'randomized' : 'normal';
}

export function derivePageBackgroundVariation(
  flags: LayoutStrategyFlags,
  side: 'left' | 'right'
): NonNullable<Page['backgroundVariation']> {
  if (side === 'left') {
    return flags.randomizeBackground ? 'randomized' : 'normal';
  }
  if (flags.mirrorRightBackground) {
    return 'mirrored';
  }
  return flags.randomizeBackground ? 'randomized' : 'normal';
}

