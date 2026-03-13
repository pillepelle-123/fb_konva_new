import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Tooltip } from '../../ui/composites/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/overlays/popover';
import { Users, FileText, RotateCcw, Trash2, Archive, Pen, Settings, FilePenLine, Eye, Download, Ellipsis, CircleCheckBig, Circle } from 'lucide-react';
import BookRoleBadge from './book-role-badge';
import { getConsistentColor } from '../../../utils/consistent-color';
import { getConsistentIcon } from '../../../utils/consistent-icon';

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
  userRole?: 'owner' | 'publisher' | 'author';
  created_at?: string;
  updated_at?: string;
}

interface BookCardProps {
  book: Book;
  isArchived?: boolean;
  multiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (bookId: number) => void;
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
  multiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (bookId: number) => void;
}

function BookCardPreview({ book, isArchived, isEditing, editName, setEditName, handleRename, setIsEditing, multiSelectMode, isSelected, onToggleSelection }: BookCardPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { token } = useAuth();
  const placeholderColor = getConsistentColor(book.name);
  const PlaceholderIcon = getConsistentIcon(book.name);

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
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `#${placeholderColor}` }}>
          <PlaceholderIcon className="h-16 w-16 text-white/80" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {multiSelectMode && (
        <div className="absolute top-2 right-2 z-10">
          <Tooltip content={isSelected ? 'Deselect' : 'Select'} side="bottom">
            <Button
              variant="secondary"
              className="h-8 w-8 p-0 shrink-0 bg-white/40 hover:bg-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection?.(book.id);
              }}
            >
              {isSelected ? (
                <CircleCheckBig className="h-5 w-5 text-ring" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </Button>
          </Tooltip>
        </div>
      )}
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
              className="text-primary-foreground text-lg bg-transparent border-0  outline-none flex-1 focus:ring-0"
              autoFocus
            />
          ) : (
            <h3 className="text-primary-foreground text-lg line-clamp-2 mb-1 ">
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
              <Pen className="h-5 w-5" />
            </Button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

type ActionButton = {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'outline' | 'destructive';
  action: () => void;
};

export default function BookCard({
  book,
  isArchived = false,
  multiSelectMode = false,
  isSelected = false,
  onToggleSelection,
  onRestore,
  onDelete,
  onArchive,
  onPageUserManager,
  hideActions = false,
}: BookCardProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(book.name);
  const { token } = useAuth();
  const actionsContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  const actionButtons: ActionButton[] = [
    { id: 'edit', label: 'Edit Book', icon: FilePenLine, variant: 'default', action: () => navigate(`/editor/${book.id}`) },
    { id: 'preview', label: 'Preview Book', icon: Eye, variant: 'outline', action: () => navigate(`/editor/${book.id}?preview=true`) },
    { id: 'exports', label: 'Exports', icon: Download, variant: 'outline', action: () => navigate(`/books/${book.id}/export`) },
    ...((book.userRole === 'owner' || book.userRole === 'publisher') ? [
      { id: 'manage', label: 'Manage Book', icon: Settings, variant: 'outline' as const, action: () => navigate(`/books/${book.id}/manager`) },
      { id: 'archive', label: 'Archive Book', icon: Archive, variant: 'outline' as const, action: () => onArchive?.(book.id) },
    ] : []),
  ];

  useEffect(() => {
    const el = actionsContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getVisibleCount = (width: number) => {
    if (width < 180) return 1;
    if (width < 260) return 2;
    if (width < 320) return 3;
    if (width < 380) return 4;
    return actionButtons.length;
  };

  let visibleCount = Math.min(getVisibleCount(containerWidth), actionButtons.length);
  let overflowButtons = actionButtons.slice(visibleCount);

  // Ellipsis only makes sense when it hides 2+ buttons. With 1 overflow button, show it directly.
  if (overflowButtons.length === 1) {
    visibleCount += 1;
    overflowButtons = [];
  }

  const hasOverflow = overflowButtons.length >= 2;
  const visibleButtons = actionButtons.slice(0, visibleCount);

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
    <Card
      className={`group border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${multiSelectMode ? 'cursor-pointer' : 'hover:border-primary/20'} ${isSelected ? 'border-4 border-muted-foreground rounded-xl' : ''}`}
      onClick={multiSelectMode ? () => onToggleSelection?.(book.id) : undefined}
    >
      <BookCardPreview
        book={book}
        isArchived={isArchived}
        isEditing={isEditing}
        editName={editName}
        setEditName={setEditName}
        handleRename={handleRename}
        setIsEditing={setIsEditing}
        multiSelectMode={multiSelectMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
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
          {book.created_at && (
            <>
              Created: {new Date(book.created_at).toLocaleDateString()}
              {book.updated_at && ` • Updated: ${new Date(book.updated_at).toLocaleDateString()}`}
            </>
          )}
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

        {!hideActions && !multiSelectMode && (
        <div ref={actionsContainerRef} className="flex gap-2 pt-2 min-w-0">
          {isArchived ? (
            <>
              <Button 
                variant="outline" 
                size="default"
                onClick={() => onRestore?.(book.id)}
                className="space-x-2 flex-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore</span>
              </Button>
              {book.isOwner && (
                <Button 
                  variant="destructive_outline" 
                  size="default"
                  onClick={() => onDelete?.(book.id)}
                  className="space-x-2"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>Delete</span>
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <Tooltip content="Edit Book" side="bottom" fullWidth>
                  <Link to={`/editor/${book.id}`} className="block w-full">
                    <Button variant="default" size="default" className="w-full space-x-2 bg-primary hover:bg-primary/90">
                      <FilePenLine className="h-5 w-5" />
                      <span>Edit Book</span>
                    </Button>
                  </Link>
                </Tooltip>
              </div>
              {visibleButtons.slice(1).map((btn) => (
                <Tooltip key={btn.id} content={btn.label} side="bottom">
                  <Button
                    variant={btn.variant}
                    size="default"
                    onClick={() => btn.action()}
                    className="space-x-2 shrink-0"
                  >
                    <btn.icon className="h-5 w-5" />
                  </Button>
                </Tooltip>
              ))}
              {hasOverflow && (
                <Tooltip content="Weitere Aktionen" side="bottom">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="default" className="shrink-0">
                        <Ellipsis className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end" side="top">
                    <div className="flex flex-col gap-1">
                      {overflowButtons.map((btn) => (
                        <Button
                          key={btn.id}
                          variant={btn.variant}
                          size="default"
                          onClick={() => btn.action()}
                          className="w-full justify-start gap-2"
                        >
                          <btn.icon className="h-4 w-4 shrink-0" />
                          <span>{btn.label}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                  </Popover>
                </Tooltip>
              )}
            </>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}