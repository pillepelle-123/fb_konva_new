import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Settings, Image, PaintBucket, LayoutPanelLeft, Paintbrush2, Palette, ArrowDown, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, MessagesSquare, Columns3Cog } from 'lucide-react';
import { RadioGroup } from '../../../ui/primitives/radio-group';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { ThemeSelector } from '../templates/theme-selector';
import { getGlobalThemeDefaults, getGlobalTheme, getThemePaletteId, getThemePageBackgroundColors } from '../../../../utils/global-themes';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { PaletteSelector, type PaletteSelectorRef } from '../templates/palette-selector';
import { type LayoutSelectorWrapperRef } from '../layout-selector-wrapper';
import { type ThemeSelectorWrapperRef } from '../theme-selector-wrapper';
import { commonToActual } from '../../../../utils/font-size-converter';
import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import ConfirmationDialog from '../../../ui/overlays/confirmation-dialog';
import { BackgroundImageSelector } from './background-image-selector';
import { applyBackgroundImageTemplate, getBackgroundImageWithUrl } from '../../../../utils/background-image-utils';
import { LayoutSelectorWrapper } from '../layout-selector-wrapper';
import { ThemeSelectorWrapper } from '../theme-selector-wrapper';
import { pageTemplates } from '../../../../data/templates/page-templates';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { Modal } from '../../../ui/overlays/modal';


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
  onApplyBackgroundImage?: () => void;
  isBackgroundApplyDisabled?: boolean;
  isBookChatAvailable?: boolean;
  onOpenBookChat?: () => void;
  showPagePalette?: boolean;
  setShowPagePalette?: (value: boolean) => void;
  showBookPalette?: boolean;
  setShowBookPalette?: (value: boolean) => void;
  showPageLayout?: boolean;
  setShowPageLayout?: (value: boolean) => void;
  showBookLayout?: boolean;
  setShowBookLayout?: (value: boolean) => void;
  showPageThemeSelector?: boolean;
  setShowPageThemeSelector?: (value: boolean) => void;
  showBookThemeSelector?: boolean;
  setShowBookThemeSelector?: (value: boolean) => void;
}

export interface GeneralSettingsRef {
  applyCurrentSelector: () => void;
}

export const GeneralSettings = forwardRef<GeneralSettingsRef, GeneralSettingsProps>((props, ref) => {
  const {
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
  onBackgroundImageSelect,
  onApplyBackgroundImage,
  isBackgroundApplyDisabled,
  isBookChatAvailable = false,
  onOpenBookChat,
  showPagePalette: externalShowPagePalette = false,
  setShowPagePalette: externalSetShowPagePalette,
  showBookPalette: externalShowBookPalette = false,
  setShowBookPalette: externalSetShowBookPalette,
  showPageLayout: externalShowPageLayout = false,
  setShowPageLayout: externalSetShowPageLayout,
  showBookLayout: externalShowBookLayout = false,
  setShowBookLayout: externalSetShowBookLayout,
  showPageThemeSelector: externalShowPageThemeSelector = false,
  setShowPageThemeSelector: externalSetShowPageThemeSelector,
  showBookThemeSelector: externalShowBookThemeSelector = false,
  setShowBookThemeSelector: externalSetShowBookThemeSelector
  } = props;
  const { state, dispatch, canEditSettings } = useEditor();
  const { user } = useAuth();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  // Use external state management if provided, otherwise fall back to local state
  const [localShowPagePalette, setLocalShowPagePalette] = useState(false);
  const [localShowBookPalette, setLocalShowBookPalette] = useState(false);
  const [localShowPageLayout, setLocalShowPageLayout] = useState(false);
  const [localShowBookLayout, setLocalShowBookLayout] = useState(false);
  const [localShowPageThemeSelector, setLocalShowPageThemeSelector] = useState(false);
  const [localShowBookThemeSelector, setLocalShowBookThemeSelector] = useState(false);

  const showPagePalette = externalSetShowPagePalette ? externalShowPagePalette : localShowPagePalette;
  const setShowPagePalette = externalSetShowPagePalette || setLocalShowPagePalette;
  const showBookPalette = externalSetShowBookPalette ? externalShowBookPalette : localShowBookPalette;
  const setShowBookPalette = externalSetShowBookPalette || setLocalShowBookPalette;
  const showPageLayout = externalSetShowPageLayout ? externalShowPageLayout : localShowPageLayout;
  const setShowPageLayout = externalSetShowPageLayout || setLocalShowPageLayout;
  const showBookLayout = externalSetShowBookLayout ? externalShowBookLayout : localShowBookLayout;
  const setShowBookLayout = externalSetShowBookLayout || setLocalShowBookLayout;
  const showPageThemeSelector = externalSetShowPageThemeSelector ? externalShowPageThemeSelector : localShowPageThemeSelector;
  const setShowPageThemeSelector = externalSetShowPageThemeSelector || setLocalShowPageThemeSelector;
  const showBookThemeSelector = externalSetShowBookThemeSelector ? externalShowBookThemeSelector : localShowBookThemeSelector;
  const setShowBookThemeSelector = externalSetShowBookThemeSelector || setLocalShowBookThemeSelector;
  const [showEditorSettings, setShowEditorSettings] = useState(false);
  const [forceImageMode, setForceImageMode] = useState(false);
  
  // Keys to force remount when dialogs are opened
  const [pageLayoutKey, setPageLayoutKey] = useState(0);
  const [bookLayoutKey, setBookLayoutKey] = useState(0);
  const [pageThemeKey, setPageThemeKey] = useState(0);
  const [bookThemeKey, setBookThemeKey] = useState(0);
  const [pagePaletteKey, setPagePaletteKey] = useState(0);
  const [bookPaletteKey, setBookPaletteKey] = useState(0);

  // Refs for selector components
  const pagePaletteRef = useRef<PaletteSelectorRef>(null);
  const bookPaletteRef = useRef<PaletteSelectorRef>(null);
  const pageLayoutRef = useRef<LayoutSelectorWrapperRef>(null);
  const bookLayoutRef = useRef<LayoutSelectorWrapperRef>(null);
  const pageThemeRef = useRef<ThemeSelectorWrapperRef>(null);
  const bookThemeRef = useRef<ThemeSelectorWrapperRef>(null);

  // Expose applyCurrentSelector method to parent
  useImperativeHandle(ref, () => ({
    applyCurrentSelector: () => {
      if (showPagePalette && pagePaletteRef.current) {
        pagePaletteRef.current.apply();
      } else if (showBookPalette && bookPaletteRef.current) {
        bookPaletteRef.current.apply();
      } else if (showPageLayout && pageLayoutRef.current) {
        pageLayoutRef.current.apply();
      } else if (showBookLayout && bookLayoutRef.current) {
        bookLayoutRef.current.apply();
      } else if (showPageThemeSelector && pageThemeRef.current) {
        pageThemeRef.current.apply();
      } else if (showBookThemeSelector && bookThemeRef.current) {
        bookThemeRef.current.apply();
      }
    }
  }));


  const stripColorFields = (obj: any) => {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const lowerKey = key.toLowerCase();
      const isColorKey =
        lowerKey === 'fill' ||
        lowerKey === 'stroke' ||
        lowerKey.endsWith('color') ||
        lowerKey.endsWith('colors') ||
        (lowerKey.includes('color') && !lowerKey.includes('colorstop'));

      if (isColorKey) {
        delete obj[key];
        return;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        stripColorFields(value);
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    });
  };


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
                payload: { pageIndex: state.activePageIndex, themeId: bookThemeId, preserveColors: true }
              });
              
              const theme = getGlobalTheme(bookThemeId);
              if (theme) {
                const currentPage = state.currentBook?.pages[state.activePageIndex];
                if (currentPage) {
                  const activePaletteId = currentPage?.colorPaletteId || state.currentBook?.colorPaletteId || null;
                  const paletteOverride = activePaletteId
                    ? colorPalettes.find(palette => palette.id === activePaletteId)
                    : undefined;
                  const existingBackground = currentPage.background;
                  const paletteColors = paletteOverride?.colors;
                  const backgroundOpacity = theme.pageSettings.backgroundOpacity ?? existingBackground?.opacity ?? 1;

              const backgroundImageConfig = theme.pageSettings.backgroundImage;
              let newBackground: PageBackground | null = null;

              if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
                const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
                  imageSize: backgroundImageConfig.size,
                  imageRepeat: backgroundImageConfig.repeat,
                  imagePosition: backgroundImageConfig.position,
                  imageWidth: backgroundImageConfig.width,
                  opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
                  backgroundColor: paletteColors?.background || existingBackground?.value || '#ffffff'
                });

                if (imageBackground) {
                  newBackground = {
                    ...imageBackground,
                    pageTheme: bookThemeId
                  };
                }
              }

                  const resolvedBaseColor = existingBackground
                    ? existingBackground.type === 'pattern'
                      ? existingBackground.patternForegroundColor || paletteColors?.background || '#ffffff'
                      : (typeof existingBackground.value === 'string' ? existingBackground.value : paletteColors?.background || '#ffffff')
                    : paletteColors?.background || '#ffffff';

                  const resolvedPatternForeground = existingBackground?.patternForegroundColor
                    || paletteColors?.background
                    || resolvedBaseColor;
                  const resolvedPatternBackground = existingBackground?.patternBackgroundColor
                    || paletteColors?.primary
                    || paletteColors?.accent
                    || resolvedPatternForeground;

              if (!newBackground && theme.pageSettings.backgroundPattern?.enabled) {
                newBackground = {
                      type: 'pattern',
                      value: theme.pageSettings.backgroundPattern.style,
                      opacity: backgroundOpacity,
                      pageTheme: bookThemeId,
                      patternSize: theme.pageSettings.backgroundPattern.size,
                      patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                      patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity,
                      patternForegroundColor: resolvedPatternForeground,
                      patternBackgroundColor: resolvedPatternBackground
                    };
              } else if (!newBackground) {
                newBackground = {
                      type: 'color',
                      value: resolvedBaseColor,
                      opacity: backgroundOpacity,
                      pageTheme: bookThemeId
                    };
                  }

                  dispatch({
                    type: 'UPDATE_PAGE_BACKGROUND',
                    payload: {
                      pageIndex: state.activePageIndex,
                      background: newBackground
                    }
                  });
                }
              }
            }}
            className="w-full mb-4"
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Book Theme übernehmen
          </Button>
        )}
        
        <ThemeSelector
          currentTheme={(() => {
            // CRITICAL: Check if page.themeId exists as an OWN property (not inherited)
            // Use Object.prototype.hasOwnProperty to ensure it's not in the prototype chain
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            if (!currentPage) return '__BOOK_THEME__';
            
            // Check if themeId exists as an own property in the object
            const hasThemeIdOwnProperty = Object.prototype.hasOwnProperty.call(currentPage, 'themeId');
            const themeIdValue = currentPage.themeId;
            const bookThemeId = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
            
            // CRITICAL FIX: If page.themeId exists as own property, it's an explicit theme
            // Even if it matches bookThemeId, we show the explicit theme (not '__BOOK_THEME__')
            // This distinguishes between "inheriting book theme" (no themeId) and 
            // "explicitly set to same theme" (has themeId, even if matching bookThemeId)
            const result = (hasThemeIdOwnProperty && themeIdValue !== undefined && themeIdValue !== null)
              ? themeIdValue  // Page has explicit theme - show it (even if it matches bookThemeId)
              : '__BOOK_THEME__';  // Page inherits book theme (no themeId) - show '__BOOK_THEME__'
            
            // console.log('[GeneralSettings] Page Theme currentTheme calculation:', {
            //   hasThemeIdOwnProperty,
            //   themeIdValue,
            //   bookThemeId,
            //   result,
            //   pageId: currentPage.id,
            //   pageNumber: currentPage.pageNumber
            // });
            
            return result;
          })()}
          title="Page Theme"
          showBookThemeOption
          isBookThemeSelected={(() => {
            // Page inherits book theme ONLY if themeId doesn't exist as own property
            // If themeId exists (even if it matches bookThemeId), it's an explicit theme
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            if (!currentPage) return true;
            // Check if themeId exists as an own property in the object
            const hasThemeIdOwnProperty = Object.prototype.hasOwnProperty.call(currentPage, 'themeId');
            const themeIdValue = currentPage.themeId;
            const bookThemeId = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
            
            // Page inherits book theme ONLY if themeId doesn't exist as own property OR is undefined/null
            // If themeId exists and has a value (even if matching bookThemeId), it's an explicit theme
            const result = !hasThemeIdOwnProperty || themeIdValue === undefined || themeIdValue === null;
            
            // console.log('[GeneralSettings] Page Theme isBookThemeSelected calculation:', {
            //   hasThemeIdOwnProperty,
            //   themeIdValue,
            //   bookThemeId,
            //   result,
            //   pageId: currentPage.id,
            //   pageNumber: currentPage.pageNumber
            // });
            
            return result;
          })()}
          onThemeSelect={(themeId) => {
            const isBookThemeSelection = themeId === '__BOOK_THEME__';
            const resolvedThemeId =
              isBookThemeSelection
                ? state.currentBook?.bookTheme || state.currentBook?.themeId || 'default'
                : themeId;
            
            // Set page theme (saves history)
            dispatch({ type: 'SET_PAGE_THEME', payload: { pageIndex: state.activePageIndex, themeId } });
            
            // Apply theme to all elements on current page (no history, part of theme application)
            dispatch({
              type: 'APPLY_THEME_TO_ELEMENTS',
              payload: {
                pageIndex: state.activePageIndex,
                themeId: resolvedThemeId,
                skipHistory: true,
                preserveColors: true
              }
            });
            
            const theme = getGlobalTheme(resolvedThemeId);
            if (!theme) {
              return;
            }
            
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            if (!currentPage) {
              return;
            }
            
            const activePaletteId =
              currentPage.colorPaletteId ||
              state.currentBook?.colorPaletteId ||
              null;
            const paletteOverride = activePaletteId
              ? colorPalettes.find(palette => palette.id === activePaletteId) || null
              : null;
            const pageColors = getThemePageBackgroundColors(
              resolvedThemeId,
              paletteOverride || undefined
            );
            const backgroundOpacity = theme.pageSettings.backgroundOpacity || 1;
            const backgroundImageConfig = theme.pageSettings.backgroundImage;
            
            let newBackground: PageBackground | null = null;
            
            if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
              const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
                imageSize: backgroundImageConfig.size,
                imageRepeat: backgroundImageConfig.repeat,
                imagePosition: backgroundImageConfig.position,
                imageWidth: backgroundImageConfig.width,
                opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
                backgroundColor: pageColors.backgroundColor
              });
              
              if (imageBackground) {
                newBackground = {
                  ...imageBackground,
                  pageTheme: resolvedThemeId
                };
              }
            }
            
            if (!newBackground && theme.pageSettings.backgroundPattern?.enabled) {
              newBackground = {
                type: 'pattern',
                value: theme.pageSettings.backgroundPattern.style,
                opacity: backgroundOpacity,
                pageTheme: resolvedThemeId,
                patternSize: theme.pageSettings.backgroundPattern.size,
                patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity,
                patternForegroundColor: pageColors.backgroundColor,
                patternBackgroundColor: pageColors.patternBackgroundColor
              };
            }
            
            if (!newBackground) {
              newBackground = {
                type: 'color',
                value: pageColors.backgroundColor,
                opacity: backgroundOpacity,
                pageTheme: resolvedThemeId
              };
            }
            
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: {
                pageIndex: state.activePageIndex,
                background: newBackground
              }
            });
            
            // Reset tool settings zu Theme-Defaults (ohne Palettenfarben)
            const pageLayoutTemplateId = currentPage.layoutTemplateId;
            const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
            const toolTypes = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna', 'free_text'];
            const toolUpdates: Record<string, any> = {};
            
            toolTypes.forEach(toolType => {
              const activeTheme = resolvedThemeId || state.currentBook?.bookTheme || 'default';
              const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType as any, undefined);
              
              if (toolType === 'brush' || toolType === 'line') {
                const updates: Record<string, any> = {
                  strokeColor: themeDefaults.stroke || '#1f2937',
                  strokeWidth: themeDefaults.strokeWidth || 2
                };
                stripColorFields(updates);
                if (Object.keys(updates).length > 0) {
                  toolUpdates[toolType] = updates;
                }
              } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(toolType)) {
                const updates: Record<string, any> = {
                  strokeColor: themeDefaults.stroke || '#1f2937',
                  strokeWidth: themeDefaults.strokeWidth || 2,
                  fillColor: themeDefaults.fill && themeDefaults.fill !== 'transparent'
                    ? themeDefaults.fill
                    : 'transparent'
                };
                stripColorFields(updates);
                if (Object.keys(updates).length > 0) {
                  toolUpdates[toolType] = updates;
                }
              } else {
                const updates: Record<string, any> = {
                  fontColor: themeDefaults.fontColor || themeDefaults.font?.fontColor || '#1f2937',
                  borderColor: themeDefaults.borderColor || themeDefaults.border?.borderColor || '#9ca3af',
                  backgroundColor: themeDefaults.backgroundColor || themeDefaults.background?.backgroundColor || '#FFFFFF'
                };
                stripColorFields(updates);
                if (Object.keys(updates).length > 0) {
                  toolUpdates[toolType] = updates;
                }
              }
            });
            
            Object.entries(toolUpdates).forEach(([tool, settings]) => {
              const cleanSettings = Object.fromEntries(
                Object.entries(settings).filter(([, value]) => value !== undefined)
              );
              
              dispatch({
                type: 'UPDATE_TOOL_SETTINGS',
                payload: { tool, settings: cleanSettings }
              });
            });
          }}
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
        
        <ThemeSelector
          currentTheme={state.currentBook?.bookTheme || 'default'}
          title="Book Theme"
          onThemeSelect={(themeId) => {
            // SET_BOOK_THEME now handles updating all pages that inherit book theme
            // It will delete page.themeId, update backgrounds, and apply theme/palette to elements
            dispatch({ type: 'SET_BOOK_THEME', payload: themeId });
            
            if (!state.currentBook) {
              return;
            }
            
            const theme = getGlobalTheme(themeId);
            if (!theme) {
              return;
            }
            
            // Tool-Defaults auf Theme-Farben zurücksetzen (ohne Palette)
            const bookLayoutTemplateId = state.currentBook.layoutTemplateId;
            const toolTypes = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna', 'free_text'];
            const toolUpdates: Record<string, any> = {};
            
            toolTypes.forEach(toolType => {
              const activeTheme = themeId || 'default';
              const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType as any, undefined);
              
              if (toolType === 'brush' || toolType === 'line') {
                const updates: Record<string, any> = {
                  strokeColor: themeDefaults.stroke || '#1f2937',
                  strokeWidth: themeDefaults.strokeWidth || 2
                };
                stripColorFields(updates);
                if (Object.keys(updates).length > 0) {
                  toolUpdates[toolType] = updates;
                }
              } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(toolType)) {
                const updates: Record<string, any> = {
                  strokeColor: themeDefaults.stroke || '#1f2937',
                  strokeWidth: themeDefaults.strokeWidth || 2,
                  fillColor: themeDefaults.fill && themeDefaults.fill !== 'transparent'
                    ? themeDefaults.fill
                    : 'transparent'
                };
                stripColorFields(updates);
                if (Object.keys(updates).length > 0) {
                  toolUpdates[toolType] = updates;
                }
              } else {
                const updates: Record<string, any> = {
                  fontColor: themeDefaults.fontColor || themeDefaults.font?.fontColor || '#1f2937',
                  borderColor: themeDefaults.borderColor || themeDefaults.border?.borderColor || '#9ca3af',
                  backgroundColor: themeDefaults.backgroundColor || themeDefaults.background?.backgroundColor || '#FFFFFF'
                };
                stripColorFields(updates);
                if (Object.keys(updates).length > 0) {
                  toolUpdates[toolType] = updates;
                }
              }
            });
            
            Object.entries(toolUpdates).forEach(([tool, settings]) => {
              const cleanSettings = Object.fromEntries(
                Object.entries(settings).filter(([, value]) => value !== undefined)
              );
              
              dispatch({
                type: 'UPDATE_TOOL_SETTINGS',
                payload: { tool, settings: cleanSettings }
              });
            });
          }}
          onBack={() => {}}
        />
      </div>
    );
  };

  const renderEditorSettings = () => {
    // Read lockElements directly from state to ensure we get the latest value
    const lockElements = Boolean(state.editorSettings?.editor?.lockElements);
    
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="lock-elements"
              checked={lockElements}
              onCheckedChange={(checked) => {
                // Ensure we only accept boolean true, not 'indeterminate' or other values
                const lockValue = checked === true;
                dispatch({
                  type: 'UPDATE_EDITOR_SETTINGS',
                  payload: {
                    category: 'editor',
                    settings: { lockElements: lockValue }
                  }
                });
              }}
            />
            <label
              htmlFor="lock-elements"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Lock Elements
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, all users will be unable to move canvas elements.
          </p>
        </div>
      </div>
    );
  };

  const renderBackgroundSettings = () => {
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
              Background Color
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

  if (showEditorSettings) {
    return renderEditorSettings();
  }
  
  if (showBackgroundSettings) {
    return renderBackgroundSettings();
  }
  
  if (showPagePalette) {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageActiveTemplates = getActiveTemplateIds(currentPage, state.currentBook);
    return (
      <PaletteSelector
        ref={pagePaletteRef}
        key={`page-palette-${pagePaletteKey}`}
        onBack={() => {
          setShowPagePalette(false);
          setPagePaletteKey(prev => prev + 1); // Force remount on next open
        }}
        title="Page Color Palette"
        isBookLevel={false}
        themeId={pageActiveTemplates.themeId}
      />
    );
  }
  
  if (showBookPalette) {
    const bookActiveTemplates = getActiveTemplateIds(undefined, state.currentBook);
    return (
      <PaletteSelector
        ref={bookPaletteRef}
        key={`book-palette-${bookPaletteKey}`}
        onBack={() => {
          setShowBookPalette(false);
          setBookPaletteKey(prev => prev + 1); // Force remount on next open
        }}
        title="Book Color Palette"
        isBookLevel={true}
        themeId={bookActiveTemplates.themeId}
      />
    );
  }
  
  if (showPageLayout) {
    return (
      <LayoutSelectorWrapper
        ref={pageLayoutRef}
        key={`page-layout-${pageLayoutKey}`}
        onBack={() => {
          setShowPageLayout(false);
          setPageLayoutKey(prev => prev + 1); // Force remount on next open
        }}
        title="Page Layout"
        isBookLevel={false}
      />
    );
  }
  
  if (showBookLayout) {
    return (
      <LayoutSelectorWrapper
        ref={bookLayoutRef}
        key={`book-layout-${bookLayoutKey}`}
        onBack={() => {
          setShowBookLayout(false);
          setBookLayoutKey(prev => prev + 1); // Force remount on next open
        }}
        title="Book Layout"
        isBookLevel={true}
      />
    );
  }
  
  if (showPageThemeSelector) {
    return (
      <ThemeSelectorWrapper
        ref={pageThemeRef}
        key={`page-theme-${pageThemeKey}`}
        onBack={() => {
          setShowPageThemeSelector(false);
          setPageThemeKey(prev => prev + 1); // Force remount on next open
        }}
        title="Page Theme"
        isBookLevel={false}
      />
    );
  }

  if (showBookThemeSelector) {
    return (
      <ThemeSelectorWrapper
        ref={bookThemeRef}
        key={`book-theme-${bookThemeKey}`}
        onBack={() => {
          setShowBookThemeSelector(false);
          setBookThemeKey(prev => prev + 1); // Force remount on next open
        }}
        title="Book Theme"
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

  // Check if user can access any settings at all
  const canAccessAnySettings = state.editorInteractionLevel === 'full_edit_with_settings';
  
  // Check if user can access book-related settings (only publishers and book owners)
  const canAccessBookSettings = (state.userRole === 'publisher' || (user && state.currentBook && user.id === state.currentBook.owner_id)) && canAccessAnySettings;
  
  // Check if user can access page-related settings (Background and Page Theme for full_edit and full_edit_with_settings)
  const canAccessPageSettings = state.editorInteractionLevel === 'full_edit' || state.editorInteractionLevel === 'full_edit_with_settings';
  const canShowBookChatButton = Boolean(isBookChatAvailable && onOpenBookChat && canAccessAnySettings);

  // Get active templates for Book Settings (no page = book level)
  const bookActiveTemplates = getActiveTemplateIds(undefined, state.currentBook);
  const bookLayout = bookActiveTemplates.layoutTemplateId 
    ? pageTemplates.find(t => t.id === bookActiveTemplates.layoutTemplateId) || null
    : null;
  const bookTheme = getGlobalTheme(bookActiveTemplates.themeId);
  // If book.colorPaletteId is null, check if theme has a default palette
  const bookPaletteId = bookActiveTemplates.colorPaletteId || (bookActiveTemplates.themeId ? getThemePaletteId(bookActiveTemplates.themeId) : null);
  const bookPalette = bookPaletteId
    ? colorPalettes.find(p => p.id === bookPaletteId) || null
    : null;

  // Get active templates for Page Settings (with inheritance)
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageActiveTemplates = getActiveTemplateIds(currentPage, state.currentBook);
  
  // DEBUG: Log page state with object identity tracking
  if (currentPage) {
    // CRITICAL: Use Object.prototype.hasOwnProperty to check if themeId exists as an own property
    // 'themeId' in currentPage also checks the prototype chain, which is wrong
    const hasThemeIdIn = 'themeId' in currentPage;
    const hasThemeIdOwnProperty = Object.prototype.hasOwnProperty.call(currentPage, 'themeId');
    const themeIdValue = currentPage.themeId;
    const bookThemeId = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
    
    // Log detailed information including object identity
    // console.log('[GeneralSettings] Page state:', {
    //   pageIndex: state.activePageIndex,
    //   hasThemeIdIn,
    //   hasThemeIdOwnProperty,
    //   themeIdValue,
    //   bookTheme: bookThemeId,
    //   pageActiveTemplatesThemeId: pageActiveTemplates.themeId,
    //   pageKeys: Object.keys(currentPage).slice(0, 10), // First 10 keys
    //   pageOwnKeys: Object.getOwnPropertyNames(currentPage).slice(0, 10),
    //   pageId: currentPage.id,
    //   pageNumber: currentPage.pageNumber,
    //   // Log if themeId matches bookThemeId (should be treated as inheritance)
    //   themeIdMatchesBookTheme: themeIdValue === bookThemeId,
    //   shouldTreatAsInheritance: !hasThemeIdOwnProperty || themeIdValue === undefined || themeIdValue === null || themeIdValue === bookThemeId
    // });
    
    // CRITICAL: If themeId exists but matches bookThemeId, log a warning
    if (hasThemeIdOwnProperty && themeIdValue && themeIdValue === bookThemeId) {
      // console.warn('[GeneralSettings] WARNING: Page has themeId as own property but it matches bookThemeId. This should be treated as inheritance!', {
      //   pageId: currentPage.id,
      //   pageNumber: currentPage.pageNumber,
      //   themeIdValue,
      //   bookThemeId
      // });
    }
  }
  
  const pageLayout = pageActiveTemplates.layoutTemplateId
    ? pageTemplates.find(t => t.id === pageActiveTemplates.layoutTemplateId) || null
    : null;
  const pageTheme = getGlobalTheme(pageActiveTemplates.themeId);
  // If pageActiveTemplates.colorPaletteId is null, check if theme has a default palette
  const pagePaletteId = pageActiveTemplates.colorPaletteId || (pageActiveTemplates.themeId ? getThemePaletteId(pageActiveTemplates.themeId) : null);
  const pagePalette = pagePaletteId
    ? colorPalettes.find(p => p.id === pagePaletteId) || null
    : null;
  const pageInheritsLayout = !currentPage?.layoutTemplateId;
  
  // CRITICAL: Check if page.themeId exists as an OWN property (not inherited)
  // Use Object.prototype.hasOwnProperty to ensure it's not in the prototype chain
  // If themeId doesn't exist as own property, the page inherits the book theme
  // CRITICAL FIX: If themeId exists (even if it matches bookThemeId), it's an explicit theme
  const hasThemeIdOwnProperty = currentPage ? Object.prototype.hasOwnProperty.call(currentPage, 'themeId') : false;
  const themeIdValue = currentPage?.themeId;
  const bookThemeId = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
  
  // Page inherits book theme ONLY if themeId doesn't exist as own property
  // If themeId exists (even if it matches bookThemeId), it's an explicit theme
  // This distinguishes between "inheriting book theme" (no themeId) and 
  // "explicitly set to same theme" (has themeId, even if matching bookThemeId)
  const pageInheritsTheme = !hasThemeIdOwnProperty || themeIdValue === undefined || themeIdValue === null;
  const pageInheritsPalette = !currentPage?.colorPaletteId;
  
  // console.log('[GeneralSettings] pageInheritsTheme:', pageInheritsTheme, 'hasThemeIdOwnProperty:', hasThemeIdOwnProperty, 'themeIdValue:', themeIdValue, 'bookThemeId:', bookThemeId);

  return (
    <>
      <div className="space-y-3">
        {state.editorInteractionLevel === 'full_edit_with_settings' && (
          <>
            <div>
              <Label variant="xs" className="text-muted-foreground mb-2 block">Book Settings</Label>
              <div className="space-y-1">
                {canShowBookChatButton && (
                  <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => onOpenBookChat?.()}
                    className="w-full justify-start"
                  >
                    <MessagesSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                )}
                <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => {
                      setBookLayoutKey(prev => prev + 1); // Force remount
                      setShowBookLayout(true);
                    }}
                    className="w-full justify-start"
                  >
                    <LayoutPanelLeft className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Book Layout</span>
                    {bookLayout && (
                      <div className="ml-2 h-6 w-12 bg-gray-100 rounded border relative overflow-hidden shrink-0">
                        <div className="absolute inset-1 grid grid-cols-2 gap-1">
                          {bookLayout.textboxes.slice(0, 4).map((_, i) => (
                            <div key={i} className="bg-blue-200 rounded-sm opacity-60" />
                          ))}
                        </div>
                      </div>
                    )}
                  </Button>
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => {
                    setBookThemeKey(prev => prev + 1); // Force remount
                    setShowBookThemeSelector(true);
                  }}
                  className="w-full justify-start"
                >
                  <Paintbrush2 className="h-4 w-4 mr-2" />
                  <span className="flex-1 text-left">Book Theme</span>
                  {bookTheme && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {bookTheme.name}
                    </span>
                  )}
                </Button>

            <Button
              variant="ghost_hover"
              size="sm"
              onClick={() => {
                setBookPaletteKey(prev => prev + 1); // Force remount
                setShowBookPalette(true);
              }}
              className="w-full justify-start"
            >
              <Palette className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">Book Color Palette</span>
              {bookPalette && (
                <div className="ml-2 flex h-4 w-16 rounded overflow-hidden shrink-0 border border-gray-200">
                  {Object.values(bookPalette.colors).map((color, index) => (
                    <div
                      key={index}
                      className="flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </Button>
              </div>
            </div>
            
            <div>
              <Label variant="xs" className="text-muted-foreground mb-2 block">Editor Settings</Label>
              <div className="space-y-1">
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => setShowEditorSettings(true)}
                  className="w-full justify-start"
                >
                  <Columns3Cog className="h-4 w-4 mr-2" />
                  Editor
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
                    onClick={() => {
                      if (canAccessPageSettings) {
                        setPageLayoutKey(prev => prev + 1); // Force remount
                        setShowPageLayout(true);
                      }
                    }}
                    className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!canAccessPageSettings}
                  >
                    <LayoutPanelLeft className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Layout</span>
                    {pageInheritsLayout ? (
                      <span className="text-xs text-muted-foreground ml-2 italic">
                        Book Layout
                      </span>
                    ) : pageLayout ? (
                      <div className="ml-2 h-6 w-12 bg-gray-100 rounded border relative overflow-hidden shrink-0">
                        <div className="absolute inset-1 grid grid-cols-2 gap-1">
                          {pageLayout.textboxes.slice(0, 4).map((_, i) => (
                            <div key={i} className="bg-blue-200 rounded-sm opacity-60" />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Button>
                  <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => {
                      if (canAccessPageSettings) {
                        setPageThemeKey(prev => prev + 1); // Force remount
                        setShowPageThemeSelector(true);
                      }
                    }}
                    className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!canAccessPageSettings}
                  >
                    <Paintbrush2 className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Theme</span>
                    {pageInheritsTheme ? (
                      <span className="text-xs text-muted-foreground ml-2 italic">
                        Book Theme
                      </span>
                    ) : pageTheme ? (
                      <span className="text-xs text-muted-foreground ml-2">
                        {pageTheme.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground ml-2 italic">
                        Book Theme
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => {
                      if (canAccessPageSettings) {
                        setPagePaletteKey(prev => prev + 1); // Force remount
                        setShowPagePalette(true);
                      }
                    }}
                    className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!canAccessPageSettings}
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Color Palette</span>
                    {pageInheritsPalette ? (
                      // When inheriting, show bookPalette (which includes theme palette if book.colorPaletteId is null)
                      bookPalette ? (
                        <div className="ml-2 flex h-4 w-16 rounded overflow-hidden shrink-0 border border-gray-200">
                          {Object.values(bookPalette.colors).map((color, index) => (
                            <div
                              key={index}
                              className="flex-1"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground ml-2 italic">
                          Book Color Palette
                        </span>
                      )
                    ) : pagePalette ? (
                      <div className="ml-2 flex h-4 w-16 rounded overflow-hidden shrink-0 border border-gray-200">
                        {Object.values(pagePalette.colors).map((color, index) => (
                          <div
                            key={index}
                            className="flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground ml-2 italic">
                        Book Color Palette
                      </span>
                    )}
                  </Button>
          </div>
        </div>
      </div>
    </>
  );
});

GeneralSettings.displayName = 'GeneralSettings';