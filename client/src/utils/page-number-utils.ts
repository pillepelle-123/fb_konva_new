import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from '../context/editor-context';

export const DEFAULT_PAGE_NUMBER_MARGIN = 60; // ~5mm at 300 DPI
export const DEFAULT_PAGE_NUMBER_FONT_SIZE = 52; // equals font size 14

export interface PageNumberingSettings {
  enabled: boolean;
  fontFamily: string;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  fontColor: string;
  fontOpacity: number;
}

export const DEFAULT_PAGE_NUMBERING_SETTINGS: PageNumberingSettings = {
  enabled: true,
  fontFamily: 'Arial, sans-serif',
  fontSize: DEFAULT_PAGE_NUMBER_FONT_SIZE,
  fontBold: false,
  fontItalic: false,
  fontColor: '#000000',
  fontOpacity: 1,
};

/**
 * Creates a page number element for a content page.
 * Page numbers: 1 starts on page 1 (first content page), no numbers on page 0 (front) and last page (back).
 * Position: Page 1 = right bottom, then alternating left/right.
 */
export function createPageNumberElement(
  pageNumber: number, // 1-based display number (1, 2, 3, ... for content pages)
  pageWidth: number,
  pageHeight: number,
  settings: Partial<PageNumberingSettings> = {}
): CanvasElement {
  const s = { ...DEFAULT_PAGE_NUMBERING_SETTINGS, ...settings };
  const margin = DEFAULT_PAGE_NUMBER_MARGIN;
  const text = String(pageNumber);

  // Page 1 (pageNumber 1) = right, page 2 (pageNumber 2) = left, page 3 (pageNumber 3) = right, ...
  const isRight = pageNumber % 2 === 1;

  // Approximate text dimensions for positioning (Konva will measure properly)
  const fontSize = s.fontSize || DEFAULT_PAGE_NUMBER_FONT_SIZE;
  const estimatedWidth = text.length * fontSize * 0.6;
  const estimatedHeight = fontSize * 1.2;

  const x = isRight
    ? pageWidth - margin - estimatedWidth
    : margin;
  const y = pageHeight - margin - estimatedHeight;

  return {
    id: uuidv4(),
    type: 'text',
    isPageNumber: true,
    text,
    x,
    y,
    width: estimatedWidth,
    height: estimatedHeight,
    fontFamily: s.fontFamily || 'Arial, sans-serif',
    fontSize: s.fontSize ?? DEFAULT_PAGE_NUMBER_FONT_SIZE,
    fontColor: s.fontColor || '#000000',
    fontBold: s.fontBold ?? false,
    fontItalic: s.fontItalic ?? false,
    fontOpacity: s.fontOpacity ?? 1,
  } as CanvasElement;
}

/**
 * Renumbers page number elements across all pages after add/duplicate/delete/reorder.
 * Content pages (1 to totalPages-2) get numbers 1, 2, 3, ...
 * Special pages (0=front, totalPages-1=back) have no page numbers.
 */
export function renumberPageNumberElementsInPages<T extends { pageNumber?: number; elements?: unknown[] }>(
  pages: T[],
  canvasSize: { width: number; height: number }
): T[] {
  const totalPages = pages.length;
  if (totalPages < 4) return pages;

  const firstPageNumberEl = pages
    .flatMap((p) => ((p.elements || []) as CanvasElement[]))
    .find((el) => el.isPageNumber) as CanvasElement | undefined;
  const hasPageNumbering = !!firstPageNumberEl;
  if (!hasPageNumbering) return pages;

  const settings: Partial<PageNumberingSettings> = firstPageNumberEl
    ? {
        fontFamily: firstPageNumberEl.fontFamily,
        fontSize: firstPageNumberEl.fontSize,
        fontBold: firstPageNumberEl.fontBold,
        fontItalic: firstPageNumberEl.fontItalic,
        fontColor: firstPageNumberEl.fontColor,
        fontOpacity: firstPageNumberEl.fontOpacity,
      }
    : undefined;

  let contentPageNumber = 0;
  return pages.map((page, index) => {
    const pageNumber = page.pageNumber ?? index;
    const isSpecial = pageNumber === 0 || (totalPages > 0 && pageNumber === totalPages - 1);
    const elements = (page.elements || []) as CanvasElement[];

    if (isSpecial) {
      const filtered = elements.filter((el) => !el.isPageNumber);
      if (filtered.length === elements.length) return page;
      return { ...page, elements: filtered };
    }

    contentPageNumber += 1;
    const existingEl = elements.find((el) => el.isPageNumber);

    if (existingEl) {
      const updates = {
        text: String(contentPageNumber),
        ...(settings && {
          fontFamily: settings.fontFamily ?? existingEl.fontFamily,
          fontSize: settings.fontSize ?? existingEl.fontSize,
          fontBold: settings.fontBold ?? existingEl.fontBold,
          fontItalic: settings.fontItalic ?? existingEl.fontItalic,
          fontColor: settings.fontColor ?? existingEl.fontColor,
          fontOpacity: settings.fontOpacity ?? existingEl.fontOpacity,
        }),
      };
      const updated = elements.map((el) => (el.isPageNumber ? { ...el, ...updates } : el));
      return { ...page, elements: updated };
    }

    const newEl = createPageNumberElement(contentPageNumber, canvasSize.width, canvasSize.height, settings);
    return { ...page, elements: [...elements, newEl] };
  });
}

/**
 * Adds page number elements to pages that should have them.
 * Excludes: page 0 (front) and last page (back).
 * Page number 1 starts on page 1 (first content page).
 */
export function addPageNumbersToPages(
  pages: Array<{ pageNumber: number; elements: unknown[]; [key: string]: unknown }>,
  canvasSize: { width: number; height: number },
  settings: Partial<PageNumberingSettings> = {}
): void {
  const totalPages = pages.length;
  if (totalPages < 4) return;

  let contentPageNumber = 0;
  for (let i = 0; i < pages.length; i++) {
    const pageNumber = pages[i].pageNumber ?? i;
    const isSpecial = pageNumber === 0 || (totalPages > 0 && pageNumber === totalPages - 1);
    if (isSpecial) continue;

    contentPageNumber += 1;
    const element = createPageNumberElement(contentPageNumber, canvasSize.width, canvasSize.height, settings);
    const page = pages[i] as { elements: CanvasElement[] };
    page.elements = [...(page.elements || []), element];
  }
}
