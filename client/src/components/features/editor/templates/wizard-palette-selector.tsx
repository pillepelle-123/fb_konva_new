import { useState } from 'react';
import { Palette } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { getAllCategories, getPalettesByCategory, colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { getThemePaletteId } from '../../../../utils/global-themes';

interface WizardPaletteSelectorProps {
  selectedPalette: ColorPalette | null;
  onPaletteSelect: (palette: ColorPalette) => void;
  themeId?: string; // Theme ID to get default palette from
}

export function WizardPaletteSelector({ 
  selectedPalette, 
  onPaletteSelect, 
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

  const listSection = (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
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

  return (
    <div className="flex flex-col h-full">
      {listSection}
    </div>
  );
}

