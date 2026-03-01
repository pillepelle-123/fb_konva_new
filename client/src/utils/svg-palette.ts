import type { ColorPalette } from '../types/template-types.ts';

type BufferLike = {
  from(content: string, encoding: string): { toString(encoding: string): string };
};

declare const Buffer: BufferLike;

export type PaletteSlot =
  | 'background'
  | 'surface'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'text';

export const PALETTE_SLOT_TOKENS: Record<PaletteSlot, string> = {
  background: 'PALETTE_BACKGROUND',
  surface: 'PALETTE_SURFACE',
  primary: 'PALETTE_PRIMARY',
  secondary: 'PALETTE_SECONDARY',
  accent: 'PALETTE_ACCENT',
  text: 'PALETTE_TEXT'
};

export type PaletteColorSource =
  | Pick<ColorPalette['colors'], PaletteSlot>
  | Record<string, string | undefined>;

interface RenderOptions {
  cacheKey?: string;
  slots?: Record<string, string>;
  encoding?: 'base64' | 'uri';
  asDataUrl?: boolean;
}

const svgRenderCache = new Map<string, string>();

/**
 * Replace palette slot placeholders inside an SVG string.
 */
export function applyPaletteSlotsToSvg(
  svgContent: string,
  paletteColors: PaletteColorSource,
  options: RenderOptions = {}
): string {
  if (!svgContent) {
    return svgContent;
  }

  const encoding = options.encoding ?? 'base64';
  const slots = {
    ...PALETTE_SLOT_TOKENS,
    ...(options.slots ?? {})
  };

  const cacheId = buildCacheKey(svgContent, paletteColors, encoding, options.cacheKey, slots);
  const cached = svgRenderCache.get(cacheId);
  if (cached) {
    return cached;
  }

  let processed = svgContent;

  Object.entries(slots).forEach(([slotName, token]) => {
    const colorValue = normalizeColor(
      paletteColors[slotName as keyof PaletteColorSource] as string | undefined
    );
    if (!colorValue) {
      return;
    }

    const tokenWithHashRegex = new RegExp(`#${escapeForRegex(token)}`, 'g');
    processed = processed.replace(tokenWithHashRegex, ensureHash(colorValue));

    const tokenRegex = new RegExp(escapeForRegex(token), 'g');
    processed = processed.replace(tokenRegex, colorValue);
  });

  const result =
    options.asDataUrl === false ? processed : svgStringToDataUrl(processed, encoding);

  svgRenderCache.set(cacheId, result);
  return result;
}

type AutoPaletteRenderOptions = RenderOptions & {
  slotOpacities?: Partial<Record<PaletteSlot, number>>;
};

/**
 * Automatically map existing SVG colors to light palette slots (background/surface/accent/secondary)
 * and apply alpha blending to create layered effects.
 */
export function applyAutoPaletteToSvg(
  svgContent: string,
  paletteColors: PaletteColorSource,
  options: AutoPaletteRenderOptions = {}
): string {
  if (!svgContent) {
    return svgContent;
  }

  const encoding = options.encoding ?? 'base64';

  const slotColors = buildAutoSlotColors(paletteColors, options.slotOpacities);
  if (!slotColors) {
    return svgContent;
  }

  const cacheId = buildCacheKey(
    svgContent,
    slotColors,
    encoding,
    `${options.cacheKey || ''}::auto`,
    PALETTE_SLOT_TOKENS
  );
  const cached = svgRenderCache.get(cacheId);
  if (cached) {
    return cached;
  }

  const colorOccurrences = mergeColorOccurrences([
    extractHexColorOccurrences(svgContent),
    extractRgbColorOccurrences(svgContent),
    extractGradientStopColors(svgContent),
  ]);
  if (colorOccurrences.size === 0) {
    let processed = svgContent;
    processed = replaceCurrentColor(processed, slotColors);
    return svgStringToDataUrl(processed, encoding);
  }

  const sortedColors = sortColorsByDominanceAndLuminance(colorOccurrences);

  const slotCycle: PaletteSlot[] = ['background', 'surface', 'accent', 'secondary'];
  const colorToSlot = new Map<string, PaletteSlot>();
  sortedColors.forEach((color, idx) => {
    let slot: PaletteSlot;
    if (idx < slotCycle.length) {
      slot = slotCycle[idx];
    } else {
      const cycleIndex = (idx - slotCycle.length) % 2; // alternate accent / secondary
      slot = slotCycle[2 + cycleIndex];
    }
    colorToSlot.set(color, slot);
  });

  let processed = svgContent;

  processed = replaceCurrentColor(processed, slotColors);

  colorToSlot.forEach((slot, normalizedColor) => {
    const replacement = slotColors[slot];
    if (!replacement) {
      return;
    }

    const originals = colorOccurrences.get(normalizedColor);
    if (!originals) {
      return;
    }

    originals.forEach((originalColor) => {
      const colorPattern = new RegExp(escapeForRegex(originalColor), 'gi');
      processed = processed.replace(colorPattern, replacement);
    });
  });

  const result = svgStringToDataUrl(processed, encoding);
  svgRenderCache.set(cacheId, result);
  return result;
}

export type MonochromeToneOptions = RenderOptions & {
  /**
   * When set: the dominant/lightest color (large area touching image edge) is replaced
   * with this instead of the monochrome tone. Creates seamless blend with page background.
   */
  edgeBackgroundColor?: string;
};

/**
 * Apply monochrome color tone to SVG: shift every color to the target hue
 * while keeping original brightness. Matches shadcn SVG Illustration Color Toning:
 * "Every color shifts to your chosen tone while keeping original brightness."
 *
 * When edgeBackgroundColor is provided: the dominant/lightest color (typically the
 * large background area touching the image edge) is replaced with it for a seamless
 * blend with the page background.
 */
export function applyMonochromeToneToSvg(
  svgContent: string,
  targetColor: string,
  options: MonochromeToneOptions = {}
): string {
  if (!svgContent || !targetColor) {
    return svgContent;
  }

  const encoding = options.encoding ?? 'base64';
  const normalizedTarget = ensureHash(normalizeColor(targetColor) ?? targetColor);
  const normalizedEdgeBg = options.edgeBackgroundColor
    ? ensureHash(normalizeColor(options.edgeBackgroundColor) ?? options.edgeBackgroundColor)
    : undefined;
  const cacheId = `${options.cacheKey || svgContent}::mono::${encoding}::${normalizedTarget}::${normalizedEdgeBg ?? 'none'}`;
  const cached = svgRenderCache.get(cacheId);
  if (cached) {
    return cached;
  }

  const targetHsl = hexToHsl(normalizedTarget);

  const colorOccurrences = mergeColorOccurrences([
    extractHexColorOccurrences(svgContent),
    extractRgbColorOccurrences(svgContent),
    extractGradientStopColors(svgContent),
  ]);

  let processed = svgContent;
  processed = replaceCurrentColor(processed, {
    background: normalizedTarget,
    surface: normalizedTarget,
    accent: normalizedTarget,
    secondary: normalizedTarget,
    primary: normalizedTarget,
    text: normalizedTarget,
  });

  // Identify dominant/lightest color (large area touching edge) for edgeBackgroundColor replacement
  const edgeColorToReplace =
    normalizedEdgeBg && colorOccurrences.size > 0
      ? sortColorsByDominanceAndLuminance(colorOccurrences)[0]
      : undefined;

  colorOccurrences.forEach((originals, normalizedColor) => {
    let replacement: string;
    if (
      edgeColorToReplace &&
      normalizedColor === edgeColorToReplace &&
      getRelativeLuminance(normalizedColor) >= 0.15
    ) {
      replacement = normalizedEdgeBg!;
    } else {
      const origHsl = hexToHsl(normalizedColor);
      replacement = hslToHex(targetHsl.h, targetHsl.s, origHsl.l);
    }
    // Skip replace if result is invalid (e.g. NaN from edge cases)
    if (!replacement || !/^#[0-9a-fA-F]{6}$/.test(replacement)) return;

    originals.forEach((originalColor) => {
      const colorPattern = new RegExp(escapeForRegex(originalColor), 'gi');
      processed = processed.replace(colorPattern, replacement);
    });
  });

  const result = svgStringToDataUrl(processed, encoding);
  svgRenderCache.set(cacheId, result);
  return result;
}

/**
 * Ensures the supplied color has a hash prefix when it is a hex color.
 */
function ensureHash(color: string): string {
  if (!color) {
    return color;
  }
  if (color.startsWith('#')) {
    return color;
  }
  return color.match(/^[0-9a-f]{3,8}$/i) ? `#${color}` : color;
}

/**
 * Normalize color input: trim & convert empty strings to undefined.
 */
function normalizeColor(color?: string): string | undefined {
  if (!color) {
    return undefined;
  }
  const trimmed = color.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

/**
 * Remove editor-specific metadata from SVG that can cause load failures
 * when used as img src (Inkscape, Sodipodi, Boxy SVG, etc.)
 */
function stripSvgEditorMetadata(svg: string): string {
  return svg
    .replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, '')
    .replace(/<inkscape:page[^>]*\/>/gi, '')
    .replace(/<inkscape:page[\s\S]*?<\/inkscape:page>/gi, '')
    .replace(/<bx:export[\s\S]*?<\/bx:export>/gi, '')
    .replace(/<bx:file[^>]*\/>/gi, '')
    .replace(/\s*sodipodi:docname="[^"]*"/gi, '');
}

function svgStringToDataUrl(svg: string, encoding: 'base64' | 'uri'): string {
  const stripped = stripSvgEditorMetadata(svg);
  const cleaned = stripped.replace(/\s+/g, ' ').trim();
  if (encoding === 'base64') {
    return `data:image/svg+xml;base64,${toBase64(cleaned)}`;
  }
  const encoded = encodeURIComponent(cleaned)
    .replace(/%0A/g, '')
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/');
  return `data:image/svg+xml;utf8,${encoded}`;
}

function toBase64(content: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(unescape(encodeURIComponent(content)));
  }
  return Buffer.from(content, 'utf-8').toString('base64');
}

function buildCacheKey(
  svgContent: string,
  paletteColors: PaletteColorSource,
  encoding: string,
  cacheKey = '',
  slots: Record<string, string>
): string {
  const baseKey = cacheKey || svgContent;
  const paletteRecord = paletteColors as Record<string, string | undefined>;
  const slotValues = Object.keys(slots)
    .sort()
    .map((slot) => normalizeColor(paletteRecord[slot]) ?? '');
  return `${baseKey}::${encoding}::${slotValues.join('|')}`;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHexColorOccurrences(svgContent: string): Map<string, Set<string>> {
  const regex = /#([0-9a-fA-F]{3,8})\b/g;
  const occurrences = new Map<string, Set<string>>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(svgContent)) !== null) {
    const original = match[0];
    const normalized = normalizeHexColor(original);
    if (!normalized) {
      continue;
    }
    if (!occurrences.has(normalized)) {
      occurrences.set(normalized, new Set());
    }
    occurrences.get(normalized)!.add(original);
  }

  return occurrences;
}

function mergeColorOccurrences(
  maps: Map<string, Set<string>>[],
): Map<string, Set<string>> {
  const merged = new Map<string, Set<string>>();
  maps.forEach((map) => {
    map.forEach((originals, normalized) => {
      if (!merged.has(normalized)) {
        merged.set(normalized, new Set());
      }
      const targetSet = merged.get(normalized)!;
      originals.forEach((value) => targetSet.add(value));
    });
  });
  return merged;
}

function extractRgbColorOccurrences(svgContent: string): Map<string, Set<string>> {
  const regex = /rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)/gi;
  const occurrences = new Map<string, Set<string>>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(svgContent)) !== null) {
    const original = match[0];
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      continue;
    }
    const normalized = rgbToHex(r, g, b);
    if (!occurrences.has(normalized)) {
      occurrences.set(normalized, new Set());
    }
    occurrences.get(normalized)!.add(original);
  }

  return occurrences;
}

function extractGradientStopColors(svgContent: string): Map<string, Set<string>> {
  const occurrences = new Map<string, Set<string>>();
  const stopColorRegex = /stop-color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g;
  const stopColorAttrRegex = /stop-color\s*=\s*["']([^"']+)["']/gi;

  function addColor(original: string) {
    let normalized: string | null = null;
    if (original.startsWith('#')) {
      normalized = normalizeHexColor(original);
    } else if (original.startsWith('rgb')) {
      const rgbMatch = original.match(/rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})/);
      if (rgbMatch) {
        const r = Number(rgbMatch[1]);
        const g = Number(rgbMatch[2]);
        const b = Number(rgbMatch[3]);
        normalized = rgbToHex(r, g, b);
      }
    }
    if (normalized) {
      if (!occurrences.has(normalized)) {
        occurrences.set(normalized, new Set());
      }
      occurrences.get(normalized)!.add(original);
    }
  }

  let match: RegExpExecArray | null;
  while ((match = stopColorRegex.exec(svgContent)) !== null) {
    addColor(match[1]);
  }
  while ((match = stopColorAttrRegex.exec(svgContent)) !== null) {
    addColor(match[1]);
  }

  return occurrences;
}

function sortColorsByDominanceAndLuminance(
  colorOccurrences: Map<string, Set<string>>
): string[] {
  const colorsWithWeight = Array.from(colorOccurrences.entries()).map(([color, originals]) => ({
    color,
    count: originals.size,
    luminance: getRelativeLuminance(color),
  }));

  return colorsWithWeight
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.luminance - a.luminance;
    })
    .map((c) => c.color);
}

function replaceCurrentColor(
  svgContent: string,
  slotColors: Record<PaletteSlot, string>
): string {
  const replacement = slotColors.accent || slotColors.primary || slotColors.secondary || '#000000';
  return svgContent
    .replace(/\bfill\s*=\s*["']currentColor["']/gi, `fill="${replacement}"`)
    .replace(/\bstroke\s*=\s*["']currentColor["']/gi, `stroke="${replacement}"`)
    .replace(/\bfill:\s*currentColor\b/gi, `fill:${replacement}`)
    .replace(/\bstroke:\s*currentColor\b/gi, `stroke:${replacement}`);
}

function normalizeHexColor(value: string): string | null {
  if (!value || !value.startsWith('#')) {
    return null;
  }
  const hex = value.slice(1);
  if (hex.length === 3) {
    return (
      '#' +
      hex
        .split('')
        .map((char) => char + char)
        .join('')
        .toLowerCase()
    );
  }
  if (hex.length === 6 || hex.length === 8) {
    return `#${hex.slice(0, 6).toLowerCase()}`;
  }
  return null;
}

function getRelativeLuminance(hexColor: string): number {
  const { r, g, b } = hexToRgb(hexColor);
  const convert = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = convert(r);
  const G = convert(g);
  const B = convert(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hexColor);
  const hex = normalized ? normalized.slice(1) : '000000';
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function hexToHsl(hexColor: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hexColor);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function mixHexColors(colorA: string, colorB: string, factor: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const clampFactor = Math.min(Math.max(factor, 0), 1);
  const mix = (channelA: number, channelB: number) =>
    Math.round(channelA * (1 - clampFactor) + channelB * clampFactor);
  const r = mix(a.r, b.r);
  const g = mix(a.g, b.g);
  const bChannel = mix(a.b, b.b);
  return rgbToHex(r, g, bChannel);
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (c: number) => Math.min(255, Math.max(0, Math.round(c)));
  return (
    '#' +
    [r, g, b]
      .map((channel) => clamp(channel).toString(16).padStart(2, '0'))
      .join('')
  ).toLowerCase();
}

function toHexWithAlpha(hexColor: string, alpha: number): string {
  const normalized = normalizeHexColor(hexColor) ?? '#000000';
  const alphaValue = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${normalized}${alphaValue}`;
}

function buildAutoSlotColors(
  paletteColors: PaletteColorSource,
  slotOpacities?: Partial<Record<PaletteSlot, number>>
): Record<PaletteSlot, string> | undefined {
  const backgroundBase = ensureHash(
    normalizeColor(
      paletteColors.background ||
        paletteColors.surface ||
        paletteColors.primary ||
        paletteColors.accent ||
        '#ffffff'
    ) || '#ffffff'
  );

  const surfaceBase = ensureHash(
    normalizeColor(paletteColors.surface || paletteColors.background || backgroundBase) || backgroundBase
  );

  const accentBase = ensureHash(
    normalizeColor(
      paletteColors.accent || paletteColors.primary || paletteColors.secondary || paletteColors.text || backgroundBase
    ) || backgroundBase
  );

  const secondaryBase = ensureHash(
    normalizeColor(
      paletteColors.secondary || paletteColors.accent || paletteColors.surface || paletteColors.primary || backgroundBase
    ) || backgroundBase
  );

  const backgroundAlpha = slotOpacities?.background ?? 1;
  const surfaceAlpha = slotOpacities?.surface ?? 1;

  const backgroundColor =
    backgroundAlpha >= 1 ? ensureHash(surfaceBase) : toHexWithAlpha(surfaceBase, backgroundAlpha);
  const surfaceColor =
    surfaceAlpha >= 1 ? ensureHash(surfaceBase) : toHexWithAlpha(surfaceBase, surfaceAlpha);
  const accentColor = toHexWithAlpha(
    mixHexColors(accentBase, backgroundBase, 0.5),
    slotOpacities?.accent ?? 0.6
  );
  const secondaryColor = toHexWithAlpha(
    mixHexColors(secondaryBase, backgroundBase, 0.45),
    slotOpacities?.secondary ?? 0.5
  );

  return {
    background: backgroundColor,
    surface: surfaceColor,
    accent: accentColor,
    secondary: secondaryColor,
    primary: accentColor,
    text: accentColor // fallback if referenced
  };
}

