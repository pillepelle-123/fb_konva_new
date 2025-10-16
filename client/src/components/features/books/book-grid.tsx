import { Grid } from '../../shared';
import BookCard from './book-card';

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
  onPageUserManager?: (bookId: number) => void;
  hideActions?: boolean;
}

export default function BooksGrid({ books, itemsPerPage = 10, onArchive, onPageUserManager, hideActions = false }: BooksGridProps) {
  const sortedBooks = [...books].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  
  return (
    <Grid
      items={sortedBooks}
      itemsPerPage={itemsPerPage}
      keyExtractor={(book) => book.id}
      renderItem={(book) => (
        <BookCard book={book} onArchive={onArchive} onPageUserManager={onPageUserManager} hideActions={hideActions} />
      )}
    />
  );
}