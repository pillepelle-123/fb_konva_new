import type { Book, Page } from '../context/editor-context';

/**
 * Get active template IDs for a page.
 * Each page has its own theme, layout, and color palette.
 *
 * @param page - The page object (can be undefined when no page context)
 * @param book - The book object (used as fallback when page is undefined, e.g. for new pages)
 * @returns Object with layoutTemplateId, themeId, and colorPaletteId
 */
export function getActiveTemplateIds(page: Page | undefined, book: Book | null): {
  layoutTemplateId: string | null;
  themeId: string;
  colorPaletteId: string | null;
} {
  if (!book) {
    return {
      layoutTemplateId: null,
      themeId: 'default',
      colorPaletteId: null
    };
  }

  // When no page is provided (e.g. new page creation), use book defaults
  if (!page) {
    return {
      layoutTemplateId: book.layoutTemplateId || null,
      themeId: book.themeId || book.bookTheme || 'default',
      colorPaletteId: book.colorPaletteId || null
    };
  }

  // Page has its own theme, layout, and palette (no inheritance from book)
  const themeId = page.themeId ?? 'default';
  const layoutTemplateId = page.layoutTemplateId ?? null;
  const colorPaletteId = page.colorPaletteId ?? null;

  return {
    layoutTemplateId,
    themeId,
    colorPaletteId
  };
}

