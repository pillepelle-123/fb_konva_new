export * from './textbox-presets';
export * from './shape-presets';
export * from './brush-presets';

import { textboxPresets, getTextboxPresetsByTheme } from './textbox-presets';
import { shapePresets, getShapePresetsByTheme } from './shape-presets';
import { brushPresets, getBrushPresetsByTheme } from './brush-presets';

export interface PresetLibrary {
  textboxes: typeof textboxPresets;
  shapes: typeof shapePresets;
  brushes: typeof brushPresets;
}

export const presetLibrary: PresetLibrary = {
  textboxes: textboxPresets,
  shapes: shapePresets,
  brushes: brushPresets
};

export function getPresetsByTheme(theme: string) {
  return {
    textboxes: getTextboxPresetsByTheme(theme),
    shapes: getShapePresetsByTheme(theme),
    brushes: getBrushPresetsByTheme(theme)
  };
}

export const availableThemes = [
  'default',
  'sketchy', 
  'colorful',
  'minimal',
  'vintage',
  'dark'
] as const;

export type PresetTheme = typeof availableThemes[number];