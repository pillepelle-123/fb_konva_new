/**
 * Runtime templates data loaded from API.
 * Replaces static JSON imports. Data is set when the app loads themes, palettes, and layouts.
 */
import type { ColorPalette } from '../../types/template-types';
import type { PageTemplate } from '../../types/template-types';

export interface ThemeConfigRecord {
  name: string;
  description?: string;
  palette: string;
  pageSettings: Record<string, unknown>;
  elementDefaults: Record<string, unknown>;
  is_default?: boolean;
}

let themesData: Record<string, ThemeConfigRecord> = {};
let colorPalettesData: ColorPalette[] = [];
let pageTemplatesData: PageTemplate[] = [];

export function setThemesData(themes: Array<{ id: string | number; name: string; description?: string; palette_id?: string | number; palette?: string; is_default?: boolean; config?: { pageSettings?: unknown; elementDefaults?: unknown }; pageSettings?: unknown; elementDefaults?: unknown }>) {
  const record: Record<string, ThemeConfigRecord> = {};
  for (const t of themes) {
    const config = t.config || {};
    record[String(t.id)] = {
      name: t.name || t.id,
      description: t.description,
      palette: String(t.palette_id ?? t.palette ?? 'default'),
      pageSettings: (config.pageSettings ?? t.pageSettings ?? {}) as Record<string, unknown>,
      elementDefaults: (config.elementDefaults ?? t.elementDefaults ?? {}) as Record<string, unknown>,
      is_default: t.is_default,
    };
  }
  themesData = record;
}

export function setColorPalettesData(palettes: ColorPalette[]) {
  colorPalettesData = palettes || [];
}

export function setPageTemplatesData(templates: PageTemplate[]) {
  pageTemplatesData = templates || [];
}

export function getThemesData(): Record<string, ThemeConfigRecord> {
  return themesData;
}

/** Returns the theme ID of the default theme (is_default=true), or the first theme, or 'default' as fallback. */
export function getDefaultThemeId(): string {
  const themes = getThemesData();
  const entries = Object.entries(themes);
  const defaultEntry = entries.find(([, t]) => t.is_default);
  if (defaultEntry) return defaultEntry[0];
  const first = entries[0];
  return first ? first[0] : 'default';
}

export function getColorPalettesData(): ColorPalette[] {
  return colorPalettesData;
}

export function getPageTemplatesData(): PageTemplate[] {
  return pageTemplatesData;
}
