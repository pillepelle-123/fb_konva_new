import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import PagePreview from '../../books/page-preview';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';

export function PagesSubmenu({ pages, activePageIndex, onClose, onPageSelect, onReorderPages, bookId, isRestrictedView = false }: {
  pages: any[];
  activePageIndex: number;
  onClose: () => void;
  onPageSelect: (page: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  bookId: number;
  isRestrictedView?: boolean;
}) {
  const { state } = useEditor();
  const { user } = useAuth();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const isAuthor = state.userRole === 'author';

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
    <div className="flex items-center gap-2 flex-1">
      <div className="flex items-center gap-2">
        {pages.map((page, index) => (
          <div
            key={page.id}
            draggable={!isAuthor}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              cursor-pointer transition-all duration-200
              ${index === activePageIndex 
                ? 'shadow-lg' 
                : ''
              }
              ${draggedIndex === index ? 'opacity-50' : ''}
              ${isAuthor ? 'cursor-default' : ''}
            `}
            onClick={() => onPageSelect(isRestrictedView ? index + 1 : page.pageNumber)}
          >
            <PagePreview 
              pageId={page.id} 
              pageNumber={isRestrictedView ? index + 1 : page.pageNumber}
              assignedUser={state.pageAssignments[page.pageNumber] || null}
              isActive={index === activePageIndex}
              page={page}
              book={state.currentBook || undefined}
            />
          </div>
        ))}
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