import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, FileText } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Badge } from '../../../ui/composites/badge';
import ProfilePicture from '../../users/profile-picture';
// import PagePreview from '../../books/page-preview'; // Disabled but kept for future use
import { useEditor } from '../../../../context/editor-context';
import type { Page } from '../../../../context/editor-context';

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

  // Get total pages from pagination or book pages length
  const totalPages = state.pagePagination?.totalPages ?? book?.pages.length ?? 0;
  
  // Derive page metadata for all pages, even if not loaded yet
  const getPageMetadata = useMemo(() => {
    return (pageNumber: number): { pageType: Page['pageType']; pagePairId: string; isSpecial: boolean; isLocked: boolean; isNonEditable: boolean } => {
      if (pageNumber === 1) {
        return { pageType: 'back-cover', pagePairId: 'spread-cover', isSpecial: true, isLocked: false, isNonEditable: false };
      }
      if (pageNumber === 2) {
        return { pageType: 'front-cover', pagePairId: 'spread-cover', isSpecial: true, isLocked: false, isNonEditable: false };
      }
      if (pageNumber === 3) {
        return { pageType: 'inner-front', pagePairId: 'spread-intro-0', isSpecial: true, isLocked: true, isNonEditable: true };
      }
      if (pageNumber === totalPages) {
        return { pageType: 'inner-back', pagePairId: 'spread-outro-last', isSpecial: true, isLocked: true, isNonEditable: true };
      }
      // Regular content pages
      if (pageNumber === 4) {
        return { pageType: 'content', pagePairId: 'spread-intro-0', isSpecial: false, isLocked: false, isNonEditable: false };
      }
      if (pageNumber === totalPages - 1) {
        return { pageType: 'content', pagePairId: 'spread-outro-last', isSpecial: false, isLocked: false, isNonEditable: false };
      }
      // For pages 5 onwards (except last content page):
      // Page 5-6: spread-content-0, Page 7-8: spread-content-1, etc.
      const contentPageIndex = pageNumber - 4; // Page 5 -> 1, Page 6 -> 2, etc.
      const pairIndex = Math.floor((contentPageIndex - 1) / 2); // Page 5-6 -> 0, Page 7-8 -> 1, etc.
      return { pageType: 'content', pagePairId: `spread-content-${pairIndex}`, isSpecial: false, isLocked: false, isNonEditable: false };
    };
  }, [totalPages]);

  // Create pair entries based on all pages (including placeholders)
  const pairEntries = useMemo(() => {
    if (!book || totalPages === 0) return [];
    
    const entries: Array<{
      pairId: string;
      startIndex: number;
      pages: (Page | null)[];
      isLocked: boolean;
      isSpecial: boolean;
    }> = [];
    const seen = new Set<string>();
    
    // Iterate through all page numbers (1 to totalPages)
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const metadata = getPageMetadata(pageNumber);
      const pairId = metadata.pagePairId;
      
      if (seen.has(pairId)) continue;
      seen.add(pairId);
      
      // Find all pages in this pair (by pageNumber)
      const pairPageNumbers: number[] = [];
      for (let pn = 1; pn <= totalPages; pn++) {
        const pnMetadata = getPageMetadata(pn);
        if (pnMetadata.pagePairId === pairId) {
          pairPageNumbers.push(pn);
        }
      }
      
      // Get actual page objects or create placeholders
      const pairPages: (Page | null)[] = pairPageNumbers.map((pn) => {
        const actualPage = book.pages.find(p => p.pageNumber === pn);
        if (actualPage) {
          return actualPage;
        }
        // Create placeholder page with metadata
        const metadata = getPageMetadata(pn);
        return {
          id: -pn, // Use negative number for placeholder IDs (consistent with createPlaceholderPage)
          pageNumber: pn,
          elements: [],
          pageType: metadata.pageType,
          pagePairId: metadata.pagePairId,
          isSpecialPage: metadata.isSpecial,
          isLocked: metadata.isNonEditable, // Only non-editable pages should be locked
          isPrintable: true,
          isPlaceholder: true,
        } as Page;
      });
      
      const startIndex = pairPageNumbers[0] - 1; // Convert to 0-based index
      // A pair is locked/non-editable only if it contains a non-editable page (page 3 or last page)
      const isPairNonEditable = pairPages.some((p) => {
        if (!p) return false;
        const metadata = getPageMetadata(p.pageNumber);
        return metadata.isNonEditable;
      });
      entries.push({
        pairId,
        startIndex,
        pages: pairPages,
        isLocked: isPairNonEditable, // Only true for pairs containing page 3 or last page
        isSpecial: pairPages.some((p) => p?.isSpecialPage ?? false)
      });
    }
    
    return entries;
  }, [book, totalPages, getPageMetadata]);

  if (!book) {
    return null;
  }

  const isAuthor = state.userRole === 'author';
  const canReorderPages = !isAuthor && !isRestrictedView && !isCompact && !isMicro;
  const activePageFromBook = book.pages[activePageIndex];
  const activePageFallback = pages[activePageIndex];
  const activePage = activePageFromBook ?? activePageFallback ?? null;
  const activePageId = activePage?.id ?? null;
  const activePageNumber = activePage?.pageNumber ?? (activePageIndex >= 0 ? activePageIndex + 1 : null);
  // Get pairId from metadata if page is not loaded yet
  const fallbackPairId = activePageNumber ? getPageMetadata(activePageNumber).pagePairId : null;
  const activePairId = activePage?.pagePairId ?? fallbackPairId;

  // Only Inner Front (page 3) and Inner Back (last page) are non-editable
  const isNonEditablePageNumber = (pageNumber: number) => {
    const metadata = getPageMetadata(pageNumber);
    return metadata.pageType === 'inner-front' || metadata.pageType === 'inner-back';
  };

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
    targetRef: React.RefObject<HTMLDivElement | null>,
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

          return (
            <div
              key={pair.pairId}
              className={`flex flex-col ${isCompact ? 'items-center min-w-[130px]' : 'items-start min-w-[180px]'}`}
            >
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
                  const isActivePage = !page.isPlaceholder && page.id === activePageId;
                  const isNonEditable = isNonEditablePageNumber(page.pageNumber);
                  const assignedUser = state.pageAssignments[page.pageNumber] || null;
                  const isPlaceholder = page.isPlaceholder ?? false;
                  
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
                              if (isPlaceholder) {
                                // Load the page if it's a placeholder
                                const pageIndex = page.pageNumber - 1; // Convert to 0-based
                                ensurePagesLoaded(pageIndex, pageIndex + 1);
                              } else {
                                const indexToLoad = book.pages.findIndex((p) => p.id === page.id);
                                if (indexToLoad >= 0) {
                                  ensurePagesLoaded(indexToLoad, indexToLoad + 1);
                                }
                              }
                              onPageSelect(page.pageNumber);
                            }
                      }
                    >
                      {/* Disabled PagePreview - showing simple placeholder instead */}
                      <div
                        className={`${
                          isCompact ? 'w-12 h-16' : 'w-16 h-20'
                        } bg-muted border-2 ${isActivePage ? 'border-ring' : 'border-border'} rounded-lg flex items-center justify-center relative overflow-visible`}
                      >
                        {isPlaceholder ? (
                          <FileText className={`${isCompact ? 'h-5 w-5' : 'h-6 w-6'} text-muted-foreground`} />
                        ) : (
                          <FileText className={`${isCompact ? 'h-5 w-5' : 'h-6 w-6'} text-muted-foreground`} />
                        )}
                        
                        {/* Profile picture badge at top-right */}
                        {assignedUser && (
                          <div className={`absolute ${isCompact ? 'w-6 h-6 -top-2.5 -right-2' : 'w-8 h-8 -top-3 -right-2'} rounded-full`}>
                            <ProfilePicture
                              name={assignedUser.name}
                              size={isCompact ? 'xs' : 'sm'}
                              userId={assignedUser.id}
                              className="w-full h-full"
                              variant="withColoredBorder"
                            />
                          </div>
                        )}
                        
                        {/* Page number badge at bottom center */}
                        <Badge 
                          variant="secondary" 
                          className={`${isCompact ? 'h-4 w-4 text-[10px] -bottom-1.5' : 'h-5 w-5 text-xs -bottom-2'} absolute left-1/2 transform -translate-x-1/2 border bg-white text-primary border-border p-1 flex items-center justify-center`}
                        >
                          {page.pageNumber}
                        </Badge>
                      </div>
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
              const isActivePage = !page.isPlaceholder && page.id === activePageId;
              const isNonEditable = isNonEditablePageNumber(page.pageNumber);
              const isPlaceholder = page.isPlaceholder ?? false;
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
                          if (isPlaceholder) {
                            // Load the page if it's a placeholder
                            const pageIndex = page.pageNumber - 1; // Convert to 0-based
                            ensurePagesLoaded(pageIndex, pageIndex + 1);
                          } else {
                            const indexToLoad = book.pages.findIndex((p) => p.id === page.id);
                            if (indexToLoad >= 0) {
                              ensurePagesLoaded(indexToLoad, indexToLoad + 1);
                            }
                          }
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