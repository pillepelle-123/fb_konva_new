import { useState, useRef, useEffect } from 'react';
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
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert hex to HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  };

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Initialize HSL from current value only once
  useEffect(() => {
    if (value) {
      const [h, s, l] = hexToHsl(value);
      setHue(h);
      setSaturation(s);
      setLightness(l);
    }
  }, []);

  // Update color only when user interacts
  const updateColor = () => {
    const newColor = hslToHex(hue, saturation, lightness);
    onChange(newColor);
  };

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
          style={{ backgroundColor: value }}
          onClick={() => setIsOpen(!isOpen)}
        />
        <input
          type="text"
          value={value}
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
        <div className="absolute top-10 left-0 z-50 bg-white border rounded-lg shadow-lg p-3 w-64">
          {/* Saturation/Lightness picker */}
          <div className="relative w-full h-32 mb-3 rounded overflow-hidden">
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(to right, white, hsl(${hue}, 100%, 50%)), linear-gradient(to top, black, transparent)`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                setSaturation((x / rect.width) * 100);
                setLightness(100 - (y / rect.height) * 100);
                setTimeout(updateColor, 0);
              }}
            >
              <div
                className="absolute w-3 h-3 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${saturation}%`,
                  top: `${100 - lightness}%`
                }}
              />
            </div>
          </div>

          {/* Hue slider */}
          <input
            ref={hueRef}
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => {
              setHue(parseInt(e.target.value));
              setTimeout(updateColor, 0);
            }}
            className="w-full h-4 mb-3 rounded-lg appearance-none"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
          />

          {/* Favorite colors */}
          {favoriteColors.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2">Favorites</div>
              <div className="grid grid-cols-8 gap-1">
                {favoriteColors.map((color, index) => (
                  <button
                    key={index}
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}