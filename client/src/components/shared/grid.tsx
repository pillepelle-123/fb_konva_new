import { useState, ReactNode } from 'react';
import { Button } from '../ui/primitives/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GridProps<T> {
  items: T[];
  itemsPerPage?: number;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string | number;
  /** Optional: Custom grid layout classes (e.g. "grid-cols-2 md:grid-cols-4") */
  gridClassName?: string;
}

export default function Grid<T>({ 
  items, 
  itemsPerPage = 12, 
  renderItem, 
  keyExtractor,
  gridClassName = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
}: GridProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Pagination */}
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

      {/* Items Grid */}
      <div className={`grid ${gridClassName}`}>
        {currentItems.map(item => (
          <div key={keyExtractor(item)}>
            {renderItem(item)}
          </div>
        ))}
      </div>
            {/* Pagination */}
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
    </div>
  );
}