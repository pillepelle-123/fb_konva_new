import { Palette, RotateCcw } from 'lucide-react';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { SelectorShell, SelectorListSection } from './selector-shell';

interface TemplatePaletteProps {
  selectedPalette: ColorPalette | null;
  onPaletteSelect: (palette: ColorPalette) => void;
  skipShell?: boolean; // If true, return only the listSection without SelectorShell wrapper
}

export function TemplatePalette({ selectedPalette, onPaletteSelect, skipShell = false }: TemplatePaletteProps) {
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
      qna: { fontColor: palette.colors.primary, borderColor: palette.colors.secondary, backgroundColor: palette.colors.background }
    };
    
    Object.entries(toolUpdates).forEach(([tool, settings]) => {
      dispatch({
        type: 'UPDATE_TOOL_SETTINGS',
        payload: { tool, settings }
      });
    });
  };

  const listSection = (
    <SelectorListSection
      title={
        <>
          <Palette className="h-4 w-4" />
          Color Palettes
        </>
      }
      headerActions={
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
      }
    >
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
    </SelectorListSection>
  );
  
  if (skipShell) {
    return listSection;
  }

  return (
    <SelectorShell
      listSection={listSection}
    />
  );
}