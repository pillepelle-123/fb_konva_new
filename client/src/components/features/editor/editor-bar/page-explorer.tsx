import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import PagePreview from '../../books/page-preview';
import { useEditor } from '../../../../context/editor-context';

export function PagesSubmenu({ pages, activePageIndex, onClose, onPageSelect, onReorderPages, bookId }: {
  pages: any[];
  activePageIndex: number;
  onClose: () => void;
  onPageSelect: (page: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  bookId: number;
}) {
  const { state } = useEditor();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
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
    }
    setDraggedIndex(null);
  };

  return (
    <div className="flex items-start justify-between w-full px-4 py-3">
      <Tooltip content="Drag and Drop to re-arrange pages" side="bottom">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium">Pages:</span>
        <div className="flex items-center gap-2">
          {pages.map((page, index) => (
            <div
              key={index}
              draggable
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
              `}
              onClick={() => onPageSelect(index + 1)}
            >
              <PagePreview 
                bookId={bookId} 
                pageId={page.id} 
                pageNumber={index + 1}
                assignedUser={state.pageAssignments[index + 1] || null}
                isActive={index === activePageIndex}
              />
            </div>
          ))}
        </div>
      </div>
      </Tooltip>
      <div className='items-end h-full'>
        <Button
          variant="outline"
          size="md"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}