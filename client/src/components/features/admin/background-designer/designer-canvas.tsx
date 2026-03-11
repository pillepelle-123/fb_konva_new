/**
 * Background Image Designer Canvas
 * Konva-based canvas for editing designers background images
 */

import { Stage, Layer } from 'react-konva';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type Konva from 'konva';
import {
  DesignerBackgroundImageNode,
  DesignerBackgroundTextNode,
  DesignerBackgroundStickerNode,
} from '../../../shared/konva';
import { canvasStructureToAbsolute } from '../../../../../../shared/types/background-designer';
import type {
  CanvasStructure,
  DesignerItem as DesignerAsset,
  DesignerItemAbsolute as DesignerAssetAbsolute,
} from '../../../../../../shared/types/background-designer';

interface DesignerCanvasProps {
  canvasWidth: number;
  canvasHeight: number;
  canvasStructure: CanvasStructure;
  selectedAssetId: string | null;
  onAssetUpdate: (assetId: string, updates: Partial<DesignerAsset>) => void;
  onAssetSelect: (assetId: string | null) => void;
  onCanvasClick?: () => void;
}

/**
 * Get sticker URL from library
 */
function getStickerUrl(stickerId: string): string | undefined {
  // TODO: Implement proper sticker library lookup
  // For now, return placeholder
  return `/api/stickers/${stickerId}/file`;
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
  selectedAssetId,
  onAssetUpdate,
  onAssetSelect,
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

  // Normalize asset updates (convert absolute coordinates to normalized 0-1 range)
  const normalizeAndUpdateAsset = useCallback(
    (assetId: string, updates: Partial<DesignerAsset>) => {
      const normalized: Partial<DesignerAsset> = { ...updates };

      // Only normalize x, y if they're present and absolute
      // x and y from Konva are absolute pixel coordinates, we need to convert to 0-1 range
      if (normalized.x !== undefined && typeof normalized.x === 'number') {
        normalized.x = Math.max(0, Math.min(1, normalized.x / canvasWidth));
      }
      if (normalized.y !== undefined && typeof normalized.y === 'number') {
        normalized.y = Math.max(0, Math.min(1, normalized.y / canvasHeight));
      }

      onAssetUpdate(assetId, normalized);
    },
    [canvasWidth, canvasHeight, onAssetUpdate]
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
      className={`flex-1 min-h-0 bg-gray-50 border border-gray-300 rounded-lg overflow-hidden relative ${
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      }`}
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
              onAssetSelect(null);
              onCanvasClick?.();
            }
          }}
        >
          <Layer>
            {/* Render assets in order (order matters for z-index) */}
            {canvasAbsolute.items.map((asset: DesignerAssetAbsolute) => {
              const isSelected = asset.id === selectedAssetId;

              switch (asset.type) {
                case 'image': {
                  const imageAsset = asset as DesignerAssetAbsolute & {
                    uploadPath: string;
                    aspectRatioLocked?: boolean;
                  };
                  return (
                    <DesignerBackgroundImageNode
                      key={asset.id}
                      id={asset.id}
                      src={normalizeDesignerAssetUrl(imageAsset.uploadPath)}
                      x={asset.x}
                      y={asset.y}
                      width={asset.width}
                      height={asset.height}
                      rotation={asset.rotation}
                      opacity={asset.opacity}
                      isSelected={isSelected}
                      onSelect={() => onAssetSelect(asset.id)}
                      onTransform={(updates) => normalizeAndUpdateAsset(asset.id, updates)}
                      aspectRatioLocked={imageAsset.aspectRatioLocked}
                      displayScale={displayScale}
                    />
                  );
                }

                case 'text': {
                  const textAsset = asset as DesignerAssetAbsolute & {
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
                    <DesignerBackgroundTextNode
                      key={asset.id}
                      id={asset.id}
                      text={textAsset.text}
                      x={asset.x}
                      y={asset.y}
                      width={asset.width}
                      height={asset.height}
                      fontFamily={textAsset.fontFamily}
                      fontSize={textAsset.fontSize || 16}
                      fontBold={textAsset.fontBold}
                      fontItalic={textAsset.fontItalic}
                      fontColor={textAsset.fontColor}
                      fontOpacity={textAsset.fontOpacity}
                      rotation={asset.rotation}
                      textAlign={textAsset.textAlign}
                      isSelected={isSelected}
                      onSelect={() => onAssetSelect(asset.id)}
                      onTransform={(updates) => normalizeAndUpdateAsset(asset.id, updates)}
                      displayScale={displayScale}
                    />
                  );
                }

                case 'sticker': {
                  const stickerAsset = asset as DesignerAssetAbsolute & {
                    stickerId: string;
                    stickerColor?: string;
                  };
                  const stickerUrl = getStickerUrl(stickerAsset.stickerId);

                  if (!stickerUrl) {
                    console.warn('Sticker URL not found:', stickerAsset.stickerId);
                    return null;
                  }

                  return (
                    <DesignerBackgroundStickerNode
                      key={asset.id}
                      id={asset.id}
                      stickerId={stickerAsset.stickerId}
                      stickerUrl={stickerUrl}
                      x={asset.x}
                      y={asset.y}
                      width={asset.width}
                      height={asset.height}
                      rotation={asset.rotation}
                      opacity={asset.opacity}
                      stickerColor={stickerAsset.stickerColor}
                      isSelected={isSelected}
                      onSelect={() => onAssetSelect(asset.id)}
                      displayScale={displayScale}
                      onTransform={(updates) => normalizeAndUpdateAsset(asset.id, updates)}
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
