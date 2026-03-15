import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Card } from '../../ui/composites/card';
import { Tooltip } from '../../ui/composites/tooltip';
import { Users, FileText, RotateCcw, Trash2, Archive, Pen, Settings, FilePenLine, Eye, Download, CircleCheckBig, Circle } from 'lucide-react';
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
  hideActions?: boolean;
  isEditing: boolean;
  editName: string;
  setEditName: (name: string) => void;
  handleRename: () => void;
  setIsEditing: (editing: boolean) => void;
  onRestore?: (bookId: number) => void;
  onDelete?: (bookId: number) => void;
  onArchive?: (bookId: number) => void;
  onOpenEditor: () => void;
  onOpenPreview: () => void;
  onOpenExports: () => void;
  onOpenManage: () => void;
  multiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (bookId: number) => void;
}

function BookCardPreview({
  book,
  isArchived,
  hideActions,
  isEditing,
  editName,
  setEditName,
  handleRename,
  setIsEditing,
  onRestore,
  onDelete,
  onArchive,
  onOpenEditor,
  onOpenPreview,
  onOpenExports,
  onOpenManage,
  multiSelectMode,
  isSelected,
  onToggleSelection
}: BookCardPreviewProps) {
  const placeholderColor = getConsistentColor(book.name);
  const PlaceholderIcon = getConsistentIcon(book.name);

  return (
    <div
      className={`relative min-h-[420px] overflow-hidden rounded-xl border border-black/20 shadow-inner ${isArchived ? 'grayscale' : ''}`}
      style={{ backgroundColor: `#${placeholderColor}` }}
    >
      <div className="absolute left-0 top-0 h-full w-8 bg-black/20 border-r border-white/30" />
      <div className="absolute left-[7px] top-8 flex flex-col gap-5">
        <span className="h-3 w-3 rounded-full bg-white/60" />
        <span className="h-3 w-3 rounded-full bg-white/60" />
        <span className="h-3 w-3 rounded-full bg-white/60" />
      </div>
      <div className="absolute right-4 bottom-3 flex flex-col gap-1">
        <span className="h-1 w-14 rounded-full bg-white/60" />
        <span className="h-1 w-20 rounded-full bg-white/55" />
        <span className="h-1 w-16 rounded-full bg-white/50" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />

      <div className="relative z-10 flex min-h-[420px] flex-col p-4 pr-0">
        <div className="mb-4 flex items-start justify-between gap-2 pl-7">
          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setEditName(book.name); setIsEditing(false); }
              }}
              className="text-white text-xl bg-transparent border-0 outline-none flex-1 focus:ring-0 font-semibold"
              autoFocus
            />
          ) : (
            <h3 className="text-white text-xl line-clamp-3 leading-tight font-semibold drop-shadow-sm">
              {book.name}
            </h3>
          )}

          {!isArchived && (
            <Tooltip content="Edit Book name" side="bottom">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => { setEditName(book.name); setIsEditing(true); }}
                className="text-white hover:bg-white/20 p-1 h-7 w-7"
              >
                <Pen className="h-5 w-5" />
              </Button>
            </Tooltip>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center pl-6">
          <PlaceholderIcon className="h-24 w-24 text-white/80 drop-shadow-md" />
        </div>

        <div className="space-y-3 bg-white/70 p-3 ml-4 backdrop-blur-[1px]">
          <div className="flex items-center justify-between text-xs text-foreground">
            <div className="flex items-center space-x-2">
              <span>{book.pageSize}</span>
              <span>•</span>
              <span className="capitalize">{book.orientation}</span>
            </div>
            <BookRoleBadge userRole={book.userRole} variant='addressedToUser' />
          </div>

          <div className="flex items-center space-x-4 text-xs text-foreground">
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{book.pageCount} pages</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{book.collaboratorCount}</span>
            </div>
          </div>

          <div className="text-[11px] text-foreground">
            {book.created_at && (
              <>
                Created: {new Date(book.created_at).toLocaleDateString()}
                {book.updated_at && ` • Updated: ${new Date(book.updated_at).toLocaleDateString()}`}
              </>
            )}
          </div>

          {!hideActions && !multiSelectMode && (
            <div className="flex flex-wrap gap-2 pt-1">
              {isArchived ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestore?.(book.id)}
                    className="space-x-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore</span>
                  </Button>
                  {book.isOwner && (
                    <Button
                      variant="destructive_outline"
                      size="sm"
                      onClick={() => onDelete?.(book.id)}
                      className="space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="default" size="sm" onClick={onOpenEditor} className="space-x-2 bg-white text-black hover:bg-white/90">
                    <FilePenLine className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={onOpenPreview} className="space-x-2 text-white border-white/60 hover:bg-white/15">
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={onOpenExports} className="space-x-2 text-white border-white/60 hover:bg-white/15">
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </Button>
                  {(book.userRole === 'owner' || book.userRole === 'publisher') && (
                    <>
                      <Button variant="outline" size="sm" onClick={onOpenManage} className="space-x-2 text-white border-white/60 hover:bg-white/15">
                        <Settings className="h-4 w-4" />
                        <span>Manage</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onArchive?.(book.id)} className="space-x-2 text-white border-white/60 hover:bg-white/15">
                        <Archive className="h-4 w-4" />
                        <span>Archive</span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}

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
      className={`group border transition-all duration-200 overflow-hidden hover:[box-shadow:0_18px_40px_rgba(0,0,0,0.35)] ${multiSelectMode ? 'cursor-pointer shadow-sm' : 'hover:border-primary/40 rounded-xl shadow-lg'} ${isSelected ? 'border border-muted-foreground rounded-xl' : ''}`}
      onClick={multiSelectMode ? () => onToggleSelection?.(book.id) : undefined}
    >
      <BookCardPreview
        book={book}
        isArchived={isArchived}
        hideActions={hideActions}
        isEditing={isEditing}
        editName={editName}
        setEditName={setEditName}
        handleRename={handleRename}
        setIsEditing={setIsEditing}
        onRestore={onRestore}
        onDelete={onDelete}
        onArchive={onArchive}
        onOpenEditor={() => navigate(`/editor/${book.id}`)}
        onOpenPreview={() => navigate(`/editor/${book.id}?preview=true`)}
        onOpenExports={() => navigate(`/books/${book.id}/export`)}
        onOpenManage={() => onPageUserManager?.(book.id) ?? navigate(`/books/${book.id}/manager`)}
        multiSelectMode={multiSelectMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
      />
    </Card>
  );
}