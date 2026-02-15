import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../ui/primitives/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListProps<T> {
  items: T[];
  itemsPerPage?: number;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string | number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** 'notifications' = scrollable list without pagination, for notification popover */
  variant?: 'default' | 'notifications';
  /** Zeigt einen horizontalen Trennstrich zwischen den Einträgen (Farbe: --border) */
  separator?: boolean;
}

export default function List<T>({ 
  items, 
  itemsPerPage = 10, 
  renderItem, 
  keyExtractor,
  interactive = false,
  size = 'md',
  variant = 'default',
  separator = false
}: ListProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = variant === 'notifications' ? items : items.slice(startIndex, startIndex + itemsPerPage);

  const sizeClasses = {
    sm: 'min-h-12',
    md: 'min-h-16', 
    lg: 'min-h-20'
  };

  const listContent = (
    <div
      className={
        separator
          ? 'divide-y divide-[hsl(var(--border))]'
          : variant === 'notifications'
            ? 'space-y-1'
            : 'space-y-4'
      }
    >
      {currentItems.map(item => (
        <div
          key={keyExtractor(item)}
          className={`${variant === 'notifications' ? '' : sizeClasses[size]} ${interactive ? 'hover:bg-[hsl(var(--secondary))] cursor-pointer transition-colors' : ''} ${separator ? 'py-2 first:pt-0 last:pb-0' : ''}`}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );

  if (variant === 'notifications') {
    return (
      <div className="max-h-72 overflow-y-auto -mx-1 px-1">
        {listContent}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.length > itemsPerPage && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {listContent}
    </div>
  );
}