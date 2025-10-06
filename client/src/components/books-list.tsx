import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Book, Users, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/primitives/button';

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

interface BooksListProps {
  books: Book[];
  itemsPerPage?: number;
}

export default function BooksList({ books, itemsPerPage = 10 }: BooksListProps) {
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

      {/* Books List */}
      <div className="space-y-4">
        {currentBooks.map(book => (
          <Card key={book.id} className="border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden flex flex-row">
            <CardHeader className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold line-clamp-2">
                    {book.name}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-2 text-sm">
                    <span>{book.pageSize}</span>
                    <span>•</span>
                    <span className="capitalize">{book.orientation}</span>
                  </CardDescription>
                  <CardDescription className="text-xs text-muted-foreground">
                    Created: {new Date(book.created_at).toLocaleDateString()}
                    {book.updated_at && ` • Updated: ${new Date(book.updated_at).toLocaleDateString()}`}
                  </CardDescription>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
                  <Book className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-ref-icon">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>{book.pageCount} pages</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{book.collaboratorCount}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  book.isOwner 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {book.isOwner ? 'You are the publisher' : 'You are an author'}
                </span>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}