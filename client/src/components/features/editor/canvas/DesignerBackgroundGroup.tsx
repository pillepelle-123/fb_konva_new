import React, { useEffect, useMemo, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';
import {
  extractDesignerCanvasPayload,
  mapDesignerCanvasToPage,
  type DesignerRenderItem,
} from '../../../../services/canvas-structure-to-konva-group';
import {
  resolveDesignerAssetUrlWithPalette,
  type BackgroundImagePaletteOptions,
} from '../../../../utils/background-image-utils';

interface DesignerBackgroundGroupProps {
  background: unknown;
  offsetX: number;
  pageOffsetY: number;
  canvasWidth: number;
  canvasHeight: number;
  paletteOptions?: BackgroundImagePaletteOptions;
  applyPalette?: boolean;
  paletteCacheKey?: string;
}

interface StaticImageItemProps {
  item: Extract<DesignerRenderItem, { type: 'image' | 'sticker' }>;
  opacityMultiplier: number;
  paletteOptions?: BackgroundImagePaletteOptions;
  applyPalette?: boolean;
  paletteCacheKey?: string;
}

const StaticImageItem = React.memo(function StaticImageItem({
  item,
  opacityMultiplier,
  paletteOptions,
  applyPalette = false,
  paletteCacheKey,
}: StaticImageItemProps) {
  const src = item.type === 'image'
    ? (item.resolvedSrc || `/api/background-images/designer/assets/${encodeURIComponent(item.assetId)}`)
    : `/api/stickers/${encodeURIComponent(item.stickerId)}/file`;

  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let cancelled = false;

    if (item.type !== 'image') {
      setResolvedSrc(src);
      return () => {
        cancelled = true;
      };
    }

    resolveDesignerAssetUrlWithPalette(src, {
      ...paletteOptions,
      applyPalette,
      paletteMode: paletteOptions?.paletteMode ?? 'monochrome',
    }).then((nextUrl) => {
      if (!cancelled) {
        setResolvedSrc(nextUrl || src);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item.type, src, applyPalette, paletteCacheKey]);

  const [image] = useImage(resolvedSrc);

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
  paletteOptions,
  applyPalette = false,
  paletteCacheKey,
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
            paletteOptions={paletteOptions}
            applyPalette={applyPalette}
            paletteCacheKey={paletteCacheKey}
          />
        );
      })}
    </Group>
  );
});