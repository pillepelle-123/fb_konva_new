import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import { useEditor } from '../../../../context/editor-context';
import { EditorPreviewProvider } from './editor-preview-provider';
import { CanvasBackground } from '../canvas/CanvasBackground';
import CanvasItemComponent from '../canvas-items';
import { resolveBackgroundImageUrl, createPreviewImage } from '../../../../utils/background-image-utils';
import { getThemePaletteId } from '../../../../utils/global-themes';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { BOOK_PAGE_DIMENSIONS } from '../../../../constants/book-formats';
import type { PageTemplate } from '../../../../types/template-types';
import type { BookOrientation, BookPageSize } from '../../../../constants/book-formats';

type BackgroundImageEntry = { full: HTMLImageElement; preview: HTMLImageElement };

const SPREAD_GAP = 0.025; // 2.5% of page width between pages
const MIN_PADDING = 20;

type StaticSpreadPreviewProps = {
  pageSize: BookPageSize;
  orientation: BookOrientation;
  themeId: string;
  paletteId: string;
  baseTemplate: PageTemplate | null;
  pickLeftRight: boolean;
  leftTemplate?: PageTemplate | null;
  rightTemplate?: PageTemplate | null;
  mirrorRight: boolean;
  className?: string;
};

function StaticSpreadPreviewInner({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 300 });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('setBackgroundQuality', { detail: { mode: 'preview' } }));
  }, []);

  const { state } = useEditor();
  const book = state.currentBook;
  const leftPage = book?.pages?.[0] ?? null;
  const rightPage = book?.pages?.[1] ?? null;

  const dimensions = useMemo(() => {
    const orient = book?.orientation || 'portrait';
    const dims = BOOK_PAGE_DIMENSIONS[book?.pageSize as keyof typeof BOOK_PAGE_DIMENSIONS] ?? BOOK_PAGE_DIMENSIONS.A4;
    return orient === 'landscape'
      ? { width: dims.height, height: dims.width }
      : { width: dims.width, height: dims.height };
  }, [book?.orientation, book?.pageSize]);

  const canvasWidth = dimensions.width;
  const canvasHeight = dimensions.height;
  const spreadWidth = canvasWidth * 2 + canvasWidth * SPREAD_GAP;
  const pageOffsetY = 0;

  const getPaletteForPage = useCallback((page?: typeof leftPage) => {
    const pageColorPaletteId = page?.colorPaletteId ?? null;
    const pageThemeId = page?.themeId ?? 'default';
    const themePaletteId = !pageColorPaletteId ? getThemePaletteId(pageThemeId) : null;
    const effectivePaletteId = pageColorPaletteId ?? themePaletteId;
    if (effectivePaletteId === null || effectivePaletteId === undefined) {
      return { paletteId: null as string | null, palette: null as ColorPalette | null };
    }
    // Use loose equality so string "1" matches numeric id 1 (API may return either)
    const palette = colorPalettes.find((p) => p.id == effectivePaletteId || String(p.id) === String(effectivePaletteId)) ?? null;
    return { paletteId: effectivePaletteId, palette };
  }, []);

  const [backgroundImageCache, setBackgroundImageCache] = useState<Map<string, BackgroundImageEntry>>(new Map());
  const cacheRef = useRef<Map<string, BackgroundImageEntry>>(new Map());
  const loadingUrlsRef = useRef<Set<string>>(new Set());

  // Preload background images for theme backgrounds (same logic as main canvas)
  useEffect(() => {
    const cache = cacheRef.current;
    const loadingUrls = loadingUrlsRef.current;
    const pages = [leftPage, rightPage].filter(Boolean) as typeof leftPage[];

    const preloadImage = (imageUrl: string) => {
      if (!imageUrl || cache.has(imageUrl) || loadingUrls.has(imageUrl)) return;

      loadingUrls.add(imageUrl);
      const img = new window.Image();
      const isDataUrl = imageUrl.startsWith('data:');
      const isLocalUrl = imageUrl.startsWith('http://localhost') || imageUrl.startsWith('https://localhost') ||
        imageUrl.startsWith('http://127.0.0.1') || imageUrl.startsWith('https://127.0.0.1') ||
        (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'));
      if (!isDataUrl && !isLocalUrl) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const previewImage = createPreviewImage(img);
        const storeEntry = () => {
          cache.set(imageUrl, { full: img, preview: previewImage });
          loadingUrls.delete(imageUrl);
          setBackgroundImageCache(new Map(cache));
        };
        if (previewImage === img || previewImage.complete) {
          storeEntry();
        } else {
          previewImage.onload = () => storeEntry();
          previewImage.onerror = () => storeEntry();
        }
      };
      img.onerror = () => {
        loadingUrls.delete(imageUrl);
      };
      img.src = imageUrl;
    };

    for (const page of pages) {
      const bg = page?.background;
      if (bg?.type === 'image') {
        const { paletteId, palette } = getPaletteForPage(page);
        const imageUrl = resolveBackgroundImageUrl(bg, {
          paletteId,
          paletteColors: palette?.colors
        }) || bg.value;
        if (imageUrl) preloadImage(imageUrl);
      }
    }
  }, [leftPage, rightPage, getPaletteForPage]);

  // Re-preload when palette SVG loads (URL may change from API URL to data URL)
  useEffect(() => {
    const cache = cacheRef.current;
    const loadingUrls = loadingUrlsRef.current;
    const pages = [leftPage, rightPage].filter(Boolean) as typeof leftPage[];

    const handleSvgLoaded = () => {
      for (const [url] of cache) {
        if (url.startsWith('data:')) cache.delete(url);
      }
      setBackgroundImageCache(new Map(cache));
      for (const page of pages) {
        const bg = page?.background;
        if (bg?.type === 'image') {
          const { paletteId, palette } = getPaletteForPage(page);
          const imageUrl = resolveBackgroundImageUrl(bg, {
            paletteId,
            paletteColors: palette?.colors
          }) || bg.value;
          if (imageUrl && !cache.has(imageUrl) && !loadingUrls.has(imageUrl)) {
            loadingUrls.add(imageUrl);
            const img = new window.Image();
            const isDataUrl = imageUrl.startsWith('data:');
            const isLocalUrl = imageUrl.startsWith('http://localhost') || imageUrl.startsWith('https://localhost') ||
              imageUrl.startsWith('http://127.0.0.1') || imageUrl.startsWith('https://127.0.0.1') ||
              (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'));
            if (!isDataUrl && !isLocalUrl) img.crossOrigin = 'anonymous';
            img.onload = () => {
              const previewImage = createPreviewImage(img);
              const storeEntry = () => {
                cache.set(imageUrl, { full: img, preview: previewImage });
                loadingUrls.delete(imageUrl);
                setBackgroundImageCache(new Map(cache));
              };
              if (previewImage === img || previewImage.complete) {
                storeEntry();
              } else {
                previewImage.onload = () => storeEntry();
                previewImage.onerror = () => storeEntry();
              }
            };
            img.onerror = () => loadingUrls.delete(imageUrl);
            img.src = imageUrl;
          }
        }
      }
    };
    window.addEventListener('backgroundImageSvgLoaded', handleSvgLoaded as EventListener);
    return () => window.removeEventListener('backgroundImageSvgLoaded', handleSvgLoaded as EventListener);
  }, [leftPage, rightPage, getPaletteForPage]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: rect.width, height: rect.height });
    }
    return () => ro.disconnect();
  }, []);

  const scale = useMemo(() => {
    const scaleX = (size.width - MIN_PADDING * 2) / spreadWidth;
    const scaleY = (size.height - MIN_PADDING * 2) / canvasHeight;
    return Math.min(scaleX, scaleY, 0.8) * 0.95;
  }, [size, spreadWidth, canvasHeight]);

  const stagePos = useMemo(() => {
    const scaledSpreadWidth = spreadWidth * scale;
    const scaledHeight = canvasHeight * scale;
    return {
      x: (size.width - scaledSpreadWidth) / 2,
      y: (size.height - scaledHeight) / 2,
    };
  }, [size, spreadWidth, canvasHeight, scale]);

  const noop = useCallback(() => {}, []);

  if (!leftPage && !rightPage) {
    return (
      <div ref={containerRef} className={`w-full h-full flex items-center justify-center bg-muted/20 rounded-xl ${className ?? ''}`}>
        <span className="text-sm text-muted-foreground">Keine Seiten</span>
      </div>
    );
  }

  const leftOffsetX = 0;
  const rightOffsetX = canvasWidth + canvasWidth * SPREAD_GAP;

  return (
    <div ref={containerRef} className={`w-full h-full overflow-hidden rounded-xl ${className ?? ''}`}>
      <Stage
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        listening={false}
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <Layer>
          {/* Linke Seite */}
          <Rect
            x={leftOffsetX}
            y={pageOffsetY}
            width={canvasWidth}
            height={canvasHeight}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={11}
            listening={false}
          />
          <CanvasBackground
            page={leftPage}
            offsetX={leftOffsetX}
            pageOffsetY={pageOffsetY}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            backgroundImageCache={backgroundImageCache}
            backgroundQuality="preview"
            getPaletteForPage={getPaletteForPage}
            resolveBackgroundImageUrl={resolveBackgroundImageUrl}
          />
          {(leftPage?.elements ?? []).map((element, index) => (
            <Group key={`left-${element.id}-${index}`} x={leftOffsetX} y={pageOffsetY}>
              <CanvasItemComponent
                element={element}
                interactive={false}
                isSelected={false}
                zoom={1}
                hoveredElementId={null}
                pageSide="left"
                pageIndex={0}
                activePageIndex={0}
                lockElements={true}
                dispatch={noop}
                onSelect={noop}
              />
            </Group>
          ))}

          {/* Rechte Seite */}
          <Rect
            x={rightOffsetX}
            y={pageOffsetY}
            width={canvasWidth}
            height={canvasHeight}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={11}
            listening={false}
          />
          <CanvasBackground
            page={rightPage}
            offsetX={rightOffsetX}
            pageOffsetY={pageOffsetY}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            backgroundImageCache={backgroundImageCache}
            backgroundQuality="preview"
            getPaletteForPage={getPaletteForPage}
            resolveBackgroundImageUrl={resolveBackgroundImageUrl}
          />
          {(rightPage?.elements ?? []).map((element, index) => (
            <Group key={`right-${element.id}-${index}`} x={rightOffsetX} y={pageOffsetY}>
              <CanvasItemComponent
                element={element}
                interactive={false}
                isSelected={false}
                zoom={1}
                hoveredElementId={null}
                pageSide="right"
                pageIndex={1}
                activePageIndex={0}
                lockElements={true}
                dispatch={noop}
                onSelect={noop}
              />
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

export function StaticSpreadPreview(props: StaticSpreadPreviewProps) {
  return (
    <EditorPreviewProvider
      pageSize={props.pageSize}
      orientation={props.orientation}
      themeId={props.themeId}
      paletteId={props.paletteId}
      baseTemplate={props.baseTemplate}
      pickLeftRight={props.pickLeftRight}
      leftTemplate={props.leftTemplate}
      rightTemplate={props.rightTemplate}
      mirrorRight={props.mirrorRight}
      allowInteractions={false}
    >
      <StaticSpreadPreviewInner className={props.className} />
    </EditorPreviewProvider>
  );
}
