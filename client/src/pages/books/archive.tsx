import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { Archive, ChevronLeft, Book, SquareCheckBig, SquareX, Copy, CopyCheck, RotateCcw, Trash2 } from 'lucide-react';
import { ButtonGroup } from '../../components/ui/composites/button-group';
import { Tooltip } from '../../components/ui/composites/tooltip';
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
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<number | number[] | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | number[] | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

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

  const handleRestoreSelected = () => {
    if (selectedBooks.size > 0) {
      setShowRestoreConfirm(Array.from(selectedBooks));
    }
  };

  const handleConfirmRestore = async () => {
    if (!showRestoreConfirm) return;
    const ids = Array.isArray(showRestoreConfirm) ? showRestoreConfirm : [showRestoreConfirm];

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`${apiUrl}/books/${id}/archive`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      if (results.every((r) => r.ok)) {
        fetchArchivedBooks();
        setSelectedBooks(new Set());
        setMultiSelectMode(false);
      }
    } catch (error) {
      console.error('Error restoring book(s):', error);
    }
    setShowRestoreConfirm(null);
  };

  const handleDelete = (bookId: number) => {
    setShowDeleteConfirm(bookId);
  };

  const handleDeleteSelected = () => {
    if (selectedBooks.size > 0) {
      setShowDeleteConfirm(Array.from(selectedBooks));
    }
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;
    const ids = Array.isArray(showDeleteConfirm) ? showDeleteConfirm : [showDeleteConfirm];

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`${apiUrl}/books/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      if (results.every((r) => r.ok)) {
        fetchArchivedBooks();
        setSelectedBooks(new Set());
        setMultiSelectMode(false);
      }
    } catch (error) {
      console.error('Error deleting book(s):', error);
    }
    setShowDeleteConfirm(null);
  };

  const toggleBookSelection = (bookId: number) => {
    const newSelected = new Set(selectedBooks);
    if (newSelected.has(bookId)) {
      newSelected.delete(bookId);
    } else {
      newSelected.add(bookId);
    }
    setSelectedBooks(newSelected);
  };

  const selectAllBooks = () => {
    setSelectedBooks(new Set(books.map((b) => b.id)));
  };

  const deselectAllBooks = () => {
    setSelectedBooks(new Set());
  };



  if (loading) {
    return <PageLoadingState message="Loading archived books..." />;
  }

  return (
    <ResourcePageLayout
      title="Book Archive"
      icon={<Archive className="h-6 w-6 text-foreground" />}
      actions={
        <>
          {multiSelectMode ? (
            <ButtonGroup>
              <Tooltip content="Exit multi-select" side="bottom">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setMultiSelectMode(false);
                    deselectAllBooks();
                  }}
                >
                  <SquareX className="h-5 w-5" />
                </Button>
              </Tooltip>
              <Tooltip content="Select all" side="bottom">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={selectAllBooks}
                  disabled={selectedBooks.size === books.length}
                >
                  <CopyCheck className="h-5 w-5" />
                </Button>
              </Tooltip>
              <Tooltip content="Deselect all" side="bottom">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={deselectAllBooks}
                  disabled={selectedBooks.size === 0}
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </Tooltip>
              <Tooltip content="Restore selected" side="bottom">
                <Button
                  variant="outline"
                  onClick={handleRestoreSelected}
                  disabled={selectedBooks.size === 0}
                  className="space-x-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>({selectedBooks.size})</span>
                </Button>
              </Tooltip>
              <Tooltip content="Delete selected" side="bottom">
                <Button
                  variant="destructive_outline"
                  onClick={handleDeleteSelected}
                  disabled={selectedBooks.size === 0}
                  className="space-x-2"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>({selectedBooks.size})</span>
                </Button>
              </Tooltip>
            </ButtonGroup>
          ) : (
            <Tooltip content="Multi-select" side="bottom">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMultiSelectMode(true)}
              >
                <SquareCheckBig className="h-5 w-5" />
              </Button>
            </Tooltip>
          )}
          <Button
            variant="outline"
            onClick={handleNavigateToBooks}
            className="space-x-2"
          >
            <Book className="h-4 w-4" />
            <span>View My Books</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </>
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
                collaboratorCount: 0,
              };
              return (
                <BookCard
                  book={adaptedBook}
                  isArchived={true}
                  multiSelectMode={multiSelectMode}
                  isSelected={selectedBooks.has(book.id)}
                  onToggleSelection={toggleBookSelection}
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
              <DialogTitle>Restore Book{Array.isArray(showRestoreConfirm) && showRestoreConfirm.length > 1 ? 's' : ''}</DialogTitle>
              <DialogDescription>
                {Array.isArray(showRestoreConfirm) && showRestoreConfirm.length > 1
                  ? `Are you sure you want to restore ${showRestoreConfirm.length} books? They will be moved back to your active books.`
                  : 'Are you sure you want to restore this book? It will be moved back to your active books.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowRestoreConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirmRestore} className="flex-1">
                Restore {Array.isArray(showRestoreConfirm) && showRestoreConfirm.length > 1 ? `${showRestoreConfirm.length} Books` : 'Book'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Book{Array.isArray(showDeleteConfirm) && showDeleteConfirm.length > 1 ? 's' : ''} Permanently</DialogTitle>
              <DialogDescription>
                {Array.isArray(showDeleteConfirm) && showDeleteConfirm.length > 1
                  ? `Are you sure you want to permanently delete ${showDeleteConfirm.length} books? This action cannot be undone.`
                  : 'Are you sure you want to permanently delete this book? This action cannot be undone.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive_outline" onClick={handleConfirmDelete} className="flex-1">
                Delete Forever
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </ResourcePageLayout>
  );
}