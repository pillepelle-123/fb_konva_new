import { useParams, useNavigate } from 'react-router-dom';
import { BookExportManager } from '../../../components/features/books/book-export-manager';

export default function BookExportPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  if (!bookId) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <BookExportManager
        bookId={bookId}
        showHeader={true}
        onBack={() => navigate(`/books/${bookId}/manager`)}
      />
    </div>
  );
}


