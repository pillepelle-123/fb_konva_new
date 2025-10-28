import type { ColorPalette } from '../../types/template-types';

interface ColorPaletteSelectorProps {
  palettes: ColorPalette[];
  selectedPalette: ColorPalette | null;
  onSelect: (palette: ColorPalette) => void;
}

export default function ColorPaletteSelector({ palettes, selectedPalette, onSelect }: ColorPaletteSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {palettes.map(palette => (
        <div
          key={palette.id}
          className={`
            cursor-pointer rounded-lg p-3 transition-all duration-200
            hover:shadow-md
            ${selectedPalette?.id === palette.id
              ? 'ring-2 ring-blue-500 shadow-lg'
              : 'border border-gray-200 hover:border-gray-300'
            }
          `}
          onClick={() => onSelect(palette)}
        >
          {/* Color swatches */}
          <div className="flex gap-1 mb-2">
            {Object.entries(palette.colors).map(([key, color]) => (
              <div
                key={key}
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color }}
                title={key}
              />
            ))}
          </div>
          
          {/* Palette name */}
          <div className="text-xs font-medium text-gray-900 truncate">
            {palette.name}
          </div>
          
          {/* Contrast rating */}
          <div className="text-xs text-gray-500">
            {palette.contrast}
          </div>
        </div>
      ))}
    </div>
  );
}