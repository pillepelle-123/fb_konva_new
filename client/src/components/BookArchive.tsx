import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Archive, RotateCcw, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [books, setBooks] = useState<ArchivedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchArchivedBooks();
  }, []);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Book Archive</h1>
          <p className="text-muted-foreground">
            View and manage your archived book projects
          </p>
        </div>

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
              Page {currentPage} of {Math.ceil(books.length / itemsPerPage)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(books.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(books.length / itemsPerPage)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(book => (
              <Card key={book.id} className="border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20">
                <CardHeader className="pb-4">
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
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Archive className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(book.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      book.isOwner 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {book.isOwner ? 'Owner' : 'Collaborator'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRestore(book.id)}
                      className="space-x-2 flex-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore</span>
                    </Button>
                    {book.isOwner && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(book.id)}
                        className="space-x-2"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>

          </>
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
                Delete Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}