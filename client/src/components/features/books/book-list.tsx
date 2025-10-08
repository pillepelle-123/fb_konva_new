import { List } from '../../shared';
import { Card, CardDescription, CardHeader, CardTitle } from '../../ui/composites/card';
import { Badge } from '../../ui/composites/badge';
import { Book, Users, FileText } from 'lucide-react';

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
  return (
    <List
      items={books}
      itemsPerPage={itemsPerPage}
      keyExtractor={(book) => book.id}
      renderItem={(book) => (
        <Card className="border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden flex flex-row">
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
              <Badge variant={book.isOwner ? 'highlight' : 'secondary'}>
                {book.isOwner ? 'You are the publisher' : 'You are an author'}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}
    />
  );
}