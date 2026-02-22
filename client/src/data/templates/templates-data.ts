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
}

let themesData: Record<string, ThemeConfigRecord> = {};
let colorPalettesData: ColorPalette[] = [];
let pageTemplatesData: PageTemplate[] = [];

export function setThemesData(themes: Array<{ id: string; name: string; description?: string; palette_id?: string; palette?: string; config?: { pageSettings?: unknown; elementDefaults?: unknown }; pageSettings?: unknown; elementDefaults?: unknown }>) {
  const record: Record<string, ThemeConfigRecord> = {};
  for (const t of themes) {
    const config = t.config || {};
    record[t.id] = {
      name: t.name || t.id,
      description: t.description,
      palette: t.palette_id ?? t.palette ?? 'default',
      pageSettings: (config.pageSettings ?? t.pageSettings ?? {}) as Record<string, unknown>,
      elementDefaults: (config.elementDefaults ?? t.elementDefaults ?? {}) as Record<string, unknown>,
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

export function getColorPalettesData(): ColorPalette[] {
  return colorPalettesData;
}

export function getPageTemplatesData(): PageTemplate[] {
  return pageTemplatesData;
}
