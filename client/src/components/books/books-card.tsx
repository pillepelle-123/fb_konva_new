import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/primitives/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tooltip } from '../ui/tooltip';
import { Users, Edit, FileText, Image, CircleHelp, RotateCcw, Trash2, Archive, Contact } from 'lucide-react';

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
  created_at: string;
  updated_at: string;
}

interface BookCardProps {
  book: Book;
  isArchived?: boolean;
  onRestore?: (bookId: number) => void;
  onDelete?: (bookId: number) => void;
  onArchive?: (bookId: number) => void;
}

function BookCardPreview({ book, isArchived }: { book: Book; isArchived?: boolean }) {
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
        <h3 className="text-white font-semibold text-lg line-clamp-2 mb-1">
          {book.name}
        </h3>
      </div>
    </div>
  );
}

export default function BookCard({ book, isArchived = false, onRestore, onDelete, onArchive }: BookCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="group border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden">
      <BookCardPreview book={book} isArchived={isArchived} />
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
                <Badge variant={book.isOwner ? 'highlight' : 'secondary'}>
                  {book.isOwner ? 'You are the publisher' : 'You are an author'}
                </Badge>
        </div>

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
                <Link to={`/editor/${book.id}`} className="block">
                  <Button variant="default" size="sm" className="w-full space-x-2 bg-gray-600 hover:bg-gray-700">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <Tooltip content="Friends" side="bottom">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/books/${book.id}/friends`)}
                  className="space-x-2"
                >
                  <Contact className="h-4 w-4" />
                </Button>
              </Tooltip>
              {book.isOwner && (
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
              )}
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
      </CardContent>
    </Card>
  );
}