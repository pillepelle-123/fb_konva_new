import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent } from '../../components/ui/composites/card';
import { Input } from '../../components/ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import BooksGrid from '../../components/features/books/book-grid';
import { Slider } from '../../components/ui/primitives/slider';
import MultipleSelector, { type Option } from '../../components/ui/multi-select';
import { Book, BookPlus, Archive, ChevronRight, Funnel, RotateCcw, Plus } from 'lucide-react';
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
  created_at?: string;
  updated_at?: string;
}

const PAGE_SIZE_OPTIONS: Option[] = [
  { value: 'A4', label: 'A4' },
  { value: 'A5', label: 'A5' },
  { value: 'Square', label: 'Square (21×21)' },
];
const ORIENTATION_OPTIONS: Option[] = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];
const USER_ROLE_OPTIONS: Option[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'author', label: 'Author' },
];

export default function BooksList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  const [filterBarOpen, setFilterBarOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterPageSizes, setFilterPageSizes] = useState<Option[]>([]);
  const [filterOrientations, setFilterOrientations] = useState<Option[]>([]);
  const [filterPageCountMin, setFilterPageCountMin] = useState(0);
  const [filterUserRoles, setFilterUserRoles] = useState<Option[]>([]);

  const [appliedFilterName, setAppliedFilterName] = useState('');
  const [appliedFilterPageSizes, setAppliedFilterPageSizes] = useState<Option[]>([]);
  const [appliedFilterOrientations, setAppliedFilterOrientations] = useState<Option[]>([]);
  const [appliedFilterPageCountMin, setAppliedFilterPageCountMin] = useState(0);
  const [appliedFilterUserRoles, setAppliedFilterUserRoles] = useState<Option[]>([]);

  const maxPageCount = useMemo(() => Math.max(...books.map((b) => b.pageCount), 1), [books]);

  const appliedPageSizeValues = useMemo(() => new Set(appliedFilterPageSizes.map((o) => o.value)), [appliedFilterPageSizes]);
  const appliedOrientationValues = useMemo(() => new Set(appliedFilterOrientations.map((o) => o.value)), [appliedFilterOrientations]);
  const appliedUserRoleValues = useMemo(() => new Set(appliedFilterUserRoles.map((o) => o.value)), [appliedFilterUserRoles]);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      if (appliedFilterName.trim()) {
        const nameLower = book.name.toLowerCase();
        const searchLower = appliedFilterName.toLowerCase();
        if (!nameLower.includes(searchLower)) return false;
      }
      if (appliedPageSizeValues.size > 0 && !appliedPageSizeValues.has(book.pageSize)) return false;
      if (appliedOrientationValues.size > 0 && !appliedOrientationValues.has(book.orientation)) return false;
      if (book.pageCount < appliedFilterPageCountMin) return false;
      if (appliedUserRoleValues.size > 0 && !appliedUserRoleValues.has(book.userRole)) return false;
      return true;
    });
  }, [books, appliedFilterName, appliedPageSizeValues, appliedOrientationValues, appliedFilterPageCountMin, appliedUserRoleValues]);

  const hasActiveFilters =
    appliedFilterName.trim() !== '' ||
    appliedFilterPageSizes.length > 0 ||
    appliedFilterOrientations.length > 0 ||
    appliedFilterPageCountMin > 0 ||
    appliedFilterUserRoles.length > 0;

  const applyFilters = () => {
    setAppliedFilterName(filterName);
    setAppliedFilterPageSizes(filterPageSizes);
    setAppliedFilterOrientations(filterOrientations);
    setAppliedFilterPageCountMin(filterPageCountMin);
    setAppliedFilterUserRoles(filterUserRoles);
  };

  const resetFilters = () => {
    setFilterName('');
    setFilterPageSizes([]);
    setFilterOrientations([]);
    setFilterPageCountMin(0);
    setFilterUserRoles([]);
    setAppliedFilterName('');
    setAppliedFilterPageSizes([]);
    setAppliedFilterOrientations([]);
    setAppliedFilterPageCountMin(0);
    setAppliedFilterUserRoles([]);
  };

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
    <>
    <div className={`page-transition-container ${isTransitioning ? 'slide-to-left-exit-active' : animationClass}`}>
      <div className="page-transition-wrapper">
        <div className="container mx-auto px-4">
          {/* Fixierte Leiste */}
          <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-sm border-b">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Book className="h-6 w-6 shrink-0 text-foreground" />
                <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
                  My Books
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={filterBarOpen ? 'default' : 'ghost'}
                  onClick={() => setFilterBarOpen((v) => !v)}
                  className="space-x-2"
                >
                  <Funnel className="h-4 w-4" />
                  <span>Filter Books</span>
                  {hasActiveFilters && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-primary-foreground/80" aria-hidden />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNavigateToArchive}
                  className="space-x-2"
                >
                  <Archive className="h-4 w-4" />
                  <span>View Archive</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => navigate('/books/create')}
                  className="space-x-2"
                  variant="highlight"
                >
                  <BookPlus className="h-5 w-5" />
                  <span>Create a Book</span>
                </Button>
              </div>
            </div>

            {filterBarOpen && (
              <div className="mt-4 flex flex-row items-start gap-4">
                <div className="flex flex-row flex-wrap items-start gap-4 flex-1 min-w-0">
                  <div className="flex flex-col shrink-0">
                    <span className="text-xs text-muted-foreground mb-1">Name</span>
                    <Input
                      placeholder="Contains..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="h-8 text-sm w-[140px]"
                    />
                  </div>
                  <div className="flex flex-col shrink-0 w-[140px]">
                    <span className="text-xs text-muted-foreground mb-1">Page Size</span>
                    <MultipleSelector
                      value={filterPageSizes}
                      onChange={setFilterPageSizes}
                      options={PAGE_SIZE_OPTIONS}
                      placeholder="All"
                      hidePlaceholderWhenSelected
                      className="min-h-8"
                    />
                  </div>
                  <div className="flex flex-col shrink-0 w-[140px]">
                    <span className="text-xs text-muted-foreground mb-1">Orientation</span>
                    <MultipleSelector
                      value={filterOrientations}
                      onChange={setFilterOrientations}
                      options={ORIENTATION_OPTIONS}
                      placeholder="All"
                      hidePlaceholderWhenSelected
                      className="min-h-8"
                    />
                  </div>
                  <div className="flex flex-col shrink-0 w-[140px]">
                    <span className="text-xs text-muted-foreground mb-1">Page Count ≥</span>
                    <Slider
                      label="Page Count ≥"
                      value={filterPageCountMin}
                      onChange={setFilterPageCountMin}
                      min={0}
                      max={maxPageCount}
                      step={1}
                      unit=""
                      hasLabel={false}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="flex flex-col shrink-0 w-[140px]">
                    <span className="text-xs text-muted-foreground mb-1">My Role</span>
                    <MultipleSelector
                      value={filterUserRoles}
                      onChange={setFilterUserRoles}
                      options={USER_ROLE_OPTIONS}
                      placeholder="All"
                      hidePlaceholderWhenSelected
                      className="min-h-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end">
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="space-x-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Filter</span>
                  </Button>
                  <Button variant="primary" size="sm" onClick={applyFilters}>
                    Apply Filter
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 py-4">
        <p className="text-muted-foreground -mt-2">
          Manage and organize your book projects
        </p>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <Book className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {books.length === 0 ? 'No books yet' : 'No books match your filters'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {books.length === 0
                  ? 'Create your first book to get started with your projects.'
                  : 'Try adjusting or resetting your filter criteria.'}
              </p>
              {books.length === 0 ? (
                <Button onClick={() => navigate('/books/create')} className="space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Your First Book</span>
                </Button>
              ) : (
                <Button variant="outline" onClick={resetFilters} className="space-x-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset Filter</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <BooksGrid books={filteredBooks} onArchive={handleArchive} onPageUserManager={(bookId) => navigate(`/books/${bookId}/page-users`)} />
        )}


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
        </div>
      </div>
    </div>
    <FloatingActionButton />
    </>
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