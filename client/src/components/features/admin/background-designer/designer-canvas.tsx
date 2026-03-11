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
import ContextMenu from '../../../ui/overlays/context-menu';
import { SnapGuidelines } from '../../editor/canvas/snap-guidelines';
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
  onAssetDuplicate: () => void;
  onAssetDelete: () => void;
  onLayerChange: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
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
  onAssetDuplicate,
  onAssetDelete,
  onLayerChange,
  onCanvasClick,
}: DesignerCanvasProps) {
  const SNAP_THRESHOLD = 8;
  const ROTATION_SNAP_THRESHOLD = 4;
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, visible: false });
  const [snapGuidelines, setSnapGuidelines] = useState<
    Array<{
      type: 'vertical' | 'horizontal';
      position: number;
      canvasWidth: number;
      canvasHeight: number;
      pageOffsetX: number;
      pageOffsetY: number;
    }>
  >([]);
  const clearGuidelinesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPannedRef = useRef(false);
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

  const workspacePadding = 800;
  const workspaceWidth = canvasWidth + workspacePadding * 2;
  const workspaceHeight = canvasHeight + workspacePadding * 2;
  const pageOffsetX = workspacePadding;
  const pageOffsetY = workspacePadding;

  const displayScale = fitScale * zoom;
  const checkerCellSize = displayScale > 0 ? 20 / displayScale : 20;

  // Convert normalized structure to absolute positions
  const canvasAbsolute = canvasStructureToAbsolute(canvasStructure, canvasWidth, canvasHeight);

  // Normalize asset updates (convert absolute coordinates to normalized 0-1 range)
  const normalizeAndUpdateAsset = useCallback(
    (assetId: string, updates: Partial<DesignerAsset>) => {
      const currentAsset = canvasAbsolute.items.find((item) => item.id === assetId);
      const normalized: Partial<DesignerAsset> = { ...updates };

      if (normalized.rotation !== undefined && typeof normalized.rotation === 'number') {
        const normalizedRotation = ((normalized.rotation % 360) + 360) % 360;
        const snapTargets = [0, 90, 180, 270, 360];
        const snappedTarget = snapTargets.find(
          (target) => Math.abs(normalizedRotation - target) <= ROTATION_SNAP_THRESHOLD,
        );
        if (snappedTarget !== undefined) {
          normalized.rotation = snappedTarget === 360 ? 0 : snappedTarget;
        }
      }

      if (currentAsset && (normalized.x !== undefined || normalized.y !== undefined)) {
        const nextWidth =
          normalized.width !== undefined && typeof normalized.width === 'number'
            ? normalized.width
            : currentAsset.width;
        const nextHeight =
          normalized.height !== undefined && typeof normalized.height === 'number'
            ? normalized.height
            : currentAsset.height;
        const nextX =
          normalized.x !== undefined && typeof normalized.x === 'number'
            ? normalized.x - pageOffsetX
            : currentAsset.x;
        const nextY =
          normalized.y !== undefined && typeof normalized.y === 'number'
            ? normalized.y - pageOffsetY
            : currentAsset.y;

        let snappedX = nextX;
        let snappedY = nextY;
        const nextGuidelines: Array<{
          type: 'vertical' | 'horizontal';
          position: number;
          canvasWidth: number;
          canvasHeight: number;
          pageOffsetX: number;
          pageOffsetY: number;
        }> = [];

        const verticalTargets = [0, canvasWidth / 2, canvasWidth];
        const horizontalTargets = [0, canvasHeight / 2, canvasHeight];

        const snapAxis = (
          start: number,
          size: number,
          targets: number[],
          type: 'vertical' | 'horizontal',
        ) => {
          const anchors = [0, size / 2, size];
          let bestDiff = Number.POSITIVE_INFINITY;
          let bestTarget: number | null = null;
          let bestAnchor = 0;

          for (const target of targets) {
            for (const anchor of anchors) {
              const diff = target - (start + anchor);
              const absDiff = Math.abs(diff);
              if (absDiff < bestDiff) {
                bestDiff = absDiff;
                bestTarget = target;
                bestAnchor = anchor;
              }
            }
          }

          if (bestTarget !== null && bestDiff <= SNAP_THRESHOLD) {
            if (type === 'vertical') {
              nextGuidelines.push({
                type,
                position: bestTarget + pageOffsetX,
                canvasWidth,
                canvasHeight,
                pageOffsetX,
                pageOffsetY,
              });
            } else {
              nextGuidelines.push({
                type,
                position: bestTarget + pageOffsetY,
                canvasWidth,
                canvasHeight,
                pageOffsetX,
                pageOffsetY,
              });
            }
            return start + (bestTarget - (start + bestAnchor));
          }

          return start;
        };

        snappedX = snapAxis(nextX, nextWidth, verticalTargets, 'vertical');
        snappedY = snapAxis(nextY, nextHeight, horizontalTargets, 'horizontal');

        normalized.x = snappedX;
        normalized.y = snappedY;
        setSnapGuidelines(nextGuidelines);

        if (clearGuidelinesTimerRef.current) {
          clearTimeout(clearGuidelinesTimerRef.current);
        }
        clearGuidelinesTimerRef.current = setTimeout(() => setSnapGuidelines([]), 140);
      }

      // Only normalize x, y if they're present and absolute
      // x and y from Konva are absolute pixel coordinates, we need to convert to 0-1 range
      if (normalized.x !== undefined && typeof normalized.x === 'number') {
        normalized.x = normalized.x / canvasWidth;
      }
      if (normalized.y !== undefined && typeof normalized.y === 'number') {
        normalized.y = normalized.y / canvasHeight;
      }

      onAssetUpdate(assetId, normalized);
    },
    [ROTATION_SNAP_THRESHOLD, canvasAbsolute.items, canvasWidth, canvasHeight, onAssetUpdate]
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

    const centeredX = (containerSize.width - workspaceWidth * displayScale) / 2;
    const centeredY = (containerSize.height - workspaceHeight * displayScale) / 2;
    setPan({ x: centeredX, y: centeredY });
  }, [containerSize.height, containerSize.width, displayScale, workspaceHeight, workspaceWidth, zoom]);

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
        // Two-finger touchpad gesture pans the canvas.
        setPan((prev) => ({
          x: prev.x - event.deltaX,
          y: prev.y - event.deltaY,
        }));
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
    // Right or middle mouse drag pans canvas.
    if (event.button !== 2 && event.button !== 1) {
      return;
    }

    event.preventDefault();
    hasPannedRef.current = false;
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
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      hasPannedRef.current = true;
    }
    setPan({
      x: panStartRef.current.panX + deltaX,
      y: panStartRef.current.panY + deltaY,
    });
  };

  const stopPanning = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handleContextMenu = (event: Konva.KonvaEventObject<PointerEvent>) => {
    event.evt.preventDefault();

    if (hasPannedRef.current) {
      hasPannedRef.current = false;
      return;
    }

    const targetId = event.target?.id?.();
    const isKnownTarget = targetId && canvasAbsolute.items.some((item) => item.id === targetId);
    if (isKnownTarget && targetId && targetId !== selectedAssetId) {
      onAssetSelect(targetId);
    }

    setContextMenu({
      x: event.evt.pageX,
      y: event.evt.pageY,
      visible: true,
    });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
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
      onClick={() => closeContextMenu()}
    >
      <div
        className="absolute"
        style={{
          width: `${workspaceWidth}px`,
          height: `${workspaceHeight}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${displayScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          className="absolute shadow-lg border border-gray-300"
          style={{
            left: `${pageOffsetX}px`,
            top: `${pageOffsetY}px`,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            backgroundColor: canvasStructure.transparentBackground ? '#ffffff' : canvasStructure.backgroundColor,
            backgroundImage: canvasStructure.transparentBackground
              ? 'repeating-conic-gradient(#f3f4f6 0 25%, #ffffff 0 50%)'
              : 'none',
            backgroundSize: canvasStructure.transparentBackground
              ? `${checkerCellSize}px ${checkerCellSize}px`
              : undefined,
            backgroundPosition: canvasStructure.transparentBackground ? '0 0' : undefined,
            pointerEvents: 'none',
          }}
        />

        <Stage
          ref={stageRef}
          width={workspaceWidth}
          height={workspaceHeight}
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            // Deselect if clicking on canvas background
            if (e.target === e.target.getStage()) {
              onAssetSelect(null);
              onCanvasClick?.();
            }
            closeContextMenu();
          }}
        >
          <Layer>
            {snapGuidelines.length > 0 && <SnapGuidelines guidelines={snapGuidelines} />}

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
                      x={asset.x + pageOffsetX}
                      y={asset.y + pageOffsetY}
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
                      x={asset.x + pageOffsetX}
                      y={asset.y + pageOffsetY}
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
                      x={asset.x + pageOffsetX}
                      y={asset.y + pageOffsetY}
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

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        hasSelection={Boolean(selectedAssetId)}
        onDuplicate={() => {
          if (!selectedAssetId) return;
          onAssetDuplicate();
          closeContextMenu();
        }}
        onDelete={() => {
          if (!selectedAssetId) return;
          onAssetDelete();
          closeContextMenu();
        }}
        onMoveToFront={() => {
          if (!selectedAssetId) return;
          onLayerChange('front');
          closeContextMenu();
        }}
        onMoveToBack={() => {
          if (!selectedAssetId) return;
          onLayerChange('back');
          closeContextMenu();
        }}
        onMoveUp={() => {
          if (!selectedAssetId) return;
          onLayerChange('forward');
          closeContextMenu();
        }}
        onMoveDown={() => {
          if (!selectedAssetId) return;
          onLayerChange('backward');
          closeContextMenu();
        }}
      />
    </div>
  );
}
