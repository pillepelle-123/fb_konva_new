import type { PageBackground } from '../context/editor-context.tsx';
import {
  getBackgroundImageById,
  getBackgroundImageWithUrl as getBackgroundImageWithUrlInternal,
  loadBackgroundImageSvg,
  svgRawImports
} from '../data/templates/background-images.ts';
import { colorPalettes, getPalettePartColor } from '../data/templates/color-palettes.ts';
import { applyAutoPaletteToSvg, applyMonochromeToneToSvg, applyPaletteSlotsToSvg } from './svg-palette.ts';
import type { PaletteSlot } from './svg-palette.ts';
import type { BackgroundPaletteMode } from '../context/editor-context.tsx';

/**
 * Optional palette context for palette-aware SVG backgrounds.
 */
export interface BackgroundImagePaletteOptions {
  paletteId?: string | null;
  paletteColors?: Partial<Record<PaletteSlot | string, string>>;
  /** 'palette' = multi-color, 'monochrome' = single-tone (Color Toning) */
  paletteMode?: BackgroundPaletteMode;
  /** Palette object for tone color resolution (monochrome uses background) */
  palette?: { colors: Record<string, string>; parts?: Record<string, string> };
  /** When set (e.g. user's backgroundColor): overrides palette for SVG coloring - image adapts to this color */
  backgroundColorOverride?: string;
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
    backgroundColorOpacity?: number; // opacity of background color layer (pageSettings.backgroundOpacity)
    opacity?: number; // image opacity (backgroundImage.opacity)
    applyPalette?: boolean;
    paletteMode?: BackgroundPaletteMode;
  }
): PageBackground | null {
  const template = getBackgroundImageWithUrlInternal(templateId);
  if (!template) {
    console.warn(`Background image template not found: ${templateId}`);
    return null;
  }

  const isDesignerTemplate = (template as any).imageType === 'designer';
  if (isDesignerTemplate) {
    const designerBackground: PageBackground = {
      type: 'image',
      value: template.url || `designer:${template.id}`,
      opacity: customSettings?.opacity ?? template.defaultOpacity ?? 1,
      imageSize: 'cover',
      imageRepeat: false,
      backgroundImageId: template.id,
      applyPalette: false,
      paletteMode: 'palette',
      backgroundImageType: 'designer',
      backgroundImageDesignerId: (template as any).designerId || template.id,
      designerCanvasStructure: (template as any).designerCanvasStructure,
      designerCanvasWidth: (template as any).designerCanvasWidth,
      designerCanvasHeight: (template as any).designerCanvasHeight,
      designerCanvas: {
        structure: (template as any).designerCanvasStructure,
        canvasWidth: (template as any).designerCanvasWidth,
        canvasHeight: (template as any).designerCanvasHeight,
      },
    } as PageBackground;

    return designerBackground;
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

  const applyPalette = customSettings?.applyPalette ?? true;
  const background: PageBackground = {
    type: 'image',
    // Only set value when palette is not applied - when applyPalette is true,
    // resolveBackgroundImageUrl will use backgroundImageId to generate palette-aware URL
    value: applyPalette ? undefined : template.url,
    opacity: resolvedOpacity,
    imageSize,
    imageRepeat,
    backgroundImageId: templateId,
    applyPalette,
    paletteMode: customSettings?.paletteMode ?? 'palette'
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
  type BackgroundWithColor = PageBackground & {
    backgroundColor?: string;
    backgroundColorEnabled?: boolean;
    backgroundColorOpacity?: number;
  };
  const backgroundWithColor = background as BackgroundWithColor;
  if (template.backgroundColor?.enabled) {
    if (customSettings?.backgroundColor) {
      backgroundWithColor.backgroundColor = customSettings.backgroundColor;
      backgroundWithColor.backgroundColorEnabled = true;
    } else if (template.backgroundColor.defaultValue) {
      backgroundWithColor.backgroundColor = template.backgroundColor.defaultValue;
      backgroundWithColor.backgroundColorEnabled = true;
    }
  }
  // Always set backgroundColor when provided (e.g. from theme pageColors)
  if (customSettings?.backgroundColor) {
    backgroundWithColor.backgroundColor = customSettings.backgroundColor;
    backgroundWithColor.backgroundColorEnabled = true;
  }
  if (customSettings?.backgroundColorOpacity !== undefined) {
    backgroundWithColor.backgroundColorOpacity = customSettings.backgroundColorOpacity;
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
    let rawSvg = svgRawImports[template.filePath];
    const paletteColors = resolvePaletteColors(options);
    const paletteMode = options?.paletteMode ?? 'palette';

    // Trigger on-demand load when SVG not yet cached (fire-and-forget)
    if (!rawSvg && template.url) {
      loadBackgroundImageSvg(template.filePath, template.url).catch(() => {});
    }

    if (rawSvg && paletteColors) {
      if (paletteMode === 'monochrome') {
        const toneColor = getToneColorFromPalette(options);
        if (toneColor) {
          try {
            // When user set backgroundColorOverride: skip edge replacement so the image stays visible.
            const edgeBgColor = options?.backgroundColorOverride
              ? undefined
              : getPageBackgroundColor(options);
            const result = applyMonochromeToneToSvg(rawSvg, toneColor, {
              cacheKey: `${template.id}::${options?.paletteId ?? 'default'}::mono`,
              asDataUrl: true,
              edgeBackgroundColor: edgeBgColor,
              pageBackgroundColor: getPageBackgroundColor(options),
            });
            if (result?.startsWith('data:')) return result;
          } catch (e) {
            console.warn('[getBackgroundImageUrl] Monochrome processing failed, using original:', e);
          }
          return template.url;
        }
      }

      const containsPaletteTokens = /PALETTE_[A-Z_]+/.test(rawSvg);

      if (template.paletteSlots === 'standard' && containsPaletteTokens) {
        return applyPaletteSlotsToSvg(rawSvg, paletteColors, {
          cacheKey: `${template.id}::${options?.paletteId ?? 'default'}`,
          asDataUrl: true,
        });
      }

      if (template.paletteSlots === 'auto' || (template.paletteSlots === 'standard' && !containsPaletteTokens)) {
        return applyAutoPaletteToSvg(rawSvg, paletteColors, {
          cacheKey: `${template.id}::${options?.paletteId ?? 'default'}::auto`,
          asDataUrl: true,
          slotOpacities: template.paletteSlotOpacities,
          useBackgroundSlots: template.useBackgroundSlots,
          pageBackgroundColor: getPageBackgroundColor(options),
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

  // Prefer pre-resolved SVG data URLs for palette processing in one-shot renderers
  // (e.g. server PDF export), otherwise we may return too early via template lookup
  // and miss palette coloring on first render.
  const shouldApplyPalette = background.applyPalette !== false;
  const isSvgDataUrl = Boolean(background.value && background.value.startsWith('data:image/svg+xml'));
  if (isSvgDataUrl && shouldApplyPalette) {
    const bg = background as { backgroundColor?: string; backgroundColorEnabled?: boolean };
    const dataUrlOptions: BackgroundImagePaletteOptions = {
      ...options,
      paletteMode: background.paletteMode ?? options?.paletteMode ?? 'palette',
      backgroundColorOverride:
        bg.backgroundColorEnabled && bg.backgroundColor ? bg.backgroundColor : undefined,
    };
    const match = background.value!.match(/^data:image\/svg\+xml.*;base64,(.+)$/);
    const urlEncodedMatch = background.value!.match(/^data:image\/svg\+xml,(.+)$/);
    if (match) {
      try {
        const binary = atob(match[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const rawSvg = new TextDecoder().decode(bytes);
        const paletteColors = resolvePaletteColors(dataUrlOptions);
        const containsPaletteTokens = rawSvg ? /PALETTE_[A-Z_]+/.test(rawSvg) : false;
        const template = background.backgroundImageId
          ? getBackgroundImageById(background.backgroundImageId)
          : null;
        const paletteSlots = template?.paletteSlots;

        if (rawSvg && paletteColors) {
          const paletteMode = background.paletteMode ?? options?.paletteMode ?? 'palette';

          if (paletteMode === 'monochrome') {
            const toneColor = getToneColorFromPalette(dataUrlOptions);
            const edgeBgColor = dataUrlOptions?.backgroundColorOverride
              ? undefined
              : getPageBackgroundColor(dataUrlOptions);
            if (toneColor) {
              const monoResult = applyMonochromeToneToSvg(rawSvg, toneColor, {
                cacheKey: `${background.backgroundImageId || 'bg'}::data::mono`,
                asDataUrl: true,
                edgeBackgroundColor: edgeBgColor,
                pageBackgroundColor: getPageBackgroundColor(dataUrlOptions),
              });
              if (monoResult?.startsWith('data:')) return monoResult;
            }
            return applyAutoPaletteToSvg(rawSvg, paletteColors, {
              cacheKey: `${background.backgroundImageId || 'bg'}::data::auto::fallback`,
              asDataUrl: true,
              slotOpacities: template?.paletteSlotOpacities,
              useBackgroundSlots: template?.useBackgroundSlots,
              pageBackgroundColor: getPageBackgroundColor(dataUrlOptions),
            });
          }

          if (paletteSlots === 'standard' && containsPaletteTokens) {
            return applyPaletteSlotsToSvg(rawSvg, paletteColors, {
              cacheKey: `${background.backgroundImageId || 'bg'}::data`,
              asDataUrl: true,
            });
          }

          if (paletteSlots === 'auto' || (paletteSlots === 'standard' && !containsPaletteTokens)) {
            return applyAutoPaletteToSvg(rawSvg, paletteColors, {
              cacheKey: `${background.backgroundImageId || 'bg'}::data::auto`,
              asDataUrl: true,
              slotOpacities: template?.paletteSlotOpacities,
              useBackgroundSlots: template?.useBackgroundSlots,
              pageBackgroundColor: getPageBackgroundColor(dataUrlOptions),
            });
          }

          if (containsPaletteTokens) {
            return applyPaletteSlotsToSvg(rawSvg, paletteColors, {
              cacheKey: `${background.backgroundImageId || 'bg'}::data::fallback`,
              asDataUrl: true,
            });
          }

          return applyAutoPaletteToSvg(rawSvg, paletteColors, {
            cacheKey: `${background.backgroundImageId || 'bg'}::data::auto::fallback`,
            asDataUrl: true,
            slotOpacities: template?.paletteSlotOpacities,
            useBackgroundSlots: template?.useBackgroundSlots,
          });
        }
      } catch (e) {
        console.warn('[resolveBackgroundImageUrl] Priority SVG data URL processing failed:', e);
      }
    }
  }

  // If using background image by UUID/slug with palette, ignore value field
  // (Legacy data may have value set from before palette support)
  if (background.backgroundImageId) {
    if (shouldApplyPalette) {
      const bg = background as { backgroundColor?: string; backgroundColorEnabled?: boolean };
      const mergedOptions: BackgroundImagePaletteOptions = {
        ...options,
        paletteMode: background.paletteMode ?? options?.paletteMode ?? 'palette',
        // Don't use backgroundColorOverride for palette mode - let it use the current paletteId
        // backgroundColorOverride would derive colors from a single color, overriding the palette
      };
      const result = getBackgroundImageUrl(background.backgroundImageId, mergedOptions, true);
      return result;
    }
    try {
      const template = getBackgroundImageWithUrlInternal(background.backgroundImageId);
      return template?.url;
    } catch {
      return background.value;
    }
  }

  // Prefer pre-resolved data URL (e.g. from server-side PDF export where API URLs are replaced)
  // For SVG, still apply palette when requested so page color palette is respected
  if (background.value && background.value.startsWith('data:')) {
    const shouldApplyPalette = background.applyPalette !== false;
    const isSvgDataUrl = background.value.startsWith('data:image/svg+xml');
    console.log('[PDF Debug] resolveBackgroundImageUrl data URL branch:', {
      valuePrefix: background.value.substring(0, 80),
      shouldApplyPalette,
      hasOptions: !!options,
      isSvgDataUrl,
    });
    if (
      shouldApplyPalette &&
      options &&
      isSvgDataUrl
    ) {
      const bg = background as { backgroundColor?: string; backgroundColorEnabled?: boolean };
      const dataUrlOptions: BackgroundImagePaletteOptions = {
        ...options,
        paletteMode: background.paletteMode ?? options?.paletteMode ?? 'palette',
        backgroundColorOverride:
          bg.backgroundColorEnabled && bg.backgroundColor ? bg.backgroundColor : undefined,
      };
      const match = background.value.match(/^data:image\/svg\+xml.*;base64,(.+)$/);
      const urlEncodedMatch = background.value.match(/^data:image\/svg\+xml,(.+)$/);
      console.log('[PDF Debug] SVG data URL format:', {
        matchedBase64: !!match,
        matchedUrlEncoded: !!urlEncodedMatch,
        valueLength: background.value.length,
      });
      if (match) {
        try {
          const binary = atob(match[1]);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const rawSvg = new TextDecoder().decode(bytes);
          const paletteColors = resolvePaletteColors(dataUrlOptions);
          const containsPaletteTokens = rawSvg ? /PALETTE_[A-Z_]+/.test(rawSvg) : false;
          const template = background.backgroundImageId
            ? getBackgroundImageById(background.backgroundImageId)
            : null;
          const paletteSlots = template?.paletteSlots;

          console.log('[PDF Debug] SVG palette application:', {
            rawSvgLength: rawSvg?.length ?? 0,
            hasPaletteColors: !!paletteColors,
            paletteColorsKeys: paletteColors ? Object.keys(paletteColors) : [],
            containsPaletteTokens,
            paletteSlots,
            backgroundImageId: background.backgroundImageId,
          });

          if (rawSvg && paletteColors) {
            const paletteMode = background.paletteMode ?? options?.paletteMode ?? 'palette';
            let appliedBranch: string;
            let result: string | undefined;

            if (paletteMode === 'monochrome') {
              const toneColor = getToneColorFromPalette(dataUrlOptions);
              const edgeBgColor = dataUrlOptions?.backgroundColorOverride
                ? undefined
                : getPageBackgroundColor(dataUrlOptions);
              if (toneColor) {
                try {
                  appliedBranch = 'monochrome';
                  const monoResult = applyMonochromeToneToSvg(rawSvg, toneColor, {
                    cacheKey: `${background.backgroundImageId || 'bg'}::data::mono`,
                    asDataUrl: true,
                    edgeBackgroundColor: edgeBgColor,
                    pageBackgroundColor: getPageBackgroundColor(dataUrlOptions),
                  });
                  if (monoResult?.startsWith('data:')) result = monoResult;
                } catch (e) {
                  console.warn('[resolveBackgroundImageUrl] Monochrome processing failed, using auto fallback:', e);
                  appliedBranch = 'monochrome-fallback-auto';
                  result = applyAutoPaletteToSvg(rawSvg, paletteColors, {
                    cacheKey: `${background.backgroundImageId || 'bg'}::data::auto::fallback`,
                    asDataUrl: true,
                    slotOpacities: template?.paletteSlotOpacities,
                    useBackgroundSlots: template?.useBackgroundSlots,
                    pageBackgroundColor: getPageBackgroundColor(dataUrlOptions),
                  });
                }
              }
              if (!result) {
                appliedBranch = 'monochrome-fallback-auto';
                result = applyAutoPaletteToSvg(rawSvg, paletteColors, {
                  cacheKey: `${background.backgroundImageId || 'bg'}::data::auto::fallback`,
                  asDataUrl: true,
                  slotOpacities: template?.paletteSlotOpacities,
                  useBackgroundSlots: template?.useBackgroundSlots,
                  pageBackgroundColor: getPageBackgroundColor(dataUrlOptions),
                });
              }
            } else if (paletteSlots === 'standard' && containsPaletteTokens) {
              appliedBranch = 'standard+slots';
              result = applyPaletteSlotsToSvg(rawSvg, paletteColors, {
                cacheKey: `${background.backgroundImageId || 'bg'}::data`,
                asDataUrl: true,
              });
            } else if (
              paletteSlots === 'auto' ||
              (paletteSlots === 'standard' && !containsPaletteTokens)
            ) {
              appliedBranch = 'auto';
              result = applyAutoPaletteToSvg(rawSvg, paletteColors, {
                cacheKey: `${background.backgroundImageId || 'bg'}::data::auto`,
                asDataUrl: true,
                slotOpacities: template?.paletteSlotOpacities,
                useBackgroundSlots: template?.useBackgroundSlots,
                pageBackgroundColor: getPageBackgroundColor(dataUrlOptions),
              });
            } else if (containsPaletteTokens) {
              appliedBranch = 'fallback-slots';
              result = applyPaletteSlotsToSvg(rawSvg, paletteColors, {
                cacheKey: `${background.backgroundImageId || 'bg'}::data::fallback`,
                asDataUrl: true,
              });
            } else {
              appliedBranch = 'fallback-auto';
              result = applyAutoPaletteToSvg(rawSvg, paletteColors, {
                cacheKey: `${background.backgroundImageId || 'bg'}::data::auto::fallback`,
                asDataUrl: true,
                slotOpacities: template?.paletteSlotOpacities,
                useBackgroundSlots: template?.useBackgroundSlots,
              });
            }
            console.log('[PDF Debug] Palette applied via branch:', appliedBranch);
            return result;
          }
          console.log('[PDF Debug] Skipped palette: no rawSvg or no paletteColors');
        } catch (e) {
          console.warn('[resolveBackgroundImageUrl] Failed to apply palette to data URL:', e);
        }
      } else {
        console.log('[PDF Debug] SVG base64 regex did not match – returning original value');
      }
    } else {
      console.log('[PDF Debug] Skipping palette: shouldApplyPalette=', shouldApplyPalette, 'hasOptions=', !!options);
    }
    return background.value;
  }

  // Otherwise use direct value
  return background.value;
}

export { getBackgroundImageWithUrl } from '../data/templates/background-images.ts';

/**
 * Check if background uses a background image by UUID
 */
export function isTemplateBackground(background: PageBackground): boolean {
  return background.type === 'image' && !!background.backgroundImageId;
}

/** Monochrome tone uses palette background color (per shadcn: "chosen tone" from background) */
function getToneColorFromPalette(options?: BackgroundImagePaletteOptions): string | undefined {
  if (options?.backgroundColorOverride) {
    return ensureHashForOverride(options.backgroundColorOverride);
  }
  if (options?.palette) {
    return (
      options.palette.colors?.background ??
      options.palette.colors?.surface ??
      options.palette.colors?.primary ??
      '#ffffff'
    );
  }
  const paletteColors = resolvePaletteColors(options);
  return paletteColors?.background ?? paletteColors?.surface ?? paletteColors?.primary;
}

/** Page background color for edge-blending in monochrome mode (matches pageBackground part) */
function getPageBackgroundColor(options?: BackgroundImagePaletteOptions): string | undefined {
  if (options?.backgroundColorOverride) {
    return ensureHashForOverride(options.backgroundColorOverride);
  }
  if (options?.palette) {
    return (
      getPalettePartColor(options.palette, 'pageBackground', 'background', options.palette.colors?.background) ??
      options.palette.colors?.background ??
      options.palette.colors?.surface ??
      options.palette.colors?.primary
    );
  }
  const paletteColors = resolvePaletteColors(options);
  return paletteColors?.background ?? paletteColors?.surface ?? paletteColors?.primary;
}

function ensureHashForOverride(color: string): string {
  if (!color?.trim()) return '#ffffff';
  const trimmed = color.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function resolvePaletteColors(
  options?: BackgroundImagePaletteOptions
): Partial<Record<PaletteSlot | string, string>> | undefined {
  const fallbackPalette =
    colorPalettes.find((palette) => palette.id === 'default') ?? colorPalettes[0] ?? null;

  if (!options) {
    return fallbackPalette ? withSlotFallbacks(fallbackPalette.colors) : undefined;
  }

  // User's background color override: derive palette from this color (Palette + Monochrome modes)
  if (options.backgroundColorOverride) {
    const base = ensureHashForOverride(options.backgroundColorOverride);
    return withSlotFallbacks(derivePaletteFromBaseColor(base));
  }

  if (options.paletteColors) {
    return withSlotFallbacks(options.paletteColors);
  }

  const paletteId = options.paletteId ?? null;
  if (!paletteId) {
    return fallbackPalette ? withSlotFallbacks(fallbackPalette.colors) : undefined;
  }

  const palette =
    colorPalettes.find((paletteEntry) => paletteEntry.id == paletteId || String(paletteEntry.id) === String(paletteId)) ??
    fallbackPalette;
  return palette ? withSlotFallbacks(palette.colors) : undefined;
}

/** Derive palette slot colors from a single base color (for Palette mode with user's backgroundColor) */
function derivePaletteFromBaseColor(baseHex: string): Partial<Record<PaletteSlot | string, string>> {
  const mix = (a: string, b: string, factor: number) => {
    const parse = (hex: string) => {
      const h = hex.replace(/^#/, '');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    };
    const toHex = (r: number, g: number, b: number) =>
      '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('');
    const pa = parse(a);
    const pb = parse(b);
    return toHex(pa.r * (1 - factor) + pb.r * factor, pa.g * (1 - factor) + pb.g * factor, pa.b * (1 - factor) + pb.b * factor);
  };
  return {
    background: baseHex,
    surface: mix(baseHex, '#ffffff', 0.25),
    primary: baseHex,
    accent: mix(baseHex, '#000000', 0.15),
    secondary: mix(baseHex, '#ffffff', 0.4),
    text: mix(baseHex, '#000000', 0.3),
  };
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
 * @param mimeType - When loading via blob URL, pass blob.type (e.g. 'image/svg+xml') so SVG is not converted to JPEG (which loses transparency).
 */
export function createPreviewImage(
  source: HTMLImageElement,
  { maxDimension = 1600, quality = 0.85, mimeType }: { maxDimension?: number; quality?: number; mimeType?: string } = {}
): HTMLImageElement {
  const src = source.currentSrc || source.src || '';
  if (isSvgSource(src) || mimeType === 'image/svg+xml') {
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

  try {
    const preview = new window.Image();
    preview.src = canvas.toDataURL('image/jpeg', quality);
    return preview;
  } catch {
    // Tainted canvas (cross-origin without CORS) – cannot export; use original
    return source;
  }
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

/**
 * Composite an SVG (or any image with transparency) onto a solid background color.
 * Fixes the issue where transparent pixels render as black when used as canvas fill pattern.
 * Returns a Promise that resolves with the composited image when loaded, or null if compositing fails.
 */
export function compositeImageOntoBackground(
  source: HTMLImageElement,
  backgroundColor: string,
  mimeType?: string
): Promise<HTMLImageElement | null> {
  const src = source.currentSrc || source.src || '';
  const isSvg = isSvgSource(src) || mimeType === 'image/svg+xml';
  if (!isSvg) return Promise.resolve(null);

  const w = source.naturalWidth || source.width || 1;
  const h = source.naturalHeight || source.height || 1;
  if (w <= 0 || h <= 0) return Promise.resolve(null);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = backgroundColor.startsWith('#') ? backgroundColor : `#${backgroundColor}`;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0);

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const composite = new window.Image();
    return new Promise((resolve) => {
      composite.onload = () => resolve(composite);
      composite.onerror = () => resolve(null);
      composite.src = dataUrl;
    });
  } catch {
    return Promise.resolve(null);
  }
}
