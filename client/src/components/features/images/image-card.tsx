import { Link } from 'react-router-dom';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Tooltip } from '../../ui/composites/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/overlays/popover';
import { CircleCheckBig, Circle, Trash2, Calendar, Book } from 'lucide-react';

interface ImageData {
  id: string;
  filename: string;
  original_name: string;
  book_name?: string;
  book_id: number;
  created_at: string;
  file_path: string;
  assignments?: Array<{
    bookId: number;
    bookName: string;
    pageNumber: number;
  }>;
}

interface ImageCardProps {
  image: ImageData;
  multiSelectMode?: boolean;
  isSelected?: boolean;
  mode?: 'select' | 'view';
  onImageClick?: () => void;
  onImageSelect?: (imageId: string, imageUrl: string) => void;
  onToggleSelection?: (imageId: string) => void;
  onDelete?: (imageId: string) => void;
  getThumbUrl: (image: ImageData) => string;
  getImageUrl: (image: ImageData) => string;
  getFileUrlForCanvas?: (image: ImageData) => string;
}

export default function ImageCard({
  image,
  multiSelectMode = false,
  isSelected = false,
  mode = 'view',
  onImageClick,
  onImageSelect,
  onToggleSelection,
  onDelete,
  getThumbUrl,
  getImageUrl,
  getFileUrlForCanvas
}: ImageCardProps) {
  const assignments = Array.isArray(image.assignments) ? image.assignments : [];
  const assignmentCount = assignments.length;

  const handleImageClick = () => {
    if (multiSelectMode) {
      onToggleSelection?.(image.id);
    } else if (mode === 'select') {
      const urlForCanvas = getFileUrlForCanvas ? getFileUrlForCanvas(image) : getImageUrl(image);
      onImageSelect?.(image.id, urlForCanvas);
    } else {
      onImageClick?.();
    }
  };

  return (
    <Card className={`group border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative ${isSelected ? 'border-4 border-muted-foreground rounded-xl' : ''}`}>
      <div className={`relative aspect-square overflow-hidden bg-gray-100 rounded-t-lg ${isSelected ? 'border-ring' : ''}`}>
        <img
          src={getThumbUrl(image)}
          alt={image.original_name}
          crossOrigin="use-credentials"
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
          onClick={handleImageClick}
          onError={(e) => {
            e.currentTarget.src = getImageUrl(image);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        {multiSelectMode && (
          <div className="absolute top-2 right-2 z-10">
            <Tooltip content={isSelected ? 'Deselect' : 'Select'} side="bottom">
              <Button
                variant="secondary"
                className="h-8 w-8 p-0 shrink-0 bg-white/40 hover:bg-white shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection?.(image.id);
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
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <h3 className="text-white font-medium text-sm line-clamp-2">
          </h3>
        </div>
      </div>
      
      <CardContent className="p-2 sm:p-3 space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          {/* <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(image.created_at).toLocaleDateString()}</span>
          </div> */}
        </div>

        {!multiSelectMode && mode !== 'select' && (
          <div className="flex items-center justify-between gap-2">
            {assignmentCount === 0 ? (
              <Tooltip content="Not assigned to books" side="bottom">
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5 opacity-40 cursor-default">
                  <Book className="h-4 w-4" />
                  <span>0</span>
                </Button>
              </Tooltip>
            ) : (
              <Tooltip content={`Assigned to ${assignmentCount} book${assignmentCount === 1 ? '' : 's'}`} side="bottom">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="default" className="flex items-center gap-1.5">
                      <Book className="h-4 w-4" />
                      <span>{assignmentCount}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start" side="top">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Assigned books</p>
                      <div className="space-y-1.5">
                        {assignments.map((assignment) => (
                          <div
                            key={`${image.id}-${assignment.bookId}-${assignment.pageNumber}`}
                            className="flex items-center justify-between gap-2 rounded-md border p-2"
                          >
                            <span className="text-xs text-muted-foreground">
                              {assignment.bookName}, page {assignment.pageNumber}
                            </span>
                            <Button asChild variant="link" size="xs" className="h-auto p-0">
                              <Link to={`/editor/${assignment.bookId}?page=${assignment.pageNumber}`}>
                                Open
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </Tooltip>
            )}

            <Button
              variant="destructive_outline"
              size="default"
              onClick={() => onDelete?.(image.id)}
              className="space-x-2"
            >
              <Trash2 className="h-5 w-5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}