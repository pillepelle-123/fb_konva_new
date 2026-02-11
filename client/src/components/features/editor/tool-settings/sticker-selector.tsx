import { useState, useMemo, useEffect } from 'react';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Search } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Separator } from '../../../ui/primitives/separator';
import { 
  getStickerCategories,
  searchStickers,
  getStickersWithUrl,
  loadStickerRegistry
} from '../../../../data/templates/stickers';
import type { StickerCategory, StickerWithUrl } from '../../../../types/template-types';
import { ImageGrid, type ImageGridItem } from '../../../shared/image-grid';

interface StickerSelectorProps {
  onBack: () => void;
  selectedStickerId?: string | null;
  onStickerSelect?: (selection: { stickerId: string; textEnabled: boolean; text: string }) => void;
}

export function StickerSelector({ onBack, selectedStickerId, onStickerSelect }: StickerSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<StickerCategory | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<'vector' | 'pixel' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSticker, setSelectedSticker] = useState<string | null>(selectedStickerId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [textEnabled, setTextEnabled] = useState(false);
  const [stickerText, setStickerText] = useState('');
  
  // Load sticker registry on mount
  useEffect(() => {
    const loadStickers = async () => {
      setIsLoading(true);
      await loadStickerRegistry(true); // Force reload to get latest stickers
      setIsLoading(false);
    };
    loadStickers();
  }, []);

  // Sync with external selectedStickerId
  useEffect(() => {
    if (selectedStickerId !== undefined && selectedStickerId !== selectedSticker) {
      setSelectedSticker(selectedStickerId);
    }
  }, [selectedStickerId, selectedSticker]);

  const categories = getStickerCategories();
  const allStickers = getStickersWithUrl();

  // Filter stickers based on category, format, and search
  const filteredStickers = useMemo(() => {
    let stickers = allStickers;

    // Category filter
    if (selectedCategory !== 'all') {
      stickers = stickers.filter(sticker => sticker.category === selectedCategory);
    }

    // Format filter
    if (selectedFormat !== 'all') {
      stickers = stickers.filter(sticker => sticker.format === selectedFormat);
    }

    // Search filter
    if (searchQuery.trim()) {
      const searchResults = searchStickers(searchQuery);
      const searchIds = new Set(searchResults.map(sticker => sticker.id));
      stickers = stickers.filter(sticker => searchIds.has(sticker.id));
    }

    return stickers;
  }, [allStickers, selectedCategory, selectedFormat, searchQuery]);

  const handleStickerSelect = (sticker: StickerWithUrl) => {
    setSelectedSticker(sticker.id);
    onStickerSelect?.({
      stickerId: sticker.id,
      textEnabled,
      text: stickerText
    });
  };

  const selectedStickerData = selectedSticker ? allStickers.find(sticker => sticker.id === selectedSticker) : null;

  if (isLoading) {
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
          <h2 className="text-lg font-semibold">Sticker</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>Loading stickers...</p>
        </div>
      </div>
    );
  }

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
        <h2 className="text-lg font-semibold">Sticker</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search stickers..."
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
            onChange={(e) => setSelectedCategory(e.target.value as StickerCategory | 'all')}
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

      <div className="space-y-2">
        <Label variant="xs" className="flex items-center gap-2">
          <Checkbox
            checked={textEnabled}
            onCheckedChange={(checked) => setTextEnabled(Boolean(checked))}
          />
          Add text to sticker
        </Label>
        <input
          type="text"
          placeholder="Optional sticker text"
          value={stickerText}
          onChange={(e) => setStickerText(e.target.value)}
          disabled={!textEnabled}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
        />
      </div>

      <Separator />

      <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
        {/* Sticker Grid */}
        <ImageGrid
          items={filteredStickers.map((sticker): ImageGridItem => ({
            id: sticker.id,
            thumbnailUrl: sticker.thumbnailUrl,
            name: sticker.name,
            category: sticker.category,
            format: sticker.format,
          }))}
          selectedItemId={selectedSticker}
          onItemSelect={handleStickerSelect}
          emptyStateMessage="No stickers found"
        />

        {/* Preview */}
        {selectedStickerData && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label variant="xs" className="mb-1 block">Selected: {selectedStickerData.name}</Label>
                <p className="text-xs text-gray-600">{selectedStickerData.description || 'No description'}</p>
                {selectedStickerData.tags && selectedStickerData.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {selectedStickerData.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
