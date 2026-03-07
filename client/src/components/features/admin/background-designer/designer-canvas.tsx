/**
 * Background Image Designer Canvas
 * Konva-based canvas for editing designers background images
 */

import { Stage, Layer } from 'react-konva';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type Konva from 'konva';
import { ImageItem, TextItem, StickerItem } from '../../../shared/konva';
import { canvasStructureToAbsolute } from '../../../../../../shared/types/background-designer';
import type {
  CanvasStructure,
  DesignerItem,
  DesignerItemAbsolute,
} from '../../../../../../shared/types/background-designer';

interface DesignerCanvasProps {
  canvasWidth: number;
  canvasHeight: number;
  canvasStructure: CanvasStructure;
  selectedItemId: string | null;
  onItemUpdate: (itemId: string, updates: Partial<DesignerItem>) => void;
  onItemSelect: (itemId: string | null) => void;
  onCanvasClick?: () => void;
}

/**
 * Get sticker URL from library
 */
function getStickerUrl(stickerId: string): string | undefined {
  // TODO: Implement proper sticker library lookup
  // For now, return placeholder
  return `/api/stickers/${stickerId}/image`;
}

function normalizeDesignerAssetUrl(uploadPath: string): string {
  if (!uploadPath) {
    return uploadPath;
  }

  const match = uploadPath.match(/^\/uploads\/background-images\/(.+)$/);
  if (match && match[1]) {
    return `/api/background-images/designer/assets/${match[1]}`;
  }

  return uploadPath;
}

export function DesignerCanvas({
  canvasWidth,
  canvasHeight,
  canvasStructure,
  selectedItemId,
  onItemUpdate,
  onItemSelect,
  onCanvasClick,
}: DesignerCanvasProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(
    null
  );

  const fitScale = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return 0.3;
    }

    const horizontalPadding = 24;
    const verticalPadding = 24;
    const availableWidth = Math.max(100, containerSize.width - horizontalPadding);
    const availableHeight = Math.max(100, containerSize.height - verticalPadding);
    return Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);
  }, [canvasWidth, canvasHeight, containerSize.height, containerSize.width]);

  const displayScale = fitScale * zoom;

  // Convert normalized structure to absolute positions
  const canvasAbsolute = canvasStructureToAbsolute(canvasStructure, canvasWidth, canvasHeight);

  // Normalize item updates (convert absolute coordinates to normalized 0-1 range)
  const normalizeAndUpdateItem = useCallback(
    (itemId: string, updates: Partial<DesignerItem>) => {
      const normalized: Partial<DesignerItem> = { ...updates };

      // Only normalize x, y if they're present and absolute
      // x and y from Konva are absolute pixel coordinates, we need to convert to 0-1 range
      if (normalized.x !== undefined && typeof normalized.x === 'number') {
        normalized.x = Math.max(0, Math.min(1, normalized.x / canvasWidth));
      }
      if (normalized.y !== undefined && typeof normalized.y === 'number') {
        normalized.y = Math.max(0, Math.min(1, normalized.y / canvasHeight));
      }

      onItemUpdate(itemId, normalized);
    },
    [canvasWidth, canvasHeight, onItemUpdate]
  );

  useEffect(() => {
    // Ensure stage is properly initialized
    if (stageRef.current) {
      stageRef.current.draw();
    }
  }, [canvasStructure]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!containerSize.width || !containerSize.height) {
      return;
    }

    if (zoom !== 1) {
      return;
    }

    const centeredX = (containerSize.width - canvasWidth * displayScale) / 2;
    const centeredY = (containerSize.height - canvasHeight * displayScale) / 2;
    setPan({ x: centeredX, y: centeredY });
  }, [containerSize.height, containerSize.width, canvasHeight, canvasWidth, displayScale, zoom]);

  const applyZoomAtCursor = useCallback(
    (cursorX: number, cursorY: number, deltaY: number) => {
      const zoomFactor = deltaY < 0 ? 1.1 : 0.9;
      const nextZoom = Math.min(8, Math.max(0.2, zoom * zoomFactor));

      if (nextZoom === zoom) {
        return;
      }

      const oldScale = displayScale;
      const nextScale = fitScale * nextZoom;
      const contentX = (cursorX - pan.x) / oldScale;
      const contentY = (cursorY - pan.y) / oldScale;

      setZoom(nextZoom);
      setPan({
        x: cursorX - contentX * nextScale,
        y: cursorY - contentY * nextScale,
      });
    },
    [displayScale, fitScale, pan.x, pan.y, zoom]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      applyZoomAtCursor(cursorX, cursorY, event.deltaY);
    };

    element.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleNativeWheel);
    };
  }, [applyZoomAtCursor]);

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (!isPanning || !panStartRef.current) {
      return;
    }

    const deltaX = event.clientX - panStartRef.current.mouseX;
    const deltaY = event.clientY - panStartRef.current.mouseY;
    setPan({
      x: panStartRef.current.panX + deltaX,
      y: panStartRef.current.panY + deltaY,
    });
  };

  const stopPanning = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-gray-50 border border-gray-300 rounded-lg overflow-hidden relative ${
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      }`}
      style={{ minHeight: '600px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopPanning}
      onMouseLeave={stopPanning}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="absolute shadow-lg border border-gray-300 bg-white"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          backgroundColor: canvasStructure.backgroundColor,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${displayScale})`,
          transformOrigin: 'top left',
        }}
      >
        <Stage
          ref={stageRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={(e) => {
            // Deselect if clicking on canvas background
            if (e.target === e.target.getStage()) {
              onItemSelect(null);
              onCanvasClick?.();
            }
          }}
        >
          <Layer>
            {/* Render items in order (order matters for z-index) */}
            {canvasAbsolute.items.map((item: DesignerItemAbsolute) => {
              const isSelected = item.id === selectedItemId;

              switch (item.type) {
                case 'image': {
                  const imageItem = item as DesignerItemAbsolute & {
                    uploadPath: string;
                    aspectRatioLocked?: boolean;
                  };
                  return (
                    <ImageItem
                      key={item.id}
                      id={item.id}
                      src={normalizeDesignerAssetUrl(imageItem.uploadPath)}
                      x={item.x}
                      y={item.y}
                      width={item.width}
                      height={item.height}
                      rotation={item.rotation}
                      opacity={item.opacity}
                      isSelected={isSelected}
                      onSelect={() => onItemSelect(item.id)}
                      onTransform={(updates) => normalizeAndUpdateItem(item.id, updates)}
                      aspectRatioLocked={imageItem.aspectRatioLocked}
                      displayScale={displayScale}
                    />
                  );
                }

                case 'text': {
                  const textItem = item as DesignerItemAbsolute & {
                    text: string;
                    fontFamily: string;
                    fontSize: number;
                    fontBold: boolean;
                    fontItalic: boolean;
                    fontColor: string;
                    fontOpacity: number;
                    textAlign?: 'left' | 'center' | 'right';
                  };
                  return (
                    <TextItem
                      key={item.id}
                      id={item.id}
                      text={textItem.text}
                      x={item.x}
                      y={item.y}
                      width={item.width}
                      height={item.height}
                      fontFamily={textItem.fontFamily}
                      fontSize={textItem.fontSize || 16}
                      fontBold={textItem.fontBold}
                      fontItalic={textItem.fontItalic}
                      fontColor={textItem.fontColor}
                      fontOpacity={textItem.fontOpacity}
                      rotation={item.rotation}
                      textAlign={textItem.textAlign}
                      isSelected={isSelected}
                      onSelect={() => onItemSelect(item.id)}
                      onTransform={(updates) => normalizeAndUpdateItem(item.id, updates)}
                      displayScale={displayScale}
                    />
                  );
                }

                case 'sticker': {
                  const stickerItem = item as DesignerItemAbsolute & {
                    stickerId: string;
                    stickerColor?: string;
                  };
                  const stickerUrl = getStickerUrl(stickerItem.stickerId);

                  if (!stickerUrl) {
                    console.warn('Sticker URL not found:', stickerItem.stickerId);
                    return null;
                  }

                  return (
                    <StickerItem
                      key={item.id}
                      id={item.id}
                      stickerId={stickerItem.stickerId}
                      stickerUrl={stickerUrl}
                      x={item.x}
                      y={item.y}
                      width={item.width}
                      height={item.height}
                      rotation={item.rotation}
                      opacity={item.opacity}
                      stickerColor={stickerItem.stickerColor}
                      isSelected={isSelected}
                      onSelect={() => onItemSelect(item.id)}
                      displayScale={displayScale}
                      onTransform={(updates) => normalizeAndUpdateItem(item.id, updates)}
                    />
                  );
                }

                default:
                  return null;
              }
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
