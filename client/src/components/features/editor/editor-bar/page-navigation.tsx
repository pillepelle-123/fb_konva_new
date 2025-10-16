import { useState } from 'react';
import { Button } from '../../../ui/primitives/button';
import { Input } from '../../../ui/primitives/input';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
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
  onPrevPage,
  onNextPage,
  onGoToPage,
  canGoPrev,
  canGoNext,
  onOpenPagesSubmenu
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(inputValue);
      if (pageNum >= 1 && pageNum <= totalPages) {
        onGoToPage(pageNum);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(currentPage.toString());
    }
  };

  const handleBlur = () => {
    const pageNum = parseInt(inputValue);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onGoToPage(pageNum);
    }
    setIsEditing(false);
    setInputValue(currentPage.toString());
  };
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Tooltip content={canGoPrev ? "Go to previous page" : "Already on first page"} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!canGoPrev}
          className="h-8 w-8 p-0 md:h-9 md:w-9"
        >
          <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </Tooltip>

      <div className="flex items-center gap-1 md:gap-2 bg-muted rounded-lg px-2 py-1 md:px-3 md:py-1.5">
        <Tooltip content="View all pages" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenPagesSubmenu}
          className="h-6 w-6 p-0 hover:bg-muted-foreground/10 cursor-pointer"
        >
          <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground hover:text-foreground" />
        </Button>
        </Tooltip>
        {isEditing ? (
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs md:text-sm font-medium text-center w-5 h-5 p-0 border-0 bg-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none focus:shadow-none rounded-none focus:rounded-none"
            autoFocus
          />
        ) : (
          <span 
            className="text-xs md:text-sm font-medium text-foreground cursor-pointer hover:bg-background/50 px-1 rounded"
            onClick={handlePageClick}
          >
            {currentPage}
          </span>
        )}
        <span className="text-xs md:text-sm font-medium text-foreground pl">/</span><span>{totalPages}</span>
      </div>

      <Tooltip content={canGoNext ? "Go to next page" : "Already on last page"} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext}
          className="h-8 w-8 p-0 md:h-9 md:w-9"
        >
          <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </Tooltip>
    </div>
  );
}