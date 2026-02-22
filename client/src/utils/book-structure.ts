import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, Page, PageBackground } from '../context/editor-context';

/** Neue Struktur: 0=front, 1=first content, 2-3 pair, ..., n-1=last content, n=back */
export const SPECIAL_PAGE_SEQUENCE: Array<Page['pageType']> = [
  'front-cover',
  'back-cover',
  'first-page',
  'last-page',
  'content'
];

export const SPECIAL_PAGE_TYPES = new Set(SPECIAL_PAGE_SEQUENCE);

export const SPECIAL_PAGE_CONFIG: Record<
  NonNullable<Page['pageType']>,
  { locked: boolean; printable: boolean; spread: 'cover' | 'intro' | 'outro' | 'content'; order: number }
> = {
  'front-cover': { locked: false, printable: false, spread: 'cover', order: 0 },
  'back-cover': { locked: false, printable: false, spread: 'cover', order: 1 },
  'first-page': { locked: false, printable: true, spread: 'intro', order: 2 },
  'last-page': { locked: false, printable: true, spread: 'outro', order: 3 },
  'content': { locked: false, printable: true, spread: 'content', order: 99 },
  // Deprecated (alte Struktur): als content behandeln
  'inner-front': { locked: false, printable: true, spread: 'content', order: 99 },
  'inner-back': { locked: false, printable: true, spread: 'content', order: 99 }
};

/** Prüft, ob die Seite Teil eines regulären Content-Paars ist (2-3, 4-5, …) – löschbar/duplizierbar */
export function isContentPairPage(pageNumber: number, totalPages: number): boolean {
  if (totalPages < 4) return false;
  if (pageNumber <= 1 || pageNumber >= totalPages - 1) return false;
  return true;
}

/** Prüft, ob die Seite Front- oder Back-Cover ist (Einzelseite, kein Partner) */
export function isStandaloneCoverPage(pageNumber: number, totalPages: number): boolean {
  return pageNumber === 0 || (totalPages > 0 && pageNumber === totalPages - 1);
}

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

/** Sortiert Seiten: 0 (front), 1..n-1 (content), n (back) */
export function sortPagesByBookStructure(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => {
    const numA = a.pageNumber ?? 0;
    const numB = b.pageNumber ?? 0;
    return numA - numB;
  });
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

/** Neue Struktur: 0=front, 1=first content, 2..n-2=pairs, n-1=last content, n=back */
function deriveFallbackPageType(pageNumber: number, totalPages: number): NonNullable<Page['pageType']> {
  if (pageNumber === 0) return 'front-cover';
  if (totalPages > 0 && pageNumber === totalPages - 1) return 'back-cover';
  if (pageNumber === 1) return 'first-page';
  if (totalPages > 2 && pageNumber === totalPages - 2) return 'last-page';
  return 'content';
}

export function buildPageMetadataMap(
  pages: Page[],
  totalPagesOverride?: number
): Record<number, PageMetadata> {
  const pageMap = new Map<number, Page>();
  pages.forEach((page, index) => {
    const number = page.pageNumber ?? index;
    pageMap.set(number, page);
  });

  const totalPages = totalPagesOverride ?? pages.length;
  if (totalPages <= 0) {
    return {};
  }

  const metadata: Record<number, PageMetadata> = {};
  for (let pageNumber = 0; pageNumber < totalPages; pageNumber++) {
    const page = pageMap.get(pageNumber);
    metadata[pageNumber] = computePageMetadataEntry(pageNumber, totalPages, page);
  }
  return metadata;
}

export function computePageMetadataEntry(pageNumber: number, totalPages: number, page?: Page): PageMetadata {
  const fallbackType = deriveFallbackPageType(pageNumber, totalPages);
  const pageType = (page?.pageType as NonNullable<Page['pageType']>) ?? fallbackType;
  const isSpecial = pageType === 'front-cover' || pageType === 'back-cover' || pageType === 'first-page' || pageType === 'last-page';
  const isEditable = true; // Alle Seiten editierbar; Cover: kein qna/qna2, keine Zuweisung
  const isSelectable = isEditable;
  const pairId = page?.pagePairId ?? calculatePagePairId(pageNumber, totalPages, pageType);
  const canAssignUser = !(pageType === 'back-cover' || pageType === 'front-cover');
  const canAddQna = canAssignUser;

  return {
    pageNumber,
    pageType,
    pagePairId: pairId,
    isSpecial,
    isEditable,
    isSelectable,
    isLocked: false,
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
 * Neue Struktur: 0=front, 1=first content, 2-3 pair, ..., n-1=last content, n=back
 */
export function calculatePagePairId(pageNumber: number, totalPages: number, pageType?: Page['pageType']): string {
  if (pageNumber === 0) return 'pair-front';
  if (totalPages > 0 && pageNumber === totalPages - 1) return 'pair-back';
  if (pageNumber === 1) return 'pair-intro-0';
  if (totalPages > 2 && pageNumber === totalPages - 2) return 'pair-outro-last';
  // Page 2-3: pair-0, 4-5: pair-1, etc.
  const pairIndex = Math.floor((pageNumber - 2) / 2);
  return `pair-${pairIndex}`;
}

/**
 * Recalculates pagePairId for all pages in the array based on their pageNumber and totalPages.
 * Ensures all pages have correct pagePairId values after insertions, deletions, or reordering.
 */
export function recalculatePagePairIds(pages: Page[]): Page[] {
  const totalPages = pages.length;
  return pages.map((page, index) => {
    const pageNumber = page.pageNumber ?? index;
    const calculatedPairId = calculatePagePairId(pageNumber, totalPages, page.pageType);
    return {
      ...page,
      pagePairId: calculatedPairId,
      pageNumber
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
    layoutId: undefined,
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

/** Stellt sicher, dass front-cover (0) und back-cover (n) existieren; setzt pageNumber 0-basiert. */
export function ensureSpecialPages(pages: Page[]): Page[] {
  const updatedPages = pages.map((page, index) => {
    const pageNumber = page.pageNumber ?? index;
    const pageType = deriveFallbackPageType(pageNumber, pages.length);
    const pairId = calculatePagePairId(pageNumber, pages.length, pageType);
    const config = SPECIAL_PAGE_CONFIG[pageType] ?? SPECIAL_PAGE_CONFIG['content'];
    return {
      ...page,
      pageNumber,
      pageType,
      pagePairId: pairId,
      isSpecialPage: pageType === 'front-cover' || pageType === 'back-cover' || pageType === 'first-page' || pageType === 'last-page',
      isLocked: config.locked,
      isPrintable: config.printable
    };
  });

  const orderedPages = sortPagesByBookStructure(updatedPages);
  const hasFront = orderedPages.some((p) => p.pageType === 'front-cover' || (p.pageNumber ?? -1) === 0);
  const hasBack = orderedPages.some((p) => p.pageType === 'back-cover');

  if (!hasFront && orderedPages.length > 0) {
    const frontPage = createSpecialPage('front-cover', 'pair-front');
    frontPage.pageNumber = 0;
    orderedPages.unshift(frontPage);
  }
  if (!hasBack && orderedPages.length > 0) {
    const backPage = createSpecialPage('back-cover', 'pair-back');
    backPage.pageNumber = orderedPages.length;
    orderedPages.push(backPage);
  }

  const renumberedPages = orderedPages.map((page, index) => ({
    ...page,
    pageNumber: index
  }));

  return recalculatePagePairIds(renumberedPages);
}

