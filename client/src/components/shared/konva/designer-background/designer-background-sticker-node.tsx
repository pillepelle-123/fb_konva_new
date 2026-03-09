/**
 * Designer Background Sticker Node for Konva.
 * Used by the background designer renderer, not directly by app canvas items.
 */
import { useEffect, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { DesignerBackgroundTransformer } from './designer-background-transformer';

export interface DesignerBackgroundStickerNodeProps {
  id: string;
  stickerId: string;
  stickerUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  stickerColor?: string;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (updates: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  }) => void;
  draggable?: boolean;
  displayScale?: number; // Zoom-independent display scale for selection UI
}

export function DesignerBackgroundStickerNode({
  id,
  stickerUrl,
  x,
  y,
  width,
  height,
  rotation = 0,
  opacity = 1,
  isSelected,
  onSelect,
  onTransform,
  draggable = true,
  displayScale = 1,
}: DesignerBackgroundStickerNodeProps) {
  const [image] = useImage(stickerUrl);
  const stickerRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && transformerRef.current && stickerRef.current) {
      transformerRef.current.nodes([stickerRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Apply color filter if stickerColor is provided
  // For SVG stickers, this would ideally be handled server-side or with filters
  // For now, we just render the image as-is
  // TODO: Implement color overlay for stickers

  return (
    <>
      <KonvaImage
        ref={stickerRef}
        id={id}
        image={image}
        x={x}
        y={y}
        width={width}
        height={height}
        rotation={rotation}
        opacity={opacity}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onTransform({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = stickerRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale to 1 (maintain aspect ratio)
          node.scaleX(1);
          node.scaleY(1);

          // Keep aspect ratio - use average scale
          const avgScale = (scaleX + scaleY) / 2;

          onTransform({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * avgScale),
            height: Math.max(20, node.height() * avgScale),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <DesignerBackgroundTransformer
          transformerRef={transformerRef}
          keepRatio={true}
          displayScale={displayScale}
          minWidth={20}
          minHeight={20}
        />
      )}
    </>
  );
}
