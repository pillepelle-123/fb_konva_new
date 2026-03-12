/**
 * Shared types for Background Image Designer
 * Used by both client and server
 */

/**
 * Position preset for quick placement of items
 */
export type DesignerItemPosition =
  | 'custom'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Base properties for all designer items
 * Positions are normalized (0-1 range), sizes are absolute pixels
 * This allows items to maintain their size across different page formats
 */
export interface DesignerItemBase {
  id: string;
  type: 'image' | 'text' | 'sticker';
  
  // Normalized positions (0-1 range, scales with page size)
  x: number; // 0 = left edge, 1 = right edge
  y: number; // 0 = top edge, 1 = bottom edge
  
  // Absolute sizes (in pixels at A4 @ 300 DPI)
  // These do NOT scale when page size changes
  width: number; // pixels (absolute)
  height: number; // pixels (absolute)
  
  rotation: number; // degrees
  opacity: number; // 0-1
  
  // Position preset (for quick placement)
  position: DesignerItemPosition;
  
  // Layer order (higher = on top)
  zIndex?: number;
}

/**
 * Image item in designer canvas
 */
export interface DesignerImageItem extends DesignerItemBase {
  type: 'image';
  assetId: string; // UUID reference to background_image_designer_image_assets
  aspectRatioLocked: boolean;
}

/**
 * Text item in designer canvas
 */
export interface DesignerTextItem extends DesignerItemBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number; // Absolute pixels (does not scale)
  fontBold: boolean;
  fontItalic: boolean;
  fontColor: string; // Hex color
  fontOpacity: number; // 0-1
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * Sticker item in designer canvas
 */
export interface DesignerStickerItem extends DesignerItemBase {
  type: 'sticker';
  stickerId: string; // Reference to sticker in database
  stickerColor?: string; // Optional color override
}

/**
 * Union type for all item types
 */
export type DesignerItem = DesignerImageItem | DesignerTextItem | DesignerStickerItem;

/**
 * Canvas structure with normalized items
 * Stored in database as JSONB in background_image_designs table
 */
export interface CanvasStructure {
  // Canvas background
  backgroundColor: string; // Hex color
  backgroundOpacity: number; // 0-1
  transparentBackground?: boolean;
  
  // All items on canvas (normalized positions)
  items: DesignerItem[];
}

/**
 * Canvas structure with absolute positions (for rendering)
 * Used internally in designer UI
 */
export interface CanvasStructureAbsolute {
  backgroundColor: string;
  backgroundOpacity: number;
  transparentBackground?: boolean;
  canvasWidth: number;
  canvasHeight: number;
  items: DesignerItemAbsolute[];
}

/**
 * Item with absolute positions (for rendering in designer)
 */
export interface DesignerItemAbsolute extends Omit<DesignerItem, 'x' | 'y' | 'width' | 'height' | 'fontSize'> {
  x: number; // Absolute pixels
  y: number; // Absolute pixels
  width: number; // Absolute pixels
  height: number; // Absolute pixels
  fontSize?: number; // Absolute pixels (only for text items)
}

/**
 * Designer canvas dimensions (used as base in designer UI)
 */
export interface DesignerCanvasDimensions {
  width: number;
  height: number;
}

/**
 * Default designer canvas size (A4 @ 300 DPI)
 */
export const DEFAULT_DESIGNER_CANVAS: DesignerCanvasDimensions = {
  width: 2480,
  height: 3508,
};

/**
 * Convert normalized item to absolute positions
 * Sizes are already absolute, only convert positions
 */
export function normalizedToAbsolute<T extends DesignerItem>(
  item: T,
  canvasWidth: number,
  canvasHeight: number
): DesignerItemAbsolute {
  const base = {
    ...item,
    x: item.x * canvasWidth,
    y: item.y * canvasHeight,
    width: item.width, // Already absolute
    height: item.height, // Already absolute
  };

  // fontSize is already absolute for text items
  if (item.type === 'text') {
    return {
      ...base,
      fontSize: (item as DesignerTextItem).fontSize,
    } as DesignerItemAbsolute;
  }

  return base as DesignerItemAbsolute;
}

/**
 * Convert absolute item to normalized positions
 * Sizes stay absolute, only convert positions
 */
export function absoluteToNormalized(
  item: DesignerItemAbsolute,
  canvasWidth: number,
  canvasHeight: number
): DesignerItem {
  const base = {
    ...item,
    x: item.x / canvasWidth,
    y: item.y / canvasHeight,
    width: item.width, // Already absolute, keep as is
    height: item.height, // Already absolute, keep as is
  };

  // fontSize is already absolute for text items
  if (item.type === 'text' && item.fontSize !== undefined) {
    return {
      ...base,
      fontSize: item.fontSize,
    } as DesignerTextItem;
  }

  return base as DesignerItem;
}

/**
 * Convert normalized canvas structure to absolute
 */
export function canvasStructureToAbsolute(
  structure: CanvasStructure,
  canvasWidth: number,
  canvasHeight: number
): CanvasStructureAbsolute {
  return {
    backgroundColor: structure.backgroundColor,
    backgroundOpacity: structure.backgroundOpacity,
    transparentBackground: Boolean(structure.transparentBackground),
    canvasWidth,
    canvasHeight,
    items: structure.items.map((item) =>
      normalizedToAbsolute(item, canvasWidth, canvasHeight)
    ),
  };
}

/**
 * Convert absolute canvas structure to normalized
 */
export function canvasStructureToNormalized(
  structure: CanvasStructureAbsolute
): CanvasStructure {
  return {
    backgroundColor: structure.backgroundColor,
    backgroundOpacity: structure.backgroundOpacity,
    transparentBackground: Boolean(structure.transparentBackground),
    items: structure.items.map((item) =>
      absoluteToNormalized(item, structure.canvasWidth, structure.canvasHeight)
    ),
  };
}

/**
 * Calculate position from preset
 * Sizes are absolute (pixels), positions are normalized (0-1)
 */
export function calculatePositionFromPreset(
  preset: DesignerItemPosition,
  itemWidth: number, // absolute pixels
  itemHeight: number, // absolute pixels
  canvasWidth: number, // absolute pixels
  canvasHeight: number, // absolute pixels
  rotationDegrees: number = 0 // item rotation around top-left pivot
): { x: number; y: number } {
  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);

  // Konva rotates around node origin (top-left here). Presets should align
  // the rotated visual bounds, so we position by rotated AABB instead.
  const corners = [
    { x: 0, y: 0 },
    { x: itemWidth, y: 0 },
    { x: 0, y: itemHeight },
    { x: itemWidth, y: itemHeight },
  ].map((point) => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }));

  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;

  const normalizedWidth = boundsWidth / canvasWidth;
  const normalizedHeight = boundsHeight / canvasHeight;

  const toNormalizedOrigin = (targetBoundsX: number, targetBoundsY: number) => ({
    x: (targetBoundsX - minX) / canvasWidth,
    y: (targetBoundsY - minY) / canvasHeight,
  });

  switch (preset) {
    case 'top-left':
      return toNormalizedOrigin(0, 0);
    case 'top-center':
      return toNormalizedOrigin((canvasWidth - boundsWidth) / 2, 0);
    case 'top-right':
      return toNormalizedOrigin(canvasWidth - boundsWidth, 0);
    case 'center-left':
      return toNormalizedOrigin(0, (canvasHeight - boundsHeight) / 2);
    case 'center':
      return toNormalizedOrigin((canvasWidth - boundsWidth) / 2, (canvasHeight - boundsHeight) / 2);
    case 'center-right':
      return toNormalizedOrigin(canvasWidth - boundsWidth, (canvasHeight - boundsHeight) / 2);
    case 'bottom-left':
      return toNormalizedOrigin(0, canvasHeight - boundsHeight);
    case 'bottom-center':
      return toNormalizedOrigin((canvasWidth - boundsWidth) / 2, canvasHeight - boundsHeight);
    case 'bottom-right':
      return toNormalizedOrigin(canvasWidth - boundsWidth, canvasHeight - boundsHeight);
    case 'custom':
    default:
      return { x: 0, y: 0 }; // Should not be used, item keeps current position
  }
}
