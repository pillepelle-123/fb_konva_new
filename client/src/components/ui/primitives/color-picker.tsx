import { useState, useRef, useEffect } from 'react';
import { SketchPicker } from 'react-color';
import { Button } from './button';
import { Heart, HeartOff } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  favoriteColors?: string[];
  onAddFavorite?: (color: string) => void;
  onRemoveFavorite?: (color: string) => void;
}

export function ColorPicker({ 
  value, 
  onChange, 
  favoriteColors = [], 
  onAddFavorite, 
  onRemoveFavorite 
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const isFavorite = favoriteColors.includes(value);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 rounded border-2 border-gray-300"
          style={{ backgroundColor: value === 'transparent' ? '#ffffff' : (value || '#000000') }}
          onClick={() => setIsOpen(!isOpen)}
        />
        <input
          type="text"
          value={value === 'transparent' ? 'transparent' : (value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs border rounded"
          placeholder="#000000"
        />
        {(onAddFavorite || onRemoveFavorite) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isFavorite && onRemoveFavorite) {
                onRemoveFavorite(value);
              } else if (!isFavorite && onAddFavorite) {
                onAddFavorite(value);
              }
            }}
            className="p-1 h-6 w-6"
          >
            {isFavorite ? (
              <Heart className="h-3 w-3 fill-current text-red-500" />
            ) : (
              <HeartOff className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-10 left-0 z-50">
          <div className="bg-white rounded shadow-lg">
            <SketchPicker
              color={value === 'transparent' ? '#ffffff' : (value || '#000000')}
              onChange={(color) => {
                onChange(color.hex);
              }}
              // presetColors={favoriteColors}
              disableAlpha={true}
            />
            <div className="p-2 border-t">
              <Button
                variant="default"
                size="xs"
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                Ok
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}