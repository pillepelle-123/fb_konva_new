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
  
  // For theme, check multiple sources:
  // - If page.themeId exists as a property and has a value, use it (page has custom theme)
  // - Otherwise, use book theme (page inherits book theme)
  // Note: When page inherits book theme, page.themeId should not exist in the object
  // background.pageTheme is set to the book theme for reference, but it doesn't indicate page theme
  
  // CRITICAL: Check if themeId actually exists as a property in the page object
  // Use Object.hasOwnProperty to check if themeId exists as an own property
  // Page has explicit theme if:
  // - themeId exists as an own property (not inherited)
  // - themeId value is not undefined/null
  // IMPORTANT: Even if themeId matches bookThemeId, it's still an explicit theme
  // This distinguishes between "inheriting book theme" (no themeId) and 
  // "explicitly set to same theme" (has themeId, even if matching bookThemeId)
  const hasThemeIdOwnProperty = page && Object.prototype.hasOwnProperty.call(page, 'themeId');
  const themeIdValue = page?.themeId;
  const hasPageThemeId = hasThemeIdOwnProperty && themeIdValue !== undefined && themeIdValue !== null;
  
  // CRITICAL: If page has themeId as own property, it's an explicit theme
  // Even if it matches bookThemeId, we use the explicit themeId
  // This allows users to explicitly set a page to the same theme as the book
  // When book theme changes, pages with explicit themeId (even if matching) won't be updated
  const themeId = hasPageThemeId
    ? (page!.themeId || bookThemeId) // Page has explicit theme - use it (even if it matches bookThemeId)
    : bookThemeId; // Page inherits book theme - use bookThemeId
  
  const colorPaletteId = page.colorPaletteId || bookColorPaletteId;

  return {
    layoutTemplateId,
    themeId,
    colorPaletteId
  };
}

