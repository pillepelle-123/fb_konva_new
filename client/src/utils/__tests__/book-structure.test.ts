import { describe, it, expect } from 'vitest';
import type { Page } from '../../context/editor-context';
import {
  getPairBounds,
  sortPagesByBookStructure,
  generateSequentialPairId,
  getNextNumericPairId,
  ensureSpecialPages,
  SPECIAL_PAGE_CONFIG
} from '../book-structure';

const createPage = (overrides: Partial<Page>): Page => ({
  id: overrides.id ?? Math.random(),
  pageNumber: overrides.pageNumber ?? 1,
  elements: overrides.elements ?? [],
  background: overrides.background,
  pageType: overrides.pageType,
  pagePairId: overrides.pagePairId,
  isSpecialPage: overrides.isSpecialPage,
  isLocked: overrides.isLocked,
  isPrintable: overrides.isPrintable ?? true,
  layoutVariation: overrides.layoutVariation,
  backgroundVariation: overrides.backgroundVariation,
  backgroundTransform: overrides.backgroundTransform
});

describe('book-structure utilities', () => {
  it('sorts special pages to their anchored positions', () => {
    const pages: Page[] = [
      createPage({ pageNumber: 3, pageType: 'content' }),
      createPage({ pageNumber: 4, pageType: 'front-cover' }),
      createPage({ pageNumber: 5, pageType: 'last-page' }),
      createPage({ pageNumber: 6, pageType: 'inner-front' })
    ];

    const sorted = sortPagesByBookStructure(pages);
    expect(sorted[0]?.pageType).toBe('front-cover');
    expect(sorted[1]?.pageType).toBe('inner-front');
    expect(sorted[sorted.length - 1]?.pageType).toBe('last-page');
  });

  it('returns bounds for paired spreads', () => {
    const pages: Page[] = [
      createPage({ id: 1, pageNumber: 1, pagePairId: 'pair-1' }),
      createPage({ id: 2, pageNumber: 2, pagePairId: 'pair-1' }),
      createPage({ id: 3, pageNumber: 3, pagePairId: 'pair-2' }),
      createPage({ id: 4, pageNumber: 4, pagePairId: 'pair-2' })
    ];

    expect(getPairBounds(pages, 0)).toEqual({ start: 0, end: 1 });
    expect(getPairBounds(pages, 3)).toEqual({ start: 2, end: 3 });
  });

  it('generates sequential pair ids safely', () => {
    expect(generateSequentialPairId(4)).toBe('spread-4');
  });

  it('gets next numeric pair id based on existing ids', () => {
    const nextId = getNextNumericPairId(new Set(['pair-1', 'pair-2']));
    expect(nextId).toBe('pair-3');
  });

  it('ensures missing special pages are added and locked', () => {
    const pages: Page[] = [
      createPage({ pageNumber: 1, pageType: 'content' })
    ];

    const ensured = ensureSpecialPages(pages);
    const specialTypes = ensured.filter((page) => page.pageType && page.pageType !== 'content');

    // ensureSpecialPages creates 4 special pages: back-cover, front-cover, inner-front, inner-back
    // first-page and last-page are not automatically created (they are regular content pages)
    expect(specialTypes.length).toBeGreaterThanOrEqual(4);
    specialTypes.forEach((page) => {
      if (!page.pageType) return;
      const config = SPECIAL_PAGE_CONFIG[page.pageType];
      expect(page.isSpecialPage).toBe(true);
      expect(page.isLocked).toBe(config.locked);
      expect(page.isPrintable).toBe(config.printable);
    });
    const orderedTypes = specialTypes.map((page) => page.pageType);
    expect(orderedTypes[0]).toBe('back-cover');
    expect(orderedTypes[1]).toBe('front-cover');
  });

  it('assigns consistent pair ids for cover, intro and outro spreads', () => {
    const pages: Page[] = [
      createPage({ pageNumber: 1, pageType: 'front-cover' }),
      createPage({ pageNumber: 2, pageType: 'inner-front' }),
      createPage({ pageNumber: 3, pageType: 'last-page' }),
      createPage({ pageNumber: 4, pageType: 'inner-back' })
    ];

    const ensured = ensureSpecialPages(pages);
    const coverPairs = ensured
      .filter((page) => page.pageType && ['front-cover', 'back-cover'].includes(page.pageType))
      .map((page) => page.pagePairId);
    const introPairs = ensured
      .filter((page) => page.pageType && ['inner-front', 'first-page'].includes(page.pageType))
      .map((page) => page.pagePairId);
    const outroPairs = ensured
      .filter((page) => page.pageType && ['last-page', 'inner-back'].includes(page.pageType))
      .map((page) => page.pagePairId);

    expect(new Set(coverPairs).size).toBe(1);
    expect(new Set(introPairs).size).toBe(1);
    expect(new Set(outroPairs).size).toBe(1);
  });
});

