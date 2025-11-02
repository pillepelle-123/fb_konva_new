/**
 * Central mapping of themes to their associated color palettes.
 * This serves as the single source of truth for theme-palette relationships.
 * 
 * Note: Themes in themes.json also have a "palette" field for backward compatibility,
 * but this mapping takes precedence and is validated.
 */
export const THEME_PALETTE_MAP: Record<string, string> = {
  'default': 'neutral-harmony',
  'sketchy': 'dark-neon',
  'minimal': 'monochrome',
  'colorful': 'vibrant-rainbow',
  'vintage': 'vintage-sepia',
  'dark': 'dark-neon',
  'custom': 'vibrant-rainbow', // Fallback for custom theme
  'leather': 'leather',

};

/**
 * Get the palette ID for a given theme ID.
 * Returns undefined if theme is not found.
 */
export function getPaletteForTheme(themeId: string): string | undefined {
  return THEME_PALETTE_MAP[themeId];
}

/**
 * Validate that all theme-palette mappings are valid.
 * Returns an array of validation errors (empty if all valid).
 */
export function validateThemePaletteMappings(
  availablePalettes: string[]
): Array<{ themeId: string; paletteId: string; error: string }> {
  const errors: Array<{ themeId: string; paletteId: string; error: string }> = [];
  
  for (const [themeId, paletteId] of Object.entries(THEME_PALETTE_MAP)) {
    if (!availablePalettes.includes(paletteId)) {
      errors.push({
        themeId,
        paletteId,
        error: `Theme "${themeId}" references invalid palette "${paletteId}"`
      });
    }
  }
  
  return errors;
}

