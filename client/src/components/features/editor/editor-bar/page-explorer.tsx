import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, FileText, Plus } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Badge } from '../../../ui/composites/badge';
import ProfilePicture from '../../users/profile-picture';
// import PagePreview from '../../books/page-preview'; // Disabled but kept for future use
import { useEditor } from '../../../../context/editor-context';
import { computePageMetadataEntry, calculatePagePairId } from '../../../../utils/book-structure';
import { getConsistentColor } from '../../../../utils/consistent-color';
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
  onShowAddPageDialog?: (insertionIndex: number) => void;
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
  compactLabelMode = 'default',
  onShowAddPageDialog
}: PagesSubmenuProps) {
  const { state, ensurePagesLoaded, getPageMetadata: resolvePageMetadata, canEditBookSettings } = useEditor();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddButton, setShowAddButton] = useState(false);
  const [addButtonPosition, setAddButtonPosition] = useState<number | null>(null);
  const [pendingInsertionIndex, setPendingInsertionIndex] = useState<number | null>(null);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const microScrollRef = useRef<HTMLDivElement | null>(null);
  const book = state.currentBook;
  const isCompact = viewMode === 'compact';
  const isMicro = viewMode === 'micro';

  // Get total pages from pagination (most accurate, comes from database)
  // Fallback to max page number from loaded pages, then to book pages length
  // Note: book?.pages.length only contains loaded pages, not the total count
  // CRITICAL: Always prioritize pagePagination.totalPages as it comes from the database
  const maxPageNumberFromBook = book?.pages.length ? Math.max(...book.pages.map(p => p.pageNumber ?? 0), 0) : 0;
  const fallbackTotalPages = maxPageNumberFromBook || (book?.pages.length ?? 0);
  const totalPages = state.pagePagination?.totalPages ?? fallbackTotalPages;
  const pagesByNumber = useMemo(() => {
    const map = new Map<number, Page>();
    book?.pages.forEach((page) => {
      if (page.pageNumber) {
        map.set(page.pageNumber, page);
      }
    });
    return map;
  }, [book?.pages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideButtonTimeoutRef.current) {
        clearTimeout(hideButtonTimeoutRef.current);
      }
    };
  }, []);

  // Create pair entries based on all pages (including placeholders)
  const pairEntries = useMemo(() => {
    if (!book || totalPages === 0) return [];
    
    // Group pages by their pagePairId from database, with fallback to calculated ID
    const pairIdMap = new Map<string, number[]>();
    
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = pagesByNumber.get(pageNumber);
      
      // Use pagePairId from database if available, otherwise calculate it
      const pairId = page?.pagePairId || calculatePagePairId(pageNumber, totalPages, page?.pageType);
      
      if (!pairIdMap.has(pairId)) {
        pairIdMap.set(pairId, []);
      }
      pairIdMap.get(pairId)!.push(pageNumber);
    }

    // Convert to entries array, sorted by the first page number in each pair
    const entries: Array<{
      pairId: string;
      startIndex: number;
      pages: (Page | null)[];
      isLocked: boolean;
      isSpecial: boolean;
    }> = [];

    // Convert map to array and sort by the minimum page number in each pair
    // CRITICAL: Sort by minPageNumber to ensure correct order, especially for last pages
    const sortedPairs = Array.from(pairIdMap.entries()).map(([pairId, pairPageNumbers]) => {
      // Sort page numbers within the pair to ensure correct order
      pairPageNumbers.sort((a, b) => a - b);
      const minPageNumber = Math.min(...pairPageNumbers);
      return { pairId, pairPageNumbers, minPageNumber };
    }).sort((a, b) => {
      // CRITICAL: Ensure 'pair-outro-last' ALWAYS comes last, regardless of page numbers
      // This is the most important sorting rule
      if (a.pairId === 'pair-outro-last' && b.pairId !== 'pair-outro-last') {
        return 1; // a (pair-outro-last) comes after b
      }
      if (b.pairId === 'pair-outro-last' && a.pairId !== 'pair-outro-last') {
        return -1; // b (pair-outro-last) comes after a
      }
      // For all other pairs, sort by minPageNumber
      return a.minPageNumber - b.minPageNumber;
    });

    for (const { pairId, pairPageNumbers } of sortedPairs) {
      const pairPages: (Page | null)[] = pairPageNumbers.map((pn) => {
        const actualPage = pagesByNumber.get(pn) ?? null;
        if (actualPage) {
          // For loaded pages, ensure pagePairId matches the computed pairId
          // This fixes cases where pagePairId from database might be incorrect
          if (actualPage.pagePairId !== pairId) {
            return {
              ...actualPage,
              pagePairId: pairId,
            };
          }
          return actualPage;
        }
        const metadata = computePageMetadataEntry(pn, totalPages);
        return {
          id: -pn, // Use negative number for placeholder IDs (consistent with createPlaceholderPage)
          pageNumber: pn,
          elements: [],
          pageType: metadata?.pageType,
          pagePairId: pairId, // Use the pairId from grouping
          isSpecialPage: metadata?.isSpecial ?? false,
          isLocked: metadata ? !metadata.isEditable : false,
          isPrintable: true,
          isPlaceholder: true,
        } as Page;
      });
      const startIndex = pairPageNumbers[0] - 1; // Convert to 0-based index
      const isPairNonEditable = pairPages.some((p) => {
        if (!p) return false;
        const metadata = computePageMetadataEntry(p.pageNumber ?? 0, totalPages, p);
        return !(metadata?.isEditable ?? true);
      });
      entries.push({
        pairId,
        startIndex,
        pages: pairPages,
        isLocked: isPairNonEditable, // Only true for pairs containing page 3 or last page
        isSpecial: pairPages.some((p) => p?.isSpecialPage ?? false)
      });
    }
    // Sort entries by startIndex to ensure correct order
    return entries.sort((a, b) => a.startIndex - b.startIndex);
  }, [book, totalPages, pagesByNumber]);


  if (!book) {
    return null;
  }

  const canReorderPages = canEditBookSettings() && !isRestrictedView && !isCompact && !isMicro;
  const activePageFromBook = book.pages[activePageIndex];
  const activePageFallback = pages[activePageIndex];
  const activePage = activePageFromBook ?? activePageFallback ?? null;
  const activePageId = activePage?.id ?? null;
  const activePageNumber = activePage?.pageNumber ?? (activePageIndex >= 0 ? activePageIndex + 1 : null);
  // Get pairId from metadata if page is not loaded yet
  const fallbackPairId = activePageNumber ? resolvePageMetadata(activePageNumber)?.pagePairId ?? null : null;
  const activePairId = activePage?.pagePairId ?? fallbackPairId;

  // Only Inner Front (page 3) and Inner Back (last page) are non-editable
  const isNonEditablePageNumber = (pageNumber: number) => {
    const lastPageNumber =
      state.pagePagination?.totalPages ??
      (book?.pages.length ? Math.max(...book.pages.map((p) => p.pageNumber ?? 0)) : totalPages);
    return pageNumber === 3 || (lastPageNumber > 0 && pageNumber === lastPageNumber);
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
    event: WheelEvent,
    targetRef: React.RefObject<HTMLDivElement | null>,
  ) => {
    if (!targetRef.current) return;
    const { deltaY } = event;
    
    // This function is only called for pure vertical gestures (deltaX === 0, deltaY !== 0)
    // Check if the container can actually scroll horizontally
    const container = targetRef.current;
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) {
      // If container can't scroll, don't prevent default
      return;
    }
    
    // Convert vertical wheel to horizontal scroll
    event.preventDefault();
    container.scrollLeft += deltaY;
  };

  // Set up wheel event listeners with passive: false to allow preventDefault
  // Only register for the container that's actually being used based on viewMode
  // IMPORTANT: Only intercept pure vertical wheel gestures, let horizontal scrolling work normally
  useEffect(() => {
    if (isMicro) {
      // For micro view, only register on microScrollRef
      const microScrollContainer = microScrollRef.current;
      if (!microScrollContainer) return;

      const wheelHandler = (e: WheelEvent) => {
        // CRITICAL: If there's ANY horizontal component, do NOTHING - let browser handle it
        if (Math.abs(e.deltaX) > 0) {
          return; // Let horizontal scrolling work normally
        }
        
        // Only handle pure vertical wheel gestures (deltaX === 0, deltaY !== 0)
        if (Math.abs(e.deltaY) > 0) {
          handleWheelScroll(e, microScrollRef);
        }
      };
      microScrollContainer.addEventListener('wheel', wheelHandler, { passive: false });

      return () => {
        microScrollContainer.removeEventListener('wheel', wheelHandler);
      };
    } else {
      // For default/compact view, only register on scrollContainerRef
      // TEMPORARILY DISABLED: Test if horizontal scrolling works without this listener
      // If horizontal scrolling works, we can re-enable with better logic
      /*
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      const wheelHandler = (e: WheelEvent) => {
        // CRITICAL: If there's ANY horizontal component, do NOTHING - let browser handle it
        // This ensures trackpad horizontal scrolling and shift+wheel work correctly
        if (Math.abs(e.deltaX) > 0) {
          return; // Let horizontal scrolling work normally - don't interfere
        }
        
        // Only handle pure vertical wheel gestures (deltaX === 0, deltaY !== 0)
        // Convert vertical mouse wheel to horizontal scroll
        if (Math.abs(e.deltaY) > 0) {
          handleWheelScroll(e, scrollContainerRef);
        }
      };
      scrollContainer.addEventListener('wheel', wheelHandler, { passive: false });

      return () => {
        scrollContainer.removeEventListener('wheel', wheelHandler);
      };
      */
    }
  }, [isMicro]);

  const scrollableContent = (
    <div
      ref={scrollContainerRef}
      className={`flex items-center w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-thin ${isCompact ? 'py-1' : 'pb-1'}`}
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
      className="flex overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin relative"
      onMouseLeave={() => {
        // Delay hiding when leaving the container
        hideButtonTimeoutRef.current = setTimeout(() => {
          setShowAddButton(false);
          setAddButtonPosition(null);
          setPendingInsertionIndex(null);
        }, 100);
      }}
    >
      {pairEntries.map((pair, pairIndex) => (
        <div key={pair.pairId} className="flex items-center">
          {/* Invisible spacer that triggers add button */}
          {pairIndex > 0 && (
            <div
              className="w-4 h-8 flex-shrink-0"
              onMouseEnter={canEditBookSettings() ? (e) => {
                // Clear any pending hide timeout
                if (hideButtonTimeoutRef.current) {
                  clearTimeout(hideButtonTimeoutRef.current);
                  hideButtonTimeoutRef.current = null;
                }

                const rect = e.currentTarget.getBoundingClientRect();
                const containerRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                if (containerRect) {
                  const relativeLeft = rect.left - containerRect.left + rect.width / 2;
                  setAddButtonPosition(relativeLeft);

                  // Calculate insertion index: insert after the pair that comes before this spacer
                  // pairIndex represents the pair after the spacer, so we want to insert after pair (pairIndex - 1)
                  const pairBeforeSpacer = pairIndex - 1;
                  if (pairBeforeSpacer >= 0 && pairEntries[pairBeforeSpacer]) {
                    // Each pair typically has 2 pages, so insert after 2 * (pairBeforeSpacer + 1) pages
                    const pagesBeforeInsertion = (pairBeforeSpacer + 1) * 2;
                    setPendingInsertionIndex(pagesBeforeInsertion);
                  }

                  setShowAddButton(true);
                }
              } : undefined}
              onMouseLeave={canEditBookSettings() ? () => {
                // Delay hiding to allow mouse to move to floating button
                hideButtonTimeoutRef.current = setTimeout(() => {
                  setShowAddButton(false);
                  setAddButtonPosition(null);
                }, 100);
              } : undefined}
            >
             <span className="p-1 text-xs text-muted-foreground/50">
               {canEditBookSettings() ? '+' : ''}
             </span>
            </div>
          )}

          <div className="flex-shrink-0">
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
                const assignedUser = state.pageAssignments[page.pageNumber] || null;
                const userColor = assignedUser ? getConsistentColor(assignedUser.name) : isActivePage ? '303a50' : 'e2e8f0';
                const buttonElement = (
                  <Button
                    key={page.id}
                    variant={isActivePage ? "primary" : "outline"} //"outline"
                    size="xs"
                    className="p-0 w-7 rounded-none"
                    disabled={isNonEditable}
                    style={{ borderBottom: `5px solid #${userColor}` }}
                    onMouseEnter={() => {
                      // Clear any pending timeout and hide immediately
                      if (hideButtonTimeoutRef.current) {
                        clearTimeout(hideButtonTimeoutRef.current);
                        hideButtonTimeoutRef.current = null;
                      }
                      setShowAddButton(false);
                      setAddButtonPosition(null);
                      setPendingInsertionIndex(null);
                    }}
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

                // Wrap with tooltip if user is assigned
                if (assignedUser) {
                  return (
                    <Tooltip
                      side="top"
                      key={page.id}
                      content={
                        <div className="flex items-center gap-2">
                          <ProfilePicture
                            name={assignedUser.name}
                            size="xs"
                            userId={assignedUser.id}
                          />
                          <span>Assigned to {assignedUser.name}</span>
                        </div>
                      }
                    >
                      {buttonElement}
                    </Tooltip>
                  );
                }

                return buttonElement;
              })}
            </ButtonGroup>
          </div>
        </div>
      ))}

      {/* Floating Add Button */}
      {canEditBookSettings() && showAddButton && addButtonPosition !== null && (
        <div
          className={`absolute top-0.5 flex items-center justify-center transition-all duration-200 ease-out cursor-pointer ${
            showAddButton ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            left: `${addButtonPosition}px`,
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
          onMouseEnter={() => {
            // Clear any pending hide timeout
            if (hideButtonTimeoutRef.current) {
              clearTimeout(hideButtonTimeoutRef.current);
              hideButtonTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            // Delay hiding to allow mouse to move back to spacer or to click
            hideButtonTimeoutRef.current = setTimeout(() => {
              setShowAddButton(false);
              setAddButtonPosition(null);
              setPendingInsertionIndex(null);
            }, 500);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (pendingInsertionIndex !== null && onShowAddPageDialog) {
              // Clear any pending timeout immediately
              if (hideButtonTimeoutRef.current) {
                clearTimeout(hideButtonTimeoutRef.current);
                hideButtonTimeoutRef.current = null;
              }
              onShowAddPageDialog(pendingInsertionIndex);
              // Hide the button after triggering the dialog
              setShowAddButton(false);
              setAddButtonPosition(null);
              setPendingInsertionIndex(null);
            }
          }}
        >
          <Tooltip side="top" content="Add page pair">
            <Button
              variant="outline"
              size="xs"
              className="h-6 w-6 p-0 rounded-full bg-background shadow-md hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );

  const content = isMicro
    ? microContent
    : canReorderPages && !isCompact
      ? (
        <div className="w-full min-w-0 page-explorer-tooltip-wrapper">
          <Tooltip content="Drag and drop to re-arrange pages" side="bottom">
            <div className="w-full min-w-0">
              {scrollableContent}
            </div>
          </Tooltip>
          <style>{`
            .page-explorer-tooltip-wrapper > div[style*="display: inline-block"] {
              display: flex !important;
              width: 100% !important;
            }
            .page-explorer-tooltip-wrapper > div[style*="display: inline-block"] > div[style*="pointer-events: auto"] {
              width: 100% !important;
              min-width: 0 !important;
            }
          `}</style>
        </div>
      )
      : scrollableContent;

  if (!showHeader) {
    return (
      <div
        className={`${isCompact || isMicro ? 'py-1' : 'px-2 py-2'} w-full min-w-0`}
        data-book-id={bookId}
      >
        {content}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start w-full px-4 py-3 gap-4" data-book-id={bookId}>
        {onClose && (
          <Button variant="ghost" size="xs" onClick={onClose} className="px-2 h-7">
            <ChevronLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
        )}
        {content}
      </div>
    </div>
  );
}