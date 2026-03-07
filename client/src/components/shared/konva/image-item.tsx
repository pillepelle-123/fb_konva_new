/**
 * Shared Image Item Component for Konva
 * Used in both Editor and Background Designer
 */
import { useEffect, useRef } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';

export interface ImageItemProps {
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

export function ImageItem({
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
}: ImageItemProps) {
  const [image] = useImage(src);
  const imageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Inverse scale to keep selection UI constant size regardless of zoom
  const inverseScale = displayScale > 0 ? 1 / displayScale : 1;

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
        <Transformer
          ref={transformerRef}
          keepRatio={aspectRatioLocked}
          rotateEnabled={true}
          borderStroke="#0066ff"
          borderStrokeWidth={2 * inverseScale}
          anchorStroke="#0066ff"
          anchorFill="#ffffff"
          anchorSize={8 * inverseScale}
          scaleX={inverseScale}
          scaleY={inverseScale}
          boundBoxFunc={(oldBox, newBox) => {
            // Minimum size constraint
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
