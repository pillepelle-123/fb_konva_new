import { useState } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Image, Palette, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { RadioGroup } from '../../../ui/primitives/radio-group';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Label } from '../../../ui/primitives/label';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { applyBackgroundImageTemplate, getBackgroundImageWithUrl } from '../../../../utils/background-image-utils';
import { Modal } from '../../../ui/overlays/modal';
import { BackgroundImageSelector } from './background-image-selector';
import { colorPalettes } from '../../../../data/templates/color-palettes';

interface PageBackgroundSettingsProps {
  showColorSelector: string | null;
  setShowColorSelector: (value: string | null) => void;
  showBackgroundSettings: boolean;
  setShowBackgroundSettings: (value: boolean) => void;
  showPatternSettings: boolean;
  setShowPatternSettings: (value: boolean) => void;
  setShowBackgroundImageModal: (value: boolean) => void;
  showBackgroundImageTemplateSelector: boolean;
  setShowBackgroundImageTemplateSelector: (value: boolean) => void;
  selectedBackgroundImageId?: string | null;
  onBackgroundImageSelect?: (imageId: string | null) => void;
  onApplyBackgroundImage?: () => void;
  isBackgroundApplyDisabled?: boolean;
}

export const PageBackgroundSettings = (props: PageBackgroundSettingsProps) => {
  const {
    showColorSelector,
    setShowColorSelector,
    showBackgroundSettings,
    setShowBackgroundSettings,
    showPatternSettings,
    setShowPatternSettings,
    setShowBackgroundImageModal,
    showBackgroundImageTemplateSelector,
    setShowBackgroundImageTemplateSelector,
    selectedBackgroundImageId,
    onBackgroundImageSelect,
    onApplyBackgroundImage,
    isBackgroundApplyDisabled
  } = props;

  const { state, dispatch } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const [forceImageMode, setForceImageMode] = useState(false);

  const updateBackground = (updates: Partial<PageBackground>) => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    const newBackground = { ...background, ...updates };
    dispatch({
      type: 'UPDATE_PAGE_BACKGROUND',
      payload: { pageIndex: state.activePageIndex, background: newBackground }
    });
  };

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  let background = currentPage?.background;
  
  // Get default background color from current palette or existing background
  const getDefaultBackgroundColor = (): string => {
    const activePaletteId = currentPage?.colorPaletteId || state.currentBook?.colorPaletteId;
    if (activePaletteId) {
      const palette = colorPalettes.find(p => p.id === activePaletteId);
      if (palette) {
        return palette.colors.background;
      }
    }

    if (currentPage?.background && typeof currentPage.background.value === 'string') {
      return currentPage.background.value;
    }

    return '#ffffff';
  };
  
  // Initialize background if not set, with default color and opacity 15 (0.15)
  if (!background) {
    const defaultColor = getDefaultBackgroundColor();
    background = { type: 'color', value: defaultColor, opacity: 0.15 };
    updateBackground(background);
  }
  const paintWithPalette = background.type === 'image' ? background.applyPalette !== false : true;
  
  // Ensure opacity is always set (default to 0.15 if not set)
  if (background.opacity === undefined) {
    background.opacity = 0.15;
    updateBackground({ opacity: 0.15 });
  }
  
  const isPattern = background.type === 'pattern';
  const isImage = background.type === 'image';
  // backgroundMode is primarily based on background.type, but use forceImageMode if user just selected "image" 
  // and background hasn't been updated yet
  const backgroundMode = isImage ? 'image' : (isPattern ? 'pattern' : (forceImageMode ? 'image' : 'color'));
  const modalApplyDisabled =
    isBackgroundApplyDisabled ??
    (!selectedBackgroundImageId ||
      selectedBackgroundImageId === (isImage ? background.backgroundImageTemplateId ?? null : null));
  
  // Get secondary color from current palette or theme
  const getSecondaryColor = (): string => {
    const pageColorPaletteId = currentPage?.colorPaletteId;
    const bookColorPaletteId = state.currentBook?.colorPaletteId;
    const activePaletteId = pageColorPaletteId || bookColorPaletteId;
    
    if (activePaletteId) {
      const palette = colorPalettes.find(p => p.id === activePaletteId);
      if (palette) {
        return palette.colors.secondary;
      }
    }
    
    // Fallback to theme secondary color or primary if secondary not available
    const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme || state.currentBook?.themeId || state.currentBook?.bookTheme || 'default';
    const themeDefaults = getGlobalThemeDefaults(pageTheme, 'shape', undefined);
    return themeDefaults.stroke || '#666666';
  };
  
  const handleBackgroundModeChange = (mode: 'color' | 'pattern' | 'image') => {
    // Preserve current opacity value when switching background types
    const currentOpacity = background?.opacity ?? 0.15;
    // Preserve backgroundImageTemplateId and image settings to restore them when switching back to image
    const savedImageTemplateId = background?.backgroundImageTemplateId;
    // Save the image value (URL) when current type is 'image' and no template ID is set (direct upload)
    const savedImageValue = background?.type === 'image' && !background?.backgroundImageTemplateId 
      ? background.value 
      : (background as any)?._savedImageValue; // Use hidden property to preserve direct upload image URL
    const savedImageSize = background?.imageSize;
    const savedImageRepeat = background?.imageRepeat;
    const savedImagePosition = background?.imagePosition;
    
    if (mode === 'color') {
      setForceImageMode(false);
      const defaultColor = getDefaultBackgroundColor();
      // Preserve backgroundImageTemplateId and image settings when switching to color (for restoration later)
      // Also preserve image value in a hidden property if it's a direct upload (no template ID)
      const updateData: any = {
        type: 'color',
        value: defaultColor,
        opacity: currentOpacity,
        backgroundImageTemplateId: savedImageTemplateId,
        imageSize: savedImageSize,
        imageRepeat: savedImageRepeat,
        imagePosition: savedImagePosition,
        imageContainWidthPercent: background?.imageContainWidthPercent,
      };
      // Preserve direct upload image URL in hidden property
      if (background?.type === 'image' && !background?.backgroundImageTemplateId && background?.value) {
        updateData._savedImageValue = background.value;
      } else if ((background as any)?._savedImageValue) {
        updateData._savedImageValue = (background as any)._savedImageValue;
      }
      updateBackground(updateData as Partial<PageBackground>);
      setShowPatternSettings(false);
      setShowBackgroundImageTemplateSelector(false);
    } else if (mode === 'pattern') {
      setForceImageMode(false);
      const backgroundColor = getDefaultBackgroundColor();
      const secondaryColor = getSecondaryColor();
      // Preserve backgroundImageTemplateId and image settings when switching to pattern (for restoration later)
      // patternForegroundColor is the space between patterns (background color)
      // patternBackgroundColor is the color of the pattern itself (secondary color)
      const updateData: any = {
        type: 'pattern',
        value: 'dots',
        patternSize: 6,
        patternStrokeWidth: 10,
        patternForegroundColor: backgroundColor, // Space between patterns uses background color
        patternBackgroundColor: secondaryColor, // Pattern itself uses secondary color
        patternBackgroundOpacity: background?.patternBackgroundOpacity ?? 1, // Preserve existing opacity or default to 1
        opacity: currentOpacity,
        backgroundImageTemplateId: savedImageTemplateId,
        imageSize: savedImageSize,
        imageRepeat: savedImageRepeat,
        imagePosition: savedImagePosition,
        imageContainWidthPercent: background?.imageContainWidthPercent,
      };
      // Preserve direct upload image URL in hidden property
      if (background?.type === 'image' && !background?.backgroundImageTemplateId && background?.value) {
        updateData._savedImageValue = background.value;
      } else if ((background as any)?._savedImageValue) {
        updateData._savedImageValue = (background as any)._savedImageValue;
      }
      updateBackground(updateData as Partial<PageBackground>);
      setShowBackgroundImageTemplateSelector(false);
    } else if (mode === 'image') {
      setForceImageMode(true);
      // If background already has a backgroundImageTemplateId, apply it immediately
      if (background && (background as any).backgroundImageTemplateId) {
        const templateId = (background as any).backgroundImageTemplateId;
        // CRITICAL: Always pass imagePosition and imageWidth to preserve theme values
        const imageBackground = applyBackgroundImageTemplate(templateId, {
          imageSize: savedImageSize || background.imageSize || 'cover',
          imageRepeat: savedImageRepeat !== undefined ? savedImageRepeat : (background.imageRepeat || false),
          imagePosition: savedImagePosition || background.imagePosition, // Preserve existing position
          imageWidth: background.imageContainWidthPercent, // Preserve existing width
          opacity: currentOpacity,
        });
        if (imageBackground) {
          // CRITICAL: Ensure position and width are preserved even if applyBackgroundImageTemplate doesn't set them
          if (savedImagePosition || background.imagePosition) {
            imageBackground.imagePosition = savedImagePosition || background.imagePosition;
          }
          if (background.imageContainWidthPercent !== undefined) {
            imageBackground.imageContainWidthPercent = background.imageContainWidthPercent;
          }
          updateBackground(imageBackground);
        }
        setShowBackgroundImageTemplateSelector(false);
      } else if (savedImageValue || (background as any)?._savedImageValue) {
        // Restore saved image URL value (direct image, not template)
        const imageUrl = savedImageValue || (background as any)?._savedImageValue;
        updateBackground({
          type: 'image',
          value: imageUrl,
          opacity: currentOpacity,
          imageSize: savedImageSize || 'cover',
          imageRepeat: savedImageRepeat || false,
          imagePosition: savedImagePosition || 'top-left',
          imageContainWidthPercent: background?.imageContainWidthPercent || 100
        });
        setShowBackgroundImageTemplateSelector(false);
      } else {
        // No image template ID yet - keep current color/background but set type to image
        // Preserve opacity when switching to image mode
        updateBackground({
          ...background,
          type: 'image',
          value: background.type === 'color' ? background.value : '#ffffff',
          opacity: currentOpacity,
          imageContainWidthPercent: background?.imageContainWidthPercent || 100
        });
        setShowBackgroundImageTemplateSelector(false);
      }
    }
  };

  if (showColorSelector) {
    const getColorValue = () => {
      switch (showColorSelector) {
        case 'background-color':
          // For pattern: this is the space between patterns (patternForegroundColor)
          // For color: this is the background color
          return background.type === 'pattern' ? (background.patternForegroundColor || 'transparent') : background.value;
        case 'pattern-background':
          // This is the color of the pattern itself (dots, lines)
          return background.patternBackgroundColor || '#666666';
        default:
          return '#ffffff';
      }
    };
    
    const handleColorChange = (color: string) => {
      switch (showColorSelector) {
        case 'background-color':
          if (background.type === 'pattern') {
            // Update space color between patterns
            updateBackground({ patternForegroundColor: color });
          } else {
            updateBackground({ value: color });
          }
          break;
        case 'pattern-background':
          // Update pattern color (dots, lines)
          updateBackground({ patternBackgroundColor: color });
          break;
      }
    };
    
    return (
      <ColorSelector
        value={getColorValue()}
        onChange={handleColorChange}
        opacity={background.opacity ?? 1}
        onOpacityChange={undefined}
        favoriteColors={favoriteStrokeColors}
        onAddFavorite={addFavoriteStrokeColor}
        onRemoveFavorite={removeFavoriteStrokeColor}
        onBack={() => setShowColorSelector(null)}
        showOpacitySlider={false}
      />
    );
  }

  if (showPatternSettings && isPattern) {
    const currentPatternId = background.value || 'dots';
    
    // Pattern Size configuration
    const patternSizeConfig: Record<string, { min: number; max: number; step: number }> = {
      'dots': { min: 2, max: 11, step: 1 },
      'grid': { min: 1, max: 9, step: 1 },
      'diagonal': { min: 1, max: 11, step: 1 },
      'cross': { min: 1, max: 11, step: 1 },
      'waves': { min: 1, max: 11, step: 1 },
      'hexagon': { min: 1, max: 11, step: 1 }
    };
    
    // Pattern Stroke Width configuration
    const patternStrokeWidthConfig: Record<string, { min: number; max: number; step: number } | null> = {
      'dots': null, // Hide for dots
      'grid': { min: 1, max: 500, step: 5 },
      'diagonal': { min: 1, max: 500, step: 5 },
      'cross': { min: 1, max: 500, step: 5 },
      'waves': { min: 1, max: 380, step: 4 },
      'hexagon': { min: 1, max: 500, step: 5 }
    };
    
    const sizeConfig = patternSizeConfig[currentPatternId] || patternSizeConfig['dots'];
    const strokeWidthConfig = patternStrokeWidthConfig[currentPatternId] ?? patternStrokeWidthConfig['grid'];
    
    // Clamp values to valid ranges (without triggering updates during render)
    const currentPatternSize = background.patternSize || sizeConfig.min;
    const clampedPatternSize = Math.max(sizeConfig.min, Math.min(sizeConfig.max, currentPatternSize));
    
    const currentPatternStrokeWidth = background.patternStrokeWidth || (strokeWidthConfig?.min ?? 1);
    const clampedPatternStrokeWidth = strokeWidthConfig 
      ? Math.max(strokeWidthConfig.min, Math.min(strokeWidthConfig.max, currentPatternStrokeWidth))
      : currentPatternStrokeWidth;
    
    // Handle pattern change - clamp values when pattern changes
    const handlePatternChange = (patternId: string) => {
      const newSizeConfig = patternSizeConfig[patternId] || patternSizeConfig['dots'];
      const newStrokeWidthConfig = patternStrokeWidthConfig[patternId] ?? patternStrokeWidthConfig['grid'];
      
      const currentSize = background.patternSize || newSizeConfig.min;
      const clampedSize = Math.max(newSizeConfig.min, Math.min(newSizeConfig.max, currentSize));
      
      const updates: Partial<PageBackground> = { value: patternId };
      
      if (clampedSize !== currentSize) {
        updates.patternSize = clampedSize;
      }
      
      if (newStrokeWidthConfig) {
        const currentStrokeWidth = background.patternStrokeWidth || newStrokeWidthConfig.min;
        const clampedStrokeWidth = Math.max(newStrokeWidthConfig.min, Math.min(newStrokeWidthConfig.max, currentStrokeWidth));
        if (clampedStrokeWidth !== currentStrokeWidth) {
          updates.patternStrokeWidth = clampedStrokeWidth;
        }
      } else {
        // If switching to dots, remove patternStrokeWidth
        if (background.patternStrokeWidth !== undefined) {
          updates.patternStrokeWidth = undefined;
        }
      }
      
      updateBackground(updates);
    };
    
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
                  onClick={() => handlePatternChange(pattern.id)}
                  title={pattern.name}
                />
              );
            })}
          </div>
        </div>
        
        <Slider
          label="Pattern Size"
          value={clampedPatternSize}
          onChange={(value) => updateBackground({ patternSize: value })}
          min={sizeConfig.min}
          max={sizeConfig.max}
          step={sizeConfig.step}
          unit=""
        />
        
        {strokeWidthConfig && (
          <Slider
            label="Pattern Stroke Width"
            value={clampedPatternStrokeWidth}
            onChange={(value) => updateBackground({ patternStrokeWidth: value })}
            min={strokeWidthConfig.min}
            max={strokeWidthConfig.max}
            step={strokeWidthConfig.step}
          />
        )}
        
        <div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowColorSelector('pattern-background')}
            className="w-full"
          >
            <Palette className="h-4 w-4 mr-2" />
            Pattern Color
          </Button>
        </div>
        
        <div>
          <Label variant="xs" className="mt-2 block">Opacity</Label>
          <Slider
            label="Opacity"
            value={Math.round((background.patternBackgroundOpacity ?? 1) * 100)}
            displayValue={Math.round((background.patternBackgroundOpacity ?? 1) * 100)}
            onChange={(value) => {
              const opacityValue = value / 100;
              updateBackground({ patternBackgroundOpacity: opacityValue });
            }}
            min={0}
            max={100}
            step={5}
            unit="%"
            hasLabel={false}
          />
        </div>
      </div>
    );
  }

  const handleCloseBackgroundImageSelector = () => {
    setShowBackgroundImageTemplateSelector(false);
    if (!background || background.type !== 'image') {
      handleBackgroundModeChange('color');
    }
  };

  return (
    <>
      <div className="space-y-4 p-2">
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

        {/* Radio Group for Color/Pattern/Image */}
        <RadioGroup
          value={backgroundMode}
          onChange={(value) => handleBackgroundModeChange(value as 'color' | 'pattern' | 'image')}
          options={[
            { value: 'color', label: 'Color' },
            { value: 'pattern', label: 'Pattern' },
            { value: 'image', label: 'Image' }
          ]}
        />
        
        {/* Color Button */}
        {(backgroundMode === 'color' || backgroundMode === 'pattern') && ( 
          
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
          )}

        {/* Pattern Settings Button */}
        {backgroundMode === 'pattern' && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowPatternSettings(true)}
              className="w-full"
            >
              Pattern Settings
            </Button>
          </div>
        )}


        {/* Select Image Button */}
        {backgroundMode === 'image' && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                // Set selected image ID to current background image if it exists
                if (background && background.type === 'image' && background.backgroundImageTemplateId) {
                  onBackgroundImageSelect?.(background.backgroundImageTemplateId);
                }
                setShowBackgroundImageTemplateSelector(true);
              }}
              className="w-full"
            >
              <Image className="h-4 w-4 mr-2" />
              Select Image
            </Button>
            {background?.type === 'image' && background.backgroundImageTemplateId && (
              <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/40 px-3 py-2">
                <Checkbox
                  id="paint-with-palette"
                  checked={paintWithPalette}
                  onCheckedChange={(checked) => {
                    const usePalette = checked !== false;
                    if (background?.type === 'image' && background.backgroundImageTemplateId) {
                      if (!usePalette) {
                        const template = getBackgroundImageWithUrl(background.backgroundImageTemplateId);
                        updateBackground({
                          applyPalette: false,
                          value: template?.url ?? background.value,
                        });
                      } else {
                        updateBackground({ applyPalette: true });
                      }
                    } else {
                      updateBackground({ applyPalette: usePalette });
                    }
                  }}
                />
                <label htmlFor="paint-with-palette" className="text-xs text-muted-foreground">
                  Paint with Color Palette
                </label>
              </div>
            )}
          </div>
        )}
        
        <div>
          <Label variant="xs" className="mt-2 block">Opacity</Label>
          <Slider
            label="Opacity"
            value={Math.round((background.opacity ?? 1) * 100)}
            displayValue={Math.round((background.opacity ?? 1) * 100)}
            onChange={(value) => {
              const opacityValue = value / 100;
              updateBackground({ opacity: opacityValue });
            }}
            min={0}
            max={100}
            step={5}
            unit="%"
            hasLabel={false}
          />
        </div>

        {/* Image Size, Position, and Repeat Controls - only visible when image background is active */}
        {backgroundMode === 'image' && background && background.type === 'image' && (
          <div className="space-y-3">
            {/* Image Size Buttons */}
            <div>
              <Label variant="xs" className="mb-1 block">Image Size</Label>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant={background.imageSize === 'cover' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    updateBackground({ imageSize: 'cover', imageContainWidthPercent: undefined });
                  }}
                  className="text-xs"
                >
                  Cover
                </Button>
                <Button
                  variant={background.imageSize === 'contain' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    updateBackground({ imageSize: 'contain', imageContainWidthPercent: background.imageContainWidthPercent ?? 100 });
                  }}
                  className="text-xs"
                >
                  Contain
                </Button>
                <Button
                  variant={background.imageSize === 'stretch' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    updateBackground({ imageSize: 'stretch', imageContainWidthPercent: undefined });
                  }}
                  className="text-xs"
                >
                  Stretch
                </Button>
              </div>
            </div>

            {/* Position Buttons for Contain mode */}
            {background.imageSize === 'contain' && !background.imageRepeat && (
              <div>
                <Label variant="xs" className="mb-1 block">Position</Label>
                <ButtonGroup>
                  <Button
                    variant={background.imagePosition === 'top-left' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      updateBackground({ imagePosition: 'top-left' });
                    }}
                    className="px-2"
                  >
                    <ArrowUpLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={background.imagePosition === 'top-right' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      updateBackground({ imagePosition: 'top-right' });
                    }}
                    className="px-2"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={background.imagePosition === 'bottom-left' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      updateBackground({ imagePosition: 'bottom-left' });
                    }}
                    className="px-2"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={background.imagePosition === 'bottom-right' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      updateBackground({ imagePosition: 'bottom-right' });
                    }}
                    className="px-2"
                  >
                    <ArrowDownRight className="h-4 w-4" />
                  </Button>
                </ButtonGroup>
              </div>
            )}

            {/* Repeat Checkbox for Contain mode */}
            {background.imageSize === 'contain' && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={background.imageRepeat || false}
                  onCheckedChange={(checked) => {
                    updateBackground({ imageRepeat: checked === true });
                  }}
                />
                <Label variant="xs" className="cursor-pointer">Repeat</Label>
              </div>
            )}

            {background.imageSize === 'contain' && (
              <div>
                <Label variant="xs" className="mb-1 block">Image Width</Label>
                <Slider
                  label="Image Width"
                  value={background.imageContainWidthPercent ?? 100}
                  onChange={(value) => {
                    const clampedValue = Math.max(10, Math.min(200, value));
                    updateBackground({ imageContainWidthPercent: clampedValue });
                  }}
                  min={25}
                  max={100}
                  step={1}
                  unit="%"
                  displayValue={Math.round(background.imageContainWidthPercent ?? 100)}
                  hasLabel={false}
                />
              </div>
            )}
          </div>
        )}

      </div>
      <Modal
        isOpen={showBackgroundImageTemplateSelector}
        onClose={handleCloseBackgroundImageSelector}
        title="Background Images"
        actions={
          onApplyBackgroundImage
            ? (
              <Button
                size="sm"
                onClick={() => onApplyBackgroundImage()}
                disabled={modalApplyDisabled}
              >
                Apply Background Image
              </Button>
            )
            : undefined
        }
      >
        <BackgroundImageSelector
          onBack={handleCloseBackgroundImageSelector}
          onUpload={() => setShowBackgroundImageModal(true)}
          selectedImageId={selectedBackgroundImageId}
          onImageSelect={(imageId) => onBackgroundImageSelect?.(imageId)}
        />
      </Modal>
    </>
  );
};
