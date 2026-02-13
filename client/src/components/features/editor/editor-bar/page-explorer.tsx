import { useMemo, useRef, useState, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import ProfilePicture from '../../users/profile-picture';
import { getConsistentColor } from '../../../../utils/consistent-color';
import { cn } from '../../../../lib/utils';
import { Tooltip } from '../../../ui/composites/tooltip';

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

function isPairDraggable(pair: PageItem[], totalPages: number): boolean {
  return !pair.some((p) => p.pageNumber <= 3 || p.pageNumber === totalPages);
}

function PairDisplay({
  pair,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
}: {
  pair: PageItem[];
  pageAssignments: Record<number, { id: number; name: string; email: string }>;
  totalPages: number;
  activePageNumber?: number;
  onPageSelect?: (pageNumber: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {pair.map((page) => {
        const assigned = pageAssignments[page.pageNumber];
        const color = assigned ? getConsistentColor(assigned.name) : undefined;
        const isCoverOrLast = page.pageNumber <= 3 || page.pageNumber === totalPages;
        const isPageActive = activePageNumber != null && page.pageNumber === activePageNumber;

        return (
          <div key={page.pageNumber} className="flex flex-col text-xs" style={{ width: '50px' }}>
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
                  : `Seite ${page.pageNumber}: Nicht zugewiesen`
              }
            >
              <span className={cn('absolute bottom-0.5 left-0.5 text-xs font-medium', isPageActive ? 'text-primary-foreground' : 'text-muted-foreground')}>
                {page.pageNumber}
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
          </div>
        );
      })}
    </div>
  );
}

const LOCKED_PAIR_TOOLTIP = 'These page pairs cannot be moved.';

function NonDraggablePagePair({
  pair,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
}: {
  pair: PageItem[];
  pageAssignments: Record<number, { id: number; name: string; email: string }>;
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
      <div
        ref={containerRef}
        onClick={handleClick}
        className="flex gap-1 items-center cursor-not-allowed"
      >
        {/* <div className="text-muted-foreground flex-shrink-0 self-center" aria-hidden>
          <GripVertical className="h-4 w-4" />
        </div> */}
        <PairDisplay pair={pair} pageAssignments={pageAssignments} totalPages={totalPages} activePageNumber={activePageNumber} onPageSelect={onPageSelect} />
      </div>
    </Tooltip>
  );
}

function getPairSortableId(pair: PageItem[]): string {
  const stableId = pair[0]?.id ?? pair[0]?.pageNumber;
  return `pair-${stableId}`;
}

function SortablePagePair({
  pair,
  pageAssignments,
  totalPages,
  activePageNumber,
  onPageSelect,
}: {
  pair: PageItem[];
  pageAssignments: Record<number, { id: number; name: string; email: string }>;
  totalPages: number;
  activePageNumber?: number;
  onPageSelect?: (pageNumber: number) => void;
}) {
  const sortableId = getPairSortableId(pair);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-1 items-center cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* <div className="text-muted-foreground flex-shrink-0 self-center" aria-hidden>
        <GripVertical className="h-4 w-4" />
      </div> */}
      <PairDisplay pair={pair} pageAssignments={pageAssignments} totalPages={totalPages} activePageNumber={activePageNumber} onPageSelect={onPageSelect} />
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
  // Reihenfolge wie vom Parent – nicht nach pageNumber sortieren, sonst wird pendingPageOrder verworfen
  const orderedPages = useMemo(() => [...pages], [pages]);

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
  const draggableIndices = useMemo(
    () => pagePairs.map((_, i) => i).filter((i) => isPairDraggable(pagePairs[i], totalPages)),
    [pagePairs, totalPages]
  );
  const sortableIds = useMemo(
    () => draggablePairs.map((p) => getPairSortableId(p)),
    [draggablePairs]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onPageOrderChange) return;

    const oldIdx = draggablePairs.findIndex((p) => getPairSortableId(p) === active.id);
    const newIdx = draggablePairs.findIndex((p) => getPairSortableId(p) === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reorderedDraggable = arrayMove(draggablePairs, oldIdx, newIdx);
    const newPairs = [...pagePairs];
    draggableIndices.forEach((slotIdx, i) => {
      newPairs[slotIdx] = reorderedDraggable[i];
    });
    const newPageOrder = newPairs.flatMap((p) => p.map((pg) => pg.pageNumber));
    onPageOrderChange(newPageOrder);
  };

  if (orderedPages.length === 0) {
    return null;
  }

  const containerClassName = layout === 'horizontal'
    ? 'flex gap-4 flex-nowrap overflow-x-auto overflow-y-hidden scrollbar-thin pb-1'
    : 'flex flex-wrap gap-4';

  if (onPageOrderChange) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className={containerClassName}>
            {pagePairs.map((pair) => (
              <div key={getPairSortableId(pair)} className={layout === 'horizontal' ? 'flex-shrink-0' : undefined}>
                {isPairDraggable(pair, totalPages) ? (
                  <SortablePagePair
                    pair={pair}
                    pageAssignments={pageAssignments}
                    totalPages={totalPages}
                    activePageNumber={activePageNumberProp}
                    onPageSelect={onPageSelect}
                  />
                ) : (
                  <NonDraggablePagePair
                    pair={pair}
                    pageAssignments={pageAssignments}
                    totalPages={totalPages}
                    activePageNumber={activePageNumberProp}
                    onPageSelect={onPageSelect}
                  />
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <div className={containerClassName}>
      {pagePairs.map((pair, index) => (
        <div key={`pair-${index}`} className="flex gap-1 flex-shrink-0">
          <PairDisplay pair={pair} pageAssignments={pageAssignments} totalPages={totalPages} activePageNumber={activePageNumberProp} onPageSelect={onPageSelect} />
        </div>
      ))}
    </div>
  );
}
