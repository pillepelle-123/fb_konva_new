import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/primitives/button';
import { ButtonGroup } from '../../ui/composites/button-group';
import { Card, CardContent } from '../../ui/composites/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Alert, AlertDescription } from '../../ui/composites/alert';
import { Image, Plus, Trash2, ChevronLeft, ChevronRight, X, SquareCheckBig, SquareX, Copy, CopyCheck, AlertTriangle } from 'lucide-react';
import ImageCard from './image-card';

interface ImageData {
  id: number;
  filename: string;
  original_name: string;
  book_name: string;
  book_id: number;
  created_at: string;
  file_path: string;
  s3_url?: string;
  uploaded_by?: number;
}

interface ImagesContentProps {
  token: string;
  onImageSelect?: (imageId: number, imageUrl: string) => void;
  onImageUpload?: (imageUrl: string) => void;
  mode?: 'manage' | 'select';
  onClose?: () => void;
  showAsContent?: boolean;
}

export default function ImagesContent({ 
  token, 
  onImageSelect, 
  onImageUpload,
  mode = 'manage', 
  onClose,
  showAsContent = false 
}: ImagesContentProps) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number[] | null>(null);
  const [lightboxImage, setLightboxImage] = useState<ImageData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadRef = useRef<string>('');

  useEffect(() => {
    fetchImages();
  }, [currentPage]);

  const fetchImages = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/images?page=${currentPage}&limit=15`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setImages(data.images);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0 || isUploading) return;
    
    const fileSignature = Array.from(files).map(f => `${f.name}-${f.size}-${f.lastModified}`).join('|');
    if (lastUploadRef.current === fileSignature) {
      return;
    }
    lastUploadRef.current = fileSignature;
    
    setIsUploading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const booksResponse = await fetch(`${apiUrl}/books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let bookId = null;
      if (booksResponse.ok) {
        const booksData = await booksResponse.json();
        bookId = booksData.length > 0 ? booksData[0].id : null;
      }
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });
      if (bookId) {
        formData.append('bookId', bookId.toString());
      }
      
      const response = await fetch(`${apiUrl}/images/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploadError(null);
        fetchImages();
        
        if (mode === 'select' && onImageUpload && data.images && data.images.length > 0) {
          const firstImage = data.images[0];
          const imageUrl = firstImage.s3_url || `${apiUrl.replace('/api', '')}/uploads/${firstImage.file_path}`;
          onImageUpload(imageUrl);
        }
      } else if (response.status === 413) {
        setUploadError('File too large. Maximum file size is 2MB per image.');
      } else {
        setUploadError('Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
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

  const handleDeleteImages = async (imageIds: number[]) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/images`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ imageIds })
      });
      if (response.ok) {
        fetchImages();
        setSelectedImages(new Set());
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleImageSelection = (imageId: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    setSelectedImages(new Set(images.map(p => p.id)));
  };

  const deselectAllImages = () => {
    setSelectedImages(new Set());
  };

  const getImageUrl = (image: ImageData) => {
    // Use S3 URL if available, fallback to local server
    if (image.s3_url) {
      return image.s3_url;
    }
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiUrl.replace('/api', '')}/uploads/${image.file_path}`;
  };

  const getThumbUrl = (image: ImageData) => {
    const ext = image.filename.split('.').pop();
    const nameWithoutExt = image.filename.replace(`.${ext}`, '');
    const thumbFilename = `${nameWithoutExt}_thumb.${ext}`;
    
    // Use S3 URL for thumbnail
    if (image.s3_url) {
      const s3BaseUrl = 'https://fb-konva.s3.us-east-1.amazonaws.com/';
      const thumbS3Key = `images/${image.uploaded_by || 'unknown'}/${thumbFilename}`;
      return `${s3BaseUrl}${thumbS3Key}`;
    }
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiUrl.replace('/api', '')}/uploads/${image.file_path.replace(image.filename, thumbFilename)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading images...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showAsContent && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center space-x-2">
                <Image/>
                <span>My Images</span>
              </h1>
              <p className="text-muted-foreground">Manage your uploaded images</p>
            </div>
            <div className="flex gap-2">
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Back
                </Button>
              )}
              {multiSelectMode ? (
                <ButtonGroup>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMultiSelectMode(false);
                      deselectAllImages();
                    }}
                  >
                    <SquareX className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={selectAllImages}
                    disabled={selectedImages.size === images.length}
                  >
                    <CopyCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={deselectAllImages}
                    disabled={selectedImages.size === 0}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(Array.from(selectedImages))}
                    disabled={selectedImages.size === 0}
                    className="space-x-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span> ({selectedImages.size})</span>
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
                <span>Add Images</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {uploadError && (
          <Alert variant="destructive">
            {/* <AlertTriangle className="h-5 w-5" /> */}
            {uploadError}
          </Alert>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 mt-6 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">
            {isUploading ? 'Uploading images...' : 'Drop images here or click "Add Images" to upload'}
          </p>
          <p className="text-muted-foreground">Supports JPG, PNG, GIF, WebP up to 5MB</p>
        </div>

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

        {images.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <Image className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No images yet</h3>
              <p className="text-muted-foreground mb-6">Upload your first images to get started.</p>
              <Button onClick={() => fileInputRef.current?.click()} className="space-x-2">
                <Plus className="h-4 w-4" />
                <span>Upload Images</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map(image => (
              <ImageCard
                key={image.id}
                image={image}
                multiSelectMode={multiSelectMode}
                isSelected={selectedImages.has(image.id)}
                mode={mode}
                onImageClick={() => setLightboxImage(image)}
                onImageSelect={onImageSelect}
                onToggleSelection={toggleImageSelection}
                onDelete={(imageId) => setShowDeleteConfirm([imageId])}
                getThumbUrl={getThumbUrl}
                getImageUrl={getImageUrl}
              />
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />

        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Images</DialogTitle>
              <DialogDescription>
                Do you permanently delete {showDeleteConfirm?.length} image{showDeleteConfirm?.length !== 1 ? 's' : ''}?
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
                    handleDeleteImages(showDeleteConfirm);
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

        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setLightboxImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              {lightboxImage && (
                <img
                  src={getImageUrl(lightboxImage)}
                  alt={lightboxImage.original_name}
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