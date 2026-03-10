import React, { useMemo } from 'react';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';
import {
  extractDesignerCanvasPayload,
  mapDesignerCanvasToPage,
  type DesignerRenderItem,
} from '../../../../services/canvas-structure-to-konva-group';

interface DesignerBackgroundGroupProps {
  background: unknown;
  offsetX: number;
  pageOffsetY: number;
  canvasWidth: number;
  canvasHeight: number;
}

interface StaticImageItemProps {
  item: Extract<DesignerRenderItem, { type: 'image' | 'sticker' }>;
  opacityMultiplier: number;
}

const StaticImageItem = React.memo(function StaticImageItem({ item, opacityMultiplier }: StaticImageItemProps) {
  // Normalize uploadPath to use API endpoint
  const normalizeUploadPath = (path: string): string => {
    if (!path) return path;
    const match = path.match(/^\/uploads\/background-images\/designer\/(.+)$/);
    if (match && match[1]) {
      return `/api/background-images/designer/assets/${match[1]}`;
    }
    return path;
  };

  const src = item.type === 'image'
    ? normalizeUploadPath(item.uploadPath)
    : `/api/stickers/${encodeURIComponent(item.stickerId)}/file`;
  const [image] = useImage(src);

  if (!image) {
    return null;
  }

  return (
    <KonvaImage
      image={image}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      opacity={Math.max(0, Math.min(1, item.opacity * opacityMultiplier))}
      listening={false}
    />
  );
});

export const DesignerBackgroundGroup = React.memo(function DesignerBackgroundGroup({
  background,
  offsetX,
  pageOffsetY,
  canvasWidth,
  canvasHeight,
}: DesignerBackgroundGroupProps) {
  const payload = useMemo(() => extractDesignerCanvasPayload(background), [background]);

  const mapped = useMemo(() => {
    if (!payload) {
      return null;
    }

    return mapDesignerCanvasToPage(
      payload,
      canvasWidth,
      canvasHeight,
      offsetX,
      pageOffsetY,
    );
  }, [payload, canvasWidth, canvasHeight, offsetX, pageOffsetY]);

  if (!mapped) {
    return null;
  }

  const backgroundOpacityMultiplier =
    typeof (background as { opacity?: unknown }).opacity === 'number'
      ? ((background as { opacity?: number }).opacity as number)
      : 1;

  return (
    <Group listening={false}>
      <Rect
        x={offsetX}
        y={pageOffsetY}
        width={canvasWidth}
        height={canvasHeight}
        fill={mapped.backgroundColor}
        opacity={Math.max(0, Math.min(1, mapped.backgroundOpacity * backgroundOpacityMultiplier))}
        listening={false}
      />

      {mapped.items.map((item) => {
        if (item.type === 'text') {
          const fontStyle = `${item.fontBold ? 'bold' : ''} ${item.fontItalic ? 'italic' : ''}`.trim() || 'normal';
          return (
            <Text
              key={item.id}
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
              text={item.text}
              fontFamily={item.fontFamily}
              fontSize={item.fontSize}
              fontStyle={fontStyle}
              fill={item.fontColor}
              opacity={Math.max(0, Math.min(1, item.fontOpacity * item.opacity * backgroundOpacityMultiplier))}
              align={item.textAlign || 'left'}
              rotation={item.rotation}
              listening={false}
            />
          );
        }

        return (
          <StaticImageItem
            key={item.id}
            item={item}
            opacityMultiplier={backgroundOpacityMultiplier}
          />
        );
      })}
    </Group>
  );
});