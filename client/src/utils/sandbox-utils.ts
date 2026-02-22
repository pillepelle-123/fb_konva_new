import { v4 as uuidv4 } from 'uuid';
import type { Book } from '../context/editor-context';
import { getGlobalThemeDefaults } from './global-themes';
import { calculatePageDimensions } from './template-utils';
import { OPENMOJI_STICKERS, getOpenMojiUrl } from '../data/templates/openmoji-stickers';
import { DEFAULT_PALETTE_PARTS } from '../data/templates/color-palettes';

export type PaletteColorSlot = 'background' | 'primary' | 'secondary' | 'accent' | 'text' | 'surface';

export const PALETTE_COLOR_SLOTS: PaletteColorSlot[] = [
  'background',
  'primary',
  'secondary',
  'accent',
  'text',
  'surface',
];

export const DEFAULT_SANDBOX_COLORS: Record<PaletteColorSlot, string> = {
  background: '#FFFFFF',
  primary: '#424242',
  secondary: '#757575',
  accent: '#BDBDBD',
  text: '#212121',
  surface: '#F5F5F5',
};

/**
 * Maps element type + property path to palette part name.
 * Used to build parts object from sandbox element configurations.
 */
export const ELEMENT_PROPERTY_TO_PART: Record<
  string,
  Record<string, string>
> = {
  qna2: {
    borderColor: 'qnaBorder',
    backgroundColor: 'qnaBackground',
    questionTextColor: 'qnaQuestionText',
    questionBorderColor: 'qnaQuestionBorder',
    questionBackgroundColor: 'qnaQuestionBackground',
    answerTextColor: 'qnaAnswerText',
    answerBorderColor: 'qnaAnswerBorder',
    answerBackgroundColor: 'qnaAnswerBackground',
    ruledLinesColor: 'qnaAnswerRuledLines',
  },
  free_text: {
    fontColor: 'freeTextText',
    borderColor: 'freeTextBorder',
    backgroundColor: 'freeTextBackground',
    ruledLinesColor: 'freeTextRuledLines',
  },
  rect: {
    stroke: 'shapeStroke',
    fill: 'shapeFill',
  },
  placeholder: {
    borderColor: 'imageBorder',
  },
  line: {
    stroke: 'lineStroke',
  },
  brush: {
    stroke: 'brushStroke',
  },
  sticker: {
    stickerTextColor: 'freeTextText',
    stickerColor: 'stickerColor',
  },
};

/** Maps partName to element property path for each element type (for syncing colors when sandboxColors change) */
function getPartToElementPropertyMap(): Record<string, Record<string, string>> {
  return {
    qna2: {
      qnaBorder: 'borderColor',
      qnaBackground: 'backgroundColor',
      qnaQuestionText: 'questionSettings.fontColor',
      qnaQuestionBorder: 'questionSettings.borderColor',
      qnaQuestionBackground: 'questionSettings.backgroundColor',
      qnaAnswerText: 'answerSettings.fontColor',
      qnaAnswerBorder: 'answerSettings.borderColor',
      qnaAnswerBackground: 'answerSettings.backgroundColor',
      qnaAnswerRuledLines: 'ruledLinesColor',
    },
    free_text: {
      freeTextText: 'textSettings.fontColor',
      freeTextBorder: 'textSettings.borderColor',
      freeTextBackground: 'textSettings.backgroundColor',
      freeTextRuledLines: 'textSettings.ruledLinesColor',
    },
    rect: { shapeStroke: 'stroke', shapeFill: 'fill' },
    placeholder: { imageBorder: 'borderColor' },
    line: { lineStroke: 'stroke' },
    brush: { brushStroke: 'stroke' },
    sticker: {
      freeTextText: 'stickerTextSettings.fontColor',
      stickerColor: 'stickerColor',
    },
  };
}

/** Re-export for consumers that need the map directly */
export const PART_TO_ELEMENT_PROPERTY = getPartToElementPropertyMap();

/**
 * Returns effective part->slot mapping for an element (explicit overrides merged with default palette parts).
 * Used when sandboxColors change to sync all elements that use any slot.
 */
export function getEffectivePartOverrides(
  element: { id: string; type?: string; textType?: string },
  partSlotOverridesMap: Record<string, Record<string, PaletteColorSlot>>
): Record<string, PaletteColorSlot> {
  const elementType = getElementType(element);
  const propertyMap = getPartToElementPropertyMap()[elementType];
  if (!propertyMap) return {};

  const explicit = partSlotOverridesMap[element.id] || {};
  const result: Record<string, PaletteColorSlot> = {};
  for (const partName of Object.keys(propertyMap)) {
    const slot = explicit[partName] ?? DEFAULT_PALETTE_PARTS[partName as keyof typeof DEFAULT_PALETTE_PARTS];
    if (slot) result[partName] = slot;
  }
  return result;
}

/**
 * Builds element updates to apply sandbox slot colors to an element.
 * Used when sandboxColors change to sync element display.
 */
export function buildElementColorUpdates(
  element: Record<string, unknown>,
  overrides: Record<string, PaletteColorSlot>,
  getColorForSlot: (slot: PaletteColorSlot) => string
): Record<string, unknown> {
  const elementType = getElementType(element);
  const propertyMap = getPartToElementPropertyMap()[elementType];
  if (!propertyMap) return {};

  const updates: Record<string, unknown> = {};
  const nestedAccum: Record<string, Record<string, unknown>> = {};

  for (const [partName, slot] of Object.entries(overrides)) {
    const path = propertyMap[partName];
    if (!path) continue;
    const color = getColorForSlot(slot);
    const parts = path.split('.');
    if (parts.length === 1) {
      updates[path] = color;
    } else {
      const [parent, child] = parts;
      if (!nestedAccum[parent]) {
        nestedAccum[parent] = {
          ...((element[parent] as Record<string, unknown>) || {}),
        };
      }
      nestedAccum[parent][child] = color;
    }
  }
  for (const [parent, obj] of Object.entries(nestedAccum)) {
    updates[parent] = obj;
  }
  return updates;
}

function getBrushBounds(points: number[]) {
  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];
  for (let i = 2; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  return { width: maxX - minX, height: maxY - minY };
}

const SHAPE_TYPES = ['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'];

function getElementType(element: { type?: string; textType?: string }): string {
  if (element.textType === 'qna2' || element.textType === 'qna') return 'qna2';
  if (element.textType === 'free_text') return 'free_text';
  if (element.type === 'placeholder') return 'placeholder';
  if (element.type === 'brush-multicolor') return 'brush';
  if (element.type && SHAPE_TYPES.includes(element.type)) return 'rect';
  return element.type || 'rect';
}

/**
 * Builds the parts object for a color palette from sandbox elements and their part slot overrides.
 * Optionally includes page-level parts (pageBackground, pagePattern) from pageSlotOverrides.
 */
export function buildPartsFromElements(
  elements: Array<{ id: string; type?: string; textType?: string; [key: string]: unknown }>,
  partSlotOverridesMap: Record<string, Record<string, PaletteColorSlot>>,
  pageSlotOverrides?: Partial<Record<'pageBackground' | 'pagePattern', PaletteColorSlot>>
): Record<string, PaletteColorSlot> {
  const parts: Record<string, PaletteColorSlot> = { ...DEFAULT_PALETTE_PARTS };

  for (const element of elements) {
    const elementType = getElementType(element);
    const propertyMap = ELEMENT_PROPERTY_TO_PART[elementType];
    if (!propertyMap) continue;

    const overrides = partSlotOverridesMap[element.id];
    for (const [property, partName] of Object.entries(propertyMap)) {
      const slot = overrides?.[partName];
      if (slot) {
        parts[partName] = slot;
      }
    }
  }

  if (pageSlotOverrides) {
    if (pageSlotOverrides.pageBackground) parts.pageBackground = pageSlotOverrides.pageBackground;
    if (pageSlotOverrides.pagePattern) parts.pagePattern = pageSlotOverrides.pagePattern;
  }

  return parts;
}

/**
 * Creates a sandbox book with one page containing one of each canvas element type.
 */
export function createSandboxBook(): Book {
  const themeId = 'default';
  const paletteId: string | undefined = undefined;
  const canvasSize = calculatePageDimensions('A4', 'portrait');

  const margin = 80;
  const gap = 60;
  let y = margin;

  const elements: unknown[] = [];

  // QnA2
  const qna2Defaults = getGlobalThemeDefaults(themeId, 'qna2', paletteId) as Record<string, unknown>;
  elements.push({
    id: uuidv4(),
    type: 'text',
    x: margin,
    y,
    width: Math.min(600, canvasSize.width - margin * 2),
    height: 200,
    ...qna2Defaults,
    text: '',
    textType: 'qna2',
    richTextSegments: [] as { text: string; bold?: boolean; italic?: boolean }[],
    textSettings: (qna2Defaults.textSettings as object) || {},
  });
  y += 200 + gap;

  // FreeText
  const freeTextDefaults = getGlobalThemeDefaults(themeId, 'free_text', paletteId) as Record<string, unknown>;
  elements.push({
    id: uuidv4(),
    type: 'text',
    x: margin,
    y,
    width: 400,
    height: 100,
    ...freeTextDefaults,
    text: '',
    textType: 'free_text',
    richTextSegments: [],
    textSettings: (freeTextDefaults.textSettings as object) || {},
  });
  y += 100 + gap;

  // Rect (shape)
  const rectDefaults = getGlobalThemeDefaults(themeId, 'rect', paletteId);
  elements.push({
    id: uuidv4(),
    type: 'rect',
    x: margin,
    y,
    width: 200,
    height: 120,
    ...rectDefaults,
  });
  y += 120 + gap;

  // Placeholder (image)
  const imageDefaults = getGlobalThemeDefaults(themeId, 'placeholder', paletteId);
  elements.push({
    id: uuidv4(),
    type: 'placeholder',
    x: margin,
    y,
    width: 200,
    height: 150,
    ...imageDefaults,
  });
  y += 150 + gap;

  // Sticker (OpenMoji)
  const stickerDefaults = getGlobalThemeDefaults(themeId, 'sticker', paletteId) as Record<string, unknown>;
  const firstOpenMoji = OPENMOJI_STICKERS[0];
  const stickerUrl = getOpenMojiUrl(firstOpenMoji.hexcode);
  elements.push({
    id: uuidv4(),
    type: 'sticker',
    x: margin,
    y,
    width: 150,
    height: 150,
    src: stickerUrl,
    stickerId: `openmoji-${firstOpenMoji.hexcode}`,
    stickerFormat: 'vector',
    stickerFilePath: stickerUrl,
    stickerOriginalUrl: stickerUrl,
    ...stickerDefaults,
  });
  y += 150 + gap;

  // Line
  const lineDefaults = getGlobalThemeDefaults(themeId, 'line', paletteId);
  elements.push({
    id: uuidv4(),
    type: 'line',
    x: margin,
    y,
    width: 200,
    height: 0,
    points: [0, 0, 200, 0],
    ...lineDefaults,
  });
  y += gap;

  // Brush
  const brushDefaults = getGlobalThemeDefaults(themeId, 'brush', paletteId);
  const brushPoints = [0, 0, 150, 30, 300, 0, 450, 20, 600, 15];
  const brushBounds = getBrushBounds(brushPoints);
  elements.push({
    id: uuidv4(),
    type: 'brush',
    x: margin,
    y,
    width: brushBounds.width,
    height: brushBounds.height,
    points: brushPoints,
    ...brushDefaults,
  });

  return {
    id: 'sandbox',
    name: 'Sandbox',
    pageSize: 'A4',
    orientation: 'portrait',
    themeId: 'default',
    bookTheme: 'default',
    colorPaletteId: 'default',
    pages: [
      {
        id: 1,
        pageNumber: 1,
        elements,
        background: {
          type: 'color',
          value: DEFAULT_SANDBOX_COLORS.surface,
          opacity: 1,
        },
      },
    ],
  } as Book;
}
