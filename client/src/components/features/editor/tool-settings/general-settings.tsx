import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Settings, Palette, Image, PaintBucket } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/composites/tabs';
import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { GlobalThemeSelector } from '../global-theme-selector';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';

interface GeneralSettingsProps {
  showColorSelector: string | null;
  setShowColorSelector: (value: string | null) => void;
  showBackgroundSettings: boolean;
  setShowBackgroundSettings: (value: boolean) => void;
  showPatternSettings: boolean;
  setShowPatternSettings: (value: boolean) => void;
  showPageTheme: boolean;
  setShowPageTheme: (value: boolean) => void;
  showBookTheme: boolean;
  setShowBookTheme: (value: boolean) => void;
  setShowBackgroundImageModal: (value: boolean) => void;
}

export function GeneralSettings({
  showColorSelector,
  setShowColorSelector,
  showBackgroundSettings,
  setShowBackgroundSettings,
  showPatternSettings,
  setShowPatternSettings,
  showPageTheme,
  setShowPageTheme,
  showBookTheme,
  setShowBookTheme,
  setShowBackgroundImageModal
}: GeneralSettingsProps) {
  const { state, dispatch } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);

  const updateBackground = (updates: Partial<PageBackground>) => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    const newBackground = { ...background, ...updates };
    dispatch({
      type: 'UPDATE_PAGE_BACKGROUND',
      payload: { pageIndex: state.activePageIndex, background: newBackground }
    });
  };

  const renderPageThemeSettings = () => {
    return (
      <GlobalThemeSelector
        currentTheme={state.currentBook?.pages[state.activePageIndex]?.background?.globalTheme}
        onThemeSelect={(themeId) => {
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          if (currentPage) {
            currentPage.elements.forEach(element => {
              const themeDefaults = getGlobalThemeDefaults(themeId, element.type);
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: { id: element.id, updates: themeDefaults }
              });
            });
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { 
                pageIndex: state.activePageIndex, 
                background: { 
                  ...currentPage.background, 
                  globalTheme: themeId 
                } 
              }
            });
          }
          setShowPageTheme(false);
        }}
        onBack={() => setShowPageTheme(false)}
      />
    );
  };

  const renderBookThemeSettings = () => {
    return (
      <GlobalThemeSelector
        currentTheme={undefined}
        onThemeSelect={(themeId) => {
          if (state.currentBook) {
            state.currentBook.pages.forEach((page, pageIndex) => {
              page.elements.forEach(element => {
                const themeDefaults = getGlobalThemeDefaults(themeId, element.type);
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: { id: element.id, updates: themeDefaults }
                });
              });
              dispatch({
                type: 'UPDATE_PAGE_BACKGROUND',
                payload: { 
                  pageIndex, 
                  background: { 
                    ...page.background, 
                    globalTheme: themeId 
                  } 
                }
              });
            });
          }
          setShowBookTheme(false);
        }}
        onBack={() => setShowBookTheme(false)}
      />
    );
  };

  const renderBackgroundSettings = () => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    const isPattern = background.type === 'pattern';
    const currentColor = isPattern ? (background.patternForegroundColor || '#666666') : background.value;

    const togglePattern = (checked: boolean) => {
      if (checked) {
        updateBackground({
          type: 'pattern',
          value: 'dots',
          patternForegroundColor: currentColor,
          patternBackgroundColor: 'transparent'
        });
      } else {
        updateBackground({
          type: 'color',
          value: currentColor
        });
        setShowPatternSettings(false);
      }
    };

    if (showColorSelector) {
      const getColorValue = () => {
        switch (showColorSelector) {
          case 'background-color':
            return background.type === 'pattern' ? (background.patternForegroundColor || '#666666') : background.value;
          case 'pattern-background':
            return background.patternBackgroundColor || 'transparent';
          default:
            return '#ffffff';
        }
      };
      
      const getOpacityValue = () => {
        switch (showColorSelector) {
          case 'background-color':
            return background.opacity || 1;
          case 'pattern-background':
            return background.patternBackgroundOpacity || 1;
          default:
            return 1;
        }
      };
      
      const handleOpacityChange = (opacity: number) => {
        switch (showColorSelector) {
          case 'background-color':
            updateBackground({ opacity });
            break;
          case 'pattern-background':
            updateBackground({ patternBackgroundOpacity: opacity });
            break;
        }
      };
      
      const handleColorChange = (color: string) => {
        switch (showColorSelector) {
          case 'background-color':
            if (background.type === 'pattern') {
              updateBackground({ patternForegroundColor: color });
            } else {
              updateBackground({ value: color });
            }
            break;
          case 'pattern-background':
            updateBackground({ patternBackgroundColor: color });
            break;
        }
      };
      
      return (
        <ColorSelector
          value={getColorValue()}
          onChange={handleColorChange}
          opacity={getOpacityValue()}
          onOpacityChange={handleOpacityChange}
          favoriteColors={favoriteStrokeColors}
          onAddFavorite={addFavoriteStrokeColor}
          onRemoveFavorite={removeFavoriteStrokeColor}
          onBack={() => setShowColorSelector(null)}
        />
      );
    }

    if (showPatternSettings && isPattern) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPatternSettings(false)}
              className="px-2 h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          
          <div>
            <Label variant="xs">Pattern</Label>
            <div className="grid grid-cols-2 gap-1">
              {PATTERNS.map((pattern) => {
                const patternDataUrl = createPatternDataUrl(
                  pattern,
                  "black",
                  'transparent'
                );
                
                return (
                  <button
                    key={pattern.id}
                    className={`w-full h-8 border rounded ${
                      background.value === pattern.id ? 'border-4 border-[hsl(var(--ring))]' : 'border-gray-200'
                    }`}
                    style={{ backgroundImage: `url(${patternDataUrl})` }}
                    onClick={() => updateBackground({ value: pattern.id })}
                    title={pattern.name}
                  />
                );
              })}
            </div>
          </div>
          
          <Slider
            label="Pattern Size"
            value={background.patternSize || 1}
            onChange={(value) => updateBackground({ patternSize: value })}
            min={1}
            max={10}
            unit=""
          />
          
          <Slider
            label="Pattern Stroke Width"
            value={background.patternStrokeWidth || 1}
            onChange={(value) => updateBackground({ patternStrokeWidth: value })}
            min={1}
            max={10}
            step={1}
          />
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('pattern-background')}
              className="w-full"
            >
              <Palette className="h-4 w-4 mr-2" />
              Background Color
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBackgroundSettings(false)}
            className="px-2 h-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        <div>
          <Tabs 
            value={background.type === 'image' ? 'image' : 'color'} 
            onValueChange={(value) => {
              if (value === 'color') {
                updateBackground({ type: 'color', value: '#ffffff' });
              } else {
                updateBackground({ type: 'image', value: '', imageSize: 'cover' });
              }
            }}
          >
            <TabsList variant="bootstrap" className='w-full'>
              <TabsTrigger variant="bootstrap" value="color">Color</TabsTrigger>
              <TabsTrigger variant="bootstrap" value="image">Image</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {(background.type === 'color' || background.type === 'pattern') && (
          <div className="space-y-2">
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('background-color')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Color
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-row gap-5 items-center h-12 space-x-2">
                <span className="flex items-center gap-1 text-xs font-medium">
                <Checkbox
                  id="pattern"
                  checked={isPattern}
                  onCheckedChange={togglePattern}
                />
                <Label htmlFor="pattern" className="text-sm font-medium cursor-pointer">
                  Pattern
                </Label>
                </span>
                {isPattern && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowPatternSettings(true)}
                    className="ml-4 w-full"
                  >
                    Pattern Settings
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {background.type === 'image' && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowBackgroundImageModal(true)}
              className="w-full"
            >
              <Image className="h-4 w-4 mr-2" />
              {background.value ? 'Change Image' : 'Select Image'}
            </Button>
            
            {background.value && (
              <div className="space-y-2">
                <div>
                  <Label variant="xs">Size</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      variant={background.imageSize === 'cover' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateBackground({ imageSize: 'cover' })}
                      className="text-xs"
                    >
                      Cover
                    </Button>
                    <Button
                      variant={background.imageSize === 'contain' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateBackground({ imageSize: 'contain' })}
                      className="text-xs"
                    >
                      Contain
                    </Button>
                    <Button
                      variant={background.imageSize === 'stretch' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateBackground({ imageSize: 'stretch' })}
                      className="text-xs"
                    >
                      Stretch
                    </Button>
                  </div>
                </div>
                
                {background.imageSize === 'contain' && (
                  <div>
                    <Label className="flex items-center gap-1" variant="xs">
                      <input
                        type="checkbox"
                        checked={background.imageRepeat || false}
                        onChange={(e) => updateBackground({ imageRepeat: e.target.checked })}
                        className="rounded w-3 h-3"
                      />
                      Repeat
                    </Label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (showBackgroundSettings) {
    return renderBackgroundSettings();
  }
  
  if (showPageTheme) {
    return renderPageThemeSettings();
  }

  if (showBookTheme) {
    return renderBookThemeSettings();
  }

  return (
    <div className="space-y-3">
      <div>
        <Label variant="xs" className="text-muted-foreground mb-2 block">Book Settings</Label>
        <Button
          variant="ghost_hover"
          size="sm"
          onClick={() => setShowBookTheme(true)}
          className="w-full justify-start"
        >
          <Palette className="h-4 w-4 mr-2" />
          Book Theme
        </Button>
      </div>
      
      <Separator />
      
      <div>
        <Label variant="xs" className="text-muted-foreground mb-2 block">Page Settings</Label>
        <div className="space-y-1">
          <Button
            variant="ghost_hover"
            size="sm"
            onClick={() => setShowBackgroundSettings(true)}
            className="w-full justify-start"
          >
            <PaintBucket className="h-4 w-4 mr-2" />
            Background
          </Button>
          <Button
            variant="ghost_hover"
            size="sm"
            onClick={() => setShowPageTheme(true)}
            className="w-full justify-start"
          >
            <Palette className="h-4 w-4 mr-2" />
            Page Theme
          </Button>
        </div>
      </div>
    </div>
  );
}