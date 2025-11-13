import { useState } from 'react';
import { Rect, Image as KonvaImage, Group, Line } from 'react-konva';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';

export default function ImagePlaceholder(props: CanvasItemProps) {
  const { element } = props;
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const handleDoubleClick = () => {
    if (element.type === 'placeholder') {
      // Dispatch custom event to open image modal in canvas
      window.dispatchEvent(new CustomEvent('openImageModal', {
        detail: {
          elementId: element.id,
          position: {
            x: element.x,
            y: element.y
          }
        }
      }));
    }
  };

  // Load existing image
  if (element.type === 'image' && element.src && !image) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = element.src;
  }

  return (
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick}>
      {element.type === 'placeholder' ? (
        <>
          {/* Hellgrauer Hintergrund */}
          <Rect
            width={element.width}
            height={element.height}
            fill="#f3f4f6"
            stroke="#e5e7eb"
            strokeWidth={1}
            cornerRadius={4}
            listening={false}
          />
          
          {/* Image-Plus Icon in dunklerem Grau */}
          <Group
            x={element.width / 2}
            y={element.height / 2}
            listening={false}
          >
            {/* Bild-Rahmen (vereinfachtes Icon) */}
            <Rect
              x={-element.width * 0.15}
              y={-element.height * 0.15}
              width={element.width * 0.3}
              height={element.height * 0.3}
              fill="transparent"
              stroke="#9ca3af"
              strokeWidth={2}
              cornerRadius={2}
              listening={false}
            />
            {/* Plus-Zeichen */}
            <Line
              points={[0, -element.height * 0.08, 0, element.height * 0.08]}
              stroke="#9ca3af"
              strokeWidth={2}
              lineCap="round"
              listening={false}
            />
            <Line
              points={[-element.width * 0.08, 0, element.width * 0.08, 0]}
              stroke="#9ca3af"
              strokeWidth={2}
              lineCap="round"
              listening={false}
            />
          </Group>
        </>
      ) : (
        <>
          {image && (
            <KonvaImage
              image={image}
              width={element.width}
              height={element.height}
              listening={false}
            />
          )}
          {!image && (
            <Rect
              width={element.width}
              height={element.height}
              fill="#f3f4f6"
              stroke="#d1d5db"
              strokeWidth={1}
              listening={false}
            />
          )}
        </>
      )}
    </BaseCanvasItem>
  );
}