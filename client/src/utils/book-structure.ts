import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, Page, PageBackground } from '../context/editor-context';

export const SPECIAL_PAGE_SEQUENCE: Array<Page['pageType']> = [
  'back-cover',
  'front-cover',
  'inner-front',
  'first-page',
  'last-page',
  'inner-back'
];

export const SPECIAL_PAGE_TYPES = new Set(SPECIAL_PAGE_SEQUENCE);

export const SPECIAL_PAGE_CONFIG: Record<
  NonNullable<Page['pageType']>,
  { locked: boolean; printable: boolean; spread: 'cover' | 'intro' | 'outro' | 'content'; order: number }
> = {
  'back-cover': { locked: true, printable: false, spread: 'cover', order: 0 },
  'front-cover': { locked: true, printable: false, spread: 'cover', order: 1 },
  'inner-front': { locked: true, printable: false, spread: 'intro', order: 2 },
  'first-page': { locked: true, printable: true, spread: 'intro', order: 3 },
  'last-page': { locked: true, printable: true, spread: 'outro', order: 4 },
  'inner-back': { locked: true, printable: false, spread: 'outro', order: 5 },
  'content': { locked: false, printable: true, spread: 'content', order: 99 }
};

export function getSpecialPageConfig(pageType?: Page['pageType']) {
  if (!pageType) return null;
  return SPECIAL_PAGE_CONFIG[pageType] ?? null;
}

export function isSpecialPageType(pageType?: Page['pageType']) {
  return pageType ? SPECIAL_PAGE_TYPES.has(pageType) : false;
}

export function getSpecialPagePosition(pageType?: Page['pageType']) {
  if (!pageType) return Infinity;
  const config = getSpecialPageConfig(pageType);
  return config?.order ?? Infinity;
}

export function sortPagesByBookStructure(pages: Page[]): Page[] {
  const frontSpecials: Page[] = [];
  const outroSpecials: Page[] = [];
  const contentPages: Page[] = [];

  pages.forEach((page) => {
    if (!page.pageType || !isSpecialPageType(page.pageType)) {
      contentPages.push(page);
      return;
    }
    const position = getSpecialPagePosition(page.pageType);
    if (position <= getSpecialPagePosition('first-page')) {
      frontSpecials.push(page);
    } else if (position >= getSpecialPagePosition('last-page')) {
      outroSpecials.push(page);
    } else {
      contentPages.push(page);
    }
  });

  const sortByPosition = (collection: Page[]) =>
    collection.sort((a, b) => getSpecialPagePosition(a.pageType) - getSpecialPagePosition(b.pageType));

  return [...sortByPosition(frontSpecials), ...contentPages, ...sortByPosition(outroSpecials)];
}

export function clonePageBackground(background?: PageBackground): PageBackground | undefined {
  return background ? JSON.parse(JSON.stringify(background)) : undefined;
}

export function cloneCanvasElements(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((element) => ({
    ...JSON.parse(JSON.stringify(element)),
    id: uuidv4()
  }));
}

export function getPairBounds(pages: Page[], index: number) {
  if (!pages.length || index < 0 || index >= pages.length) {
    return { start: index, end: index };
  }
  const pairId = pages[index]?.pagePairId;
  if (!pairId) {
    const start = index % 2 === 0 ? index : Math.max(0, index - 1);
    const end = Math.min(pages.length - 1, start + 1);
    return { start, end };
  }

  let start = index;
  while (start > 0 && pages[start - 1]?.pagePairId === pairId) {
    start -= 1;
  }
  let end = index;
  while (end < pages.length - 1 && pages[end + 1]?.pagePairId === pairId) {
    end += 1;
  }
  return { start, end };
}

export function generateSequentialPairId(counter: number) {
  return `spread-${counter}`;
}

export function collectPairIds(pages: Page[]): Set<string> {
  return new Set(
    pages
      .map((page) => page.pagePairId)
      .filter((id): id is string => Boolean(id))
  );
}

export function getNextNumericPairId(existingIds: Set<string>) {
  const numericIds = Array.from(existingIds)
    .filter((id) => id.startsWith('pair-'))
    .map((id) => Number(id.split('-')[1]))
    .filter((value) => !Number.isNaN(value));
  const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 0;
  return `pair-${nextId}`;
}

function createSpecialPage(pageType: NonNullable<Page['pageType']>, pairId: string): Page {
  const config = SPECIAL_PAGE_CONFIG[pageType];
  const tempId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
  return {
    id: tempId,
    pageNumber: 0,
    elements: [],
    background: undefined,
    database_id: undefined,
    layoutTemplateId: undefined,
    colorPaletteId: undefined,
    pageType,
    pagePairId: pairId,
    isSpecialPage: true,
    isLocked: config.locked,
    isPrintable: config.printable,
    layoutVariation: 'normal',
    backgroundVariation: 'normal'
  };
}

export function ensureSpecialPages(pages: Page[]): Page[] {
  const existingPairIds = collectPairIds(pages);
  let pairCounter = existingPairIds.size;
  const getNextPairId = () => generateSequentialPairId(pairCounter++);

  const spreadPairMap = new Map<'cover' | 'intro' | 'outro', string>();
  const updatedPages = pages.map((page) => {
    if (!page.pageType || !isSpecialPageType(page.pageType)) {
      return page;
    }
    const config = SPECIAL_PAGE_CONFIG[page.pageType];
    if (!config) {
      return page;
    }
    if (config.spread !== 'content') {
      const existingPair = spreadPairMap.get(config.spread);
      const appliedPairId = existingPair || page.pagePairId || getNextPairId();
      if (!existingPair) {
        spreadPairMap.set(config.spread, appliedPairId);
      }
      return {
        ...page,
        pagePairId: appliedPairId,
        isSpecialPage: true,
        isLocked: config.locked,
        isPrintable: config.printable
      };
    }
    return {
      ...page,
      isSpecialPage: config.locked,
      isLocked: config.locked,
      isPrintable: config.printable
    };
  });

  const existingTypes = new Set(updatedPages.map((page) => page.pageType).filter(Boolean) as NonNullable<Page['pageType']>[]);

  const ensurePairIdForSpread = (spread: 'cover' | 'intro' | 'outro') => {
    if (!spreadPairMap.has(spread)) {
      spreadPairMap.set(spread, getNextPairId());
    }
    return spreadPairMap.get(spread)!;
  };

  const ensurePageType = (pageType: NonNullable<Page['pageType']>, spread: 'cover' | 'intro' | 'outro') => {
    if (existingTypes.has(pageType)) {
      return;
    }
    const pairId = ensurePairIdForSpread(spread);
    updatedPages.push(createSpecialPage(pageType, pairId));
    existingTypes.add(pageType);
  };

  ensurePageType('back-cover', 'cover');
  ensurePageType('front-cover', 'cover');
  ensurePageType('inner-front', 'intro');
  ensurePageType('first-page', 'intro');
  ensurePageType('last-page', 'outro');
  ensurePageType('inner-back', 'outro');

  const orderedPages = sortPagesByBookStructure(updatedPages);
  return orderedPages.map((page, index) => ({
    ...page,
    pageNumber: index + 1
  }));
}

