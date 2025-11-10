import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { EyeOff, Loader2, RefreshCw } from 'lucide-react';

import { Modal } from '../../../ui/overlays/modal';
import { Button } from '../../../ui/primitives/button';
import { PageNavigation } from '../editor-bar/page-navigation';
import { useEditor, type Book } from '../../../../context/editor-context';

interface BookPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PreviewPage {
  pageNumber: number;
  dataUrl: string;
}

const PAGE_RENDER_DELAY_MS = 220;
const PREVIEW_PIXEL_RATIO = 0.18;
const PREVIEW_QUALITY = 0.75;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForNextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function waitForStageSettled() {
  await waitForNextFrame();
  await sleep(PAGE_RENDER_DELAY_MS);
}

function sanitizePreviewStage(stage: Konva.Stage) {
  // Remove transformers and helper visuals
  stage.find('Transformer').forEach((node) => node.destroy());

  stage
    .find('Rect')
    .filter((rect) => Array.isArray(rect.dash()) && rect.dash().length > 0)
    .forEach((rect) => rect.destroy());

  stage
    .find('Line')
    .filter((line) => Array.isArray(line.dash()) && line.dash().length > 0)
    .forEach((line) => line.destroy());
}

function getPageBoundingRect(stage: Konva.Stage) {
  const pageRect = stage
    .find('Rect')
    .find((rect) => {
      const stroke = rect.stroke?.();
      const strokeWidth = rect.strokeWidth?.();
      return stroke === '#e5e7eb' && Math.abs((strokeWidth || 0) - 11) < 0.1;
    });

  return pageRect || null;
}

function createPreviewDataUrl(stage: Konva.Stage): string | null {
  sanitizePreviewStage(stage);

  const pageRect = getPageBoundingRect(stage);

  if (!pageRect) {
    console.warn('Seitenbegrenzung für Preview nicht gefunden');
    return null;
  }

  const requiredWidth = pageRect.x() + pageRect.width();
  const requiredHeight = pageRect.y() + pageRect.height();

  if (stage.width() < requiredWidth || stage.height() < requiredHeight) {
    stage.size({
      width: Math.max(stage.width(), requiredWidth),
      height: Math.max(stage.height(), requiredHeight),
    });
    stage.draw();
  }

  const basePixelRatio = PREVIEW_PIXEL_RATIO;
  const pixelRatio = basePixelRatio;

  try {
    const dataUrl = stage.toDataURL({
      x: pageRect.x(),
      y: pageRect.y(),
      width: pageRect.width(),
      height: pageRect.height(),
      pixelRatio,
      mimeType: 'image/jpeg',
      quality: PREVIEW_QUALITY,
    });
    return dataUrl;
  } catch (error) {
    console.error('Fehler beim Generieren des Preview-Bildes', error);
    return null;
  }
}

function cloneStageForPreview(originalStage: Konva.Stage): string | null {
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.top = '-99999px';
  tempContainer.style.left = '-99999px';
  document.body.appendChild(tempContainer);

  const tempStage = new Konva.Stage({
    container: tempContainer,
    width: originalStage.width(),
    height: originalStage.height(),
    listening: false,
  });

  const layers = originalStage.getLayers();
  if (!layers?.length) {
    tempStage.destroy();
    document.body.removeChild(tempContainer);
    return null;
  }

  layers.forEach((layer) => {
    const clonedLayer = layer.clone({ listening: false });
    // Reset any filters that should not appear in preview
    clonedLayer.position({
      x: layer.x(),
      y: layer.y(),
    });
    tempStage.add(clonedLayer);
  });

  tempStage.scale({ x: 1, y: 1 });
  tempStage.position({ x: 0, y: 0 });
  tempStage.draw();

  const dataUrl = createPreviewDataUrl(tempStage);

  tempStage.destroy();
  document.body.removeChild(tempContainer);

  return dataUrl;
}

export function BookPreviewModal({ isOpen, onClose }: BookPreviewModalProps) {
  const { state, getVisiblePages, dispatch } = useEditor();
  const [previews, setPreviews] = useState<PreviewPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const abortRef = useRef(false);
  const generatingRef = useRef(false);
  const bookRef = useRef<Book | null>(state.currentBook);
  const activePageIndexRef = useRef(state.activePageIndex);

  useEffect(() => {
    bookRef.current = state.currentBook;
  }, [state.currentBook]);

  useEffect(() => {
    activePageIndexRef.current = state.activePageIndex;
  }, [state.activePageIndex]);

  const spreads = useMemo(() => {
    if (previews.length === 0) return [];
    const result: PreviewPage[][] = [];
    result.push([previews[0]]);

    for (let i = 1; i < previews.length; i += 2) {
      const spread: PreviewPage[] = [previews[i]];
      if (previews[i + 1]) {
        spread.push(previews[i + 1]);
      }
      result.push(spread);
    }

    return result;
  }, [previews]);

  useEffect(() => {
    if (currentSpreadIndex >= spreads.length) {
      setCurrentSpreadIndex(Math.max(spreads.length - 1, 0));
    }
  }, [currentSpreadIndex, spreads.length]);

  const generatePreviews = useCallback(async () => {
    if (generatingRef.current) return;

    const book = bookRef.current;
    const originalPageIndex = activePageIndexRef.current;
    if (!book) return;
    const visiblePages = getVisiblePages();

    if (!visiblePages.length) {
      setError('Keine Seiten zur Vorschau verfügbar.');
      return;
    }

    generatingRef.current = true;
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setPreviews([]);
    setCurrentSpreadIndex(0);
    abortRef.current = false;

    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });

    const previewsBuffer: PreviewPage[] = [];

    try {
      for (let i = 0; i < visiblePages.length; i++) {
        if (abortRef.current) {
          break;
        }

        const page = visiblePages[i];
        const pageIndex = book.pages.findIndex((p) => p.id === page.id);
        if (pageIndex === -1) continue;

        if (pageIndex !== activePageIndexRef.current) {
          window.dispatchEvent(new CustomEvent('changePage', { detail: pageIndex }));
          await waitForStageSettled();
        } else {
          await waitForStageSettled();
        }

        const stage = (window as any).konvaStage as Konva.Stage | undefined;

        if (!stage) {
          setError('Canvas konnte nicht gefunden werden.');
          break;
        }

        const dataUrl = cloneStageForPreview(stage);

        if (!dataUrl) {
          setError('Die Vorschau konnte nicht erstellt werden.');
          break;
        }

        previewsBuffer.push({
          pageNumber: page.pageNumber,
          dataUrl,
        });

        setPreviews([...previewsBuffer]);
        setProgress((i + 1) / visiblePages.length);
      }
    } catch (err) {
      console.error('Fehler bei der Generierung der Vorschau', err);
      setError('Beim Generieren der Vorschau ist ein Fehler aufgetreten.');
    } finally {
      if (!abortRef.current && originalPageIndex !== undefined) {
        window.dispatchEvent(new CustomEvent('changePage', { detail: originalPageIndex }));
        await waitForStageSettled();
      }

      setIsLoading(false);
      generatingRef.current = false;
    }
  }, [dispatch, getVisiblePages]);

  useEffect(() => {
    abortRef.current = false;
    if (isOpen) {
      generatePreviews();
    } else {
      abortRef.current = true;
      setPreviews([]);
      setProgress(0);
      setError(null);
      setCurrentSpreadIndex(0);
    }

    return () => {
      abortRef.current = true;
    };
  }, [isOpen, generatePreviews]);

  const handleRetry = () => {
    if (!isLoading) {
      generatePreviews();
    }
  };

  const handlePrevSpread = () => {
    setCurrentSpreadIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNextSpread = () => {
    setCurrentSpreadIndex((prev) => Math.min(prev + 1, spreads.length - 1));
  };

  const handleGoToSpread = (spreadNumber: number) => {
    setCurrentSpreadIndex(spreadNumber - 1);
  };

  const actions = (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <Button variant="outline" size="sm" onClick={handleRetry} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      )}
      <Button variant="default" size="sm" onClick={onClose}>
        Schließen
      </Button>
    </div>
  );

  const renderContent = () => {
    if (isLoading && previews.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Buchvorschau wird erstellt ({Math.round(progress * 100)}%)
          </p>
        </div>
      );
    }

    if (error && previews.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <EyeOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-md">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        </div>
      );
    }

    if (!spreads.length) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <EyeOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Keine Seiten zur Vorschau gefunden.
          </p>
        </div>
      );
    }

    const currentSpread = spreads[currentSpreadIndex] ?? [];

    return (
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-center">
          <PageNavigation
            currentPage={currentSpreadIndex + 1}
            totalPages={spreads.length}
            onPrevPage={handlePrevSpread}
            onNextPage={handleNextSpread}
            onGoToPage={handleGoToSpread}
            canGoPrev={currentSpreadIndex > 0}
            canGoNext={currentSpreadIndex < spreads.length - 1}
          />
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto">
          <div className={`flex ${currentSpread.length === 1 ? 'justify-center' : 'justify-center gap-6'} w-full`}>
            {currentSpread.map((page) => (
              <div
                key={page.pageNumber}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative overflow-hidden rounded-lg border border-border bg-white shadow-sm">
                  <img
                    src={page.dataUrl}
                    alt={`Seite ${page.pageNumber}`}
                    className="h-auto max-h-[70vh] w-full max-w-[420px] object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Seite {page.pageNumber}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Weitere Seiten werden vorbereitet...
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buchvorschau"
      actions={actions}
      closeOnBackdrop={false}
    >
      <div className="flex min-h-[400px] flex-col">
        {renderContent()}
      </div>
    </Modal>
  );
}

