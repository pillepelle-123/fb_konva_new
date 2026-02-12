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
  ]);
  if (colorOccurrences.size === 0) {
    return svgStringToDataUrl(svgContent, encoding);
  }

  const sortedColors = Array.from(colorOccurrences.keys()).sort((a, b) => {
    return getRelativeLuminance(b) - getRelativeLuminance(a);
  });

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
  return (
    '#' +
    [r, g, b]
      .map((channel) => channel.toString(16).padStart(2, '0'))
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

