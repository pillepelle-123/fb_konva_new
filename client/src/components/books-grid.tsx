import { useState } from 'react';
import { Button } from './ui/primitives/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookCard from './books/books-card';

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
  created_at: string;
  updated_at: string;
}

interface BooksGridProps {
  books: Book[];
  itemsPerPage?: number;
  onArchive?: (bookId: number) => void;
}



export default function BooksGrid({ books, itemsPerPage = 10, onArchive }: BooksGridProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(books.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBooks = books.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Pagination */}
      {books.length > itemsPerPage && (
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

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentBooks.map(book => (
          <BookCard key={book.id} book={book} onArchive={onArchive} />
        ))}
      </div>
    </div>
  );
}