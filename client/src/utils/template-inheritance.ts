import type { Book, Page } from '../context/editor-context';

/**
 * Get active template IDs with inheritance fallback logic.
 * Page-level templates take precedence, falling back to book-level templates.
 * 
 * @param page - The page object (can be undefined for book-level)
 * @param book - The book object
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

  // Get book-level template IDs
  const bookLayoutTemplateId = book.layoutTemplateId || null;
  const bookThemeId = book.themeId || book.bookTheme || 'default';
  const bookColorPaletteId = book.colorPaletteId || null;

  // If no page is provided, return book-level templates
  if (!page) {
    return {
      layoutTemplateId: bookLayoutTemplateId,
      themeId: bookThemeId,
      colorPaletteId: bookColorPaletteId
    };
  }

  // Page-level templates take precedence, fallback to book-level
  const layoutTemplateId = page.layoutTemplateId || bookLayoutTemplateId;
  
  // For theme, check multiple sources: page.themeId, page.background.pageTheme, then book theme
  const themeId = page.themeId || 
                  page.background?.pageTheme || 
                  bookThemeId;
  
  const colorPaletteId = page.colorPaletteId || bookColorPaletteId;

  return {
    layoutTemplateId,
    themeId,
    colorPaletteId
  };
}

