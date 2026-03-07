/**
 * Sticker Selector Dialog for Designer
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';
import { Button } from '../../../ui/primitives/button';
import { Input } from '../../../ui/primitives/input';
import { Label } from '../../../ui/primitives/label';
import { Search } from 'lucide-react';

interface Sticker {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
}

interface StickerSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStickerSelect: (stickerId: string) => void;
  stickers?: Sticker[];
  isLoading?: boolean;
}

export function StickerSelectorDialog({
  open,
  onOpenChange,
  onStickerSelect,
  stickers = [],
  isLoading = false,
}: StickerSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(stickers.map((s) => s.category));
    return Array.from(cats).sort();
  }, [stickers]);

  // Filter stickers
  const filteredStickers = useMemo(() => {
    return stickers.filter((sticker) => {
      const matchesSearch =
        !searchQuery ||
        sticker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sticker.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || sticker.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [stickers, searchQuery, selectedCategory]);

  const handleStickerClick = (stickerId: string) => {
    onStickerSelect(stickerId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Sticker</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="space-y-2">
            <Label size="sm">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search stickers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label size="sm">Category</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={!selectedCategory ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(undefined)}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sticker grid */}
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading stickers...</p>
              </div>
            ) : filteredStickers.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No stickers found</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {filteredStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => handleStickerClick(sticker.id)}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    title={sticker.name}
                  >
                    {sticker.thumbnail && (
                      <img
                        src={sticker.thumbnail}
                        alt={sticker.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{sticker.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
