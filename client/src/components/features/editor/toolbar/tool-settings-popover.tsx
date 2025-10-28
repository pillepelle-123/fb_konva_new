import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../ui/primitives/button';
import { X, Paintbrush, Minus, Circle, Square, Triangle, Pentagon, Heart, Star, MessageSquare, Dog, Cat, Smile } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { Input } from '../../../ui/primitives/input';
import { Slider } from '../../../ui/primitives/slider';
import { useEditor } from '../../../../context/editor-context';
import { ColorSelector } from '../tool-settings/color-selector';

interface ToolSettingsPopoverProps {
  activeTool: string;
  children: React.ReactNode;
}

const PRESET_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ffffff'
];

const TOOL_CONFIG: Record<string, { label: string; icon: any }> = {
  brush: { label: 'Brush', icon: Paintbrush },
  line: { label: 'Line', icon: Minus },
  circle: { label: 'Circle', icon: Circle },
  rect: { label: 'Rectangle', icon: Square },
  triangle: { label: 'Triangle', icon: Triangle },
  polygon: { label: 'Polygon', icon: Pentagon },
  heart: { label: 'Heart', icon: Heart },
  star: { label: 'Star', icon: Star },
  'speech-bubble': { label: 'Speech Bubble', icon: MessageSquare },
  dog: { label: 'Dog', icon: Dog },
  cat: { label: 'Cat', icon: Cat },
  smiley: { label: 'Smiley', icon: Smile },
};

export function ToolSettingsPopover({ activeTool, children }: ToolSettingsPopoverProps) {
  const { state, dispatch } = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showStrokeColorPicker, setShowStrokeColorPicker] = useState(false);
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const favoriteColors = state.editorSettings?.favoriteColors?.strokeColors || [];
  
  const addFavoriteColor = (color: string) => {
    const newFavorites = [...favoriteColors, color];
    dispatch({
      type: 'SET_EDITOR_SETTINGS',
      payload: {
        ...state.editorSettings,
        favoriteColors: { strokeColors: newFavorites }
      }
    });
  };
  
  const removeFavoriteColor = (color: string) => {
    const newFavorites = favoriteColors.filter((c: string) => c !== color);
    dispatch({
      type: 'SET_EDITOR_SETTINGS',
      payload: {
        ...state.editorSettings,
        favoriteColors: { strokeColors: newFavorites }
      }
    });
  };
  
  const needsSettings = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(activeTool);
  const needsFill = ['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(activeTool);
  
  const settings = state.toolSettings?.[activeTool] || {};
  const strokeWidth = settings.strokeWidth || 50;
  const strokeColor = settings.strokeColor || '#1f2937';
  const fillColor = settings.fillColor || 'transparent';
  const polygonSides = settings.polygonSides || 5;

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ x: rect.right + 8, y: rect.top });
    }
  };

  const handleClick = () => {
    if (needsSettings) {
      updatePosition();
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    if (needsSettings && !isOpen) {
      setIsOpen(true);
      updatePosition();
    } else if (!needsSettings && isOpen) {
      setIsOpen(false);
    }
  }, [activeTool, needsSettings]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowStrokeColorPicker(false);
        setShowFillColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateSetting = (key: string, value: any) => {
    dispatch({
      type: 'UPDATE_TOOL_SETTINGS',
      payload: { tool: activeTool, settings: { [key]: value } }
    });
  };

  if (!needsSettings) {
    return <>{children}</>;
  }

  const toolConfig = TOOL_CONFIG[activeTool];
  const ToolIcon = toolConfig?.icon;

  const strokeWidthLabel = activeTool === 'brush' ? 'Brush Size' : activeTool === 'line' ? 'Stroke Width' : 'Border Width';
  const fillColorLabel = 'Background Color';

  return (
    <div ref={triggerRef}>
      <div onClick={handleClick}>
        {children}
      </div>
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="fixed w-64 p-3 bg-background border rounded-md shadow-lg"
          style={{ left: position.x, top: position.y, zIndex: 10000 }}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              {ToolIcon && <ToolIcon className="h-4 w-4" />}
              <h3 className="text-sm font-medium">
                {toolConfig?.label || activeTool} Settings
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {showStrokeColorPicker ? (
            <ColorSelector
              value={strokeColor}
              onChange={(color) => updateSetting('strokeColor', color)}
              favoriteColors={favoriteColors}
              onAddFavorite={addFavoriteColor}
              onRemoveFavorite={removeFavoriteColor}
              onBack={() => setShowStrokeColorPicker(false)}
            />
          ) : showFillColorPicker ? (
            <ColorSelector
              value={fillColor}
              onChange={(color) => updateSetting('fillColor', color)}
              favoriteColors={favoriteColors}
              onAddFavorite={addFavoriteColor}
              onRemoveFavorite={removeFavoriteColor}
              onBack={() => setShowFillColorPicker(false)}
            />
          ) : (
            <>
              {/* Stroke Width */}
              <div className="mb-4">
                <Label className="text-xs mb-2 block">{strokeWidthLabel}</Label>
                <Slider
                  label="Stroke Width"
                  value={strokeWidth}
                  onChange={(value) => updateSetting('strokeWidth', value)}
                  min={1}
                  max={100}
                  step={1}
                  hasLabel={false}
                />
              </div>

              {/* Stroke Color */}
              <div className="mb-4">
                <Label className="text-xs mb-2 block">Border Color</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-10"
                  onClick={() => setShowStrokeColorPicker(true)}
                >
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ 
                      backgroundColor: strokeColor === 'transparent' ? '#ffffff' : strokeColor,
                      backgroundImage: strokeColor === 'transparent' ? 'linear-gradient(to top right, transparent 0%, transparent calc(50% - 1px), #ff0000 calc(50% - 1px), #ff0000 calc(50% + 1px), transparent calc(50% + 1px), transparent 100%)' : 'none'
                    }}
                  />
                  <span className="text-xs">{strokeColor}</span>
                </Button>
              </div>

              {/* Fill Color (only for shapes) */}
              {needsFill && (
                <div className="mb-4">
                  <Label className="text-xs mb-2 block">{fillColorLabel}</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-10"
                    onClick={() => setShowFillColorPicker(true)}
                  >
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ 
                        backgroundColor: fillColor === 'transparent' ? '#ffffff' : fillColor,
                        backgroundImage: fillColor === 'transparent' ? 'linear-gradient(to top right, transparent 0%, transparent calc(50% - 1px), #ff0000 calc(50% - 1px), #ff0000 calc(50% + 1px), transparent calc(50% + 1px), transparent 100%)' : 'none'
                      }}
                    />
                    <span className="text-xs">{fillColor}</span>
                  </Button>
                </div>
              )}

              {/* Polygon Sides */}
              {activeTool === 'polygon' && (
                <div>
                  <Label className="text-xs mb-2 block">Polygon Sides</Label>
                  <Input
                    type="number"
                    min={3}
                    max={12}
                    value={polygonSides}
                    onChange={(e) => {
                      const value = Math.max(3, Math.min(12, parseInt(e.target.value) || 5));
                      updateSetting('polygonSides', value);
                    }}
                    className="h-8"
                  />
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
