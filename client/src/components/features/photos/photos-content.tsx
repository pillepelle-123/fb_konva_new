import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/primitives/button';
import { ButtonGroup } from '../../ui/composites/button-group';
import { Card, CardContent } from '../../ui/composites/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Image, Plus, Trash2, ChevronLeft, ChevronRight, X, SquareCheckBig, SquareX, Copy, CopyCheck } from 'lucide-react';
import PhotoCard from './photo-card';

interface Photo {
  id: number;
  filename: string;
  original_name: string;
  book_name: string;
  book_id: number;
  created_at: string;
  file_path: string;
}

interface PhotosContentProps {
  token: string;
  onPhotoSelect?: (photoId: number, photoUrl: string) => void;
  onPhotoUpload?: (photoUrl: string) => void;
  mode?: 'manage' | 'select';
  onClose?: () => void;
  showAsContent?: boolean;
}

export default function PhotosContent({ 
  token, 
  onPhotoSelect, 
  onPhotoUpload,
  mode = 'manage', 
  onClose,
  showAsContent = false 
}: PhotosContentProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number[] | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadRef = useRef<string>('');

  useEffect(() => {
    fetchPhotos();
  }, [currentPage]);

  const fetchPhotos = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/photos?page=${currentPage}&limit=15`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0 || isUploading) return;
    
    // Create a signature for this file set to prevent duplicate uploads
    const fileSignature = Array.from(files).map(f => `${f.name}-${f.size}-${f.lastModified}`).join('|');
    if (lastUploadRef.current === fileSignature) {
      return; // Same files already being processed
    }
    lastUploadRef.current = fileSignature;
    
    setIsUploading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Get book ID first
      const booksResponse = await fetch(`${apiUrl}/books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let bookId = null;
      if (booksResponse.ok) {
        const booksData = await booksResponse.json();
        bookId = booksData.length > 0 ? booksData[0].id : null;
      }
      
      // Create FormData with all files at once
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });
      if (bookId) {
        formData.append('bookId', bookId.toString());
      }
      
      const response = await fetch(`${apiUrl}/photos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchPhotos();
        
        // If in select mode and callback provided, auto-add first uploaded photo
        if (mode === 'select' && onPhotoUpload && data.photos && data.photos.length > 0) {
          const firstPhoto = data.photos[0];
          const photoUrl = `${apiUrl.replace('/api', '')}/uploads/${firstPhoto.file_path}`;
          onPhotoUpload(photoUrl);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      // Clear the signature after a delay to allow new uploads
      setTimeout(() => {
        lastUploadRef.current = '';
      }, 2000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && !isUploading) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDeletePhotos = async (photoIds: number[]) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/photos`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ photoIds })
      });
      if (response.ok) {
        fetchPhotos();
        setSelectedPhotos(new Set());
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const togglePhotoSelection = (photoId: number) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(new Set(photos.map(p => p.id)));
  };

  const deselectAllPhotos = () => {
    setSelectedPhotos(new Set());
  };

  const getPhotoUrl = (photo: Photo) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiUrl.replace('/api', '')}/uploads/${photo.file_path}`;
  };

  const getThumbUrl = (photo: Photo) => {
    const ext = photo.filename.split('.').pop();
    const nameWithoutExt = photo.filename.replace(`.${ext}`, '');
    const thumbFilename = `${nameWithoutExt}_thumb.${ext}`;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiUrl.replace('/api', '')}/uploads/${photo.file_path.replace(photo.filename, thumbFilename)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <>


      {showAsContent && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center space-x-2">
              <Image className="h-6 w-6" />
              <span>My Photos</span>
            </h1>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Back
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">Manage your uploaded photos</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex gap-2">
          {multiSelectMode ? (
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => {
                  setMultiSelectMode(false);
                  deselectAllPhotos();
                }}
              >
                <SquareX className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={selectAllPhotos}
                disabled={selectedPhotos.size === photos.length}
              >
                <CopyCheck className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={deselectAllPhotos}
                disabled={selectedPhotos.size === 0}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(Array.from(selectedPhotos))}
                disabled={selectedPhotos.size === 0}
                className="space-x-2"
              >
                <Trash2 className="h-3 w-3" />
                <span> ({selectedPhotos.size})</span>
              </Button>
            </ButtonGroup>
          ) : (
            <Button
              variant="outline"
              onClick={() => setMultiSelectMode(true)}
            >
              <SquareCheckBig className="h-4 w-4" />
            </Button>
          )}

          <Button variant="default" onClick={() => fileInputRef.current?.click()} className="space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Photos</span>
          </Button>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">
            {isUploading ? 'Uploading photos...' : 'Drop photos here or click "Add Photos" to upload'}
          </p>
          <p className="text-muted-foreground">Supports JPG, PNG, GIF, WebP up to 10MB</p>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <Image className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No photos yet</h3>
              <p className="text-muted-foreground mb-6">Upload your first photos to get started.</p>
              <Button onClick={() => fileInputRef.current?.click()} className="space-x-2">
                <Plus className="h-4 w-4" />
                <span>Upload Photos</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                multiSelectMode={multiSelectMode}
                isSelected={selectedPhotos.has(photo.id)}
                mode={mode}
                onPhotoClick={() => setLightboxPhoto(photo)}
                onPhotoSelect={onPhotoSelect}
                onToggleSelection={togglePhotoSelection}
                onDelete={(photoId) => setShowDeleteConfirm([photoId])}
                getThumbUrl={getThumbUrl}
                getPhotoUrl={getPhotoUrl}
              />
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Photos</DialogTitle>
              <DialogDescription>
                Do you permanently delete {showDeleteConfirm?.length} photo{showDeleteConfirm?.length !== 1 ? 's' : ''}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (showDeleteConfirm) {
                    handleDeletePhotos(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lightbox */}
        <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setLightboxPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              {lightboxPhoto && (
                <img
                  src={getPhotoUrl(lightboxPhoto)}
                  alt={lightboxPhoto.original_name}
                  className="w-full h-auto max-h-[85vh] object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>


    </>
  );
}