import {
  DEFAULT_DESIGNER_CANVAS,
  type CanvasStructure,
  type DesignerImageItem,
  type DesignerItem,
  type DesignerStickerItem,
  type DesignerTextItem,
} from '../../../shared/types/background-designer';

type UnknownRecord = Record<string, unknown>;

export interface DesignerCanvasPayload {
  structure: CanvasStructure;
  baseWidth: number;
  baseHeight: number;
}

export interface DesignerRenderMapped {
  backgroundColor: string;
  backgroundOpacity: number;
  items: DesignerRenderItem[];
}

export type DesignerRenderItem =
  | ({ type: 'image' } & DesignerRenderItemBase & Pick<DesignerImageItem, 'uploadPath' | 'aspectRatioLocked'>)
  | ({ type: 'text' } & DesignerRenderItemBase & Pick<DesignerTextItem, 'text' | 'fontFamily' | 'fontSize' | 'fontBold' | 'fontItalic' | 'fontColor' | 'fontOpacity' | 'textAlign'>)
  | ({ type: 'sticker' } & DesignerRenderItemBase & Pick<DesignerStickerItem, 'stickerId' | 'stickerColor'>);

export interface DesignerRenderItemBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex?: number;
}

export function hasDesignerCanvasPayload(background: unknown): boolean {
  return extractDesignerCanvasPayload(background) !== null;
}

export function extractDesignerCanvasPayload(background: unknown): DesignerCanvasPayload | null {
  if (!isRecord(background)) {
    return null;
  }

  const structure = isRecord(background.designerCanvas)
    ? asCanvasStructure(background.designerCanvas.structure)
    : null;
  if (!structure) {
    return null;
  }

  const baseWidth =
    (isRecord(background.designerCanvas) ? asNumber(background.designerCanvas.canvasWidth) : undefined) ??
    DEFAULT_DESIGNER_CANVAS.width;

  const baseHeight =
    (isRecord(background.designerCanvas) ? asNumber(background.designerCanvas.canvasHeight) : undefined) ??
    DEFAULT_DESIGNER_CANVAS.height;

  return { structure, baseWidth, baseHeight };
}

export function mapDesignerCanvasToPage(
  payload: DesignerCanvasPayload,
  pageWidth: number,
  pageHeight: number,
  offsetX = 0,
  offsetY = 0,
): DesignerRenderMapped {
  const backgroundColor = payload.structure.backgroundColor || '#ffffff';
  const backgroundOpacity = clampOpacity(payload.structure.backgroundOpacity ?? 1);

  const mappedItems = payload.structure.items
    .map((item, index) => mapItemToPage(item, payload.baseWidth, payload.baseHeight, pageWidth, pageHeight, offsetX, offsetY, index))
    .filter((item): item is DesignerRenderItem => item !== null)
    .sort((a, b) => {
      const aZ = a.zIndex ?? Number.MAX_SAFE_INTEGER;
      const bZ = b.zIndex ?? Number.MAX_SAFE_INTEGER;
      return aZ - bZ;
    });

  return {
    backgroundColor,
    backgroundOpacity,
    items: mappedItems,
  };
}

function mapItemToPage(
  item: DesignerItem,
  baseWidth: number,
  baseHeight: number,
  pageWidth: number,
  pageHeight: number,
  offsetX: number,
  offsetY: number,
  index: number,
): DesignerRenderItem | null {
  const width = normalizeLegacyDimension(item.width, baseWidth);
  const height = normalizeLegacyDimension(item.height, baseHeight);

  const base: DesignerRenderItemBase = {
    id: item.id,
    x: offsetX + item.x * pageWidth,
    y: offsetY + item.y * pageHeight,
    width,
    height,
    rotation: item.rotation || 0,
    opacity: clampOpacity(item.opacity ?? 1),
    zIndex: item.zIndex ?? index,
  };

  if (item.type === 'image') {
    return {
      ...base,
      type: 'image',
      uploadPath: item.uploadPath,
      aspectRatioLocked: item.aspectRatioLocked,
    };
  }

  if (item.type === 'text') {
    return {
      ...base,
      type: 'text',
      text: item.text,
      fontFamily: item.fontFamily,
      fontSize: normalizeLegacyFontSize(item.fontSize, baseHeight),
      fontBold: item.fontBold,
      fontItalic: item.fontItalic,
      fontColor: item.fontColor,
      fontOpacity: clampOpacity(item.fontOpacity ?? 1),
      textAlign: item.textAlign,
    };
  }

  if (item.type === 'sticker') {
    return {
      ...base,
      type: 'sticker',
      stickerId: item.stickerId,
      stickerColor: item.stickerColor,
    };
  }

  return null;
}

function normalizeLegacyDimension(value: number, baseDimension: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  if (value <= 1.5) {
    return Math.max(1, value * baseDimension);
  }

  return value;
}

function normalizeLegacyFontSize(value: number, baseHeight: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 16;
  }

  if (value <= 1.5) {
    return Math.max(8, value * baseHeight);
  }

  return value;
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function asCanvasStructure(value: unknown): CanvasStructure | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }

  const backgroundColor = typeof value.backgroundColor === 'string' ? value.backgroundColor : '#ffffff';
  const backgroundOpacity = asNumber(value.backgroundOpacity) ?? 1;

  return {
    backgroundColor,
    backgroundOpacity,
    items: value.items as DesignerItem[],
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }
  return value;
}