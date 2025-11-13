import { useState } from 'react';
import { SwatchBook } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { getAllCategories, getPalettesByCategory, colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { getThemePaletteId } from '../../../../utils/global-themes';

interface WizardPaletteSelectorProps {
  selectedPalette: ColorPalette | null;
  onPaletteSelect: (palette: ColorPalette) => void;
  previewPosition?: 'top' | 'bottom' | 'right'; // 'bottom' = Preview below list (default), 'top' = Preview above list, 'right' = Preview to the right
  themeId?: string; // Theme ID to get default palette from
}

export function WizardPaletteSelector({ 
  selectedPalette, 
  onPaletteSelect, 
  previewPosition = 'top',
  themeId
}: WizardPaletteSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Default');
  
  // Get theme default palette if themeId is provided
  const themePaletteId = themeId ? getThemePaletteId(themeId) : undefined;
  const themePalette = themePaletteId ? colorPalettes.find(p => p.id === themePaletteId) || null : null;
  
  const categories = getAllCategories();

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

  const previewSection = (
    <div className="p-4 flex-1 overflow-y-auto">
      <h3 className="text-sm font-medium mb-3">Preview</h3>
      {selectedPalette ? (
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-medium mb-2">{selectedPalette.name}</div>
          <div className="aspect-[210/297] bg-gray-50 border rounded p-4 flex flex-col gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Primary</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.primary }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Secondary</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.secondary }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Accent</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.accent }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Background</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.background }}
                />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-600 mb-2">Color Preview</div>
              {renderPalettePreview(selectedPalette)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Select a palette to see preview</div>
      )}
    </div>
  );

  const listSection = (
    <div className={`p-4 ${previewPosition === 'right' ? 'w-1/2 border-r border-gray-200' : 'border-b border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <SwatchBook className="h-4 w-4" />
          Color Palettes
        </h3>
      </div>

      <div className="space-y-2 mb-3">
        <Label variant="xs">Categories</Label>
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {themePalette && (
          <button
            key="theme-palette-entry"
            onClick={() => onPaletteSelect(themePalette)}
            className={`w-full p-3 border rounded-lg text-left transition-colors ${
              selectedPalette?.id === themePalette.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm mb-1">Default</div>
            <div className="mb-2">
              {renderPalettePreview(themePalette)}
            </div>
            <div className="text-xs text-gray-600">{themePalette.name}</div>
          </button>
        )}
        {getPalettesByCategory(selectedCategory).map(palette => (
          <button
            key={palette.id}
            onClick={() => onPaletteSelect(palette)}
            className={`w-full p-3 border rounded-lg text-left transition-colors ${
              selectedPalette?.id === palette.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm mb-1">{palette.name}</div>
            <div className="mb-2">
              {renderPalettePreview(palette)}
            </div>
            <div className="text-xs text-gray-600">{palette.contrast} contrast</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (previewPosition === 'right') {
    return (
      <div className="flex flex-row h-full">
        {listSection}
        <div className="w-1/2 border-l border-gray-200">
          {previewSection}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {previewPosition === 'top' ? (
        <>
          {previewSection}
          {listSection}
        </>
      ) : (
        <>
          {listSection}
          {previewSection}
        </>
      )}
    </div>
  );
}

