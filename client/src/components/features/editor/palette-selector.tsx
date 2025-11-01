import { useState } from 'react';
import { Button } from '../../ui/primitives/button';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { Label } from '../../ui/primitives/label';
import { colorPalettes as GLOBAL_PALETTES, getAllCategories, getPalettesByCategory, applyPaletteToElement, type ColorPalette } from '../../../data/templates/color-palettes';
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
  
  const resetColorOverrides = () => {
    if (!state.currentBook) return;
    
    if (isBookLevel) {
      // Reset overrides for all pages
      state.currentBook.pages.forEach(page => {
        page.elements.forEach(element => {
          if (element.colorOverrides && Object.keys(element.colorOverrides).length > 0) {
            dispatch({
              type: 'RESET_COLOR_OVERRIDES',
              payload: { elementIds: [element.id] }
            });
          }
        });
      });
    } else {
      // Reset overrides for current page only
      const currentPage = state.currentBook.pages[state.activePageIndex];
      if (currentPage) {
        currentPage.elements.forEach(element => {
          if (element.colorOverrides && Object.keys(element.colorOverrides).length > 0) {
            dispatch({
              type: 'RESET_COLOR_OVERRIDES',
              payload: { elementIds: [element.id] }
            });
          }
        });
      }
    }
  };
  
  const handlePaletteSelect = (palette: ColorPalette) => {
    // Set Book/Page-Level Color Palette (for new elements)
    if (isBookLevel) {
      dispatch({
        type: 'SET_BOOK_COLOR_PALETTE',
        payload: palette.id
      });
    } else {
      dispatch({
        type: 'SET_PAGE_COLOR_PALETTE',
        payload: { 
          pageIndex: state.activePageIndex, 
          colorPaletteId: palette.id 
        }
      });
    }
    
    // Optionally apply to existing elements (existing behavior)
    if (isBookLevel && state.currentBook) {
      // Apply to all pages
      state.currentBook.pages.forEach((page, pageIndex) => {
        page.elements.forEach(element => {
          const elementType = element.textType || element.type;
          const updates = applyPaletteToElement(palette, elementType);
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
          const elementType = element.textType || element.type;
          const updates = applyPaletteToElement(palette, elementType);
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: { id: element.id, updates }
          });
        });
      }
    }
    
    // Update tool settings to use palette colors for new elements
    const toolUpdates = {
      brush: { strokeColor: palette.colors.primary },
      line: { strokeColor: palette.colors.primary },
      rect: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      circle: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      triangle: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      polygon: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      heart: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      star: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      'speech-bubble': { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      dog: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      cat: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      smiley: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      text: { fontColor: palette.colors.primary, borderColor: palette.colors.secondary, backgroundColor: palette.colors.background },
      question: { fontColor: palette.colors.primary, borderColor: palette.colors.secondary, backgroundColor: palette.colors.surface },
      answer: { fontColor: palette.colors.accent, borderColor: palette.colors.secondary, backgroundColor: palette.colors.background },
      qna_inline: { fontColor: palette.colors.primary, borderColor: palette.colors.secondary, backgroundColor: palette.colors.background }
    };
    
    Object.entries(toolUpdates).forEach(([tool, settings]) => {
      dispatch({
        type: 'UPDATE_TOOL_SETTINGS',
        payload: { tool, settings }
      });
    });
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
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="px-2 h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetColorOverrides}
          className="px-2 h-8 text-xs"
          title="Reset all manual color overrides to allow palette colors to be applied"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset Overrides
        </Button>
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