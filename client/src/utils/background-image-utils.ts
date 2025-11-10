import type { PageBackground } from '../context/editor-context';
import {
  getBackgroundImageById,
  getBackgroundImageWithUrl,
  svgRawImports
} from '../data/templates/background-images';
import { colorPalettes } from '../data/templates/color-palettes';
import { applyAutoPaletteToSvg, applyPaletteSlotsToSvg } from './svg-palette';
import type { PaletteSlot } from './svg-palette';

/**
 * Optional palette context for palette-aware SVG backgrounds.
 */
export interface BackgroundImagePaletteOptions {
  paletteId?: string | null;
  paletteColors?: Partial<Record<PaletteSlot | string, string>>;
}

/**
 * Apply background image template to PageBackground
 */
export function applyBackgroundImageTemplate(
  templateId: string,
  customSettings?: {
    imageSize?: PageBackground['imageSize'];
    imageRepeat?: boolean;
    backgroundColor?: string;
    opacity?: number;
  }
): PageBackground | null {
  const template = getBackgroundImageWithUrl(templateId);
  if (!template) {
    console.warn(`Background image template not found: ${templateId}`);
    return null;
  }

  // Map defaultSize to imageSize and imageRepeat
  let imageSize: PageBackground['imageSize'] = 'cover';
  let imageRepeat = false;

  if (customSettings?.imageSize) {
    imageSize = customSettings.imageSize;
    imageRepeat = customSettings.imageRepeat ?? false;
  } else {
    switch (template.defaultSize) {
      case 'cover':
        imageSize = 'cover';
        imageRepeat = false;
        break;
      case 'contain':
        imageSize = 'contain';
        imageRepeat = false;
        break;
      case 'contain-repeat':
        imageSize = 'contain';
        imageRepeat = true;
        break;
      case 'stretch':
        imageSize = 'stretch';
        imageRepeat = false;
        break;
      default:
        imageSize = 'cover';
        imageRepeat = false;
    }
  }

  const background: PageBackground = {
    type: 'image',
    value: template.url,
    opacity: customSettings?.opacity ?? 1,
    imageSize,
    imageRepeat,
    backgroundImageTemplateId: templateId
  };

  // Apply background color if enabled and provided
  if (template.backgroundColor?.enabled) {
    type BackgroundWithColor = PageBackground & {
      backgroundColor?: string;
      backgroundColorEnabled?: boolean;
    };
    const backgroundWithColor = background as BackgroundWithColor;
    if (customSettings?.backgroundColor) {
      backgroundWithColor.backgroundColor = customSettings.backgroundColor;
      backgroundWithColor.backgroundColorEnabled = true;
    } else if (template.backgroundColor.defaultValue) {
      backgroundWithColor.backgroundColor = template.backgroundColor.defaultValue;
      backgroundWithColor.backgroundColorEnabled = true;
    }
  }

  return background;
}

/**
 * Get background image URL for a template ID
 */
export function getBackgroundImageUrl(
  templateId: string,
  options?: BackgroundImagePaletteOptions
): string | undefined {
  const template = getBackgroundImageWithUrl(templateId);
  if (!template) {
    console.warn(`Background image template not found: ${templateId}`);
    return undefined;
  }
  if (!template.url) {
    console.warn(`Background image URL not resolved for template: ${templateId}, filePath: ${template.filePath}`);
    return undefined;
  }

  if (template.format === 'vector') {
    const rawSvg = svgRawImports[template.filePath];
    const paletteColors = resolvePaletteColors(options);

    if (rawSvg && paletteColors) {
      if (template.paletteSlots === 'standard') {
        return applyPaletteSlotsToSvg(rawSvg, paletteColors, {
          cacheKey: template.id,
          asDataUrl: true
        });
      }

      if (template.paletteSlots === 'auto') {
        return applyAutoPaletteToSvg(rawSvg, paletteColors, {
          cacheKey: template.id,
          asDataUrl: true
        });
      }
    }
  }

  return template.url;
}

/**
 * Get background image thumbnail URL for a template ID
 */
export function getBackgroundImageThumbnailUrl(templateId: string): string | undefined {
  const template = getBackgroundImageWithUrl(templateId);
  return template?.thumbnailUrl;
}

/**
 * Validate background image template
 */
export function validateBackgroundImageTemplate(templateId: string): {
  valid: boolean;
  error?: string;
} {
  const template = getBackgroundImageById(templateId);
  if (!template) {
    return {
      valid: false,
      error: `Background image template not found: ${templateId}`
    };
  }

  // Additional validation could be added here
  // e.g., check if file exists, validate imageSize values, etc.

  return { valid: true };
}

/**
 * Resolve image URL from PageBackground (handles both template and direct URLs)
 */
export function resolveBackgroundImageUrl(
  background: PageBackground,
  options?: BackgroundImagePaletteOptions
): string | undefined {
  if (background.type !== 'image') {
    return undefined;
  }

  // If using template, resolve template URL (with palette support for SVGs)
  if (background.backgroundImageTemplateId) {
    return getBackgroundImageUrl(background.backgroundImageTemplateId, options);
  }

  // Otherwise use direct value
  return background.value;
}

/**
 * Check if background uses a template
 */
export function isTemplateBackground(background: PageBackground): boolean {
  return background.type === 'image' && !!background.backgroundImageTemplateId;
}

function resolvePaletteColors(
  options?: BackgroundImagePaletteOptions
): Partial<Record<PaletteSlot | string, string>> | undefined {
  const fallbackPalette =
    colorPalettes.find((palette) => palette.id === 'default') ?? colorPalettes[0] ?? null;

  if (!options) {
    return fallbackPalette ? withSlotFallbacks(fallbackPalette.colors) : undefined;
  }

  if (options.paletteColors) {
    return withSlotFallbacks(options.paletteColors);
  }

  const paletteId = options.paletteId ?? null;
  if (!paletteId) {
    return fallbackPalette ? withSlotFallbacks(fallbackPalette.colors) : undefined;
  }

  const palette = colorPalettes.find((paletteEntry) => paletteEntry.id === paletteId) ?? fallbackPalette;
  return palette ? withSlotFallbacks(palette.colors) : undefined;
}

function withSlotFallbacks(
  colors: Partial<Record<PaletteSlot | string, string>>
): Partial<Record<PaletteSlot | string, string>> {
  const background = colors.background || colors.surface || colors.primary || colors.secondary || colors.accent;
  const surface = colors.surface || background;
  const primary = colors.primary || background;
  const secondary = colors.secondary || surface;
  const accent = colors.accent || primary;
  const text = colors.text || primary || background;

  return {
    background,
    surface,
    primary,
    secondary,
    accent,
    text
  };
}
