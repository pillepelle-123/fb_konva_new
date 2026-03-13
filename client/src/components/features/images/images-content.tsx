import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/primitives/button';
import { Label } from '../../ui/primitives/label';
import MultipleSelector, { type Option } from '../../ui/multi-select';
import { ButtonGroup } from '../../ui/composites/button-group';
import { DatePicker } from '../../ui/composites/date-picker';
import AlertDialog from '../../ui/overlays/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Alert } from '../../ui/composites/alert';
import { Image, Plus, ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight, X, SquareCheckBig, SquareX, Copy, CopyCheck, Funnel } from 'lucide-react';
import ImageCard from './image-card';
import { Tooltip } from '../../ui/composites/tooltip';
import { PageLoadingState, EmptyStateCard, ResourcePageLayout, ImageGrid, type ImageGridItem } from '../../shared';

interface ImageData {
  id: string;
  filename: string;
  original_name: string;
  book_name?: string;
  book_id: number;
  created_at: string;
  file_path: string;
  uploaded_by?: number;
  assignments?: Array<{
    bookId: number;
    bookName: string;
    pageNumber: number;
  }>;
  signedUrl?: string;
  signedThumbUrl?: string;
  fileUrl?: string;
}

interface ImageBookFilterOption {
  id: number;
  name: string;
}

interface ImageDeleteConflictUsage {
  bookId: number;
  bookName: string;
  pageNumber: number;
}

interface ImageDeleteConflict {
  imageId: string;
  imageName: string;
  usages: ImageDeleteConflictUsage[];
}

interface DeletePreviewItem {
  id: string;
  name: string;
  assignments: ImageDeleteConflictUsage[];
}

interface DeletePreview {
  deletable: Array<{ id: string; name: string }>;
  blocked: DeletePreviewItem[];
}

interface ImagesContentProps {
  token: string;
  onImageSelect?: (imageId: string, imageUrl: string) => void;
  onImageUpload?: (imageId: string, imageUrl: string) => void;
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
  const [availableBooks, setAvailableBooks] = useState<ImageBookFilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterUsageBooks, setFilterUsageBooks] = useState<Option[]>([]);
  const [filterUploadedFrom, setFilterUploadedFrom] = useState('');
  const [filterUploadedTo, setFilterUploadedTo] = useState('');
  const [appliedUsageBooks, setAppliedUsageBooks] = useState<Option[]>([]);
  const [appliedUploadedFrom, setAppliedUploadedFrom] = useState('');
  const [appliedUploadedTo, setAppliedUploadedTo] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string[] | null>(null);
  const [deleteConflicts, setDeleteConflicts] = useState<ImageDeleteConflict[] | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [lightboxImage, setLightboxImage] = useState<ImageData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadZoneExpanded, setUploadZoneExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadRef = useRef<string>('');

  const selectedFilterBookId = filterUsageBooks[0]?.value ?? '';
  const selectedAppliedBookId = appliedUsageBooks[0]?.value ?? '';

  const hasActiveFilters = selectedAppliedBookId !== '' || appliedUploadedFrom !== '' || appliedUploadedTo !== '';
  const hasPendingFilterChanges =
    selectedFilterBookId !== selectedAppliedBookId ||
    filterUploadedFrom !== appliedUploadedFrom ||
    filterUploadedTo !== appliedUploadedTo;

  const usageBookOptions = useMemo<Option[]>(
    () => availableBooks.map((book) => ({ value: String(book.id), label: book.name })),
    [availableBooks]
  );

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
      });

      if (selectedAppliedBookId) {
        searchParams.set('usageBookId', selectedAppliedBookId);
      }
      if (appliedUploadedFrom) {
        searchParams.set('uploadedFrom', appliedUploadedFrom);
      }
      if (appliedUploadedTo) {
        searchParams.set('uploadedTo', appliedUploadedTo);
      }

      const response = await fetch(`${apiUrl}/images?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const nextTotalPages = Math.max(1, data.totalPages || 1);
        setAvailableBooks(Array.isArray(data.availableBooks) ? data.availableBooks : []);

        if (currentPage > nextTotalPages) {
          setCurrentPage(nextTotalPages);
          return;
        }

        setImages(Array.isArray(data.images) ? data.images : []);
        setTotalPages(nextTotalPages);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedAppliedBookId, appliedUploadedFrom, appliedUploadedTo, token]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

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
          const imageUrl = `${apiUrl}/images/file/${firstImage.id}`;
          onImageUpload(firstImage.id, imageUrl);
        }
      } else {
        // Try to parse error message from response
        let errorMessage = 'Upload failed. Please try again.';
        try {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            // If not JSON, use the text directly
            errorData = { message: errorText, error: errorText };
          }
          
          const errorMessageText = errorData.message || errorData.error || errorText || JSON.stringify(errorData);
          
          // Check for Multer file size errors (case-insensitive)
          const lowerErrorText = errorMessageText.toLowerCase();
          if (response.status === 413 || 
              lowerErrorText.includes('file too large') || 
              lowerErrorText.includes('multererror') ||
              lowerErrorText.includes('limit_file_size')) {
            errorMessage = 'File too large. Maximum file size is 2MB per image.';
          } else if (errorMessageText && errorMessageText !== '{}') {
            errorMessage = errorMessageText;
          }
        } catch {
          // If response cannot be read, check status code
          if (response.status === 413) {
            errorMessage = 'File too large. Maximum file size is 2MB per image.';
          }
        }
        setUploadError(errorMessage);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      // Also check error message in catch block
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lowerErrorText = errorMessage.toLowerCase();
      
      if (lowerErrorText.includes('file too large') || 
          lowerErrorText.includes('multererror') ||
          lowerErrorText.includes('limit_file_size')) {
        setUploadError('File too large. Maximum file size is 2MB per image.');
      } else {
        setUploadError('Upload failed. Please try again.');
      }
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

  const handleDeleteImages = async (imageIds: string[]) => {
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
        setDeleteConflicts(null);
        fetchImages();
        setSelectedImages(new Set());
        return;
      }

      if (response.status === 409) {
        const data = await response.json();
        setDeleteConflicts(Array.isArray(data.conflicts) ? data.conflicts : []);
        return;
      }

      let errorMessage = 'Delete failed. Please try again.';
      try {
        const errorData = await response.json();
        if (typeof errorData?.error === 'string' && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Ignore parse errors and keep default message.
      }
      setUploadError(errorMessage);
    } catch (error) {
      console.error('Delete failed:', error);
      setUploadError('Delete failed. Please try again.');
    }
  };

  const toggleImageSelection = (imageId: string) => {
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

  const applyFilters = () => {
    setAppliedUsageBooks(filterUsageBooks);
    setAppliedUploadedFrom(filterUploadedFrom);
    setAppliedUploadedTo(filterUploadedTo);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterUsageBooks([]);
    setFilterUploadedFrom('');
    setFilterUploadedTo('');
    setAppliedUsageBooks([]);
    setAppliedUploadedFrom('');
    setAppliedUploadedTo('');
    setCurrentPage(1);
  };

  const getImageUrl = (image: ImageData) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    if (image.signedUrl) {
      return `${apiUrl}/images/serve?s=${encodeURIComponent(image.signedUrl)}`;
    }
    return `${apiUrl}/images/file/${image.id}`;
  };

  const getThumbUrl = (image: ImageData) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    if (image.signedThumbUrl) {
      return `${apiUrl}/images/serve?s=${encodeURIComponent(image.signedThumbUrl)}`;
    }
    return `${apiUrl}/images/file/${image.id}`;
  };

  const getFileUrlForCanvas = (image: ImageData) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiUrl}/images/file/${image.id}`;
  };

  const buildEditorPageLink = (bookId: number, pageNumber: number) => `/editor/${bookId}?page=${pageNumber}`;

  const buildDeletePreview = (imageIds: string[]): DeletePreview => {
    const deletable: Array<{ id: string; name: string }> = [];
    const blocked: DeletePreviewItem[] = [];
    for (const id of imageIds) {
      const img = images.find((i) => i.id === id);
      if (!img) continue;
      if (img.assignments && img.assignments.length > 0) {
        blocked.push({ id: img.id, name: img.original_name, assignments: img.assignments as ImageDeleteConflictUsage[] });
      } else {
        deletable.push({ id: img.id, name: img.original_name });
      }
    }
    return { deletable, blocked };
  };

  const renderDeleteConflictMessage = () => {
    if (!deleteConflicts || deleteConflicts.length === 0) {
      return 'The selected image is still used on one or more pages. You need to remove it from there first.';
    }

    return (
      <div className="space-y-4 text-left text-sm text-foreground">
        <p className="text-muted-foreground">
          The selected image{deleteConflicts.length !== 1 ? 's are' : ' is'} still used in the following book pages.
        </p>
        {deleteConflicts.map((conflict) => (
          <div key={conflict.imageId} className="space-y-2 rounded-md border p-3">
            <p className="font-medium">{conflict.imageName}</p>
            <div className="flex flex-col items-start gap-1">
              {conflict.usages.map((usage) => (
                <Button
                  key={`${conflict.imageId}-${usage.bookId}-${usage.pageNumber}`}
                  asChild
                  variant="link"
                  className="h-auto p-0 text-left whitespace-normal"
                >
                  <Link to={buildEditorPageLink(usage.bookId, usage.pageNumber)}>
                    Open {usage.bookName}, page {usage.pageNumber}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const uploadZoneContent = uploadZoneExpanded && showAsContent ? (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <Image className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-base font-medium mb-2">
        {isUploading ? 'Uploading images...' : 'Drop images here or click "Upload" to add images'}
      </p>
      <p className="text-muted-foreground text-sm mb-4">Supports JPG, PNG, GIF, WebP up to 5MB</p>
      <Button variant="default" onClick={() => fileInputRef.current?.click()} className="space-x-2">
        <Plus className="h-4 w-4" />
        <span>Upload</span>
      </Button>
      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost_hover"
          size="sm"
          onClick={() => setUploadZoneExpanded(false)}
          className="space-x-2 text-muted-foreground"
        >
          <ChevronUp className="h-4 w-4" />
          <span>Hide Drop Zone</span>
        </Button>
      </div>
    </div>
  ) : null;

  const filterBarContent = filtersExpanded && showAsContent ? (
    // <div className="rounded-lg border bg-background/80 p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto]">
        <div>
          <Label variant="sm" htmlFor="images-filter-book" className="text-xs text-muted-foreground mb-1">Assigned Book</Label>
          <MultipleSelector
            value={filterUsageBooks}
            onChange={setFilterUsageBooks}
            options={usageBookOptions}
            placeholder="All books"
            maxSelected={1}
            hidePlaceholderWhenSelected
            className="min-h-9"
          />
        </div>

        <div>
          <Label variant="sm" htmlFor="images-filter-uploaded" className="text-xs text-muted-foreground mb-1">Uploaded</Label>
          <DatePicker
            variant="range"
            value={{ from: filterUploadedFrom, to: filterUploadedTo }}
            onChange={(nextValue) => {
              setFilterUploadedFrom(nextValue.from);
              setFilterUploadedTo(nextValue.to);
            }}
            placeholder="Pick created date range"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters && !hasPendingFilterChanges} className="w-full md:w-auto">
            Reset Filter
          </Button>
          <Button variant="primary" onClick={applyFilters} disabled={!hasPendingFilterChanges} className="w-full md:w-auto">
            Apply Filter
          </Button>
        </div>
      </div>
    // </div>
  ) : null;

  const headerAdditionalContent = showAsContent && (filtersExpanded || uploadZoneExpanded) ? (
    <div className="space-y-4 pt-4">
      {filterBarContent}
      {uploadZoneContent}
    </div>
  ) : null;

  const imagesHeaderActions = showAsContent ? (
    <>
      {onClose && (
        <Button variant="outline" onClick={onClose}>
          Back
        </Button>
      )}
      {multiSelectMode ? (
        <ButtonGroup>
          <Tooltip content="Exit multi-select" side="bottom">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setMultiSelectMode(false);
                deselectAllImages();
              }}
            >
              <SquareX className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Tooltip content="Select all" side="bottom">
            <Button
              variant="outline"
              size="icon"
              onClick={selectAllImages}
              disabled={selectedImages.size === images.length}
            >
              <CopyCheck className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Tooltip content="Deselect all" side="bottom">
            <Button
              variant="outline"
              size="icon"
              onClick={deselectAllImages}
              disabled={selectedImages.size === 0}
            >
              <Copy className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Button
            variant="destructive_outline"
            onClick={() => setDeletePreview(buildDeletePreview(Array.from(selectedImages)))}
            disabled={selectedImages.size === 0}
            className="space-x-2"
          >
            <Trash2 className="h-5 w-5" />
            <span> ({selectedImages.size})</span>
          </Button>
        </ButtonGroup>
      ) : (
        <Tooltip content="Multi-select" side="bottom">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMultiSelectMode(true)}
          >
            <SquareCheckBig className="h-5 w-5" />
          </Button>
        </Tooltip>
      )}
      <Button
        variant={filtersExpanded ? 'secondary' : 'outline'}
        onClick={() => setFiltersExpanded((value) => !value)}
        className="space-x-2"
      >
        <Funnel className="h-4 w-4" />
        <span>Filter Images</span>
      </Button>
      <Button
        variant="default"
        onClick={() => fileInputRef.current?.click()}
        className="sm:hidden space-x-2"
      >
        <Plus className="h-4 w-4" />
        <span>Upload</span>
      </Button>
      <Button
        variant="default"
        onClick={() => setUploadZoneExpanded((value) => !value)}
        className="hidden sm:inline-flex space-x-2"
      >
        <Plus className="h-5 w-5" />
        <span>Add Images</span>
        {uploadZoneExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </>
  ) : null;

  if (loading) {
    return <PageLoadingState message="Loading images..." withContainer={false} />;
  }

  const mainContent = (
    <>
      {uploadError && (
        <Alert variant="destructive">
          {uploadError}
        </Alert>
      )}

      {!showAsContent && (
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
          <p className="text-muted-foreground mb-4">Supports JPG, PNG, GIF, WebP up to 5MB</p>
          <Button variant="default" onClick={() => fileInputRef.current?.click()} className="space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Images</span>
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Tooltip content="Previous page" side="top">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Tooltip>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Tooltip content="Next page" side="top">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )}

      {images.length === 0 ? (
        <EmptyStateCard
          icon={<Image className="h-12 w-12" />}
          title={hasActiveFilters ? 'No images match your filters' : 'No images yet'}
          description={hasActiveFilters ? 'Adjust or clear the filters to see more images.' : 'Upload your first images to get started.'}
          primaryAction={{
            label: hasActiveFilters ? 'Reset Filter' : (
              <>
                <Plus className="h-4 w-4" />
                <span>Upload Images</span>
              </>
            ),
            onClick: () => {
              if (hasActiveFilters) {
                clearFilters();
                return;
              }
              fileInputRef.current?.click();
            },
          }}
        />
      ) : (
          <ImageGrid
            items={images.map((image): ImageGridItem & { imageData: ImageData } => ({
              id: String(image.id),
              thumbnailUrl: getThumbUrl(image),
              name: image.original_name,
              category: image.book_name || 'image',
              format: 'pixel',
              imageData: image,
            }))}
            itemsPerPage={15}
            emptyStateMessage=""
            renderItem={(item) => {
              const imageData = (item as ImageGridItem & { imageData: ImageData }).imageData;
              if (!imageData) return null;
              return (
                <div className="mx-auto w-full max-w-[15rem] sm:max-w-[15.5rem] xl:max-w-[16rem]">
                  <ImageCard
                    image={imageData}
                    multiSelectMode={multiSelectMode}
                    isSelected={selectedImages.has(imageData.id)}
                    mode={mode === 'select' ? 'select' : 'view'}
                    onImageClick={() => setLightboxImage(imageData)}
                    onImageSelect={onImageSelect}
                    onToggleSelection={toggleImageSelection}
                    onDelete={(imageId) => {
                      const img = images.find((i) => i.id === imageId);
                      if (img?.assignments && img.assignments.length > 0) {
                        handleDeleteImages([imageId]);
                      } else {
                        setShowDeleteConfirm([imageId]);
                      }
                    }}
                    getThumbUrl={getThumbUrl}
                    getImageUrl={getImageUrl}
                    getFileUrlForCanvas={getFileUrlForCanvas}
                  />
                </div>
              );
            }}
          />
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
                Do you want to permanently delete {showDeleteConfirm?.length} image{showDeleteConfirm?.length !== 1 ? 's' : ''}?
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

        <AlertDialog
          open={!!deleteConflicts}
          onOpenChange={() => setDeleteConflicts(null)}
          title="Image is still used in books"
          message={renderDeleteConflictMessage()}
          onClose={() => setDeleteConflicts(null)}
        />

        <Dialog open={!!deletePreview} onOpenChange={() => setDeletePreview(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete images</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              {(deletePreview?.blocked.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-destructive">Cannot be deleted — still used in books</p>
                  {deletePreview!.blocked.map((img) => (
                    <div key={img.id} className="rounded-md border p-3 space-y-1">
                      <p className="font-medium">{img.name}</p>
                      <div className="flex flex-col items-start gap-0.5">
                        {img.assignments.map((a) => (
                          <Button
                            key={`${img.id}-${a.bookId}-${a.pageNumber}`}
                            asChild
                            variant="link"
                            className="h-auto p-0 text-left text-xs"
                          >
                            <Link to={buildEditorPageLink(a.bookId, a.pageNumber)}>
                              Open {a.bookName}, page {a.pageNumber}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(deletePreview?.deletable.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="font-medium">Will be permanently deleted</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {deletePreview!.deletable.map((img) => (
                      <li key={img.id}>{img.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeletePreview(null)} className="flex-1">
                Cancel
              </Button>
              {(deletePreview?.deletable.length ?? 0) > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deletePreview) {
                      handleDeleteImages(deletePreview.deletable.map((i) => i.id));
                      setDeletePreview(null);
                    }
                  }}
                  className="flex-1"
                >
                  Delete {deletePreview!.deletable.length} image{deletePreview!.deletable.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <Tooltip content="Close" side="left">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setLightboxImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Tooltip>
              {lightboxImage && (
                <img
                  src={getImageUrl(lightboxImage)}
                  alt={lightboxImage.original_name}
                  crossOrigin="use-credentials"
                  className="w-full h-auto max-h-[85vh] object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
    </>
  );

  if (showAsContent) {
    return (
      <ResourcePageLayout
        title="My Images"
        icon={<Image className="h-6 w-6 text-foreground" />}
        actions={imagesHeaderActions}
        headerAdditionalContent={headerAdditionalContent}
        description="Manage your uploaded images"
        actionsAlignRightOnMobile
      >
        <div className="space-y-6">
          {mainContent}
        </div>
      </ResourcePageLayout>
    );
  }

  return (
    <div className="space-y-6">
      {mainContent}
    </div>
  );
}