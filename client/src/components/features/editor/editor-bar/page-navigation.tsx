import { useState } from 'react';
import { Button } from '../../../ui/primitives/button';
import { Input } from '../../../ui/primitives/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip } from '../../../ui/composites/tooltip';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  onOpenPagesSubmenu?: () => void;
}

export function PageNavigation({
  currentPage,
  totalPages,
  onGoToPage,
  canGoPrev,
  canGoNext,
  onOpenPagesSubmenu: _onOpenPagesSubmenu,
}: PageNavigationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage.toString());

  const handlePageClick = () => {
    setIsEditing(true);
    setInputValue(currentPage.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(value);
  };

  const handleForbiddenInput = () => {
    setInputValue(currentPage.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(inputValue);
      if (pageNum >= 0 && pageNum < totalPages) {
        onGoToPage(pageNum);
      } else {
        handleForbiddenInput();
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(currentPage.toString());
    }
  };

  const handleBlur = () => {
    const pageNum = parseInt(inputValue);
    if (pageNum >= 0 && pageNum < totalPages) {
      onGoToPage(pageNum);
    } else {
      handleForbiddenInput();
    }
    setIsEditing(false);
    setInputValue(currentPage.toString());
  };

  const getNextEditablePage = (start: number, direction: 'prev' | 'next'): number => {
    if (direction === 'prev') {
      for (let p = start - 1; p >= 0; p--) {
        if (p < totalPages) return p;
      }
      return 0;
    } else {
      for (let p = start + 1; p < totalPages; p++) {
        return p;
      }
      return totalPages - 1;
    }
  };

  const handlePrevPair = () => {
    if (!canGoPrev) return;
    const nextPage = getNextEditablePage(currentPage, 'prev');
    onGoToPage(nextPage);
  };

  const handleNextPair = () => {
    if (!canGoNext) return;
    const nextPage = getNextEditablePage(currentPage, 'next');
    onGoToPage(nextPage);
  };
  return (
    <div className="flex items-center gap-0">
      <Tooltip content={canGoPrev ? "Go to previous page pair" : "Already on first page"} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="xs"
          onClick={handlePrevPair}
          disabled={!canGoPrev}
          className="rounded-r-none"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </Tooltip>

      <div className="flex items-center gap-2 bg-muted border-t border-b border-border px-1 py-0.5 h-7">
        {/* <Tooltip content="View all pages" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenPagesSubmenu}
          className="h-6 w-6 p-0 hover:bg-muted-foreground/10 cursor-pointer"
        >
          <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground hover:text-foreground" />
        </Button>
        </Tooltip> */}
        {isEditing ? (
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs font-medium text-center w-4 h-4 -p-1 border-0 bg-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none focus:shadow-none rounded-none focus:rounded-none"
            autoFocus
          />
        ) : (
          <span 
            className="text-xs font-medium text-foreground cursor-pointer hover:bg-background/50 px-[3px] pt-0.5 rounded"
            onClick={handlePageClick}
          >
            {currentPage}
          </span>
        )}
        <span className="text-xs font-medium pt-0.5 text-foreground">/</span> 
        <span className="text-xs font-medium pt-0.5 text-foreground">{totalPages}</span> 
      </div>

      <Tooltip content="Go to next page pair" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="xs"
          onClick={handleNextPair}
          disabled={!canGoNext}
          className='rounded-l-none'
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </Tooltip>

    </div>
  );
}