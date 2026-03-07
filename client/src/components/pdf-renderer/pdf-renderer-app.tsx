import React, { useEffect, useState } from 'react';
import type { Page, Book } from '../../context/editor-context.tsx';
import { PDFExportAuthProvider } from './pdf-export-auth-provider';
import { PDFExportEditorProvider } from './pdf-export-editor-provider';
import { PDFRenderer } from './pdf-renderer';
import {
  getBackgroundImageWithUrl,
  loadBackgroundImageRegistry,
  loadBackgroundImageSvg,
  rebuildDerivedState,
  normalizeBackgroundImageRecord,
} from '../../data/templates/background-images';
import { setColorPalettesData } from '../../data/templates/templates-data';

interface PDFRendererAppProps {
  pageData: {
    page: Page;
    book: Book;
    canvasWidth: number;
    canvasHeight: number;
    scale?: number;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  token?: string | null;
  onRenderComplete?: (imageDataUrl: string) => void;
}

// Error Boundary Component
class PDFRendererErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PDFRendererErrorBoundary] Error caught:', error);
    console.error('[PDFRendererErrorBoundary] Error info:', errorInfo);
    console.error('[PDFRendererErrorBoundary] Component stack:', errorInfo.componentStack);
    // Store error globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).renderError = error.message || String(error);
      (window as any).reactError = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };
    }
  }

  render() {
    if (this.state.hasError) {
      console.error('[PDFRendererErrorBoundary] Rendering error fallback');
      return null; // Return null to avoid breaking the render
    }

    return this.props.children;
  }
}

export function PDFRendererApp({
  pageData,
  user = null,
  token = null,
  onRenderComplete,
}: PDFRendererAppProps) {
  const [assetsReady, setAssetsReady] = useState(false);

  // Set palette data for other consumers (e.g. getPalettePartColor)
  const bookPalettes = (pageData.book as any).colorPalettes;
  if (Array.isArray(bookPalettes) && bookPalettes.length > 0) {
    setColorPalettesData(bookPalettes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // If server has embedded backgroundImages in bookData, use those directly
        // to avoid API call and ensure palette metadata is available
        const embeddedBackgroundImages = (pageData.book as any).backgroundImages;
        if (Array.isArray(embeddedBackgroundImages) && embeddedBackgroundImages.length > 0) {
          const normalizedEmbeddedImages = embeddedBackgroundImages
            .map((entry: unknown) => normalizeBackgroundImageRecord(entry))
            .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

          if (normalizedEmbeddedImages.length > 0) {
            console.log('[PDFRendererApp] Using normalized embedded background images from server:', normalizedEmbeddedImages.length);
            rebuildDerivedState(normalizedEmbeddedImages);
          } else {
            console.warn('[PDFRendererApp] Embedded background images could not be normalized, falling back to API load');
            await loadBackgroundImageRegistry();
          }
        } else {
          console.log('[PDFRendererApp] Loading background images from API');
          await loadBackgroundImageRegistry();
        }

        // PDF export is single-pass: preload current vector background SVG so
        // palette coloring can run immediately during first render.
        const background = pageData.page.background;
        if (
          background?.type === 'image' &&
          background.applyPalette !== false &&
          background.backgroundImageId
        ) {
          const template = getBackgroundImageWithUrl(background.backgroundImageId);
          if (template?.format === 'vector' && template.filePath && template.url) {
            try {
              await loadBackgroundImageSvg(template.filePath, template.url);
              console.log('[PDFRendererApp] Preloaded vector SVG for palette rendering:', {
                id: template.id,
                filePath: template.filePath,
              });
            } catch (svgError) {
              console.warn('[PDFRendererApp] Failed to preload vector SVG, palette may fallback to original colors:', svgError);
            }
          }
        }
      } catch (err) {
        console.error('[PDFRendererApp] Failed to load background images registry:', err);
      } finally {
        if (!cancelled) setAssetsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!assetsReady) {
    return null;
  }

  // Resolve palette colors for background image (from server-embedded bookData)
  const pagePaletteId = pageData.page.colorPaletteId ?? pageData.book.colorPaletteId;
  const paletteForPage = pagePaletteId && Array.isArray(bookPalettes)
    ? bookPalettes.find((p: { id: string | number }) => p.id == pagePaletteId || String(p.id) === String(pagePaletteId))
    : bookPalettes?.[0];
  const paletteColorsForBackground = paletteForPage?.colors;

  if (pageData.page.background?.type === 'image') {
    console.log('[PDF Debug] Background image palette resolution:', {
      hasBookPalettes: Array.isArray(bookPalettes),
      bookPalettesCount: bookPalettes?.length ?? 0,
      pagePaletteId,
      paletteForPage: paletteForPage ? { id: paletteForPage.id, name: (paletteForPage as any).name } : null,
      hasPaletteColorsForBackground: !!paletteColorsForBackground,
      paletteColorsKeys: paletteColorsForBackground ? Object.keys(paletteColorsForBackground) : [],
      backgroundApplyPalette: pageData.page.background.applyPalette,
      backgroundValuePrefix: pageData.page.background.value?.substring(0, 50),
    });
  }

  return (
    <PDFRendererErrorBoundary>
      <PDFExportAuthProvider user={user} token={token}>
        <PDFExportEditorProvider bookData={pageData.book}>
          <PDFRenderer
            page={pageData.page}
            bookData={pageData.book}
            paletteColorsForBackground={paletteColorsForBackground}
            width={pageData.canvasWidth}
            height={pageData.canvasHeight}
            scale={pageData.scale}
          />
        </PDFExportEditorProvider>
      </PDFExportAuthProvider>
    </PDFRendererErrorBoundary>
  );
}

