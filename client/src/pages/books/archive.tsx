import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent } from '../../components/ui/composites/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { Archive, ChevronLeft, ChevronRight, Book } from 'lucide-react';
import BookCard from '../../components/features/books/book-card';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/page-transitions.css';
import Grid from '../../components/shared/grid';

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
  const location = useLocation();
  const [books, setBooks] = useState<ArchivedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 12;
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    fetchArchivedBooks();
    
    // Handle page transition animation
    const from = location.state?.from;
    if (from === 'index') {
      setAnimationClass('slide-from-right-enter');
      setTimeout(() => setAnimationClass('slide-from-right-enter-active'), 50);
    }
  }, [location.state]);

  const handleNavigateToBooks = () => {
    setIsTransitioning(true);
    setAnimationClass('slide-to-right-exit-active');
    setTimeout(() => {
      navigate('/books', { state: { from: 'archive' } });
    }, 50);
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
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading archived books...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-transition-container ${animationClass}`}>
      <div className="page-transition-wrapper">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Book Archive</h1>
            <p className="text-muted-foreground">
              View and manage your archived book projects
            </p>
            <div className="pt-2">
            </div>
          </div>
          <div className="flex flex-col flex-start gap-2 justify-center items-center">
          <Button 
            variant="ghost" 
            onClick={handleNavigateToBooks}
            className="space-x-2"
          >
            <Book className="h-4 w-4" />
            <span>View My Books</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          </div>
        </div>

        {/* Archived Books */}
        {books.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No archived books</h3>
              <p className="text-muted-foreground">
                Books you archive will appear here for safekeeping.
              </p>
            </CardContent>
          </Card>
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
          </div>
        </div>
      </div>
    </div>
  );
}