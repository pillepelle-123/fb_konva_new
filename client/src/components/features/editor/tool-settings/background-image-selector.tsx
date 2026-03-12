import { useState, useMemo, useEffect } from 'react';
import { Button } from '../../../ui/primitives/button';
import { Search, Image as ImageIcon } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { Separator } from '../../../ui/primitives/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../ui/primitives/select';
import { Input } from '../../../ui/primitives/input';
import { 
  getBackgroundImageCategories,
  searchBackgroundImages,
  getBackgroundImagesWithUrl
} from '../../../../data/templates/background-images';
import type { BackgroundImageCategory } from '../../../../types/template-types';
import { useEditor } from '../../../../context/editor-context';
import { ImageGrid, type ImageGridItem } from '../../../shared/image-grid';

interface BackgroundImageSelectorProps {
  onBack: () => void;
  onUpload?: () => void;
  selectedImageId?: string | null;
  onImageSelect?: (imageId: string | null) => void;
}

export function BackgroundImageSelector({ onUpload, selectedImageId, onImageSelect }: BackgroundImageSelectorProps) {
  const { state } = useEditor();
  const [selectedCategory, setSelectedCategory] = useState<BackgroundImageCategory | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<'vector' | 'pixel' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(selectedImageId || null);
  
  // Sync with external selectedImageId
  useEffect(() => {
    if (selectedImageId !== undefined && selectedImageId !== selectedImage) {
      setSelectedImage(selectedImageId);
    }
  }, [selectedImageId, selectedImage]);

  const categories = getBackgroundImageCategories();
  const allImages = useMemo(() => {
    const seen = new Set<string>();

    return getBackgroundImagesWithUrl().filter((image) => {
      if (seen.has(image.id)) {
        return false;
      }
      seen.add(image.id);
      return true;
    });
  }, []);

  // Filter images based on category, format, and search
  const filteredImages = useMemo(() => {
    let images = allImages;

    // Category filter
    if (selectedCategory !== 'all') {
      images = images.filter(img => img.category === selectedCategory);
    }

    // Format filter
    if (selectedFormat !== 'all') {
      images = images.filter(img => img.format === selectedFormat);
    }

    // Search filter
    if (searchQuery.trim()) {
      const searchResults = searchBackgroundImages(searchQuery);
      const searchIds = new Set(searchResults.map(img => img.id));
      images = images.filter(img => searchIds.has(img.id));
    }

    return images;
  }, [allImages, selectedCategory, selectedFormat, searchQuery]);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const currentBackgroundImageId = currentPage?.background?.backgroundImageId;

  const handleImageSelect = (item: ImageGridItem) => {
    setSelectedImage(item.id);
    onImageSelect?.(item.id);
  };

  const selectedImageData = selectedImage ? allImages.find(img => img.id === selectedImage) : null;

  return (
    <div className="flex flex-col min-h-0 h-full gap-4">
      {/* <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="px-2 h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">Background Images</h2>
      </div> */}

      {/* Upload Button */}
      {onUpload && (
        <div className="flex-shrink-0">
          <Button
            variant="outline"
            size="xs"
            onClick={onUpload}
            className="w-full"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="flex-shrink-0">
        <Input
          icon={<Search className="h-4 w-4" />}
          type="text"
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap flex-shrink-0">
        {/* Category Filter */}
        <div className="flex-1 min-w-[150px]">
          <Label variant="xs" className="mb-1 block">Category</Label>
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as BackgroundImageCategory | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format Filter */}
        <div className="flex-1 min-w-[120px]">
          <Label variant="xs" className="mb-1 block">Format</Label>
          <Select
            value={selectedFormat}
            onValueChange={(value) => setSelectedFormat(value as 'vector' | 'pixel' | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Formats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="vector">Vector (SVG)</SelectItem>
              <SelectItem value="pixel">Pixel (PNG/JPG)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Image Grid – scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin pr-1">
        <ImageGrid
          items={filteredImages.map((image): ImageGridItem => ({
            id: image.id,
            thumbnailUrl: image.thumbnailUrl,
            name: image.name,
            category: image.category,
            format: image.format,
          }))}
          selectedItemId={selectedImage}
          activeItemId={currentBackgroundImageId}
          onItemSelect={handleImageSelect}
          emptyStateMessage="No images found"
        />
      </div>

      {/* Preview & Settings */}
      {selectedImageData && (
        <div className="flex-shrink-0 space-y-3">
          <Separator />
          <div className="space-y-3">
            <div>
              <Label variant="xs" className="mb-1 block">Selected: {selectedImageData.name}</Label>
              <p className="text-xs text-gray-600">{selectedImageData.description || 'No description'}</p>
              {selectedImageData.tags && selectedImageData.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {selectedImageData.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Image Size and Apply Button are moved to tool-settings-panel.tsx */}
          </div>
        </div>
      )}
    </div>
  );
}

