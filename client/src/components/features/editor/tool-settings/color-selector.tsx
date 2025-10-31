import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, X, Heart, HeartOff } from 'lucide-react';
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
        <Label variant="xs">Selected Color</Label>
        <div className="mb-2">
          <div
            className="w-full h-10 rounded border-2 border-gray-300 mb-2"
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
        </div>
        {/* <div className="[&_.sketch-picker]:!rounded-none [&_.sketch-picker]:!shadow-none"> */}
          <SketchPicker
            color={value === 'transparent' ? '#ffffff' : (value || '#000000')}
            onChange={(color) => onChange(color.hex)}
            presetColors={favoriteColors}
            disableAlpha={true}
            className='!rounden-none !shadow-none !border-none !w-[260px] !p-0'
          />
        {/* </div> */}
      </div>
      
      <div>
        <Label variant="xs">Standard Colors</Label>
        <div className="grid grid-cols-8 gap-1">
          <button
            className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 relative"
            style={{ 
              backgroundColor: '#ffffff',
              backgroundImage: 'linear-gradient(to top right, transparent 0%, transparent calc(50% - 1px), #ff0000 calc(50% - 1px), #ff0000 calc(50% + 1px), transparent calc(50% + 1px), transparent 100%)'
            }}
            onClick={() => onChange('transparent')}
            title="transparent"
          />
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
        <Slider
          label="Opacity"
          value={Math.round((opacity || 1) * 100)}
          displayValue={Math.round((opacity || 1) * 100)}
          onChange={(value) => onOpacityChange(value / 100)}
          min={0}
          max={100}
          step={5}
          unit="%"
          hasLabel={false}
        />
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