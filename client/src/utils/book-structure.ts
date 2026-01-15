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

export type PageMetadata = {
  pageNumber: number;
  pageType: NonNullable<Page['pageType']>;
  pagePairId: string;
  isSpecial: boolean;
  isEditable: boolean;
  isSelectable: boolean;
  isLocked: boolean;
  canAssignUser: boolean;
  canAddQna: boolean;
  isPlaceholder: boolean;
};

function deriveFallbackPageType(pageNumber: number, totalPages: number): NonNullable<Page['pageType']> {
  if (pageNumber === 1) return 'back-cover';
  if (pageNumber === 2) return 'front-cover';
  if (pageNumber === 3) return 'inner-front';
  if (pageNumber === totalPages) return 'inner-back';
  return 'content';
}

export function buildPageMetadataMap(
  pages: Page[],
  totalPagesOverride?: number
): Record<number, PageMetadata> {
  const pageMap = new Map<number, Page>();
  pages.forEach((page, index) => {
    const number = page.pageNumber ?? index + 1;
    pageMap.set(number, page);
  });

  const totalPages = totalPagesOverride ?? pages.length;
  if (totalPages <= 0) {
    return {};
  }

  const metadata: Record<number, PageMetadata> = {};
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const page = pageMap.get(pageNumber);
    metadata[pageNumber] = computePageMetadataEntry(pageNumber, totalPages, page);
  }
  return metadata;
}

export function computePageMetadataEntry(pageNumber: number, totalPages: number, page?: Page): PageMetadata {
  const fallbackType = deriveFallbackPageType(pageNumber, totalPages);
  const pageType = (page?.pageType as NonNullable<Page['pageType']>) ?? fallbackType;
  const isSpecial = pageType !== 'content';
  const isEditable = !(pageType === 'inner-front' || pageType === 'inner-back');
  const isSelectable = isEditable;
  // Use pagePairId from page if available, otherwise calculate it using the unified system
  const pairId = page?.pagePairId ?? calculatePagePairId(pageNumber, totalPages, pageType);
  const canAssignUser = isEditable && !(pageType === 'back-cover' || pageType === 'front-cover');
  const canAddQna = canAssignUser;

  return {
    pageNumber,
    pageType,
    pagePairId: pairId,
    isSpecial,
    isEditable,
    isSelectable,
    isLocked: !isEditable,
    canAssignUser,
    canAddQna,
    isPlaceholder: page?.isPlaceholder ?? true
  };
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


/**
 * Calculates the correct pagePairId for a page based on its pageNumber and totalPages.
 * Uses pair-X format (e.g., pair-0, pair-1, pair-cover, pair-intro-0, pair-outro-last).
 */
export function calculatePagePairId(pageNumber: number, totalPages: number, pageType?: Page['pageType']): string {
  // Special pages
  if (pageNumber === 1 || pageNumber === 2) {
    return 'pair-cover'; // Cover pages
  }
  if (pageNumber === 3) {
    return 'pair-intro-0'; // Inner Front
  }
  if (pageNumber === totalPages) {
    return 'pair-outro-last'; // Inner Back
  }
  if (pageNumber === totalPages - 1) {
    return 'pair-outro-last'; // Last content page pairs with Inner Back
  }
  if (pageNumber === 4) {
    return 'pair-intro-0'; // First content page pairs with Inner Front
  }
  
  // Regular content pages: pair them starting from page 5
  // Page 5-6: pair-0, Page 7-8: pair-1, etc.
  const contentPageIndex = pageNumber - 4; // Page 5 -> 1, Page 6 -> 2, etc.
  const pairIndex = Math.floor((contentPageIndex - 1) / 2); // Page 5-6 -> 0, Page 7-8 -> 1
  return `pair-${pairIndex}`;
}

/**
 * Recalculates pagePairId for all pages in the array based on their pageNumber and totalPages.
 * Ensures all pages have correct pagePairId values after insertions, deletions, or reordering.
 */
export function recalculatePagePairIds(pages: Page[]): Page[] {
  const totalPages = pages.length;
  return pages.map((page, index) => {
    const pageNumber = page.pageNumber ?? index + 1;
    const calculatedPairId = calculatePagePairId(pageNumber, totalPages, page.pageType);
    return {
      ...page,
      pagePairId: calculatedPairId,
      pageNumber: pageNumber // Ensure pageNumber is set
    };
  });
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
      // Use existing pagePairId if available, otherwise will be calculated later
      const existingPair = spreadPairMap.get(config.spread);
      const appliedPairId = existingPair || page.pagePairId || 'temp';
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
      spreadPairMap.set(spread, 'temp');
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
  // Do NOT automatically create 'first-page' and 'last-page' - they are regular content pages
  // ensurePageType('first-page', 'intro');
  // ensurePageType('last-page', 'outro');
  // 'inner-back' wird nicht über ensurePageType hinzugefügt, da immer die bestehende letzte Seite
  // als Inner Back markiert werden soll (siehe weiter unten).

  const orderedPages = sortPagesByBookStructure(updatedPages);

  const enforceInnerBackConfig = (page: Page): Page => {
    const config = SPECIAL_PAGE_CONFIG['inner-back'];
    return {
      ...page,
      pageType: 'inner-back',
      isSpecialPage: true,
      isLocked: config.locked,
      isPrintable: config.printable,
      pagePairId: page.pagePairId ?? ensurePairIdForSpread('outro')
    };
  };

  if (orderedPages.length > 0) {
    const lastIndex = orderedPages.length - 1;
    const innerBackIndex = orderedPages.findIndex((page) => page.pageType === 'inner-back');

    if (innerBackIndex === -1) {
      const newInnerBack = createSpecialPage('inner-back', ensurePairIdForSpread('outro'));
      orderedPages.push(enforceInnerBackConfig(newInnerBack));
    } else if (innerBackIndex !== lastIndex) {
      const [innerBackPage] = orderedPages.splice(innerBackIndex, 1);
      orderedPages.push(enforceInnerBackConfig(innerBackPage));
    } else {
      orderedPages[lastIndex] = enforceInnerBackConfig(orderedPages[lastIndex]);
    }
  }
  const renumberedPages = orderedPages.map((page, index) => ({
    ...page,
    pageNumber: index + 1
  }));
  
  // Recalculate all pagePairIds using the unified system
  return recalculatePagePairIds(renumberedPages);
}

