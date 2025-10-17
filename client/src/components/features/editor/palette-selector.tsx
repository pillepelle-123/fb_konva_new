import { useState } from 'react';
import { Button } from '../../ui/primitives/button';
import { ChevronLeft } from 'lucide-react';
import { Label } from '../../ui/primitives/label';
import { GLOBAL_PALETTES, getAllCategories, getPalettesByCategory, applyPaletteToElement, type ColorPalette } from '../../../utils/global-palettes';
import { useEditor } from '../../../context/editor-context';

interface PaletteSelectorProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
}

export function PaletteSelector({ onBack, title, isBookLevel = false }: PaletteSelectorProps) {
  const { state, dispatch } = useEditor();
  const [selectedCategory, setSelectedCategory] = useState<string>('Default');
  
  const categories = getAllCategories();
  
  const handlePaletteSelect = (palette: ColorPalette) => {
    if (isBookLevel && state.currentBook) {
      // Apply to all pages
      state.currentBook.pages.forEach((page, pageIndex) => {
        page.elements.forEach(element => {
          const updates = applyPaletteToElement(palette, element.type);
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: { id: element.id, updates }
          });
        });
      });
    } else {
      // Apply to current page only
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      if (currentPage) {
        currentPage.elements.forEach(element => {
          const updates = applyPaletteToElement(palette, element.type);
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: { id: element.id, updates }
          });
        });
      }
    }
  };

  const renderPalettePreview = (palette: ColorPalette) => (
    <div className="flex h-6 w-full rounded overflow-hidden">
      {Object.values(palette.colors).map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

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
        {/* <Label variant="sm" className="font-medium">{title} - Palette</Label> */}
      </div>

      {/* Category Tabs */}
      <div className="space-y-2">
        <Label variant="xs">Categories</Label>
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="xs"
              onClick={() => setSelectedCategory(category)}
              className="text-xs"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Palette Grid */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <Label variant="xs">Palettes</Label>
        <div className="space-y-2">
          {getPalettesByCategory(selectedCategory).map(palette => (
            <Button
              key={palette.id}
              variant="ghost"
              className="w-full h-auto p-2 flex flex-col gap-2 hover:bg-muted/80"
              onClick={() => handlePaletteSelect(palette)}
            >
              <div className="w-full">
                {renderPalettePreview(palette)}
              </div>
              <Label variant="xs" className="text-center">{palette.name}</Label>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}