import type { Book, Page } from '../context/editor-context';

/**
 * Get active template IDs for a page.
 * Each page has its own theme, layout, and color palette.
 *
 * @param page - The page object (can be undefined when no page context)
 * @param book - The book object (used as fallback when page is undefined, e.g. for new pages)
 * @returns Object with layoutId, themeId, and colorPaletteId
 */
export function getActiveTemplateIds(page: Page | undefined, book: Book | null): {
  layoutId: string | null;
  themeId: string;
  colorPaletteId: string | null;
} {
  if (!book) {
    return {
      layoutId: null,
      themeId: 'default',
      colorPaletteId: null
    };
  }

  // When no page is provided (e.g. new page creation), use book defaults
  if (!page) {
    return {
      layoutId: book.layoutId || null,
      themeId: book.themeId || book.bookTheme || 'default',
      colorPaletteId: book.colorPaletteId || null
    };
  }

  // Page has its own theme, layout, and palette; fall back to book when page has none set
  const themeId = page.themeId ?? book.themeId ?? book.bookTheme ?? 'default';
  const layoutId = page.layoutId ?? null;
  const colorPaletteId = page.colorPaletteId ?? book.colorPaletteId ?? null;

  return {
    layoutId,
    themeId,
    colorPaletteId
  };
}

