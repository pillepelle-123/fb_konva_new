import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { Archive, ChevronLeft, Book } from 'lucide-react';
import BookCard from '../../components/features/books/book-card';
import { useNavigate } from 'react-router-dom';
import { Grid, PageLoadingState, EmptyStateCard, ResourcePageLayout } from '../../components/shared';

interface ArchivedBook {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  isOwner: boolean;
  createdAt: string;
}

export default function BookArchive() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<ArchivedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 12;
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchArchivedBooks();
  }, []);

  const handleNavigateToBooks = () => {
    navigate('/books', { state: { from: 'archive' } });
  };

  const fetchArchivedBooks = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/archived`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Error fetching archived books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (bookId: number) => {
    setShowRestoreConfirm(bookId);
  };

  const handleConfirmRestore = async () => {
    if (!showRestoreConfirm) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/${showRestoreConfirm}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchArchivedBooks();
      }
    } catch (error) {
      console.error('Error restoring book:', error);
    }
    setShowRestoreConfirm(null);
  };

  const handleDelete = (bookId: number) => {
    setShowDeleteConfirm(bookId);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/${showDeleteConfirm}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchArchivedBooks();
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
    setShowDeleteConfirm(null);
  };



  if (loading) {
    return <PageLoadingState message="Loading archived books..." />;
  }

  return (
    <ResourcePageLayout
      title="Book Archive"
      icon={<Archive className="h-6 w-6 text-foreground" />}
      actions={
        <Button
          variant="outline"
          onClick={handleNavigateToBooks}
          className="space-x-2"
        >
          <Book className="h-4 w-4" />
          <span>View My Books</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      }
      // description="View and manage your archived book projects"
    >
      {books.length === 0 ? (
        <EmptyStateCard
          icon={<Archive className="h-12 w-12" />}
          title="No archived books"
          description="Books you archive will appear here for safekeeping."
        />
      ) : (
          <Grid
            items={books}
            itemsPerPage={itemsPerPage}
            keyExtractor={(book) => book.id.toString()}
            renderItem={(book) => {
              const adaptedBook = {
                ...book,
                created_at: book.createdAt,
                updated_at: book.createdAt,
                pageCount: 0,
                collaboratorCount: 0
              };
              return (
                <BookCard 
                  book={adaptedBook} 
                  isArchived={true}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              );
            }}
          />
        )}
        
        {/* Restore Confirmation Dialog */}
        <Dialog open={!!showRestoreConfirm} onOpenChange={() => setShowRestoreConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Restore Book</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore this book? It will be moved back to your active books.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowRestoreConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirmRestore} className="flex-1">
                Restore Book
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Book Permanently</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this book? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1">
                Delete Forever
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </ResourcePageLayout>
  );
}