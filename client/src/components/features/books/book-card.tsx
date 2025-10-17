import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Badge } from '../../ui/composites/badge';
import { Tooltip } from '../../ui/composites/tooltip';
import { Users, Edit, FileText, Image, CircleHelp, RotateCcw, Trash2, Archive, Contact, Pen } from 'lucide-react';
import PageUserIcon from '../../ui/icons/page-user-icon';
import BookRoleBadge from './book-role-badge';

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
  userRole: 'owner' | 'publisher' | 'author';
  created_at: string;
  updated_at: string;
}

interface BookCardProps {
  book: Book;
  isArchived?: boolean;
  onRestore?: (bookId: number) => void;
  onDelete?: (bookId: number) => void;
  onArchive?: (bookId: number) => void;
  onPageUserManager?: (bookId: number) => void;
  hideActions?: boolean;
}

interface BookCardPreviewProps {
  book: Book;
  isArchived?: boolean;
  isEditing: boolean;
  editName: string;
  setEditName: (name: string) => void;
  handleRename: () => void;
  setIsEditing: (editing: boolean) => void;
}

function BookCardPreview({ book, isArchived, isEditing, editName, setEditName, handleRename, setIsEditing }: BookCardPreviewProps) {
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
    <div className="relative h-40 overflow-hidden bg-gray-100 rounded-t-lg">
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt="Book preview" 
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isArchived ? 'grayscale' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <Image className="h-16 w-16 text-gray-300" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex flex-start items-center gap-2">
          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setEditName(book.name); setIsEditing(false); }
              }}
              className="text-white font-semibold text-lg bg-transparent border-0  outline-none flex-1 focus:ring-0"
              autoFocus
            />
          ) : (
            <h3 className="text-white font-semibold text-lg line-clamp-2 mb-1 ">
              {book.name}
            </h3>
          )}
          {!isArchived && (
            <Tooltip content="Edit Book name" side="bottom">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => { setEditName(book.name); setIsEditing(true); }}
              className="text-white hover:bg-white/20 p-1 h-6 w-6"
            >
              <Pen className="h-3 w-3" />
            </Button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookCard({ book, isArchived = false, onRestore, onDelete, onArchive, onPageUserManager, hideActions = false }: BookCardProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(book.name);
  const { token } = useAuth();

  const handleRename = async () => {
    if (editName.trim() && editName !== book.name) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/books/${book.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name: editName.trim() })
        });
        if (response.ok) {
          book.name = editName.trim();
        }
      } catch (error) {
        console.error('Error renaming book:', error);
      }
    }
    setIsEditing(false);
  };

  return (
    <Card className="group border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden">
      <BookCardPreview 
        book={book} 
        isArchived={isArchived} 
        isEditing={isEditing}
        editName={editName}
        setEditName={setEditName}
        handleRename={handleRename}
        setIsEditing={setIsEditing}
      />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <span>{book.pageSize}</span>
            <span>•</span>
            <span className="capitalize">{book.orientation}</span>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Created: {new Date(book.created_at).toLocaleDateString()}
          {book.updated_at && ` • Updated: ${new Date(book.updated_at).toLocaleDateString()}`}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-muted-foreground">
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{book.pageCount} pages</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{book.collaboratorCount}</span>
            </div>
          </div>
                <BookRoleBadge userRole={book.userRole} variant='addressedToUser' />
        </div>

        {!hideActions && (
        <div className="flex gap-2 pt-2">
          {isArchived ? (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onRestore?.(book.id)}
                className="space-x-2 flex-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore</span>
              </Button>
              {book.isOwner && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onDelete?.(book.id)}
                  className="space-x-2"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="flex-1">
                <Tooltip content="Edit Book" side="bottom">
                <Link to={`/editor/${book.id}`} className="block">
                  <Button variant="default" size="sm" className="w-full space-x-2 bg-primary hover:bg-primary/90">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                </Tooltip>
              </div>
              <Tooltip content="Page User Manager" side="bottom">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onPageUserManager?.(book.id)}
                  className="space-x-2"
                >
                  <PageUserIcon className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Questions" side="bottom">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/questions/${book.id}`)}
                  className="space-x-2"
                >
                  <CircleHelp className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Archive" side="bottom">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onArchive?.(book.id)}
                  className="space-x-2"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}