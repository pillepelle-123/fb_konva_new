import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import ProfilePicture from '../../users/profile-picture';
import { getConsistentColor } from '../../../../utils/consistent-color';
import { cn } from '../../../../lib/utils';
import { Tooltip } from '../../../ui/composites/tooltip';
import { isContentPairPage, isStandaloneCoverPage } from '../../../../utils/book-structure';

export interface PageItem {
  pageNumber: number;
  pageType?: string;
  /** Stable ID for DnD – prevents visual jump-back when pageNumber changes after reorder */
  id?: number | string;
}

export interface PageExplorerProps {
  pages?: PageItem[];
  pageAssignments?: Record<number, { id: number; name: string; email: string }>;
  onPageOrderChange?: (newPageOrder: number[]) => void;
  /** 'grid' = flex-wrap, 'horizontal' = single row with horizontal scroll */
  layout?: 'grid' | 'horizontal';
  /** Seitenzahl der aktuell im Editor angezeigten Seite – markiert die aktive Seite mit Hintergrundfarbe */
  activePageNumber?: number;
  /** Klick auf Seite → zu dieser Seite im Editor navigieren (z.B. in Status-Bar) */
  onPageSelect?: (pageNumber: number) => void;
}

type Assignment = { id: number; name: string; email: string };

const LOCKED_PAIR_TOOLTIP = 'These page pairs cannot be moved.';
const PAIR_CONTAINER_GAP_PX = 16;

function getPairGridPosition(index: number, columns: number) {
  return {
    row: Math.floor(index / columns),
    column: index % columns,
  };
}

function isPairDraggable(pair: PageItem[], totalPages: number): boolean {
  return pair.every((p) => isContentPairPage(p.pageNumber, totalPages));
}

function isPageDraggable(page: PageItem, totalPages: number): boolean {
  return isContentPairPage(page.pageNumber, totalPages);
}

function shouldShowPairGrip(pair: PageItem[], totalPages: number): boolean {
  if (pair.length !== 2) {
    return false;
  }

  const [firstPage, secondPage] = pair;
  const isFrontCoverPair = firstPage.pageNumber === 0 && secondPage.pageNumber === 1;
  const isLastPair = firstPage.pageNumber === totalPages - 2 && secondPage.pageNumber === totalPages - 1;

  return !isFrontCoverPair && !isLastPair;
}

function getPairSortableId(pair: PageItem[]): string {
  const stableId = pair[0]?.id ?? pair[0]?.pageNumber;
  return `pair-${stableId}`;
}

function getPageSortableId(page: PageItem): string {
  const stableId = page.id ?? page.pageNumber;
  return `page-${stableId}`;
}

function PageTile({
  page,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
}: {
  page: PageItem;
  pageAssignments: Record<number, Assignment>;
  totalPages: number;
  activePageNumber?: number;
  onPageSelect?: (pageNumber: number) => void;
}) {
  const assigned = pageAssignments[page.pageNumber];
  const color = assigned ? getConsistentColor(assigned.name) : undefined;
  const isCoverOrLast = isStandaloneCoverPage(page.pageNumber, totalPages);
  const isPageActive = activePageNumber != null && page.pageNumber === activePageNumber;

  const isFrontCover = page.pageNumber === 0;
  const isBackCover = totalPages > 0 && page.pageNumber === totalPages - 1;
  const coverLabel = isFrontCover ? 'Front' : isBackCover ? 'Back' : null;
  const coverTooltip = isFrontCover ? 'Front Cover' : isBackCover ? 'Back Cover' : null;

  const pageContent = (
    <div
      role={onPageSelect ? 'button' : undefined}
      tabIndex={onPageSelect ? 0 : undefined}
      onClick={onPageSelect ? (e) => { e.stopPropagation(); onPageSelect(page.pageNumber); } : undefined}
      onKeyDown={onPageSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPageSelect(page.pageNumber); } } : undefined}
      className={cn(
        'rounded-xl border-4 flex flex-col items-center justify-center transition-all p-0.5 relative',
        assigned ? 'shadow-sm' : 'border-muted-foreground/20',
        isPageActive ? 'bg-primary' : 'bg-white',
        onPageSelect && 'cursor-pointer hover:opacity-90'
      )}
      style={{
        borderColor: assigned ? `#${color}` : undefined,
        aspectRatio: '210 / 297',
        width: '50px',
        ...(isCoverOrLast && !isPageActive && {
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          )`,
        }),
      }}
      title={
        assigned
          ? `Seite ${page.pageNumber}: ${assigned.name}`
          : coverTooltip ?? `Seite ${page.pageNumber}: Nicht zugewiesen`
      }
    >
      <span className={cn('absolute bottom-0.5 left-0.5 text-xs font-medium', isPageActive ? 'text-primary-foreground' : 'text-muted-foreground')}>
        {coverLabel ?? page.pageNumber}
      </span>
      {assigned ? (
        <div className="flex items-center justify-center">
          <ProfilePicture
            name={assigned.name}
            size="sm"
            userId={assigned.id}
            variant="withColoredBorder"
            className="w-9 h-9"
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col text-xs" style={{ width: '50px' }}>
      {coverTooltip ? (
        <Tooltip content={coverTooltip} side="top">
          {pageContent}
        </Tooltip>
      ) : (
        pageContent
      )}
    </div>
  );
}

function SortablePageTile({
  page,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
}: {
  page: PageItem;
  pageAssignments: Record<number, Assignment>;
  totalPages: number;
  activePageNumber?: number;
  onPageSelect?: (pageNumber: number) => void;
}) {
  const sortableId = getPageSortableId(page);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <PageTile
        page={page}
        pageAssignments={pageAssignments}
        totalPages={totalPages}
        activePageNumber={activePageNumber}
        onPageSelect={onPageSelect}
      />
    </div>
  );
}

function PairDisplay({
  pair,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
  enablePageReorder,
}: {
  pair: PageItem[];
  pageAssignments: Record<number, Assignment>;
  totalPages: number;
  activePageNumber?: number;
  onPageSelect?: (pageNumber: number) => void;
  enablePageReorder?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {pair.map((page) => {
        if (enablePageReorder && isPageDraggable(page, totalPages)) {
          return (
            <SortablePageTile
              key={page.pageNumber}
              page={page}
              pageAssignments={pageAssignments}
              totalPages={totalPages}
              activePageNumber={activePageNumber}
              onPageSelect={onPageSelect}
            />
          );
        }

        return (
          <PageTile
            key={page.pageNumber}
            page={page}
            pageAssignments={pageAssignments}
            totalPages={totalPages}
            activePageNumber={activePageNumber}
            onPageSelect={onPageSelect}
          />
        );
      })}
    </div>
  );
}

function NonDraggablePagePair({
  pair,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
}: {
  pair: PageItem[];
  pageAssignments: Record<number, Assignment>;
  totalPages: number;
  activePageNumber?: number;
  onPageSelect?: (pageNumber: number) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTooltip(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showTooltip]);

  const handleClick = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
    setShowTooltip((v) => !v);
  };

  return (
    <Tooltip
      content={LOCKED_PAIR_TOOLTIP}
      forceVisible={showTooltip}
      screenPosition={tooltipPosition}
      side="bottom"
    >
      <div ref={containerRef} className="flex flex-col gap-1 items-center">
        <PairDisplay
          pair={pair}
          pageAssignments={pageAssignments}
          totalPages={totalPages}
          activePageNumber={activePageNumber}
          onPageSelect={onPageSelect}
          enablePageReorder
        />
        {shouldShowPairGrip(pair, totalPages) ? (
          <button
            type="button"
            onClick={handleClick}
            className="text-muted-foreground/70 hover:text-muted-foreground cursor-not-allowed"
            aria-label={LOCKED_PAIR_TOOLTIP}
            title={LOCKED_PAIR_TOOLTIP}
          >
            <GripHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </Tooltip>
  );
}

function SortablePagePair({
  pair,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
  className,
  displacementX = 0,
  displacementY = 0,
  onMeasureSize,
}: {
  pair: PageItem[];
  pageAssignments: Record<number, Assignment>;
  totalPages: number;
  activePageNumber?: number;
  onPageSelect?: (pageNumber: number) => void;
  className?: string;
  displacementX?: number;
  displacementY?: number;
  onMeasureSize?: (width: number, height: number) => void;
}) {
  const sortableId = getPairSortableId(pair);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const handleNodeRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (!node || !onMeasureSize) {
      return;
    }

    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      onMeasureSize(rect.width, rect.height);
    }
  }, [onMeasureSize, setNodeRef]);

  const combinedTransform = transform
    ? { ...transform, x: transform.x + displacementX, y: transform.y + displacementY }
    : displacementX !== 0 || displacementY !== 0
      ? { x: displacementX, y: displacementY, scaleX: 1, scaleY: 1 }
      : null;

  const style = {
    transform: CSS.Transform.toString(combinedTransform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={handleNodeRef} style={style} className={cn('flex flex-col gap-1 items-center', className)}>
      <PairDisplay
        pair={pair}
        pageAssignments={pageAssignments}
        totalPages={totalPages}
        activePageNumber={activePageNumber}
        onPageSelect={onPageSelect}
        enablePageReorder
      />
      {shouldShowPairGrip(pair, totalPages) ? (
        <Tooltip content="Drag to reorder page pairs" side="top">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag page pair"
          title="Drag page pair"
          {...attributes}
          {...listeners}
        >
          <GripHorizontal className="h-4 w-4" />
        </button>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function PageExplorer({
  pages = [],
  pageAssignments = {},
  onPageOrderChange,
  layout = 'grid',
  activePageNumber: activePageNumberProp,
  onPageSelect,
}: PageExplorerProps) {
  const [activePairId, setActivePairId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [overPairId, setOverPairId] = useState<string | null>(null);
  const [measuredPairWidth, setMeasuredPairWidth] = useState(120);
  const [measuredPairHeight, setMeasuredPairHeight] = useState(92);
  const [containerWidth, setContainerWidth] = useState(0);

  // Reihenfolge wie vom Parent – nicht nach pageNumber sortieren, sonst wird pendingPageOrder verworfen
  const orderedPages = useMemo(() => [...pages], [pages]);
  const containerRef = useRef<HTMLDivElement>(null);

  const pagePairs = useMemo(() => {
    const pairs: PageItem[][] = [];
    for (let i = 0; i < orderedPages.length; i += 2) {
      pairs.push(orderedPages.slice(i, i + 2));
    }
    return pairs;
  }, [orderedPages]);

  const totalPages = orderedPages.length;

  const draggablePairs = useMemo(
    () => pagePairs.filter((pair) => isPairDraggable(pair, totalPages)),
    [pagePairs, totalPages]
  );
  const draggablePairIds = useMemo(
    () => draggablePairs.map((pair) => getPairSortableId(pair)),
    [draggablePairs]
  );
  const draggablePairIndices = useMemo(
    () => pagePairs.map((_, i) => i).filter((i) => isPairDraggable(pagePairs[i], totalPages)),
    [pagePairs, totalPages]
  );

  const draggablePages = useMemo(
    () => orderedPages.filter((page) => isPageDraggable(page, totalPages)),
    [orderedPages, totalPages]
  );
  const draggablePageIds = useMemo(
    () => draggablePages.map((page) => getPageSortableId(page)),
    [draggablePages]
  );
  const draggablePageIndices = useMemo(
    () => orderedPages.map((_, i) => i).filter((i) => isPageDraggable(orderedPages[i], totalPages)),
    [orderedPages, totalPages]
  );

  const activePair = useMemo(
    () => (activePairId ? pagePairs.find((pair) => getPairSortableId(pair) === activePairId) : undefined),
    [activePairId, pagePairs]
  );
  const activePage = useMemo(
    () => (activePageId ? orderedPages.find((page) => getPageSortableId(page) === activePageId) : undefined),
    [activePageId, orderedPages]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const activeId = String(args.active.id);
    const targetPrefix = activeId.startsWith('pair-') ? 'pair-' : 'page-';
    const scopedDroppables = args.droppableContainers.filter((container) =>
      String(container.id).startsWith(targetPrefix)
    );

    const pointerCollisions = pointerWithin({
      ...args,
      droppableContainers: scopedDroppables,
    });

    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    return closestCenter({
      ...args,
      droppableContainers: scopedDroppables,
    });
  }, []);

  const resetDragState = () => {
    setActivePairId(null);
    setActivePageId(null);
    setOverPairId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('pair-')) {
      setActivePairId(id);
      setActivePageId(null);
      setOverPairId(id);
      return;
    }
    if (id.startsWith('page-')) {
      setActivePageId(id);
      setActivePairId(null);
      setOverPairId(null);
      return;
    }
    resetDragState();
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (activeId.startsWith('pair-')) {
      setOverPairId(overId?.startsWith('pair-') ? overId : null);
      return;
    }

    setOverPairId(null);
  };

  const handleMeasurePairSize = useCallback((width: number, height: number) => {
    setMeasuredPairWidth((currentWidth) => (Math.abs(currentWidth - width) < 1 ? currentWidth : width));
    setMeasuredPairHeight((currentHeight) => (Math.abs(currentHeight - height) < 1 ? currentHeight : height));
  }, []);

  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (!node) {
      return;
    }

    const nextWidth = node.getBoundingClientRect().width;
    if (nextWidth > 0) {
      setContainerWidth((currentWidth) => (Math.abs(currentWidth - nextWidth) < 1 ? currentWidth : nextWidth));
    }
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = entry.contentRect.width;
      if (nextWidth > 0) {
        setContainerWidth((currentWidth) => (Math.abs(currentWidth - nextWidth) < 1 ? currentWidth : nextWidth));
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const activePairIndex = activePairId ? draggablePairIds.indexOf(activePairId) : -1;
  const overPairIndex = overPairId ? draggablePairIds.indexOf(overPairId) : -1;

  const pairDisplacementById = useMemo(() => {
    const displacement = new Map<string, { x: number; y: number }>();

    if (
      activePairIndex === -1 ||
      overPairIndex === -1 ||
      activePairIndex === overPairIndex
    ) {
      return displacement;
    }

    const reorderedPairIds = arrayMove(draggablePairIds, activePairIndex, overPairIndex);
    const effectiveContainerWidth = containerWidth > 0 ? containerWidth : measuredPairWidth + PAIR_CONTAINER_GAP_PX;
    const pairStepX = measuredPairWidth + PAIR_CONTAINER_GAP_PX;
    const pairStepY = measuredPairHeight + PAIR_CONTAINER_GAP_PX;
    const columns = layout === 'horizontal'
      ? Math.max(draggablePairIds.length, 1)
      : Math.max(1, Math.floor((effectiveContainerWidth + PAIR_CONTAINER_GAP_PX) / Math.max(pairStepX, 1)));

    draggablePairIds.forEach((id, index) => {
      if (id === activePairId) {
        return;
      }

      const nextIndex = reorderedPairIds.indexOf(id);
      if (nextIndex === -1 || nextIndex === index) {
        return;
      }

      const currentPosition = getPairGridPosition(index, columns);
      const nextPosition = getPairGridPosition(nextIndex, columns);

      displacement.set(id, {
        x: (nextPosition.column - currentPosition.column) * pairStepX,
        y: (nextPosition.row - currentPosition.row) * pairStepY,
      });
    });

    return displacement;
  }, [activePairId, activePairIndex, containerWidth, draggablePairIds, layout, measuredPairHeight, measuredPairWidth, overPairIndex]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;

    resetDragState();

    if (!overId || activeId === overId || !onPageOrderChange) {
      return;
    }

    if (activeId.startsWith('page-') && overId.startsWith('page-')) {
      const oldIdx = draggablePageIds.findIndex((id) => id === activeId);
      const newIdx = draggablePageIds.findIndex((id) => id === overId);
      if (oldIdx === -1 || newIdx === -1) return;

      const reorderedDraggablePages = arrayMove(draggablePages, oldIdx, newIdx);
      const newOrderedPages = [...orderedPages];
      draggablePageIndices.forEach((slotIdx, i) => {
        newOrderedPages[slotIdx] = reorderedDraggablePages[i];
      });
      onPageOrderChange(newOrderedPages.map((page) => page.pageNumber));
      return;
    }

    if (activeId.startsWith('pair-') && overId.startsWith('pair-')) {
      const oldIdx = draggablePairIds.findIndex((id) => id === activeId);
      const newIdx = draggablePairIds.findIndex((id) => id === overId);
      if (oldIdx === -1 || newIdx === -1) return;

      const reorderedDraggablePairs = arrayMove(draggablePairs, oldIdx, newIdx);
      const newPairs = [...pagePairs];
      draggablePairIndices.forEach((slotIdx, i) => {
        newPairs[slotIdx] = reorderedDraggablePairs[i];
      });
      onPageOrderChange(newPairs.flatMap((pair) => pair.map((page) => page.pageNumber)));
    }
  };

  if (orderedPages.length === 0) {
    return null;
  }

  const containerClassName = layout === 'horizontal'
    ? 'flex gap-4 flex-nowrap overflow-x-auto overflow-y-hidden scrollbar-thin pb-1'
    : 'flex flex-wrap gap-4';

  if (!onPageOrderChange) {
    return (
      <div className={containerClassName}>
        {pagePairs.map((pair, index) => (
          <div key={`pair-${index}`} className="flex gap-1 flex-shrink-0">
            <PairDisplay
              pair={pair}
              pageAssignments={pageAssignments}
              totalPages={totalPages}
              activePageNumber={activePageNumberProp}
              onPageSelect={onPageSelect}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={resetDragState}
    >
      <SortableContext items={draggablePairIds} strategy={rectSortingStrategy}>
        <SortableContext items={draggablePageIds} strategy={rectSortingStrategy}>
          <div ref={handleContainerRef} className={containerClassName}>
            {pagePairs.map((pair) => {
              if (isPairDraggable(pair, totalPages)) {
                const pairDisplacement = pairDisplacementById.get(getPairSortableId(pair));

                return (
                  <SortablePagePair
                    key={getPairSortableId(pair)}
                    pair={pair}
                    pageAssignments={pageAssignments}
                    totalPages={totalPages}
                    activePageNumber={activePageNumberProp}
                    onPageSelect={onPageSelect}
                    className={layout === 'horizontal' ? 'flex-shrink-0' : undefined}
                    displacementX={pairDisplacement?.x ?? 0}
                    displacementY={pairDisplacement?.y ?? 0}
                    onMeasureSize={handleMeasurePairSize}
                  />
                );
              }

              return (
                <div
                  key={getPairSortableId(pair)}
                  className={layout === 'horizontal' ? 'flex-shrink-0' : undefined}
                >
                  <NonDraggablePagePair
                    pair={pair}
                    pageAssignments={pageAssignments}
                    totalPages={totalPages}
                    activePageNumber={activePageNumberProp}
                    onPageSelect={onPageSelect}
                  />
                </div>
              );
            })}
          </div>
        </SortableContext>
      </SortableContext>

      {typeof document !== 'undefined'
        ? createPortal(
            <DragOverlay zIndex={11050}>
              {activePair ? (
                <div className="flex flex-col gap-1 items-center cursor-grabbing opacity-90">
                  <PairDisplay
                    pair={activePair}
                    pageAssignments={pageAssignments}
                    totalPages={totalPages}
                    activePageNumber={activePageNumberProp}
                    onPageSelect={onPageSelect}
                  />
                  <div className="text-muted-foreground">
                    <GripHorizontal className="h-4 w-4" />
                  </div>
                </div>
              ) : activePage ? (
                <div className="cursor-grabbing opacity-90">
                  <PageTile
                    page={activePage}
                    pageAssignments={pageAssignments}
                    totalPages={totalPages}
                    activePageNumber={activePageNumberProp}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )
        : null}
    </DndContext>
  );
}
