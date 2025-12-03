import type { PageBackground } from '../context/editor-context.tsx';
import {
  getBackgroundImageById,
  getBackgroundImageWithUrl as getBackgroundImageWithUrlInternal,
  svgRawImports
} from '../data/templates/background-images.ts';
import { colorPalettes } from '../data/templates/color-palettes.ts';
import { applyAutoPaletteToSvg, applyPaletteSlotsToSvg } from './svg-palette.ts';
import type { PaletteSlot } from './svg-palette.ts';

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
    imagePosition?: PageBackground['imagePosition'];
    imageWidth?: number; // width in % of page width (0-200, default 100)
    backgroundColor?: string;
    opacity?: number;
  }
): PageBackground | null {
  const template = getBackgroundImageWithUrlInternal(templateId);
  if (!template) {
    console.warn(`Background image template not found: ${templateId}`);
    return null;
  }

  const resolvedOpacity = customSettings?.opacity ?? template.defaultOpacity ?? 1;
  const resolvedWidth = customSettings?.imageWidth !== undefined 
    ? Math.min(Math.max(customSettings.imageWidth, 10), 200)
    : Math.min(Math.max(template.defaultWidth ?? 100, 10), 200);
  const resolvedPosition = customSettings?.imagePosition ?? template.defaultPosition ?? 'top-left';

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
    opacity: resolvedOpacity,
    imageSize,
    imageRepeat,
    backgroundImageTemplateId: templateId,
    applyPalette: true
  };

  // Always set position (resolvedPosition already handles customSettings, template default, or fallback)
  background.imagePosition = resolvedPosition;

  // Always set width - resolvedWidth already handles customSettings, template default, or fallback
  // For contain mode, width is always used. For other modes, it's set if explicitly provided in customSettings or template.
  // CRITICAL: Always set width if it was provided in customSettings (from theme) OR if template has defaultWidth
  // This ensures theme values are always applied, even for cover/stretch modes
  if (customSettings?.imageWidth !== undefined || imageSize === 'contain' || template.defaultWidth !== undefined) {
    background.imageContainWidthPercent = resolvedWidth;
  }

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
  options?: BackgroundImagePaletteOptions,
  applyPalette = true
): string | undefined {
  const template = getBackgroundImageWithUrlInternal(templateId);
  if (!template) {
    console.warn(`Background image template not found: ${templateId}`);
    return undefined;
  }
  if (!template.url) {
    console.warn(`Background image URL not resolved for template: ${templateId}, filePath: ${template.filePath}`);
    return undefined;
  }

  if (!applyPalette) {
    return template.url;
  }

  if (template.format === 'vector') {
    const rawSvg = svgRawImports[template.filePath];
    const paletteColors = resolvePaletteColors(options);

    if (rawSvg && paletteColors) {
      const containsPaletteTokens = /PALETTE_[A-Z_]+/.test(rawSvg);

      if (template.paletteSlots === 'standard' && containsPaletteTokens) {
        return applyPaletteSlotsToSvg(rawSvg, paletteColors, {
          cacheKey: template.id,
          asDataUrl: true,
        });
      }

      if (template.paletteSlots === 'auto' || (template.paletteSlots === 'standard' && !containsPaletteTokens)) {
        return applyAutoPaletteToSvg(rawSvg, paletteColors, {
          cacheKey: `${template.id}::auto`,
          asDataUrl: true,
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
  const template = getBackgroundImageWithUrlInternal(templateId);
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
    const shouldApplyPalette = background.applyPalette !== false;
    if (shouldApplyPalette) {
      return getBackgroundImageUrl(background.backgroundImageTemplateId, options, true);
    }
    try {
      const template = getBackgroundImageWithUrlInternal(background.backgroundImageTemplateId);
      return template?.url;
    } catch {
      return background.value;
    }
  }

  // Otherwise use direct value
  return background.value;
}

export { getBackgroundImageWithUrl } from '../data/templates/background-images.ts';

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

/**
 * Create a downscaled preview image for heavy assets to improve runtime performance.
 * Falls back to the original image when scaling is unnecessary.
 */
export function createPreviewImage(
  source: HTMLImageElement,
  { maxDimension = 1600, quality = 0.85 }: { maxDimension?: number; quality?: number } = {}
): HTMLImageElement {
  const src = source.currentSrc || source.src || '';
  if (isSvgSource(src)) {
    return source;
  }

  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;

  if (width === 0 || height === 0) {
    return source;
  }

  const shouldScale =
    width > maxDimension || height > maxDimension;

  if (!shouldScale) {
    return source;
  }

  const scale = Math.min(maxDimension / width, maxDimension / height);
  const targetWidth = Math.max(Math.round(width * scale), 1);
  const targetHeight = Math.max(Math.round(height * scale), 1);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return source;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  const preview = new window.Image();
  preview.src = canvas.toDataURL('image/jpeg', quality);
  return preview;
}

function isSvgSource(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('data:image/svg+xml')) return true;
  try {
    const url = new URL(src, window.location.href);
    return /\.svg$/i.test(url.pathname);
  } catch {
    return /\.svg(\?|$)/i.test(src);
  }
}
