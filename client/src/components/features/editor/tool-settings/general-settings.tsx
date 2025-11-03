import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Settings, Palette, Image, PaintBucket, CircleHelp, LayoutPanelLeft, Paintbrush2, SwatchBook, ArrowDown, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { RadioGroup } from '../../../ui/primitives/radio-group';
import { getPalette } from '../../../../utils/global-palettes';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { GlobalThemeSelector } from '../global-theme-selector';
import { getGlobalThemeDefaults, getGlobalTheme, getThemePageBackgroundColors } from '../../../../utils/global-themes';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { PaletteSelector } from '../palette-selector';
import { commonToActual } from '../../../../utils/font-size-converter';
import { useState } from 'react';
import ConfirmationDialog from '../../../ui/overlays/confirmation-dialog';
import { BackgroundImageSelector } from './background-image-selector';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';


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
  showBackgroundImageTemplateSelector: boolean;
  setShowBackgroundImageTemplateSelector: (value: boolean) => void;
  onOpenTemplates: () => void;
  onOpenLayouts: () => void;
  onOpenBookLayouts: () => void;
  onOpenThemes: () => void;
  onOpenPalettes: () => void;
  selectedBackgroundImageId?: string | null;
  onBackgroundImageSelect?: (imageId: string | null) => void;
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
  setShowBackgroundImageModal,
  showBackgroundImageTemplateSelector,
  setShowBackgroundImageTemplateSelector,
  onOpenTemplates,
  onOpenLayouts,
  onOpenBookLayouts,
  onOpenThemes,
  onOpenPalettes,
  selectedBackgroundImageId,
  onBackgroundImageSelect
}: GeneralSettingsProps) {
  const { state, dispatch, canEditSettings } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const [showPagePalette, setShowPagePalette] = useState(false);
  const [showBookPalette, setShowBookPalette] = useState(false);
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



  const renderPageThemeSettings = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPageTheme(false)}
            className="px-2 h-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        {/* Button to apply Book Theme to current page */}
        {state.currentBook?.bookTheme && state.currentBook.bookTheme !== 'default' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const bookThemeId = state.currentBook?.bookTheme || 'default';
              // Set page theme to book theme
              dispatch({ type: 'SET_PAGE_THEME', payload: { pageIndex: state.activePageIndex, themeId: bookThemeId } });
              
              // Apply theme to all elements on current page
              dispatch({
                type: 'APPLY_THEME_TO_ELEMENTS',
                payload: { pageIndex: state.activePageIndex, themeId: bookThemeId }
              });
              
              const theme = getGlobalTheme(bookThemeId);
              if (theme) {
                // Get page background colors from palette, not from themes.json
                const pageColors = getThemePageBackgroundColors(bookThemeId);
                
                // Apply page background settings
                const newBackground = {
                  type: theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color',
                  value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
                  opacity: theme.pageSettings.backgroundOpacity || 1,
                  pageTheme: bookThemeId,
                  ruledLines: theme.ruledLines,
                  ...(theme.pageSettings.backgroundPattern?.enabled && {
                    patternSize: theme.pageSettings.backgroundPattern.size,
                    patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                    patternForegroundColor: pageColors.backgroundColor,
                    patternBackgroundColor: pageColors.patternBackgroundColor,
                    patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
                  })
                };
                
                dispatch({
                  type: 'UPDATE_PAGE_BACKGROUND',
                  payload: { 
                    pageIndex: state.activePageIndex, 
                    background: newBackground
                  }
                });
              }
            }}
            className="w-full mb-4"
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Book Theme übernehmen
          </Button>
        )}
        
        <GlobalThemeSelector
          currentTheme={state.currentBook?.pages[state.activePageIndex]?.background?.pageTheme || state.currentBook?.bookTheme || 'default'}
          onThemeSelect={(themeId) => {
            // Set page theme
            dispatch({ type: 'SET_PAGE_THEME', payload: { pageIndex: state.activePageIndex, themeId } });
            
            // Remove page color palette override so theme palette is used instead
            dispatch({
              type: 'SET_PAGE_COLOR_PALETTE',
              payload: { pageIndex: state.activePageIndex, colorPaletteId: null }
            });
            
            // Apply theme to all elements on current page
            dispatch({
              type: 'APPLY_THEME_TO_ELEMENTS',
              payload: { pageIndex: state.activePageIndex, themeId }
            });
            
            const theme = getGlobalTheme(themeId);
            if (theme) {
                // Get page background colors from palette, not from themes.json
                const pageColors = getThemePageBackgroundColors(themeId);
                
                // Apply page background settings
                const newBackground = {
                  type: theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color',
                  value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
                  opacity: theme.pageSettings.backgroundOpacity || 1,
                  pageTheme: themeId,
                  ruledLines: theme.ruledLines,
                  ...(theme.pageSettings.backgroundPattern?.enabled && {
                    patternSize: theme.pageSettings.backgroundPattern.size,
                    patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                    patternForegroundColor: pageColors.backgroundColor,
                    patternBackgroundColor: pageColors.patternBackgroundColor,
                    patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
                  })
                };
                
                dispatch({
                  type: 'UPDATE_PAGE_BACKGROUND',
                  payload: { 
                    pageIndex: state.activePageIndex, 
                    background: newBackground
                  }
                });
                
                // Reset tool settings to theme defaults (not palette defaults)
                // This ensures tool colors reflect the theme, not any previously applied palette
                const currentPage = state.currentBook?.pages[state.activePageIndex];
                const pageLayoutTemplateId = currentPage?.layoutTemplateId;
                const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
                
                // Don't use palette IDs - we want pure theme colors
                const toolTypes = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna_inline', 'free_text'];
                const toolUpdates: Record<string, any> = {};
                
                toolTypes.forEach(toolType => {
                  // Get theme defaults WITHOUT palette - just pure theme colors
                  const themeDefaults = getToolDefaults(
                    toolType as any,
                    themeId, // pageTheme - use selected theme
                    state.currentBook?.bookTheme || 'default', // bookTheme
                    undefined,
                    undefined, // Don't pass toolSettings - we want pure theme defaults
                    pageLayoutTemplateId,
                    bookLayoutTemplateId,
                    null, // Don't use page palette - reset to theme colors
                    null  // Don't use book palette - reset to theme colors
                  );
                  
                  // Build tool settings from theme defaults (theme palette, not manually selected palette)
                  if (toolType === 'brush' || toolType === 'line') {
                    const updates: Record<string, any> = {
                      strokeColor: themeDefaults.stroke || '#1f2937',
                      strokeWidth: themeDefaults.strokeWidth || 2
                    };
                    toolUpdates[toolType] = updates;
                  } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(toolType)) {
                    const updates: Record<string, any> = {
                      strokeColor: themeDefaults.stroke || '#1f2937',
                      strokeWidth: themeDefaults.strokeWidth || 2
                    };
                    if (themeDefaults.fill && themeDefaults.fill !== 'transparent') {
                      updates.fillColor = themeDefaults.fill;
                    } else {
                      updates.fillColor = 'transparent';
                    }
                    toolUpdates[toolType] = updates;
                  } else {
                    // Text elements
                    toolUpdates[toolType] = {
                      fontColor: themeDefaults.fontColor || themeDefaults.font?.fontColor || '#1f2937',
                      borderColor: themeDefaults.borderColor || themeDefaults.border?.borderColor || '#9ca3af',
                      backgroundColor: themeDefaults.backgroundColor || themeDefaults.background?.backgroundColor || '#FFFFFF'
                    };
                  }
                });
                
                // Update tool settings with theme defaults (not palette defaults)
                Object.entries(toolUpdates).forEach(([tool, settings]) => {
                  const cleanSettings = Object.fromEntries(
                    Object.entries(settings).filter(([, value]) => value !== undefined)
                  );
                  
                  dispatch({
                    type: 'UPDATE_TOOL_SETTINGS',
                    payload: { tool, settings: cleanSettings }
                  });
                });
              }
            }
          }
          onBack={() => {}}
          title="Page Theme"
        />
        
      </div>
    );
  };

  const renderBookThemeSettings = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBookTheme(false)}
            className="px-2 h-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        <GlobalThemeSelector
          currentTheme={state.currentBook?.bookTheme || 'default'}
          title="Book Theme"
          onThemeSelect={(themeId) => {
            // Set book theme
            dispatch({ type: 'SET_BOOK_THEME', payload: themeId });
            
            // Remove book color palette override so theme palette is used instead
            dispatch({ type: 'SET_BOOK_COLOR_PALETTE', payload: null });
            
            if (state.currentBook) {
              // Apply theme to all elements on all pages
              state.currentBook.pages.forEach((_, pageIndex) => {
                dispatch({
                  type: 'APPLY_THEME_TO_ELEMENTS',
                  payload: { pageIndex, themeId }
                });
              });
              
              const theme = getGlobalTheme(themeId);
              if (theme) {
                // Apply page background settings to ALL pages
                state.currentBook.pages.forEach((_, pageIndex) => {
                  // Get page background colors from palette, not from themes.json
                  const pageColors = getThemePageBackgroundColors(themeId);
                  
                  // Apply page background settings to ALL pages (overriding page themes)
                  const newBackground = {
                    type: theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color',
                    value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
                    opacity: theme.pageSettings.backgroundOpacity || 1,
                    pageTheme: undefined, // Clear page theme override
                    ruledLines: theme.ruledLines,
                    ...(theme.pageSettings.backgroundPattern?.enabled && {
                      patternSize: theme.pageSettings.backgroundPattern.size,
                      patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                      patternForegroundColor: pageColors.backgroundColor,
                      patternBackgroundColor: pageColors.patternBackgroundColor,
                      patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
                    })
                  };
                  
                  dispatch({
                    type: 'UPDATE_PAGE_BACKGROUND',
                    payload: { 
                      pageIndex, 
                      background: newBackground
                    }
                  });
                });
                
                // Reset tool settings to theme defaults (not palette defaults) for all tools
                // This ensures tool colors reflect the theme, not any previously applied palette
                const bookLayoutTemplateId = state.currentBook.layoutTemplateId;
                
                // Don't use palette IDs - we want pure theme colors
                const toolTypes = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna_inline', 'free_text'];
                const toolUpdates: Record<string, any> = {};
                
                toolTypes.forEach(toolType => {
                  // Get theme defaults WITHOUT palette - just pure theme colors
                  const themeDefaults = getToolDefaults(
                    toolType as any,
                    themeId, // pageTheme - use selected theme
                    themeId, // bookTheme - use selected theme
                    undefined,
                    undefined, // Don't pass toolSettings - we want pure theme defaults
                    undefined, // pageLayoutTemplateId
                    bookLayoutTemplateId,
                    null, // Don't use page palette - reset to theme colors
                    null  // Don't use book palette - reset to theme colors
                  );
                  
                  // Build tool settings from theme defaults (theme palette, not manually selected palette)
                  if (toolType === 'brush' || toolType === 'line') {
                    const updates: Record<string, any> = {
                      strokeColor: themeDefaults.stroke || '#1f2937',
                      strokeWidth: themeDefaults.strokeWidth || 2
                    };
                    toolUpdates[toolType] = updates;
                  } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(toolType)) {
                    const updates: Record<string, any> = {
                      strokeColor: themeDefaults.stroke || '#1f2937',
                      strokeWidth: themeDefaults.strokeWidth || 2
                    };
                    if (themeDefaults.fill && themeDefaults.fill !== 'transparent') {
                      updates.fillColor = themeDefaults.fill;
                    } else {
                      updates.fillColor = 'transparent';
                    }
                    toolUpdates[toolType] = updates;
                  } else {
                    // Text elements
                    toolUpdates[toolType] = {
                      fontColor: themeDefaults.fontColor || themeDefaults.font?.fontColor || '#1f2937',
                      borderColor: themeDefaults.borderColor || themeDefaults.border?.borderColor || '#9ca3af',
                      backgroundColor: themeDefaults.backgroundColor || themeDefaults.background?.backgroundColor || '#FFFFFF'
                    };
                  }
                });
                
                // Update tool settings with theme defaults (not palette defaults)
                Object.entries(toolUpdates).forEach(([tool, settings]) => {
                  const cleanSettings = Object.fromEntries(
                    Object.entries(settings).filter(([, value]) => value !== undefined)
                  );
                  
                  dispatch({
                    type: 'UPDATE_TOOL_SETTINGS',
                    payload: { tool, settings: cleanSettings }
                  });
                });
              }
            }
          }}
          onBack={() => {}}
        />
      </div>
    );
  };

  const renderBackgroundSettings = () => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    let background = currentPage?.background;
    
    // Get default background color from theme or palette
    const getDefaultBackgroundColor = (): string => {
      const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme || state.currentBook?.themeId || state.currentBook?.bookTheme || 'default';
      const pageColors = getThemePageBackgroundColors(pageTheme);
      return pageColors.backgroundColor;
    };
    
    // Initialize background if not set, with default color and opacity 15 (0.15)
    if (!background) {
      const defaultColor = getDefaultBackgroundColor();
      background = { type: 'color', value: defaultColor, opacity: 0.15 };
      updateBackground(background);
    }
    
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
    
    // Get primary color from current palette or theme
    const getPrimaryColor = (): string => {
      const pageColorPaletteId = currentPage?.colorPaletteId;
      const bookColorPaletteId = state.currentBook?.colorPaletteId;
      const activePaletteId = pageColorPaletteId || bookColorPaletteId;
      
      if (activePaletteId) {
        const palette = getPalette(activePaletteId);
        if (palette) {
          return palette.colors.primary;
        }
      }
      
      // Fallback to theme primary color
      const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme || state.currentBook?.themeId || state.currentBook?.bookTheme || 'default';
      const themeDefaults = getGlobalThemeDefaults(pageTheme, 'shape');
      return themeDefaults.stroke || '#000000';
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
          imagePosition: savedImagePosition
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
        const primaryColor = getPrimaryColor();
        // Preserve backgroundImageTemplateId and image settings when switching to pattern (for restoration later)
        const updateData: any = {
          type: 'pattern',
          value: 'dots',
          patternSize: 6,
          patternStrokeWidth: 10,
          patternForegroundColor: primaryColor,
          patternBackgroundColor: 'transparent',
          opacity: currentOpacity,
          backgroundImageTemplateId: savedImageTemplateId,
          imageSize: savedImageSize,
          imageRepeat: savedImageRepeat,
          imagePosition: savedImagePosition
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
          const imageBackground = applyBackgroundImageTemplate(templateId, {
            imageSize: savedImageSize || background.imageSize || 'cover',
            imageRepeat: savedImageRepeat !== undefined ? savedImageRepeat : (background.imageRepeat || false),
            opacity: currentOpacity,
          });
          if (imageBackground) {
            // Preserve imagePosition if it was set
            if (savedImagePosition || background.imagePosition) {
              imageBackground.imagePosition = savedImagePosition || background.imagePosition || 'top-left';
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
            imagePosition: savedImagePosition || 'top-left'
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
          });
          setShowBackgroundImageTemplateSelector(false);
        }
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
          opacity={background.opacity ?? 1}
          onOpacityChange={undefined}
          favoriteColors={favoriteStrokeColors}
          onAddFavorite={addFavoriteStrokeColor}
          onRemoveFavorite={removeFavoriteStrokeColor}
          onBack={() => setShowColorSelector(null)}
          showOpacitySlider={showColorSelector !== 'background-color'}
        />
      );
    }

    if (showBackgroundImageTemplateSelector) {
      return (
        <BackgroundImageSelector
          onBack={() => {
            setShowBackgroundImageTemplateSelector(false);
            // If no image was selected, revert to previous mode
            if (!background || background.type !== 'image') {
              handleBackgroundModeChange('color');
            }
          }}
          onSelect={() => {}}
          onUpload={() => setShowBackgroundImageModal(true)}
          selectedImageId={selectedBackgroundImageId}
          onImageSelect={onBackgroundImageSelect}
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
            max={12}
            unit=""
          />
          
          <Slider
            label="Pattern Stroke Width"
            value={background.patternStrokeWidth || 1}
            onChange={(value) => updateBackground({ patternStrokeWidth: value })}
            min={1}
            max={300}
            step={3}
          />
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('pattern-background')}
              className="w-full"
            >
              <Palette className="h-4 w-4 mr-2" />
              Background Color & Opacity
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

        {/* Color Button */}
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
          </div>
        )}

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
                    updateBackground({ imageSize: 'cover' });
                  }}
                  className="text-xs"
                >
                  Cover
                </Button>
                <Button
                  variant={background.imageSize === 'contain' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    updateBackground({ imageSize: 'contain' });
                  }}
                  className="text-xs"
                >
                  Contain
                </Button>
                <Button
                  variant={background.imageSize === 'stretch' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    updateBackground({ imageSize: 'stretch' });
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
                <input
                  type="checkbox"
                  checked={background.imageRepeat || false}
                  onChange={(e) => {
                    updateBackground({ imageRepeat: e.target.checked });
                  }}
                  className="rounded w-3 h-3"
                />
                <Label variant="xs" className="cursor-pointer">Repeat</Label>
              </div>
            )}
          </div>
        )}

        {/* Opacity Slider - always visible, preserves value across background type changes */}
        <div>
          <Label variant="xs">Opacity</Label>
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
      </div>
    );
  };

  if (showBackgroundSettings) {
    return renderBackgroundSettings();
  }
  
  if (showPagePalette) {
    return (
      <PaletteSelector
        onBack={() => setShowPagePalette(false)}
        title="Page Color Palette"
        isBookLevel={false}
      />
    );
  }
  
  if (showBookPalette) {
    return (
      <PaletteSelector
        onBack={() => setShowBookPalette(false)}
        title="Book Color Palette"
        isBookLevel={true}
      />
    );
  }
  
  if (showPageTheme) {
    return renderPageThemeSettings();
  }

  if (showBookTheme) {
    return renderBookThemeSettings();
  }



  const { user } = useAuth();
  
  // Check if user can access any settings at all
  const canAccessAnySettings = state.editorInteractionLevel === 'full_edit_with_settings';
  
  // Check if user can access book-related settings (only publishers and book owners)
  const canAccessBookSettings = (state.userRole === 'publisher' || (user && state.currentBook && user.id === state.currentBook.owner_id)) && canAccessAnySettings;
  
  // Check if user can access page-related settings (Background and Page Theme for full_edit and full_edit_with_settings)
  const canAccessPageSettings = state.editorInteractionLevel === 'full_edit' || state.editorInteractionLevel === 'full_edit_with_settings';

  return (
    <>
      <div className="space-y-3">
        {state.editorInteractionLevel === 'full_edit_with_settings' && (
          <>
            <div>
              <Label variant="xs" className="text-muted-foreground mb-2 block">Book Settings</Label>
              <div className="space-y-1">
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('openQuestions'))}
                  className="w-full justify-start"
                >
                  <CircleHelp className="h-4 w-4 mr-2" />
                  Questions
                </Button>
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => setShowBookTheme(true)}
                  className="w-full justify-start"
                >
                  <Paintbrush2 className="h-4 w-4 mr-2" />
                  Book Theme
                </Button>
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => onOpenBookLayouts()}
                  className="w-full justify-start"
                >
                  <LayoutPanelLeft className="h-4 w-4 mr-2" />
                  Book Layout
                </Button>
            <Button
              variant="ghost_hover"
              size="sm"
              onClick={() => setShowBookPalette(true)}
              className="w-full justify-start"
            >
              <SwatchBook className="h-4 w-4 mr-2" />
              Book Color Palette
            </Button>
              </div>
            </div>
            
            <Separator />
          </>
        )}
        
        <div>
          <Label variant="xs" className="text-muted-foreground mb-2 block">Page Settings</Label>
          <div className="space-y-1">
            <Button
              variant="ghost_hover"
              size="sm"
              onClick={() => canAccessPageSettings && setShowBackgroundSettings(true)}
              className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canAccessPageSettings}
            >
              <PaintBucket className="h-4 w-4 mr-2" />
              Background
            </Button>
            <Button
              variant="ghost_hover"
              size="sm"
              onClick={() => canAccessPageSettings && onOpenLayouts()}
              className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canAccessPageSettings}
            >
              <LayoutPanelLeft className="h-4 w-4 mr-2" />
              Layout
            </Button>
            <Button
              variant="ghost_hover"
              size="sm"
              onClick={() => canAccessPageSettings && setShowPageTheme(true)}
              className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canAccessPageSettings}
            >
              <Paintbrush2 className="h-4 w-4 mr-2" />
              Theme
            </Button>
            <Button
              variant="ghost_hover"
              size="sm"
              onClick={() => {
                if (canAccessPageSettings) {
                  setShowPagePalette(true);
                }
              }}
              className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canAccessPageSettings}
            >
              <SwatchBook className="h-4 w-4 mr-2" />
              Color Palette
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}