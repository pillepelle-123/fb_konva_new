import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { useSettingsPanel } from '../../../../hooks/useSettingsPanel';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Image, Palette, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/composites/tabs';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { ColorSelector } from './color-selector';
import { SlotSelector } from './slot-selector';
import type { SandboxContextValue } from '../../../../context/sandbox-context';
import type { PaletteColorSlot } from '../../../../utils/sandbox-utils';
import { Slider } from '../../../ui/primitives/slider';
import { Label } from '../../../ui/primitives/label';
import { getGlobalThemeDefaults, getThemePaletteId } from '../../../../utils/global-themes';
import { applyBackgroundImageTemplate, getBackgroundImageWithUrl } from '../../../../utils/background-image-utils';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { Modal } from '../../../ui/overlays/modal';
import { BackgroundImageSelector } from './background-image-selector';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { SettingsFormFooter } from './settings-form-footer';

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
  isSandboxMode?: boolean;
  sandbox?: SandboxContextValue;
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
    isBackgroundApplyDisabled,
    isSandboxMode = false,
    sandbox
  } = props;

  const { state, dispatch, canEditBookSettings } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const [forceImageMode, setForceImageMode] = useState(false);
  const [applyToEntireBook, setApplyToEntireBook] = useState(false);
  const originalPageStateRef = useRef<{ background?: PageBackground } | null>(null);
  const isApplyingRef = useRef(false);
  const [pendingImageBackgroundColor, setPendingImageBackgroundColor] = useState<string | null>(null);
  const imageBgColorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    if (currentPage && !originalPageStateRef.current) {
      originalPageStateRef.current = {
        background: currentPage.background
          ? (typeof structuredClone === 'function'
            ? structuredClone(currentPage.background)
            : JSON.parse(JSON.stringify(currentPage.background)))
          : undefined
      };
    }
  }, [state.currentBook?.id, state.activePageIndex]);

  useEffect(() => {
    if (showColorSelector !== 'image-background-color') {
      if (imageBgColorDebounceRef.current) {
        clearTimeout(imageBgColorDebounceRef.current);
        imageBgColorDebounceRef.current = null;
      }
      setPendingImageBackgroundColor((pending) => {
        if (pending) {
          updateBackground({ backgroundColor: pending, backgroundColorEnabled: true });
          window.dispatchEvent(new CustomEvent('invalidateBackgroundImageCache', { detail: { pageIndex: state.activePageIndex } }));
        }
        return null;
      });
    }
    return () => {
      if (imageBgColorDebounceRef.current) {
        clearTimeout(imageBgColorDebounceRef.current);
      }
    };
  }, [showColorSelector]);

  const updateBackground = (updates: Partial<PageBackground>, skipHistory = true) => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    
    // CRITICAL: If type is changing, create a clean object without type-specific properties from old background
    // This prevents pattern properties from contaminating image backgrounds, etc.
    let newBackground: PageBackground;
    if (updates.type && updates.type !== background.type) {
      // Type is changing - only preserve properties that should persist across type changes
      const preservedProperties = {
        opacity: background.opacity,
        // Preserve image-related properties for restoration when switching back to image
        ...(background.backgroundImageId && { backgroundImageId: background.backgroundImageId }),
        ...(background.imageSize && { imageSize: background.imageSize }),
        ...(background.imageRepeat !== undefined && { imageRepeat: background.imageRepeat }),
        ...(background.imagePosition && { imagePosition: background.imagePosition }),
        ...(background.imageContainWidthPercent !== undefined && { imageContainWidthPercent: background.imageContainWidthPercent }),
        // Preserve palette settings for image backgrounds
        ...((background as any).applyPalette !== undefined && { applyPalette: (background as any).applyPalette }),
        ...((background as any).paletteMode && { paletteMode: (background as any).paletteMode }),
        ...((background as any).backgroundColor && { backgroundColor: (background as any).backgroundColor }),
        ...((background as any).backgroundColorEnabled !== undefined && { backgroundColorEnabled: (background as any).backgroundColorEnabled }),
        ...((background as any).backgroundColorOpacity !== undefined && { backgroundColorOpacity: (background as any).backgroundColorOpacity }),
        // Hidden property for direct upload image URLs
        ...((background as any)._savedImageValue && { _savedImageValue: (background as any)._savedImageValue }),
      };
      newBackground = { ...preservedProperties, ...updates } as PageBackground;
    } else {
      // Type is not changing - merge with existing background
      newBackground = { ...background, ...updates };
    }
    
    dispatch({
      type: 'UPDATE_PAGE_BACKGROUND',
      payload: { pageIndex: state.activePageIndex, background: newBackground, skipHistory }
    });
  };

  const handleCancel = useCallback(() => {
    if (isApplyingRef.current) {
      isApplyingRef.current = false;
      setShowBackgroundSettings(false);
      return;
    }
    const orig = originalPageStateRef.current?.background;
    if (state.currentBook && orig !== undefined) {
      dispatch({
        type: 'UPDATE_PAGE_BACKGROUND',
        payload: {
          pageIndex: state.activePageIndex,
          background: orig,
          skipHistory: true
        }
      });
    }
    setShowBackgroundSettings(false);
  }, [dispatch, state.activePageIndex, state.currentBook, setShowBackgroundSettings]);

  const { panelRef } = useSettingsPanel(
    handleCancel,
    () => showBackgroundImageTemplateSelector
  );

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  // Get default background color from current palette or theme's default palette
  const getDefaultBackgroundColor = (): string => {
    const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
    const paletteOverrideId = currentPage?.colorPaletteId ?? null;
    const effectivePaletteId = paletteOverrideId ?? (activeTemplateIds.themeId ? getThemePaletteId(activeTemplateIds.themeId) ?? null : null);
    if (effectivePaletteId) {
      const palette = colorPalettes.find(p => p.id == effectivePaletteId || String(p.id) === String(effectivePaletteId));
      if (palette) return palette.colors.background;
    }
    // Only use background.value when it's a color (hex or rgb), not a URL
    const bgValue = currentPage?.background?.value;
    if (typeof bgValue === 'string' && (bgValue.startsWith('#') || bgValue.startsWith('rgb'))) {
      return bgValue;
    }
    return '#ffffff';
  };

  let background = currentPage?.background;
  // Fallback for render when background not yet initialized (useEffect will persist to state)
  if (!background) {
    background = { type: 'color' as const, value: getDefaultBackgroundColor(), opacity: 0.15 };
  } else if (background.opacity === undefined) {
    background = { ...background, opacity: 0.15 };
  }

  const handleApply = () => {
    isApplyingRef.current = true;
    if (applyToEntireBook && state.currentBook && background) {
      dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Apply Background to Book' });
      state.currentBook.pages.forEach((_page, pageIndex) => {
        const backgroundCopy = typeof structuredClone === 'function'
          ? structuredClone(background)
          : JSON.parse(JSON.stringify(background));
        dispatch({
          type: 'UPDATE_PAGE_BACKGROUND',
          payload: { pageIndex, background: backgroundCopy, skipHistory: true }
        });
      });
    } else {
      dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Update Page Background' });
    }
    setShowBackgroundSettings(false);
  };

  // Initialize background if not set, or ensure opacity – must run in useEffect to avoid setState during render
  useEffect(() => {
    if (!currentPage) return;
    const bg = currentPage.background;
    if (!bg) {
      const defaultColor = getDefaultBackgroundColor();
      updateBackground({ type: 'color', value: defaultColor, opacity: 0.15 });
    } else if (bg.opacity === undefined) {
      updateBackground({ opacity: 0.15 });
    }
  }, [currentPage, currentPage?.background, currentPage?.colorPaletteId, state.currentBook?.colorPaletteId]);

  const isDesignerImage =
    background.type === 'image' && (background as any).backgroundImageType === 'designer';
  const paintWithPalette =
    background.type === 'image' && !isDesignerImage ? background.applyPalette !== false : true;
  
  const isPattern = background.type === 'pattern';
  const isImage = background.type === 'image';
  // backgroundMode is primarily based on background.type, but use forceImageMode if user just selected "image" 
  // and background hasn't been updated yet
  const backgroundMode = isImage ? 'image' : (isPattern ? 'pattern' : (forceImageMode ? 'image' : 'color'));

  const hasChanges = (() => {
    const orig = originalPageStateRef.current?.background;
    const curr = currentPage?.background;
    if (!orig && !curr) return false;
    if (!orig || !curr) return true;
    return JSON.stringify(orig) !== JSON.stringify(curr);
  })();
  const modalApplyDisabled =
    isBackgroundApplyDisabled ??
    (!selectedBackgroundImageId ||
      selectedBackgroundImageId === (isImage ? background.backgroundImageId ?? null : null));
  
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
    // Preserve backgroundImageId and image settings to restore them when switching back to image
    const savedImageTemplateId = background?.backgroundImageId;
    // Save the image value (URL) when current type is 'image' and no background image ID is set (direct upload)
    const savedImageValue = background?.type === 'image' && !background?.backgroundImageId 
      ? background.value 
      : (background as any)?._savedImageValue; // Use hidden property to preserve direct upload image URL
    const savedImageSize = background?.imageSize;
    const savedImageRepeat = background?.imageRepeat;
    const savedImagePosition = background?.imagePosition;
    
    if (mode === 'color') {
      setForceImageMode(false);
      // Use pattern's Color (patternForegroundColor) when switching from pattern, otherwise default
      const colorValue = background?.type === 'pattern' && background?.patternForegroundColor
        ? background.patternForegroundColor
        : getDefaultBackgroundColor();
      // Preserve backgroundImageId and image settings when switching to color (for restoration later)
      // Also preserve image value in a hidden property if it's a direct upload (no background image UUID)
      // CRITICAL: Only include properties relevant to 'color' type, don't copy all old properties
      const updateData: PageBackground = {
        type: 'color',
        value: colorValue,
        opacity: currentOpacity,
        // Preserve these for restoration when switching back to image
        backgroundImageId: savedImageTemplateId,
        imageSize: savedImageSize,
        imageRepeat: savedImageRepeat,
        imagePosition: savedImagePosition,
        imageContainWidthPercent: background?.imageContainWidthPercent,
      } as any;
      // Preserve direct upload image URL in hidden property
      if (background?.type === 'image' && !background?.backgroundImageId && background?.value) {
        (updateData as any)._savedImageValue = background.value;
      } else if ((background as any)?._savedImageValue) {
        (updateData as any)._savedImageValue = (background as any)._savedImageValue;
      }
      updateBackground(updateData);
      setShowPatternSettings(false);
      setShowBackgroundImageTemplateSelector(false);
    } else if (mode === 'pattern') {
      setForceImageMode(false);
      // Use Color mode's value when switching from color, otherwise default
      const foregroundColor = background?.type === 'color' && typeof background?.value === 'string'
        ? background.value
        : getDefaultBackgroundColor();
      const secondaryColor = getSecondaryColor();
      // Preserve backgroundImageId and image settings when switching to pattern (for restoration later)
      // patternForegroundColor = Color (main color), patternBackgroundColor = Pattern Color (secondary)
      // CRITICAL: Only include properties relevant to 'pattern' type, don't copy all old properties
      const updateData: PageBackground = {
        type: 'pattern',
        value: 'dots',
        patternSize: 6,
        patternStrokeWidth: 10,
        patternForegroundColor: foregroundColor, // Color uses the selected color from Color mode
        patternBackgroundColor: secondaryColor, // Pattern itself uses secondary color
        patternBackgroundOpacity: background?.patternBackgroundOpacity ?? 1, // Preserve existing opacity or default to 1
        opacity: currentOpacity,
        // Preserve these for restoration when switching back to image
        backgroundImageId: savedImageTemplateId,
        imageSize: savedImageSize,
        imageRepeat: savedImageRepeat,
        imagePosition: savedImagePosition,
        imageContainWidthPercent: background?.imageContainWidthPercent,
      } as any;
      // Preserve direct upload image URL in hidden property
      if (background?.type === 'image' && !background?.backgroundImageId && background?.value) {
        (updateData as any)._savedImageValue = background.value;
      } else if ((background as any)?._savedImageValue) {
        (updateData as any)._savedImageValue = (background as any)._savedImageValue;
      }
      updateBackground(updateData);
      setShowBackgroundImageTemplateSelector(false);
    } else if (mode === 'image') {
      setForceImageMode(true);
      // If background already has a backgroundImageId, apply it immediately
      if (background && (background as any).backgroundImageId) {
        const templateId = (background as any).backgroundImageId;
        // Preserve current applyPalette setting (default to true if not set)
        const currentApplyPalette = (background as any).applyPalette !== false;
        const currentPaletteMode = (background as any).paletteMode ?? 'palette';
        // CRITICAL: Always pass imagePosition and imageWidth to preserve theme values
        const imageBackground = applyBackgroundImageTemplate(templateId, {
          imageSize: savedImageSize || background.imageSize || 'cover',
          imageRepeat: savedImageRepeat !== undefined ? savedImageRepeat : (background.imageRepeat || false),
          imagePosition: savedImagePosition || background.imagePosition, // Preserve existing position
          imageWidth: background.imageContainWidthPercent, // Preserve existing width
          opacity: currentOpacity,
          backgroundColor: (background as any).backgroundColor,
          backgroundColorOpacity: (background as any).backgroundColorOpacity ?? 1,
          applyPalette: currentApplyPalette,  // Preserve applyPalette setting
          paletteMode: currentPaletteMode,    // Preserve paletteMode setting
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
        const colorValue = background?.type === 'color' && typeof background?.value === 'string'
          ? background.value
          : getDefaultBackgroundColor();
        updateBackground({
          type: 'image',
          value: imageUrl,
          opacity: currentOpacity,
          backgroundColor: (background as any).backgroundColor ?? colorValue,
          backgroundColorEnabled: (background as any).backgroundColorEnabled ?? true,
          backgroundColorOpacity: (background as any).backgroundColorOpacity ?? 1,
          imageSize: savedImageSize || 'cover',
          imageRepeat: savedImageRepeat || false,
          imagePosition: savedImagePosition || 'top-left',
          imageContainWidthPercent: background?.imageContainWidthPercent || 100
        });
        setShowBackgroundImageTemplateSelector(false);
      } else {
        // No image template ID yet - set type to image and prepare for image selection
        // Preserve opacity when switching to image mode; use current color as backgroundColor when switching from color
        const colorValue = background?.type === 'color' && typeof background?.value === 'string'
          ? background.value
          : getDefaultBackgroundColor();
        // CRITICAL: Create a clean image background object without pattern properties
        const imageBackground: PageBackground = {
          type: 'image',
          value: background?.type === 'color' ? background.value : '#ffffff',
          opacity: currentOpacity,
          backgroundColor: colorValue,
          backgroundColorEnabled: true,
          backgroundColorOpacity: 1,
          imageSize: savedImageSize || 'cover',
          imageRepeat: savedImageRepeat || false,
          imagePosition: savedImagePosition || 'top-left',
          imageContainWidthPercent: background?.imageContainWidthPercent || 100,
        } as any;
        updateBackground(imageBackground);
        setShowBackgroundImageTemplateSelector(false);
      }
    }
  };

  const colorSelectorContent = showColorSelector && (() => {
    if (isSandboxMode && sandbox) {
      const partName = showColorSelector === 'image-background-color'
        ? 'pageBackground'
        : (showColorSelector === 'background-color' ? 'pageBackground' : 'pagePattern');
      const currentSlot = sandbox.getPageSlot(partName) ?? (partName === 'pageBackground' ? 'surface' : 'primary');
      const slotColors = sandbox.state.sandboxColors;
      const handleSlotChange = (slot: PaletteColorSlot) => {
        sandbox.setPageSlotOverride(partName, slot);
        const color = sandbox.getColorForSlot(slot);
        if (showColorSelector === 'image-background-color') {
          updateBackground({ backgroundColor: color, backgroundColorEnabled: true });
        } else if (showColorSelector === 'background-color') {
          if (background.type === 'pattern') {
            updateBackground({ patternForegroundColor: color });
          } else {
            updateBackground({ value: color });
          }
        } else {
          updateBackground({ patternBackgroundColor: color });
        }
      };
      return (
        <div className="space-y-4 p-2">
          <Button variant="ghost" size="sm" onClick={() => setShowColorSelector(null)} className="px-2 h-8">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <SlotSelector
            value={currentSlot}
            onChange={handleSlotChange}
            slotColors={slotColors}
            label={
              showColorSelector === 'image-background-color'
                ? 'Page Background Color (behind image)'
                : (showColorSelector === 'background-color' ? 'Page Background Color' : 'Page Background Pattern Color')
            }
          />
        </div>
      );
    }
    const getColorValue = () => {
      switch (showColorSelector) {
        case 'background-color':
          return background.type === 'pattern' ? (background.patternForegroundColor || 'transparent') : background.value;
        case 'pattern-background':
          return background.patternBackgroundColor || '#666666';
        case 'image-background-color':
          return pendingImageBackgroundColor ?? ((background.backgroundColorEnabled && background.backgroundColor) ? background.backgroundColor : getDefaultBackgroundColor());
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
        case 'image-background-color': {
          setPendingImageBackgroundColor(color);
          if (imageBgColorDebounceRef.current) clearTimeout(imageBgColorDebounceRef.current);
          imageBgColorDebounceRef.current = setTimeout(() => {
            imageBgColorDebounceRef.current = null;
            updateBackground({ backgroundColor: color, backgroundColorEnabled: true });
            setPendingImageBackgroundColor(null);
            window.dispatchEvent(new CustomEvent('invalidateBackgroundImageCache', { detail: { pageIndex: state.activePageIndex } }));
          }, 200);
          break;
        }
      }
    };
    const colorSelectorOpacity = showColorSelector === 'image-background-color'
      ? (background.backgroundColorOpacity ?? 1)
      : (background.opacity ?? 1);
    return (
      <ColorSelector
        value={getColorValue()}
        onChange={handleColorChange}
        opacity={colorSelectorOpacity}
        onOpacityChange={undefined}
        favoriteColors={favoriteStrokeColors}
        onAddFavorite={addFavoriteStrokeColor}
        onRemoveFavorite={removeFavoriteStrokeColor}
        onBack={() => setShowColorSelector(null)}
        showOpacitySlider={false}
      />
    );
  })();

  const patternSettingsContent = showPatternSettings && isPattern && (() => {
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
            <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: background.patternBackgroundColor || '#666666' }} />
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
  })();

  const handleCloseBackgroundImageSelector = () => {
    setShowBackgroundImageTemplateSelector(false);
    if (!background || background.type !== 'image') {
      handleBackgroundModeChange('color');
    }
  };

  const mainContent = (
    <>
      <div className="flex-1 overflow-y-auto space-y-4 p-2">
        {/* Tabs for Color/Pattern/Image */}
        <Tabs value={backgroundMode} onValueChange={(value) => handleBackgroundModeChange(value as 'color' | 'pattern' | 'image')}>
          <TabsList variant="bootstrap" className="w-full h-5">
            <TabsTrigger variant="bootstrap" value="color" className="h-5">Color</TabsTrigger>
            <TabsTrigger variant="bootstrap" value="pattern" className="h-5">Pattern</TabsTrigger>
            <TabsTrigger variant="bootstrap" value="image" className="h-5">Image</TabsTrigger>
          </TabsList>
        </Tabs>
        
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
              <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: background?.type === 'pattern' ? (background.patternForegroundColor || '#ffffff') : (background?.value || '#ffffff') }} />
              Color
            </Button>
          </div>
        )}

        {/* Color Button for Image mode - background color behind the image */}
        {backgroundMode === 'image' && !isDesignerImage && (
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('image-background-color')}
              className="w-full"
            >
              <Palette className="h-4 w-4 mr-2" />
              <div
                className="w-4 h-4 mr-2 rounded border border-border"
                style={{
                  backgroundColor:
                    background?.type === 'image' && !!(background as any).backgroundColorEnabled && (background as any).backgroundColor
                      ? (background as any).backgroundColor
                      : getDefaultBackgroundColor()
                }}
              />
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
                if (background && background.type === 'image' && background.backgroundImageId) {
                  onBackgroundImageSelect?.(background.backgroundImageId);
                }
                setShowBackgroundImageTemplateSelector(true);
              }}
              className="w-full"
            >
              <Image className="h-4 w-4 mr-2" />
              Select Image
            </Button>
            {background?.type === 'image' && background.backgroundImageId && !isDesignerImage && (() => {
              const template = getBackgroundImageWithUrl(background.backgroundImageId);
              const isVectorImage = template?.format === 'vector';
              return isVectorImage ? (
              <div className="space-y-2 rounded-md border border-border/40 bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="paint-with-palette"
                    checked={paintWithPalette}
                    onCheckedChange={(checked) => {
                      const usePalette = checked !== false;
                      if (background?.type === 'image' && background.backgroundImageId) {
                        if (!usePalette) {
                          const template = getBackgroundImageWithUrl(background.backgroundImageId);
                          updateBackground({
                            applyPalette: false,
                            value: template?.url ?? background.value,
                            backgroundColorEnabled: false,
                          });
                          window.dispatchEvent(new CustomEvent('invalidateBackgroundImageCache', { detail: { pageIndex: state.activePageIndex } }));
                        } else {
                          const template = getBackgroundImageWithUrl(background.backgroundImageId);
                          const defaultColor = (template as any)?.backgroundColor?.defaultValue ?? getDefaultBackgroundColor();
                          updateBackground({
                            applyPalette: true,
                            paletteMode: background.paletteMode ?? 'palette',
                            backgroundColorEnabled: true,
                            backgroundColor: defaultColor,
                            value: undefined, // Reset value so resolveBackgroundImageUrl uses backgroundImageId with palette
                          });
                          window.dispatchEvent(new CustomEvent('invalidateBackgroundImageCache', { detail: { pageIndex: state.activePageIndex } }));
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
                {paintWithPalette && (
                  <div className="pl-6">
                    <Label variant="xs" className="mb-1 block text-muted-foreground">Palette Mode</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={(background.paletteMode ?? 'palette') === 'palette' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => {
                          updateBackground({ paletteMode: 'palette' });
                          window.dispatchEvent(new CustomEvent('invalidateBackgroundImageCache', { detail: { pageIndex: state.activePageIndex } }));
                        }}
                        className="text-xs"
                      >
                        Palette
                      </Button>
                      <Button
                        variant={(background.paletteMode ?? 'palette') === 'monochrome' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => {
                          updateBackground({ paletteMode: 'monochrome' });
                          window.dispatchEvent(new CustomEvent('invalidateBackgroundImageCache', { detail: { pageIndex: state.activePageIndex } }));
                        }}
                        className="text-xs"
                      >
                        Monochrom
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              ) : null;
            })()}
          </div>
        )}
        
        {/* Opacity: for image mode show two sliders (background color + image), otherwise single slider */}
        {backgroundMode === 'image' && !isDesignerImage ? (
          <>
            <div>
              <Label variant="xs" className="mt-2 block">Background Color Opacity</Label>
              <Slider
                label="Background Color Opacity"
                value={Math.round((background.backgroundColorOpacity ?? 1) * 100)}
                displayValue={Math.round((background.backgroundColorOpacity ?? 1) * 100)}
                onChange={(value) => {
                  const opacityValue = value / 100;
                  updateBackground({ backgroundColorOpacity: opacityValue });
                }}
                min={0}
                max={100}
                step={5}
                unit="%"
                hasLabel={false}
              />
            </div>
            <div>
              <Label variant="xs" className="mt-2 block">Image Opacity</Label>
              <Slider
                label="Image Opacity"
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
          </>
        ) : (
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
        )}

        {/* Image Size, Position, and Repeat Controls - only visible when image background is active */}
        {backgroundMode === 'image' && background && background.type === 'image' && !isDesignerImage && (
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
      <SettingsFormFooter
        hasChanges={hasChanges}
        onSave={handleApply}
        onDiscard={handleCancel}
        showApplyToEntireBook={canEditBookSettings()}
        applyToEntireBook={applyToEntireBook}
        onApplyToEntireBookChange={setApplyToEntireBook}
      />
    </>
  );

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {colorSelectorContent || patternSettingsContent || mainContent}
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
    </div>
  );
};
