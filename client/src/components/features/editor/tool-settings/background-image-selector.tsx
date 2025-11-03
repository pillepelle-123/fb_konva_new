import { useState, useMemo, useEffect } from 'react';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Search, Grid3x3, Image as ImageIcon } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { Separator } from '../../../ui/primitives/separator';
import { 
  getBackgroundImageCategories,
  searchBackgroundImages,
  getBackgroundImagesWithUrl
} from '../../../../data/templates/background-images';
import type { BackgroundImageCategory, BackgroundImageWithUrl } from '../../../../types/template-types';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';
import { useEditor } from '../../../../context/editor-context';

interface BackgroundImageSelectorProps {
  onBack: () => void;
  onSelect?: (templateId: string) => void;
  onUpload?: () => void;
  selectedImageId?: string | null;
  onImageSelect?: (imageId: string | null) => void;
}

export function BackgroundImageSelector({ onBack, onSelect, onUpload, selectedImageId, onImageSelect }: BackgroundImageSelectorProps) {
  const { state, dispatch } = useEditor();
  const [selectedCategory, setSelectedCategory] = useState<BackgroundImageCategory | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<'vector' | 'pixel' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(selectedImageId || null);
  
  // Sync with external selectedImageId
  useEffect(() => {
    if (selectedImageId !== undefined && selectedImageId !== selectedImage) {
      setSelectedImage(selectedImageId);
    }
  }, [selectedImageId]);

  const categories = getBackgroundImageCategories();
  const allImages = getBackgroundImagesWithUrl();

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
  const currentBackgroundImageId = currentPage?.background?.backgroundImageTemplateId;

  const handleImageSelect = (image: BackgroundImageWithUrl) => {
    setSelectedImage(image.id);
    onImageSelect?.(image.id);
  };

  const selectedImageData = selectedImage ? allImages.find(img => img.id === selectedImage) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
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
      </div>

      {/* Upload Button */}
      {onUpload && (
        <div>
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {/* Category Filter */}
        <div className="flex-1 min-w-[150px]">
          <Label variant="xs" className="mb-1 block">Category</Label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as BackgroundImageCategory | 'all')}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Format Filter */}
        <div className="flex-1 min-w-[120px]">
          <Label variant="xs" className="mb-1 block">Format</Label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as 'vector' | 'pixel' | 'all')}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Formats</option>
            <option value="vector">Vector (SVG)</option>
            <option value="pixel">Pixel (PNG/JPG)</option>
          </select>
        </div>
      </div>

      <Separator />

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-3  overflow-y-auto">
        {filteredImages.map((image) => (
          <button
            key={image.id}
            onClick={() => handleImageSelect(image)}
            className={`p-2 border-2 rounded-lg transition-colors text-left ${
              selectedImage === image.id
                ? 'border-blue-500 bg-blue-50'
                : currentBackgroundImageId === image.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
              {image.format === 'vector' ? (
                <img 
                  src={image.thumbnailUrl} 
                  alt={image.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img 
                  src={image.thumbnailUrl} 
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="text-xs font-medium truncate">{image.name}</div>
            <div className="text-xs text-gray-500 truncate capitalize">{image.category}</div>
            {currentBackgroundImageId === image.id && (
              <div className="text-xs text-green-600 mt-1">Active</div>
            )}
          </button>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No images found</p>
        </div>
      )}

      {/* Preview & Settings */}
      {selectedImageData && (
        <>
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
        </>
      )}
    </div>
  );
}

