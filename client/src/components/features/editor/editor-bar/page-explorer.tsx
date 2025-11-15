import { useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Tooltip } from '../../../ui/composites/tooltip';
import PagePreview from '../../books/page-preview';
import { useEditor } from '../../../../context/editor-context';
import type { Page } from '../../../../context/editor-context';
import { getLayoutVariationLabel, getBackgroundVariationLabel } from '../../../../utils/layout-variation-labels';

type PagesSubmenuProps = {
  pages: Page[];
  activePageIndex: number;
  onClose?: () => void;
  onPageSelect: (page: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number, count?: number) => void;
  bookId: number | string;
  isRestrictedView?: boolean;
  viewMode?: 'default' | 'compact' | 'micro';
  showHeader?: boolean;
  compactLabelMode?: 'default' | 'minimal';
};

export function PagesSubmenu({
  pages,
  activePageIndex,
  onClose,
  onPageSelect,
  onReorderPages,
  bookId,
  isRestrictedView = false,
  viewMode = 'default',
  showHeader = true,
  compactLabelMode = 'default'
}: PagesSubmenuProps) {
  const { state, ensurePagesLoaded } = useEditor();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const microScrollRef = useRef<HTMLDivElement | null>(null);
  const book = state.currentBook;
  const isCompact = viewMode === 'compact';
  const isMicro = viewMode === 'micro';

  const displayedIds = useMemo(() => new Set(pages.map((page) => page.id)), [pages]);
  const pairEntries = useMemo(() => {
    if (!book) return [];
    const entries: Array<{
      pairId: string;
      startIndex: number;
      pages: Page[];
      isLocked: boolean;
      isSpecial: boolean;
    }> = [];
    const seen = new Set<string>();
    book.pages.forEach((page, idx) => {
      if (!displayedIds.has(page.id)) return;
      const pairId = page.pagePairId ?? `pair-${Math.floor(idx / 2)}`;
      if (seen.has(pairId)) return;
      const pairWithIndex = book.pages
        .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
        .filter(({ candidate, candidateIndex }) => (candidate.pagePairId ?? `pair-${Math.floor(candidateIndex / 2)}`) === pairId)
        .sort((a, b) => a.candidateIndex - b.candidateIndex);
      const pairPages = pairWithIndex.map(({ candidate }) => candidate);
      const startIndex = pairWithIndex[0]?.candidateIndex ?? idx;
      seen.add(pairId);
      entries.push({
        pairId,
        startIndex,
        pages: pairPages,
        isLocked: pairPages.some((entry) => entry.isLocked),
        isSpecial: pairPages.some((entry) => entry.isSpecialPage)
      });
    });
    return entries;
  }, [book, displayedIds]);

  if (!book) {
    return null;
  }

  const isAuthor = state.userRole === 'author';
  const canReorderPages = !isAuthor && !isRestrictedView && !isCompact && !isMicro;
  const activePageFromBook = book.pages[activePageIndex];
  const activePageFallback = pages[activePageIndex];
  const activePage = activePageFromBook ?? activePageFallback ?? null;
  const activePageId = activePage?.id ?? null;
  const fallbackPairId =
    activePageIndex >= 0 ? book.pages[activePageIndex]?.pagePairId ?? `pair-${Math.floor(activePageIndex / 2)}` : null;
  const activePairId = activePage?.pagePairId ?? fallbackPairId;

  const totalPages = book.pages.length;
  const isNonEditablePageNumber = (pageNumber: number) => pageNumber === 3 || pageNumber === totalPages;

  const handleDragStart = (e: React.DragEvent, index: number, isLocked: boolean) => {
    if (!canReorderPages || isLocked) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!canReorderPages || draggedIndex === null || draggedIndex === dropIndex) return;
    const movingPair = pairEntries[draggedIndex];
    const targetPair = pairEntries[dropIndex];
    if (!movingPair || !targetPair) return;
    onReorderPages(movingPair.startIndex, targetPair.startIndex, movingPair.pages.length);
    setDraggedIndex(null);
  };

  const handleWheelScroll = (
    event: React.WheelEvent<HTMLDivElement>,
    targetRef: React.RefObject<HTMLDivElement>,
  ) => {
    if (!targetRef.current) return;
    const { deltaY, deltaX } = event;
    // Only hijack primarily vertical wheel gestures
    if (Math.abs(deltaY) <= Math.abs(deltaX)) return;
    event.preventDefault();
    targetRef.current.scrollLeft += deltaY;
  };

  const scrollableContent = (
    <div
      ref={scrollContainerRef}
      onWheel={(event) => handleWheelScroll(event, scrollContainerRef)}
      className={`flex items-center flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin ${isCompact ? 'py-1' : 'pb-1'}`}
    >
      <div className={`flex ${isCompact ? 'gap-3 py-1 pr-2' : 'gap-4 py-2 pr-4'}`}>
        {pairEntries.map((pair, index) => {
          const isActivePair = activePairId ? pair.pairId === activePairId : false;
          const isDragged = draggedIndex === index;
          const variationChips = pair.pages.flatMap((page, slotIndex) => {
            if (!page || isCompact) return [];
            const chips = [];
            const layoutLabel = getLayoutVariationLabel(page.layoutVariation);
            if (layoutLabel) {
              chips.push(
                <span
                  key={`${pair.pairId}-${slotIndex}-layout`}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-medium"
                >
                  {slotIndex === 0 ? 'L' : 'R'} · {layoutLabel}
                </span>
              );
            }
            const backgroundLabel = getBackgroundVariationLabel(page.backgroundVariation);
            if (backgroundLabel) {
              chips.push(
                <span
                  key={`${pair.pairId}-${slotIndex}-background`}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 font-medium"
                >
                  {slotIndex === 0 ? 'L' : 'R'} · {backgroundLabel}
                </span>
              );
            }
            return chips;
          });

          return (
            <div
              key={pair.pairId}
              className={`flex flex-col ${isCompact ? 'items-center min-w-[130px]' : 'items-start min-w-[180px]'}`}
            >
              {!isCompact && pair.isSpecial && (
                <span className="text-[11px] font-semibold text-amber-600 mb-1 uppercase tracking-wide">
                  Special spread
                </span>
              )}
              {!isCompact && variationChips.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">{variationChips}</div>
              )}
              <div
                className={`
                  border rounded-xl p-2 bg-white flex gap-2 transition-all
                  ${isCompact ? 'min-w-[120px]' : 'min-w-[170px]'}
                  ${isActivePair ? 'ring-2 ring-blue-500' : 'shadow-sm'}
                  ${!isCompact && pair.isLocked ? 'opacity-60 cursor-not-allowed' : isCompact ? 'cursor-default' : 'cursor-grab'}
                  ${isDragged ? 'opacity-40' : ''}
                `}
                draggable={canReorderPages && !pair.isLocked}
                onDragStart={(e) => handleDragStart(e, index, pair.isLocked)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                {Array.from({ length: Math.max(pair.pages.length, 2) }).map((_, slotIndex) => {
                  const page = pair.pages[slotIndex];
                  if (!page) {
                    return (
                      <div
                        key={`placeholder-${slotIndex}`}
                        className={`${
                          isCompact ? 'w-12 h-16 text-[9px]' : 'w-16 h-20 text-[10px]'
                        } border border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground bg-muted`}
                      >
                        Empty
                      </div>
                    );
                  }
                  const isActivePage = page.id === activePageId;
                  const isNonEditable = isNonEditablePageNumber(page.pageNumber);
                  return (
                    <button
                      key={page.id}
                      type="button"
                      className="flex flex-col items-center gap-1"
                      disabled={isNonEditable}
                      onClick={
                        isNonEditable
                          ? undefined
                          : () => {
                              const indexToLoad = book.pages.findIndex((p) => p.id === page.id);
                              ensurePagesLoaded(indexToLoad, indexToLoad + 1);
                              onPageSelect(page.pageNumber);
                            }
                      }
                    >
                      <PagePreview
                        pageId={page.id}
                        pageNumber={page.pageNumber}
                        assignedUser={state.pageAssignments[page.pageNumber] || null}
                        isActive={isActivePage}
                        page={page}
                        book={book}
                        variant={isCompact ? 'compact' : 'default'}
                      />
                      {isCompact && compactLabelMode === 'default' && (
                        <span className="text-[10px] text-muted-foreground font-medium">Page {page.pageNumber}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const microContent = (
    <div
      ref={microScrollRef}
      onWheel={(event) => handleWheelScroll(event, microScrollRef)}
      className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin"
    >
      {pairEntries.map((pair) => (
        <div key={pair.pairId} className="flex-shrink-0">
          <ButtonGroup>
            {pair.pages.map((page, index) => {
              if (!page) {
                return (
                  <Button key={`placeholder-${pair.pairId}-${index}`} variant="outline" size="xs" className="h-8 w-8 p-0" disabled>
                    -
                  </Button>
                );
              }
              const isActivePage = page.id === activePageId;
              const isNonEditable = isNonEditablePageNumber(page.pageNumber);
              return (
                <Button
                  key={page.id}
                  variant="outline"
                  size="xs"
                  className={`h-7 w-7 p-0 text-xs ${isActivePage ? 'bg-primary/10 border-primary text-primary' : ''}`}
                  disabled={isNonEditable}
                  onClick={
                    isNonEditable
                      ? undefined
                      : () => {
                          const indexToLoad = book.pages.findIndex((p) => p.id === page.id);
                          ensurePagesLoaded(indexToLoad, indexToLoad + 1);
                          onPageSelect(page.pageNumber);
                        }
                  }
                >
                  {page.pageNumber}
                </Button>
              );
            })}
          </ButtonGroup>
        </div>
      ))}
    </div>
  );

  const content = isMicro
    ? microContent
    : canReorderPages && !isCompact
      ? (
        <Tooltip content="Drag and drop to re-arrange pages" side="bottom">
          {scrollableContent}
        </Tooltip>
      )
      : scrollableContent;

  if (!showHeader) {
    return (
      <div
        className={`${isCompact || isMicro ? 'px-2 py-1' : 'px-4 py-2'} w-full`}
        data-book-id={bookId}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-start w-full px-4 py-3 gap-4" data-book-id={bookId}>
      {onClose && (
        <Button variant="ghost" size="sm" onClick={onClose} className="px-2 h-8">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}
      {content}
    </div>
  );
}