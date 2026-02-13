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
 * Page numbers: 1 starts on page 4 (first content page), no numbers on pages 1, 2, 3, and last page.
 * Position: Page 4 = right bottom, then alternating left/right.
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

  // Page 4 (pageNumber 1) = right, page 5 (pageNumber 2) = left, page 6 (pageNumber 3) = right, ...
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
 * Adds page number elements to pages that should have them.
 * Excludes: pages 1, 2, 3 (special) and last page.
 * Page number 1 starts on page 4.
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
    const pageNumber = i + 1; // 1-based
    const isSpecial = pageNumber === 1 || pageNumber === 2 || pageNumber === 3 || pageNumber === totalPages;
    if (isSpecial) continue;

    contentPageNumber += 1;
    const element = createPageNumberElement(contentPageNumber, canvasSize.width, canvasSize.height, settings);
    const page = pages[i] as { elements: CanvasElement[] };
    page.elements = [...(page.elements || []), element];
  }
}
