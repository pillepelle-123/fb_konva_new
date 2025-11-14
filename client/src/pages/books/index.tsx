import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent } from '../../components/ui/composites/card';
import { Input } from '../../components/ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import BooksGrid from '../../components/features/books/book-grid';
import BookCreationWizard from '../../components/features/books/creation/creation-wizard';
import { Book, BookPlus, Archive, ChevronRight, ChevronUp, Plus } from 'lucide-react';
import PageUserIcon from '../../components/ui/icons/page-user-icon';
import FloatingActionButton from '../../components/ui/composites/floating-action-button';
import '../../styles/page-transitions.css';

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
  userRole: 'owner' | 'publisher' | 'author';
}

export default function BooksList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    // Handle page transition animation
    const from = location.state?.from;
    if (from === 'archive') {
      setAnimationClass('slide-from-left-enter');
      setTimeout(() => setAnimationClass('slide-from-left-enter-active'), 50);
    }
  }, [location.state]);

  const fetchBooks = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = (bookId: number) => {
    setShowArchiveConfirm(bookId);
  };

  const handleConfirmArchive = async () => {
    if (!showArchiveConfirm) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/${showArchiveConfirm}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchBooks();
      }
    } catch (error) {
      console.error('Error archiving book:', error);
    }
    setShowArchiveConfirm(null);
  };

  const handleNavigateToArchive = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate('/books/archive', { state: { from: 'index' } });
    }, 50);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading books...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-transition-container ${isTransitioning ? 'slide-to-left-exit-active' : animationClass}`}>
      <div className="page-transition-wrapper">
        <div className="container mx-auto px-4 py-4">
          <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center space-x-2">
              <Book/>
              <span>My Books</span>
            </h1>
            <p className="text-muted-foreground">
              Manage and organize your book projects
            </p>
            <div className="pt-2">
            </div>
          </div>
          <div className="flex flex-col gap-2 justify-center items-center">
            <Button 
              variant="ghost" 
              onClick={handleNavigateToArchive}
              className="space-x-2"
            >
              <Archive className="h-4 w-4" />
              <span>View Archive</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowAddForm(true)} className="space-x-2  mt-5">
              <BookPlus className="h-6 w-6" />
              <span>Create a Book</span>
            </Button>
            
          </div>
        </div>

        {/* Books Grid */}
        {books.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <Book className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No books yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first book to get started with your projects.
              </p>
              <Button onClick={() => setShowAddForm(true)} className="space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Your First Book</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <BooksGrid books={books} onArchive={handleArchive} onPageUserManager={(bookId) => navigate(`/books/${bookId}/page-users`)} />
        )}

        {/* Add Book Wizard */}
        <BookCreationWizard 
          open={showAddForm} 
          onOpenChange={setShowAddForm} 
          onSuccess={fetchBooks} 
        />

        {/* Collaborator Dialog */}
        <Dialog open={!!showCollaboratorModal} onOpenChange={() => setShowCollaboratorModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Collaborators</DialogTitle>
              <DialogDescription>
                Add collaborators to work on this book with you.
              </DialogDescription>
            </DialogHeader>
            {showCollaboratorModal && (
              <CollaboratorModal bookId={showCollaboratorModal} onClose={() => setShowCollaboratorModal(null)} />
            )}
          </DialogContent>
        </Dialog>

        
        {/* Alert Dialog */}
        <Dialog open={!!showAlert} onOpenChange={() => setShowAlert(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{showAlert?.title}</DialogTitle>
              <DialogDescription>
                {showAlert?.message}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowAlert(null)}>
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Archive Confirmation Dialog */}
        <Dialog open={!!showArchiveConfirm} onOpenChange={() => setShowArchiveConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Archive Book</DialogTitle>
              <DialogDescription>
                Are you sure you want to archive this book? You can restore it later from the archive.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowArchiveConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirmArchive} className="flex-1">
                Archive Book
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          </div>
          
          <FloatingActionButton />
        </div>
      </div>
    </div>
  );
}



function CollaboratorModal({ bookId, onClose }: { bookId: number; onClose: () => void }) {
  const { token } = useAuth();
  const [email, setEmail] = useState('');

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/${bookId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setEmail('');
        // setShowAlert({ title: 'Success', message: 'Collaborator added successfully!' });
      } else {
        const error = await response.json();
        // setShowAlert({ title: 'Error', message: error.error || 'Failed to add collaborator' });
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
    }
  };

  return (
    <form onSubmit={handleAddCollaborator} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Add Collaborator by Email</label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button type="submit">
          Add Collaborator
        </Button>
      </div>
    </form>
  );
}

function BookCardPreview({ book }: { book: any }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchBookData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/books/${book.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const bookData = await response.json();
          const firstImage = bookData.pages?.flatMap(page => page.elements || [])
            .find(element => element.type === 'image' && element.src);
          
          if (firstImage?.src) {
            setPreviewUrl(firstImage.src);
          }
        }
      } catch (error) {
        console.error('Error fetching book data:', error);
      }
    };

    fetchBookData();
  }, [book.id, token]);

  return (
    <div className="h-32 overflow-hidden bg-white flex items-center justify-center">
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt="Book preview" 
          className="w-full h-full object-cover"
        />
      ) : (
        <Image className="h-16 w-16 text-gray-200" />
      )}
    </div>
  );
}