import React, { useRef, useEffect, useState } from 'react';
import { Rect, Group, Image as KonvaImage } from 'react-konva';
import { createPatternTile } from './canvas-utils';
import { DesignerBackgroundGroup } from './DesignerBackgroundGroup';
import { hasDesignerCanvasPayload } from '../../../../services/canvas-structure-to-konva-group';

function isSvgLikeUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:image/svg+xml')) return true;
  try {
    const parsed = new URL(url, window.location.href);
    return /\.svg$/i.test(parsed.pathname);
  } catch {
    return /\.svg(\?|$)/i.test(url);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.trim().replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized.slice(0, 6);
  const int = parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

// Module-level cache: pre-toned images keyed by "src::toneColor"
const toneCache = new Map<string, Promise<HTMLImageElement>>();

function preToneImage(image: HTMLImageElement, toneColorHex: string): Promise<HTMLImageElement> {
  const key = `${image.src}::${toneColorHex}`;
  if (toneCache.has(key)) return toneCache.get(key)!;
  const promise = new Promise<HTMLImageElement>((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width || 1;
    canvas.height = image.naturalHeight || image.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(image); return; }
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { r: tr, g: tg, b: tb } = hexToRgb(toneColorHex);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      data[i]     = Math.max(0, Math.min(255, (gray * tr) / 255));
      data[i + 1] = Math.max(0, Math.min(255, (gray * tg) / 255));
      data[i + 2] = Math.max(0, Math.min(255, (gray * tb) / 255));
    }
    ctx.putImageData(imageData, 0, 0);
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL('image/png');
  });
  toneCache.set(key, promise);
  return promise;
}

function useTonedImage(
  sourceImage: HTMLImageElement | null | undefined,
  toneColorHex: string | undefined
): HTMLImageElement | null {
  const [tonedImage, setTonedImage] = useState<HTMLImageElement | null>(null);
  const activeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sourceImage || !sourceImage.complete || !toneColorHex) {
      setTonedImage(null);
      activeKeyRef.current = null;
      return;
    }
    const key = `${sourceImage.src}::${toneColorHex}`;
    if (key === activeKeyRef.current) return;
    activeKeyRef.current = key;
    let cancelled = false;
    preToneImage(sourceImage, toneColorHex).then((img) => {
      if (!cancelled && activeKeyRef.current === key) {
        setTonedImage(img);
      }
    });
    return () => { cancelled = true; };
  }, [sourceImage?.src, toneColorHex]);

  return tonedImage;
}

interface PreTonedKonvaImageProps {
  sourceImage: HTMLImageElement;
  toneColorHex?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  listening: boolean;
  scaleX?: number;
  scaleY?: number;
}

const PreTonedKonvaImage: React.FC<PreTonedKonvaImageProps> = ({
  sourceImage,
  toneColorHex,
  x,
  y,
  width,
  height,
  opacity,
  listening,
  scaleX = 1,
  scaleY = 1,
}) => {
  const tonedImage = useTonedImage(sourceImage, toneColorHex);
  // Keep original visible while async toning is pending/fails to avoid "only color background" frames.
  const renderImage = toneColorHex ? (tonedImage ?? sourceImage) : sourceImage;
  if (!renderImage) return null;
  return (
    <KonvaImage
      image={renderImage}
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={opacity}
      listening={listening}
      scaleX={scaleX}
      scaleY={scaleY}
    />
  );
};

interface PreTonedRepeatRectProps {
  sourceImage: HTMLImageElement;
  toneColorHex?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillPatternScaleX: number;
  fillPatternScaleY: number;
  fillPatternOffsetX: number;
  fillPatternOffsetY: number;
  fillPatternRepeat: string;
  opacity: number;
}

const PreTonedRepeatRect: React.FC<PreTonedRepeatRectProps> = ({
  sourceImage,
  toneColorHex,
  x,
  y,
  width,
  height,
  fillPatternScaleX,
  fillPatternScaleY,
  fillPatternOffsetX,
  fillPatternOffsetY,
  fillPatternRepeat,
  opacity,
}) => {
  const tonedImage = useTonedImage(sourceImage, toneColorHex);
  // Fall back to original while toning is in progress so the pattern is always visible
  const patternImage = toneColorHex ? (tonedImage ?? sourceImage) : sourceImage;
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fillPatternImage={patternImage}
      fillPatternScaleX={fillPatternScaleX}
      fillPatternScaleY={fillPatternScaleY}
      fillPatternOffsetX={fillPatternOffsetX}
      fillPatternOffsetY={fillPatternOffsetY}
      fillPatternRepeat={fillPatternRepeat as 'repeat' | 'no-repeat'}
      opacity={opacity}
      listening={false}
    />
  );
};

// Local copy of getPalettePartColor to avoid import issues
function getPalettePartColor(
  palette: any,
  partName: string,
  fallbackSlot?: string,
  fallbackColor?: string
): string | undefined {
  if (!palette) return fallbackColor;
  const slot = palette.parts?.[partName];
  if (slot && palette.colors[slot]) {
    return palette.colors[slot];
  }
  if (fallbackSlot && palette.colors[fallbackSlot]) {
    return palette.colors[fallbackSlot];
  }
  return fallbackColor;
}

// Import PATTERNS directly to avoid import path issues
const PATTERNS = [
  { id: 'dots', name: 'Dots' },
  { id: 'grid', name: 'Grid' },
  { id: 'diagonal', name: 'Diagonal' },
  { id: 'cross', name: 'Cross' },
  { id: 'waves', name: 'Waves' },
  { id: 'hexagon', name: 'Hexagon' }
];

interface CanvasBackgroundProps {
  page: any;
  offsetX: number;
  pageOffsetY: number;
  canvasWidth: number;
  canvasHeight: number;
  backgroundImageCache: Map<string, any>;
  backgroundQuality: 'preview' | 'full';
  getPaletteForPage: (page?: any) => { paletteId: string | null; palette: any };
  resolveBackgroundImageUrl: (background: any, options?: any) => string | undefined;
}

export const CanvasBackground: React.FC<CanvasBackgroundProps> = ({
  page,
  offsetX,
  pageOffsetY,
  canvasWidth,
  canvasHeight,
  backgroundImageCache,
  backgroundQuality,
  getPaletteForPage,
  resolveBackgroundImageUrl
}) => {
  const lastDisplayedImageRef = useRef<HTMLImageElement | null>(null);
  const background = page?.background;
  const backgroundTransform = page?.backgroundTransform;
  const transformScale = backgroundTransform?.scale ?? 1;
  const transformOffsetX = (backgroundTransform?.offsetRatioX ?? 0) * canvasWidth;
  const transformOffsetY = (backgroundTransform?.offsetRatioY ?? 0) * canvasHeight;
  const mirrorBackground = Boolean(backgroundTransform?.mirror);
  const { paletteId, palette } = getPaletteForPage(page);
  const normalizedPalette = palette || undefined;
  const debugEnabled = (() => {
    try {
      if (typeof window === 'undefined') return false;
      const value = window.localStorage.getItem('debug.background.palette');
      return value === '1' || value === 'true';
    } catch {
      return false;
    }
  })();
  const palettePatternStroke =
    getPalettePartColor(normalizedPalette, 'pagePattern', 'primary', '#666666') || '#666666';
  const palettePatternFill =
    getPalettePartColor(normalizedPalette, 'pageBackground', 'background', 'transparent') || 'transparent';
  const pageBackgroundColor =
    getPalettePartColor(normalizedPalette, 'pageBackground', 'background', '#ffffff') || '#ffffff';

  // Pre-calculate imageUrl (before early returns)
  // Note: Preloading is handled by parent canvas.tsx to ensure proper cache state updates
  let precomputedImageUrl: string | undefined;
  if (background?.type === 'image' && !hasDesignerCanvasPayload(background)) {
    const opts = {
      paletteId,
      paletteColors: palette?.colors,
      palette: palette ?? undefined,
      pageBackgroundColor,
    };
    precomputedImageUrl = resolveBackgroundImageUrl(background, opts);
    
    if (!precomputedImageUrl && background.backgroundImageId) {
      precomputedImageUrl = resolveBackgroundImageUrl(background, {
        paletteId: null,
        paletteColors: undefined
      });
    }
    
    if (!precomputedImageUrl) {
      precomputedImageUrl = background.value;
    }
  }

  if (!background) return null;

  const opacity = background.opacity || 1;

  if (background.type === 'color') {
    return (
      <Rect
        x={offsetX}
        y={pageOffsetY}
        width={canvasWidth}
        height={canvasHeight}
        fill={background.value}
        opacity={opacity}
        listening={false}
      />
    );
  }

  if (background.type === 'pattern') {
    const pattern = PATTERNS.find(p => p.id === background.value);
    if (pattern) {
      // patternBackgroundColor = color of the pattern itself (dots, lines)
      // patternForegroundColor = color of the space between patterns
      const patternColor = background.patternBackgroundColor || palettePatternStroke;
      const spaceColor = background.patternForegroundColor || palettePatternFill;
      const patternScale = Math.pow(1.5, (background.patternSize || 1) - 1);

      const patternTile = createPatternTile(pattern, patternColor, patternScale, background.patternStrokeWidth || 1);

      return (
        <Group>
          {spaceColor !== 'transparent' && (
            <Rect
              x={offsetX}
              y={pageOffsetY}
              width={canvasWidth}
              height={canvasHeight}
              fill={spaceColor}
              opacity={opacity}
              listening={false}
            />
          )}
          <Rect
            x={offsetX}
            y={pageOffsetY}
            width={canvasWidth}
            height={canvasHeight}
            fillPatternImage={patternTile}
            fillPatternRepeat="repeat"
            fillPatternScaleX={mirrorBackground ? -transformScale : transformScale}
            fillPatternScaleY={transformScale}
            fillPatternOffsetX={mirrorBackground ? transformOffsetX - canvasWidth * transformScale : transformOffsetX}
            fillPatternOffsetY={transformOffsetY}
            opacity={background.patternBackgroundOpacity || 1}
            listening={false}
          />
        </Group>
      );
    }
  }

  if (background.type === 'image') {
    if (hasDesignerCanvasPayload(background)) {
      const shouldApplyPalette = background.applyPalette !== false;
      const paletteMode = background.paletteMode ?? 'monochrome';
      const backgroundColorOverride = (background as any).backgroundColorEnabled && (background as any).backgroundColor
        ? (background as any).backgroundColor
        : undefined;
      const designerPaletteOptions = {
        paletteId,
        paletteColors: palette?.colors,
        palette: palette ?? undefined,
        paletteMode,
        backgroundColorOverride,
      };
      const designerPaletteCacheKey = JSON.stringify({
        applyPalette: shouldApplyPalette,
        paletteId: paletteId ?? null,
        paletteMode,
        backgroundColorOverride: backgroundColorOverride ?? null,
        paletteColors: Object.entries(palette?.colors ?? {}).sort(([a], [b]) => a.localeCompare(b)),
      });

      return (
        <DesignerBackgroundGroup
          background={background}
          offsetX={offsetX}
          pageOffsetY={pageOffsetY}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          paletteOptions={designerPaletteOptions}
          applyPalette={shouldApplyPalette}
          paletteCacheKey={designerPaletteCacheKey}
        />
      );
    }

    // Use precomputed imageUrl from above
    const imageUrl = precomputedImageUrl;

    if (!imageUrl) {
      return null;
    }



    // Check if this is a template background that needs background color
    const hasBackgroundColor = (background as any).backgroundColorEnabled && (background as any).backgroundColor;
    const paletteBackgroundColor = getPalettePartColor(normalizedPalette, 'pageBackground', 'background', '#ffffff') || '#ffffff';
    const baseBackgroundColor = hasBackgroundColor
      ? (background as any).backgroundColor || paletteBackgroundColor
      : '#ffffff';
    const shouldApplyPixelMonochrome =
      background.applyPalette !== false &&
      (background.paletteMode ?? 'monochrome') === 'monochrome' &&
      !isSvgLikeUrl(imageUrl);
    const pixelToneColor = baseBackgroundColor;
    const backgroundColorOpacity = (background as any).backgroundColorOpacity ?? 1;
    const imageOpacity = background.opacity ?? 1;

    const cacheEntry = imageUrl ? backgroundImageCache.get(imageUrl) || null : null;

    const displayImage =
      backgroundQuality === 'full'
        ? cacheEntry?.full
        : cacheEntry?.preview || cacheEntry?.full;

    // Only save as fallback if the image matches the current URL
    if (displayImage?.complete && displayImage.src === imageUrl) {
      lastDisplayedImageRef.current = displayImage;
    }
    
    // Only use fallback if it matches the current URL (prevent showing stale palette colors)
    const fallbackCandidate = (!displayImage || !displayImage.complete) ? lastDisplayedImageRef.current : null;
    const fallbackMatchesUrl = fallbackCandidate?.complete && fallbackCandidate.src === imageUrl;
    const fallbackImage = fallbackMatchesUrl ? fallbackCandidate : null;

    if (!displayImage || !displayImage.complete) {
      if (fallbackImage?.complete) {
        const img = fallbackImage;
        const imageWidth = img.naturalWidth || img.width || 1;
        const imageHeight = img.naturalHeight || img.height || 1;
        const fallbackImageOpacity = background.opacity ?? 1;
        if (background.imageSize === 'contain' && !background.imageRepeat) {
          const widthPercent = background.imageContainWidthPercent ?? 100;
          const widthRatio = Math.max(0.1, Math.min(2, widthPercent / 100));
          const scale = Math.max(0.01, (canvasWidth * widthRatio) / imageWidth);
          const scaledImageWidth = imageWidth * scale;
          const scaledImageHeight = imageHeight * scale;
          const position = background.imagePosition || 'top-left';

          const horizontalSpace = canvasWidth - scaledImageWidth;
          const verticalSpace = canvasHeight - scaledImageHeight;

          const isRight = position.endsWith('right');
          const isBottom = position.startsWith('bottom');

          const imageX = offsetX + (isRight ? horizontalSpace : 0);
          const imageY = pageOffsetY + (isBottom ? verticalSpace : 0);
          const finalWidth = scaledImageWidth * transformScale;
          const finalHeight = scaledImageHeight * transformScale;

          return (
            <Group listening={false}>
              <Rect
                x={offsetX}
                y={pageOffsetY}
                width={canvasWidth}
                height={canvasHeight}
                fill={baseBackgroundColor}
                opacity={backgroundColorOpacity}
                listening={false}
              />
              <PreTonedKonvaImage
                sourceImage={img}
                toneColorHex={shouldApplyPixelMonochrome ? pixelToneColor : undefined}
                x={mirrorBackground ? imageX + finalWidth + transformOffsetX : imageX + transformOffsetX}
                y={imageY + transformOffsetY}
                width={finalWidth}
                height={finalHeight}
                opacity={fallbackImageOpacity}
                listening={false}
                scaleX={mirrorBackground ? -1 : 1}
                scaleY={1}
              />
            </Group>
          );
        }
        let fillPatternScaleX = 1;
        let fillPatternScaleY = 1;
        let fillPatternOffsetX = transformOffsetX;
        let fillPatternOffsetY = transformOffsetY;
        let fillPatternRepeat: 'no-repeat' | 'repeat' = 'no-repeat';
        if (background.imageSize === 'cover') {
          const scaleX = canvasWidth / imageWidth;
          const scaleY = canvasHeight / imageHeight;
          const scale = Math.max(scaleX, scaleY);
          fillPatternScaleX = fillPatternScaleY = scale * transformScale;
        } else if (background.imageSize === 'contain') {
          const widthPercent = background.imageContainWidthPercent ?? 100;
          const widthRatio = Math.max(0.1, Math.min(2, widthPercent / 100));
          const desiredScale = Math.max(0.01, (canvasWidth * widthRatio) / imageWidth);
          fillPatternScaleX = fillPatternScaleY = desiredScale * transformScale;
          fillPatternRepeat = background.imageRepeat ? 'repeat' : 'no-repeat';
        } else if (background.imageSize === 'stretch') {
          fillPatternScaleX = (canvasWidth / imageWidth) * transformScale;
          fillPatternScaleY = (canvasHeight / imageHeight) * transformScale;
        }
        if (mirrorBackground) {
          fillPatternScaleX = -fillPatternScaleX;
          fillPatternOffsetX -= canvasWidth * transformScale;
        }
        if (fillPatternRepeat === 'repeat') {
          return (
            <Group listening={false}>
              <Rect
                x={offsetX}
                y={pageOffsetY}
                width={canvasWidth}
                height={canvasHeight}
                fill={baseBackgroundColor}
                opacity={backgroundColorOpacity}
                listening={false}
              />
              <PreTonedRepeatRect
                sourceImage={img}
                toneColorHex={shouldApplyPixelMonochrome ? pixelToneColor : undefined}
                x={offsetX}
                y={pageOffsetY}
                width={canvasWidth}
                height={canvasHeight}
                fillPatternScaleX={fillPatternScaleX}
                fillPatternScaleY={fillPatternScaleY}
                fillPatternOffsetX={fillPatternOffsetX}
                fillPatternOffsetY={fillPatternOffsetY}
                fillPatternRepeat={fillPatternRepeat}
                opacity={imageOpacity}
              />
            </Group>
          );
        }

        const drawWidth = canvasWidth * transformScale;
        const drawHeight = canvasHeight * transformScale;
        const drawX = mirrorBackground ? offsetX + drawWidth + transformOffsetX : offsetX + transformOffsetX;
        const drawY = pageOffsetY + transformOffsetY;

        return (
          <Group listening={false}>
            <Rect
              x={offsetX}
              y={pageOffsetY}
              width={canvasWidth}
              height={canvasHeight}
              fill={baseBackgroundColor}
              opacity={backgroundColorOpacity}
              listening={false}
            />
            <PreTonedKonvaImage
              sourceImage={img}
              toneColorHex={shouldApplyPixelMonochrome ? pixelToneColor : undefined}
              x={drawX}
              y={drawY}
              width={drawWidth}
              height={drawHeight}
              opacity={imageOpacity}
              listening={false}
              scaleX={mirrorBackground ? -1 : 1}
              scaleY={1}
            />
          </Group>
        );
      }
      return (
        <Rect
          x={offsetX}
          y={pageOffsetY}
          width={canvasWidth}
          height={canvasHeight}
          fill={baseBackgroundColor}
          opacity={backgroundColorOpacity}
          listening={false}
        />
      );
    }

    // Calculate scaling based on actual image dimensions
    let fillPatternScaleX = 1;
    let fillPatternScaleY = 1;
    let fillPatternOffsetX = 0;
    let fillPatternOffsetY = 0;
    let fillPatternRepeat = 'no-repeat';

    const imageWidth = displayImage.naturalWidth || displayImage.width || 1;
    const imageHeight = displayImage.naturalHeight || displayImage.height || 1;
    if (background.imageSize === 'cover') {
      const scaleX = canvasWidth / imageWidth;
      const scaleY = canvasHeight / imageHeight;
      const scale = Math.max(scaleX, scaleY);
      fillPatternScaleX = fillPatternScaleY = scale;
    } else if (background.imageSize === 'contain') {
      const widthPercent = background.imageContainWidthPercent ?? 100;
      const widthRatio = Math.max(0.1, Math.min(2, widthPercent / 100));
      const desiredScale = Math.max(0.01, (canvasWidth * widthRatio) / imageWidth);
      const scale = desiredScale;

      if (background.imageRepeat) {
        // Use pattern fill for repeat mode and respect slider scaling
        fillPatternScaleX = fillPatternScaleY = scale;
        fillPatternRepeat = 'repeat';
      } else {
        // For contain mode without repeat, use direct Image element for precise positioning
        const scaledImageWidth = imageWidth * scale;
        const scaledImageHeight = imageHeight * scale;
        const position = background.imagePosition || 'top-left';

        const horizontalSpace = canvasWidth - scaledImageWidth;
        const verticalSpace = canvasHeight - scaledImageHeight;

        const isRight = position.endsWith('right');
        const isBottom = position.startsWith('bottom');

        const imageX = offsetX + (isRight ? horizontalSpace : 0);
        const imageY = pageOffsetY + (isBottom ? verticalSpace : 0);

        // Render as Image element instead of pattern fill for precise positioning
        const finalWidth = scaledImageWidth * transformScale;
        const finalHeight = scaledImageHeight * transformScale;
        const imageElement = (
          <PreTonedKonvaImage
            sourceImage={displayImage}
            toneColorHex={shouldApplyPixelMonochrome ? pixelToneColor : undefined}
            x={mirrorBackground ? imageX + finalWidth + transformOffsetX : imageX + transformOffsetX}
            y={imageY + transformOffsetY}
            width={finalWidth}
            height={finalHeight}
            opacity={imageOpacity}
            listening={false}
            scaleX={mirrorBackground ? -1 : 1}
            scaleY={1}
          />
        );

        // Background color layer behind the image (visible in transparent SVG areas)
        return (
          <Group listening={false}>
            <Rect
              x={offsetX}
              y={pageOffsetY}
              width={canvasWidth}
              height={canvasHeight}
              fill={baseBackgroundColor}
              opacity={backgroundColorOpacity}
              listening={false}
            />
            {imageElement}
          </Group>
        );
      }
    } else if (background.imageSize === 'stretch') {
      fillPatternScaleX = canvasWidth / imageWidth;
      fillPatternScaleY = canvasHeight / imageHeight;
    }

    // Apply transform adjustments for pattern fill
    fillPatternScaleX *= transformScale;
    fillPatternScaleY *= transformScale;
    fillPatternOffsetX += transformOffsetX;
    fillPatternOffsetY += transformOffsetY;
    if (mirrorBackground) {
      fillPatternScaleX = -fillPatternScaleX;
      fillPatternOffsetX -= canvasWidth * transformScale;
    }

    if (fillPatternRepeat === 'repeat') {
      // Konva filters do not apply to Rect fill patterns; keep legacy repeat behavior.
      return (
        <Group listening={false}>
          <Rect
            x={offsetX}
            y={pageOffsetY}
            width={canvasWidth}
            height={canvasHeight}
            fill={baseBackgroundColor}
            opacity={backgroundColorOpacity}
            listening={false}
          />
          <PreTonedRepeatRect
            sourceImage={displayImage}
            toneColorHex={shouldApplyPixelMonochrome ? pixelToneColor : undefined}
            x={offsetX}
            y={pageOffsetY}
            width={canvasWidth}
            height={canvasHeight}
            fillPatternScaleX={fillPatternScaleX}
            fillPatternScaleY={fillPatternScaleY}
            fillPatternOffsetX={fillPatternOffsetX}
            fillPatternOffsetY={fillPatternOffsetY}
            fillPatternRepeat={fillPatternRepeat}
            opacity={imageOpacity}
          />
        </Group>
      );
    }

    const drawWidth = canvasWidth * transformScale;
    const drawHeight = canvasHeight * transformScale;
    const drawX = mirrorBackground ? offsetX + drawWidth + transformOffsetX : offsetX + transformOffsetX;
    const drawY = pageOffsetY + transformOffsetY;

    return (
      <Group listening={false}>
        <Rect
          x={offsetX}
          y={pageOffsetY}
          width={canvasWidth}
          height={canvasHeight}
          fill={baseBackgroundColor}
          opacity={backgroundColorOpacity}
          listening={false}
        />
        <PreTonedKonvaImage
          sourceImage={displayImage}
          toneColorHex={shouldApplyPixelMonochrome ? pixelToneColor : undefined}
          x={drawX}
          y={drawY}
          width={drawWidth}
          height={drawHeight}
          opacity={imageOpacity}
          listening={false}
          scaleX={mirrorBackground ? -1 : 1}
          scaleY={1}
        />
      </Group>
    );
  }

  return null;
};
