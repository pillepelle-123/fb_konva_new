import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import PagePreview from '../../books/page-preview';
import { useEditor } from '../../../../context/editor-context';
import type { Page } from '../../../../context/editor-context';

export function PagesSubmenu({
  pages,
  activePageIndex,
  onClose,
  onPageSelect,
  onReorderPages,
  bookId,
  isRestrictedView = false
}: {
  pages: Page[];
  activePageIndex: number;
  onClose: () => void;
  onPageSelect: (page: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number, count?: number) => void;
  bookId: number;
  isRestrictedView?: boolean;
}) {
  const { state, ensurePagesLoaded } = useEditor();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const isAuthor = state.userRole === 'author';

  if (!state.currentBook) {
    return null;
  }

  const displayedIds = useMemo(() => new Set(pages.map((page) => page.id)), [pages]);
  const pairEntries = useMemo(() => {
    const entries: Array<{
      pairId: string;
      startIndex: number;
      pages: Page[];
      isLocked: boolean;
      isSpecial: boolean;
    }> = [];
    const seen = new Set<string>();
    state.currentBook!.pages.forEach((page, idx) => {
      if (!displayedIds.has(page.id)) return;
      const pairId = page.pagePairId ?? `pair-${Math.floor(idx / 2)}`;
      if (seen.has(pairId)) return;
      const pairWithIndex = state.currentBook!.pages
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
  }, [state.currentBook, displayedIds]);

  const activePageId = state.currentBook.pages[activePageIndex]?.id;
  const activePairId =
    state.currentBook.pages[activePageIndex]?.pagePairId ?? `pair-${Math.floor(activePageIndex / 2)}`;

  const handleDragStart = (e: React.DragEvent, index: number, isLocked: boolean) => {
    if (isAuthor || isLocked) {
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
    if (isAuthor || draggedIndex === null || draggedIndex === dropIndex) return;
    const movingPair = pairEntries[draggedIndex];
    const targetPair = pairEntries[dropIndex];
    if (!movingPair || !targetPair) return;
    onReorderPages(movingPair.startIndex, targetPair.startIndex, movingPair.pages.length);
    setDraggedIndex(null);
  };

  const pagesContent = (
    <div className="flex items-center flex-1 overflow-x-auto">
      <div className="flex gap-4 py-2 pr-4">
        {pairEntries.map((pair, index) => {
          const isActivePair = pair.pairId === activePairId;
          const isDragged = draggedIndex === index;
          return (
            <div key={pair.pairId} className="flex flex-col items-start min-w-[180px]">
              {pair.isSpecial && (
                <span className="text-[11px] font-semibold text-amber-600 mb-1 uppercase tracking-wide">
                  Special spread
                </span>
              )}
              <div
                className={`
                  border rounded-xl p-2 bg-white flex gap-2 transition-all min-w-[170px]
                  ${isActivePair ? 'ring-2 ring-blue-500' : 'shadow-sm'}
                  ${pair.isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-grab'}
                  ${isDragged ? 'opacity-40' : ''}
                `}
                draggable={!isAuthor && !pair.isLocked}
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
                        className="w-16 h-20 border border-dashed border-muted rounded-lg flex items-center justify-center text-[10px] text-muted-foreground bg-muted"
                      >
                        Empty
                      </div>
                    );
                  }
                  const isActivePage = page.id === activePageId;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      className="flex flex-col items-center gap-1"
                      onClick={() => {
                        const indexToLoad = state.currentBook!.pages.findIndex((p) => p.id === page.id);
                        ensurePagesLoaded(indexToLoad, indexToLoad + 1);
                        onPageSelect(page.pageNumber);
                      }}
                    >
                      <PagePreview
                        pageId={page.id}
                        pageNumber={page.pageNumber}
                        assignedUser={state.pageAssignments[page.pageNumber] || null}
                        isActive={isActivePage}
                        page={page}
                        book={state.currentBook || undefined}
                      />
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

  return (
    <div className="flex items-start w-full px-4 py-3 gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="px-2 h-8"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      {isAuthor ? pagesContent : (
        <Tooltip content="Drag and Drop to re-arrange pages" side="bottom">
          {pagesContent}
        </Tooltip>
      )}
    </div>
  );
}