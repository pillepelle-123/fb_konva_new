import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { CircleCheckBig, Circle, Trash2, Calendar } from 'lucide-react';

interface Photo {
  id: number;
  filename: string;
  original_name: string;
  book_name?: string;
  book_id: number;
  created_at: string;
  file_path: string;
}

interface PhotoCardProps {
  photo: Photo;
  multiSelectMode?: boolean;
  isSelected?: boolean;
  mode?: 'select' | 'view';
  onPhotoClick?: () => void;
  onPhotoSelect?: (photoId: number, photoUrl: string) => void;
  onToggleSelection?: (photoId: number) => void;
  onDelete?: (photoId: number) => void;
  getThumbUrl: (photo: Photo) => string;
  getPhotoUrl: (photo: Photo) => string;
}

export default function PhotoCard({
  photo,
  multiSelectMode = false,
  isSelected = false,
  mode = 'view',
  onPhotoClick,
  onPhotoSelect,
  onToggleSelection,
  onDelete,
  getThumbUrl,
  getPhotoUrl
}: PhotoCardProps) {
  const handleImageClick = () => {
    if (mode === 'select') {
      onPhotoSelect?.(photo.id, getPhotoUrl(photo));
    } else {
      onPhotoClick?.();
    }
  };

  return (
    <Card className={`group border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden relative" ${isSelected ? 'border-4 border-ring hover:border-4 hover:border-ring' : ''}`}
    >
  
      <div className={`relative aspect-square overflow-hidden bg-gray-100 rounded-t-lg} {isSelected ? 'border-ring' : ''}`}>
        <img
          src={getThumbUrl(photo)}
          alt={photo.original_name}
          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
          onClick={handleImageClick}
          onError={(e) => {
            e.currentTarget.src = getPhotoUrl(photo);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <h3 className="text-white font-medium text-sm line-clamp-2">
            {/* {photo.book_name || 'No book'} */}
          {/* {photo.original_name} */}
          </h3>
        </div>
      </div>
      
      <CardContent className="p-3 space-y-2">
        {/* <div className="text-xs text-muted-foreground line-clamp-1">
          {photo.original_name}
        </div> */}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(photo.created_at).toLocaleDateString()}</span>
          </div>

          {!multiSelectMode && mode !== 'select' && (
          <Button
            variant="destructive"
            size="sm"
            // className="w-2 space-x-1"
            onClick={() => onDelete?.(photo.id)}
          >
            <Trash2 className="h-3 w-3" />
            {/* <span>Delete</span> */}
          </Button>
        )}

      {multiSelectMode && (
        <Button
          variant="standard"
          // size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onToggleSelection?.(photo.id)}
        >
          {isSelected ? (
            <CircleCheckBig className="h-5 w-5 text-ring" />
          ) : (
            <Circle className="h-5 w-5 " />
          )}
        </Button>
      )}

        </div>

        
      </CardContent>
    </Card>
  );
}