import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Button } from './ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tooltip } from './ui/tooltip';
import { Book, Users, Edit, Settings, FileText, ChevronLeft, ChevronRight, Image, CircleHelp } from 'lucide-react';

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

interface BooksGridProps {
  books: Book[];
  itemsPerPage?: number;
}

function BookCardPreview({ book }: { book: Book }) {
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
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <Image className="h-16 w-16 text-gray-200" />
      )}
    </div>
  );
}

export default function BooksGrid({ books, itemsPerPage = 10 }: BooksGridProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(books.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBooks = books.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
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
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentBooks.map(book => (
          <Card key={book.id} className="group border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden">
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
                  <CardDescription className="text-xs text-muted-foreground">
                    Created: {new Date(book.created_at).toLocaleDateString()}
                    {book.updated_at && ` • Updated: ${new Date(book.updated_at).toLocaleDateString()}`}
                  </CardDescription>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Book className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-ref-icon">
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
                    ? 'bg-highlight text-primary-foreground' 
                    : 'bg-muted-foreground text-background'
                }`}>
                  {book.isOwner ? 'You are the publisher' : 'You are an author'}
                </span>
              </div>
            </CardHeader>
            <BookCardPreview book={book} />
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <div className="flex-1">
                  <Tooltip content="Edit" side="bottom">
                    <Link to={`/editor/${book.id}`} className="block">
                      <Button variant="default" size="sm" className="w-full space-x-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </Tooltip>
                </div>
                <Tooltip content="Friends" side="bottom">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/friends/${book.id}`)}
                    className="space-x-2"
                  >
                    <Users className="h-4 w-4" />
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}