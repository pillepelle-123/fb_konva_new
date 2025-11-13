import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import PagePreview from '../../books/page-preview';
import { useEditor } from '../../../../context/editor-context';

const ITEM_WIDTH = 72;
const ITEM_HEIGHT = 116;
const ITEM_SPACING = 12;
const VIRTUAL_BUFFER = 4;

export function PagesSubmenu({ pages, activePageIndex, onClose, onPageSelect, onReorderPages, bookId, isRestrictedView = false }: {
  pages: any[];
  activePageIndex: number;
  onClose: () => void;
  onPageSelect: (page: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  bookId: number;
  isRestrictedView?: boolean;
}) {
  const { state, ensurePagesLoaded } = useEditor();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const isAuthor = state.userRole === 'author';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [virtualRange, setVirtualRange] = useState<{ start: number; end: number }>(() => ({
    start: 0,
    end: Math.min(pages.length, 12)
  }));

  const itemFullWidth = ITEM_WIDTH + ITEM_SPACING;

  const calculateRange = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      const fallbackVisible = 8;
      return {
        start: 0,
        end: Math.min(pages.length, fallbackVisible)
      };
    }

    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth || 1;
    const estimatedStart = Math.floor(scrollLeft / itemFullWidth);
    const visibleCount = Math.ceil(containerWidth / itemFullWidth);
    const start = Math.max(0, estimatedStart - VIRTUAL_BUFFER);
    const end = Math.min(pages.length, start + visibleCount + VIRTUAL_BUFFER * 2);
    return { start, end };
  }, [itemFullWidth, pages.length]);

  const updateRange = useCallback(() => {
    const nextRange = calculateRange();
    setVirtualRange((prev) =>
      prev.start === nextRange.start && prev.end === nextRange.end ? prev : nextRange
    );
  }, [calculateRange]);

  useEffect(() => {
    updateRange();
  }, [pages.length, updateRange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateRange();
    const handleResize = () => updateRange();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => updateRange());
      resizeObserver.observe(container);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [updateRange]);

  const virtualPages = useMemo(
    () => pages.slice(virtualRange.start, virtualRange.end),
    [pages, virtualRange]
  );

  useEffect(() => {
    if (!state.currentBook || isRestrictedView || !virtualPages.length) return;
    const globalIndexes = virtualPages
      .map((page) => state.currentBook!.pages.findIndex((p) => p.id === page.id))
      .filter((index) => index !== undefined && index >= 0) as number[];
    if (!globalIndexes.length) return;

    const totalPageCount = state.pagePagination?.totalPages ?? state.currentBook.pages.length;
    const start = Math.max(0, Math.min(...globalIndexes) - VIRTUAL_BUFFER);
    const end = Math.min(totalPageCount, Math.max(...globalIndexes) + 1 + VIRTUAL_BUFFER);
    ensurePagesLoaded(start, end);
  }, [virtualPages, state.currentBook, state.pagePagination, ensurePagesLoaded, isRestrictedView]);

  if (!state.currentBook) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isAuthor) {
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
    
    onReorderPages(draggedIndex, dropIndex);
    
    // Update active page to follow the moved page
    let newActiveIndex = activePageIndex;
    if (activePageIndex === draggedIndex) {
      // User was on the dragged page, follow it to new position
      newActiveIndex = dropIndex;
    } else if (activePageIndex > draggedIndex && activePageIndex <= dropIndex) {
      // Active page shifts left
      newActiveIndex = activePageIndex - 1;
    } else if (activePageIndex < draggedIndex && activePageIndex >= dropIndex) {
      // Active page shifts right
      newActiveIndex = activePageIndex + 1;
    }
    
    if (newActiveIndex !== activePageIndex) {
      onPageSelect(newActiveIndex + 1);
    }
    
    setDraggedIndex(null);
  };

  const pagesContent = (
    <div className="flex items-center flex-1 overflow-x-auto" ref={scrollContainerRef}>
      <div
        className="relative"
        style={{
          height: ITEM_HEIGHT,
          width: Math.max(pages.length * itemFullWidth, itemFullWidth * 6)
        }}
      >
        {virtualPages.map((page, index) => {
          const globalIndex = state.currentBook.pages.findIndex((p) => p.id === page.id);
          const actualIndex = globalIndex >= 0 ? globalIndex : virtualRange.start + index;
          const left = actualIndex * itemFullWidth;
          const pageNumber = isRestrictedView ? actualIndex + 1 : page.pageNumber;
          const isActivePage = actualIndex === activePageIndex;
          const isDragged = draggedIndex === actualIndex;

          return (
            <div
              key={page.id ?? `page-${actualIndex}`}
              style={{
                position: 'absolute',
                top: 0,
                left,
                width: ITEM_WIDTH,
                marginRight: ITEM_SPACING
              }}
              draggable={!isAuthor}
              onDragStart={(e) => handleDragStart(e, actualIndex)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, actualIndex)}
              className={`
                cursor-pointer transition-all duration-200
                ${isActivePage ? 'shadow-lg' : ''}
                ${isDragged ? 'opacity-50' : ''}
                ${isAuthor ? 'cursor-default' : ''}
              `}
              onClick={() => {
                ensurePagesLoaded(actualIndex, actualIndex + 1);
                onPageSelect(pageNumber);
              }}
            >
              <PagePreview 
                pageId={page.id} 
                pageNumber={pageNumber}
                assignedUser={state.pageAssignments[page.pageNumber] || null}
                isActive={isActivePage}
                page={page}
                book={state.currentBook || undefined}
              />
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