import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, X } from 'lucide-react';
import { ColorPicker } from '../../../ui/primitives/color-picker';
import { Label } from '../../../ui/primitives/label';

const STANDARD_COLORS = [
  '#ff595e', '#ff924c', '#ffca3a', '#c5ca30', '#8ac926', 
  '#52a675', '#1982c4', '#4267ac', '#6a4c93', '#b5a6c9',
  '#000000', '#ffffff', '#808080', '#d3d3d3', '#8b4513', '#deb887'
];

interface ColorSelectorProps {
  value: string;
  onChange: (color: string) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  favoriteColors: string[];
  onAddFavorite: (color: string) => void;
  onRemoveFavorite: (color: string) => void;
  onBack: () => void;
}

export function ColorSelector({
  value,
  onChange,
  opacity = 1,
  onOpacityChange,
  favoriteColors,
  onAddFavorite,
  onRemoveFavorite,
  onBack
}: ColorSelectorProps) {
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
      </div>
      
      <div>
        <Label variant="xs">Color Selector</Label>
        <ColorPicker
          value={value}
          onChange={onChange}
          favoriteColors={favoriteColors}
          onAddFavorite={onAddFavorite}
          onRemoveFavorite={onRemoveFavorite}
        />
      </div>
      
      <div>
        <Label variant="xs">Standard Colors</Label>
        <div className="grid grid-cols-8 gap-1">
          {STANDARD_COLORS.map((color, index) => (
            <button
              key={index}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>
      
      {onOpacityChange && (
        <div>
          <Label variant="xs">Opacity</Label>
          <input
            type="range"
            value={opacity * 100}
            onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
        </div>
      )}
      
      <div>
        <Label variant="xs">Your Favorite Colors</Label>
        {favoriteColors.length > 0 ? (
          <div className="grid grid-cols-6 gap-1">
            {favoriteColors.map((color, index) => (
              <div key={index} className="relative group">
                <button
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                  title={color}
                />
                <button
                  className="absolute -top-1 left-6 w-4 h-4 text-muted-foreground rounded-full border border-muted-foreground opacity-0 group-hover:opacity-100 bg-white transition-opacity flex items-center justify-center"
                  onClick={() => onRemoveFavorite(color)}
                  title="Remove from favorites"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No favorite colors yet. Use the color picker above to add favorites.</div>
        )}
      </div>
    </div>
  );
}