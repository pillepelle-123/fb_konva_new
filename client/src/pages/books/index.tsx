import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { BookOpen, Plus, Users, Archive, Edit, Settings, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
}

export default function BooksList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Books</h1>
            <p className="text-muted-foreground">
              Manage and organize your book projects
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)} className="space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Book</span>
          </Button>
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

        {/* Books Grid */}
        {books.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
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
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      book.isOwner 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {book.isOwner ? 'Owner' : 'Collaborator'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/editor/${book.id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full space-x-2">
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                    </Link>
                    {book.isOwner && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/questions/${book.id}`)}
                        className="space-x-2"
                      >
                        <Settings className="h-3 w-3" />
                        <span>Questions</span>
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    {book.isOwner && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowCollaboratorModal(book.id)}
                        className="space-x-2 text-muted-foreground hover:text-foreground"
                      >
                        <Users className="h-3 w-3" />
                        <span>Collaborators</span>
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleArchive(book.id)}
                      className="space-x-2 text-destructive hover:text-destructive"
                    >
                      <Archive className="h-3 w-3" />
                      <span>Archive</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>

          </>
        )}

        {/* Add Book Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Book</DialogTitle>
              <DialogDescription>
                Set up your new book project with the preferred format.
              </DialogDescription>
            </DialogHeader>
            <AddBookForm onClose={() => setShowAddForm(false)} onSuccess={fetchBooks} />
          </DialogContent>
        </Dialog>

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
  );
}

function AddBookForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, pageSize, orientation })
      });
      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error creating book:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Book Name</label>
        <Input
          id="name"
          type="text"
          placeholder="Enter book name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="pageSize" className="text-sm font-medium">Page Size</label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="A3">A3</option>
          <option value="Letter">Letter</option>
          <option value="Square">Square</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Orientation</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="portrait"
              checked={orientation === 'portrait'}
              onChange={(e) => setOrientation(e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span>Portrait</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="landscape"
              checked={orientation === 'landscape'}
              onChange={(e) => setOrientation(e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span>Landscape</span>
          </label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Create Book
        </Button>
      </div>
    </form>
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