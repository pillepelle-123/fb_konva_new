import { Palette, RotateCcw } from 'lucide-react';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';

interface TemplatePaletteProps {
  selectedPalette: ColorPalette | null;
  onPaletteSelect: (palette: ColorPalette) => void;
}

export function TemplatePalette({ selectedPalette, onPaletteSelect }: TemplatePaletteProps) {
  const { state, dispatch } = useEditor();
  
  const resetColorOverrides = () => {
    if (!state.currentBook) return;
    
    const currentPage = state.currentBook.pages[state.activePageIndex];
    if (!currentPage) return;
    
    // Reset color overrides for all elements on current page
    currentPage.elements.forEach(element => {
      if (element.colorOverrides && Object.keys(element.colorOverrides).length > 0) {
        dispatch({
          type: 'RESET_COLOR_OVERRIDES',
          payload: { elementIds: [element.id] }
        });
      }
    });
  };
  
  const handlePaletteSelect = (palette: ColorPalette) => {
    // Apply palette to existing elements
    onPaletteSelect(palette);
    
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
  
  return (
    <div className="flex flex-col h-full">
      {/* List section - flex-1 with scroll */}
      <div className="p-2 flex-1 min-h-0 flex flex-col border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Color Palettes
          </h3>
          <Button
            variant="outline"
            size="xs"
            onClick={resetColorOverrides}
            className="text-xs"
            title="Reset all manual color overrides to allow palette colors to be applied"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {colorPalettes.map((palette) => (
            <button
              key={palette.id}
              onClick={() => handlePaletteSelect(palette)}
              className={`w-full p-3 border rounded-lg text-left transition-colors ${
                selectedPalette?.id === palette.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{palette.name}</div>
              <div className="mt-2 flex gap-1">
                <div 
                  className="w-4 h-4 rounded-sm border border-gray-300"
                  style={{ backgroundColor: palette.colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-sm border border-gray-300"
                  style={{ backgroundColor: palette.colors.secondary }}
                />
                <div 
                  className="w-4 h-4 rounded-sm border border-gray-300"
                  style={{ backgroundColor: palette.colors.accent }}
                />
                <div 
                  className="w-4 h-4 rounded-sm border border-gray-300"
                  style={{ backgroundColor: palette.colors.background }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {palette.contrast} contrast
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Preview section - shrink-0 at bottom */}
      <div className="p-4 border-t border-gray-200 shrink-0">
        <h3 className="text-sm font-medium mb-3">Preview</h3>
        {selectedPalette ? (
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm font-medium mb-2">{selectedPalette.name}</div>
            <div className="aspect-[210/297] border rounded p-4" style={{ backgroundColor: selectedPalette.colors.background }}>
              <div 
                className="w-full h-8 rounded mb-2 border"
                style={{ backgroundColor: selectedPalette.colors.primary }}
              />
              <div 
                className="w-3/4 h-6 rounded mb-2 border"
                style={{ backgroundColor: selectedPalette.colors.secondary }}
              />
              <div 
                className="w-1/2 h-4 rounded border"
                style={{ backgroundColor: selectedPalette.colors.accent }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {selectedPalette.contrast} contrast
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Select a palette to see preview</div>
        )}
      </div>
    </div>
  );
}