import { Button } from '../../ui/primitives/button';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function PageNavigation({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  canGoPrev,
  canGoNext
}: PageNavigationProps) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevPage}
        disabled={!canGoPrev}
        className="h-8 w-8 p-0 md:h-9 md:w-9"
      >
        <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
      </Button>

      <div className="flex items-center gap-1 md:gap-2 bg-muted rounded-lg px-2 py-1 md:px-3 md:py-1.5">
        <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        <span className="text-xs md:text-sm font-medium text-foreground min-w-[80px] md:min-w-[100px] text-center">
          {currentPage}/{totalPages}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onNextPage}
        disabled={!canGoNext}
        className="h-8 w-8 p-0 md:h-9 md:w-9"
      >
        <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}