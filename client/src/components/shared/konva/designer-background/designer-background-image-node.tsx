/**
 * Designer Background Image Node for Konva.
 * Used by the background designer renderer, not directly by app canvas items.
 */
import { useEffect, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { DesignerBackgroundTransformer } from './designer-background-transformer';

export interface DesignerBackgroundImageNodeProps {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (updates: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  }) => void;
  aspectRatioLocked?: boolean;
  draggable?: boolean;
  displayScale?: number; // Zoom-independent display scale for selection UI
}

export function DesignerBackgroundImageNode({
  id,
  src,
  x,
  y,
  width,
  height,
  rotation = 0,
  opacity = 1,
  isSelected,
  onSelect,
  onTransform,
  aspectRatioLocked = true,
  draggable = true,
  displayScale = 1,
}: DesignerBackgroundImageNodeProps) {
  const [image] = useImage(src);
  const imageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        ref={imageRef}
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
          const node = imageRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale to 1
          node.scaleX(1);
          node.scaleY(1);

          onTransform({
            x: node.x(),
            y: node.y(),
            width: Math.max(10, node.width() * scaleX),
            height: Math.max(10, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <DesignerBackgroundTransformer
          transformerRef={transformerRef}
          keepRatio={aspectRatioLocked}
          displayScale={displayScale}
          minWidth={20}
          minHeight={20}
        />
      )}
    </>
  );
}
