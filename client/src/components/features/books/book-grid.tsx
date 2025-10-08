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
}

export default function BooksGrid({ books, itemsPerPage = 10, onArchive }: BooksGridProps) {
  return (
    <Grid
      items={books}
      itemsPerPage={itemsPerPage}
      keyExtractor={(book) => book.id}
      renderItem={(book) => (
        <BookCard book={book} onArchive={onArchive} />
      )}
    />
  );
}