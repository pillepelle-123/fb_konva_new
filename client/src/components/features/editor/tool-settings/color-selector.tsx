import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, X, Heart, HeartOff, Lock } from 'lucide-react';
import { SketchPicker } from 'react-color';
import { Label } from '../../../ui/primitives/label';
import { Slider } from '../../../ui/primitives/slider';
import { Tooltip } from '../../../ui';

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
  onBack?: () => void;
  isOverridden?: boolean;
  onResetOverride?: () => void;
}

export function ColorSelector({
  value,
  onChange,
  opacity = 1,
  onOpacityChange,
  favoriteColors,
  onAddFavorite,
  onRemoveFavorite,
  onBack,
  isOverridden = false,
  onResetOverride
}: ColorSelectorProps) {

  return (
    <div className="space-y-4">
      {onBack && (
        <div className="flex items-center gap-2 mb-2">
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
      )}
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label variant="xs">Selected Color</Label>
          {isOverridden && (
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-orange-600">Override</span>
            </div>
          )}
        </div>
        <div className="mb-2">
          <div
            className={`w-full h-10 rounded border-2 mb-2 ${isOverridden ? 'border-orange-300' : 'border-gray-300'}`}
            style={{ backgroundColor: value === 'transparent' ? '#ffffff' : (value || '#000000') }}
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={value === 'transparent' ? 'transparent' : (value || '')}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border rounded"
              placeholder="#000000"
            />
            <Tooltip content="Add to your Favorite Colors">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const isFavorite = favoriteColors.includes(value);
                  if (isFavorite) {
                    onRemoveFavorite(value);
                  } else {
                    onAddFavorite(value);
                  }
                }}
                className="p-0 h-8 w-8"
              >
                {favoriteColors.includes(value) ? (
                  <Heart className="h-5 w-5 fill-current text-red-500" />
                ) : (
                  <Heart className="h-5 w-5" />
                )}
              </Button>
            </Tooltip>
          </div>
          {isOverridden && onResetOverride && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="xs"
                onClick={onResetOverride}
                className="w-full text-xs"
              >
                Reset to Palette Color
              </Button>
            </div>
          )}
        </div>
          <SketchPicker
            color={value === 'transparent' ? '#ffffff' : (value || '#000000')}
            onChange={(color) => onChange(color.hex)}
            presetColors={favoriteColors}
            disableAlpha={true}
            width="260px"
          />
      </div>
      
      <div>
        <Label variant="xs">Standard Colors</Label>
        <div className="grid grid-cols-8 gap-1">
          <button
            type="button"
            className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 relative cursor-pointer"
            style={{ 
              backgroundColor: '#ffffff',
              backgroundImage: 'linear-gradient(to top right, transparent 0%, transparent calc(50% - 1px), #ff0000 calc(50% - 1px), #ff0000 calc(50% + 1px), transparent calc(50% + 1px), transparent 100%)',
              pointerEvents: 'auto'
            }}
            onClick={() => onChange('transparent')}
            title="transparent"
          />
          {STANDARD_COLORS.map((color, index) => (
            <button
              key={index}
              type="button"
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 cursor-pointer"
              style={{ backgroundColor: color, pointerEvents: 'auto' }}
              onClick={() => onChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>
      
      {onOpacityChange && (
        <div>
          <Label variant="xs">Opacity</Label>
          <Slider
            label="Opacity"
            value={Math.round((opacity ?? 1) * 100)}
            displayValue={Math.round((opacity ?? 1) * 100)}
            onChange={(value) => onOpacityChange(value / 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            hasLabel={false}
          />
        </div>
      )}
      
      <div>
        <Label variant="xs">Your Favorite Colors</Label>
        {favoriteColors.length > 0 ? (
          <div className="grid grid-cols-6 gap-1">
            {favoriteColors.map((color, index) => (
              <div key={index} className="relative group">
                <button
                  type="button"
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 cursor-pointer"
                  style={{ backgroundColor: color, pointerEvents: 'auto' }}
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