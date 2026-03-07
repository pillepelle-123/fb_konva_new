/**
 * Shared Text Item Component for Konva
 * Used in Background Designer (similar to sticker text)
 */
import { useEffect, useRef } from 'react';
import { Text as KonvaText, Transformer } from 'react-konva';

export interface TextItemProps {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor: string;
  fontOpacity?: number;
  rotation?: number;
  textAlign?: 'left' | 'center' | 'right';
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

export function TextItem({
  id,
  text,
  x,
  y,
  width,
  height,
  fontFamily,
  fontSize,
  fontBold = false,
  fontItalic = false,
  fontColor,
  fontOpacity = 1,
  rotation = 0,
  textAlign = 'left',
  isSelected,
  onSelect,
  onTransform,
  draggable = true,
  displayScale = 1,
}: TextItemProps) {
  const textRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Inverse scale to keep selection UI constant size regardless of zoom
  const inverseScale = displayScale > 0 ? 1 / displayScale : 1;

  // Build font style string
  const fontStyle = [
    fontItalic ? 'italic' : '',
    fontBold ? 'bold' : '',
    `${fontSize}px`,
    fontFamily,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (isSelected && transformerRef.current && textRef.current) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaText
        ref={textRef}
        id={id}
        text={text}
        x={x}
        y={y}
        width={width}
        height={height}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontStyle={[fontBold ? 'bold' : '', fontItalic ? 'italic' : '']
          .filter(Boolean)
          .join(' ')}
        fill={fontColor}
        opacity={fontOpacity}
        rotation={rotation}
        align={textAlign}
        verticalAlign="top"
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
          const node = textRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale
          node.scaleX(1);
          node.scaleY(1);

          onTransform({
            x: node.x(),
            y: node.y(),
            width: Math.max(50, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          keepRatio={false}
          rotateEnabled={true}
          borderStroke="#0066ff"
          borderStrokeWidth={2 * inverseScale}
          anchorStroke="#0066ff"
          anchorFill="#ffffff"
          anchorSize={8 * inverseScale}
          scaleX={inverseScale}
          scaleY={inverseScale}
          boundBoxFunc={(oldBox, newBox) => {
            // Minimum size constraints
            if (newBox.width < 50 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
