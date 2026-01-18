import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, PaintBucket, LayoutPanelLeft, Paintbrush2, Palette, MessagesSquare, Columns3Cog } from 'lucide-react';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { ThemeSelector } from '../templates/theme-selector';
import { getGlobalThemeDefaults, getGlobalTheme, getThemePaletteId, getThemePageBackgroundColors } from '../../../../utils/global-themes';
import { PaletteSelector, type PaletteSelectorRef } from '../templates/palette-selector';
import { type LayoutSelectorWrapperRef } from '../layout-selector-wrapper';
import { type ThemeSelectorWrapperRef } from '../theme-selector-wrapper';
import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';
import { LayoutSelectorWrapper } from '../layout-selector-wrapper';
import { ThemeSelectorWrapper } from '../theme-selector-wrapper';
import { pageTemplates } from '../../../../data/templates/page-templates';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { PageBackgroundSettings } from './page-background-settings';
import type { PageBackground } from '../../../../context/editor-context';
import { EditorSettings } from './editor-settings';


interface GeneralSettingsProps {
  showColorSelector: string | null;
  setShowColorSelector: (value: string | null) => void;
  showBackgroundSettings: boolean;
  setShowBackgroundSettings: (value: boolean) => void;
  showPatternSettings: boolean;
  setShowPatternSettings: (value: boolean) => void;
  showEditorSettings?: boolean;
  setShowEditorSettings?: (value: boolean) => void;
  showPageTheme: boolean;
  setShowPageTheme: (value: boolean) => void;
  showBookTheme: boolean;
  setShowBookTheme: (value: boolean) => void;
  setShowBackgroundImageModal: (value: boolean) => void;
  showBackgroundImageTemplateSelector: boolean;
  setShowBackgroundImageTemplateSelector: (value: boolean) => void;
  onOpenTemplates: () => void;
  onOpenLayouts: () => void;
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
  applyCurrentSelector: (applyToEntireBook?: boolean) => void;
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
  setShowBookThemeSelector: externalSetShowBookThemeSelector,
  showEditorSettings: externalShowEditorSettings = false,
  setShowEditorSettings: externalSetShowEditorSettings
  } = props;
  const { state, dispatch } = useEditor();
  const { user } = useAuth();
  // Use external state management if provided, otherwise fall back to local state
  const [localShowPagePalette, setLocalShowPagePalette] = useState(false);
  const [localShowPageLayout, setLocalShowPageLayout] = useState(false);
  const [localShowPageThemeSelector, setLocalShowPageThemeSelector] = useState(false);

  const showPagePalette = externalSetShowPagePalette ? externalShowPagePalette : localShowPagePalette;
  const setShowPagePalette = externalSetShowPagePalette || setLocalShowPagePalette;
  const showPageLayout = externalSetShowPageLayout ? externalShowPageLayout : localShowPageLayout;
  const setShowPageLayout = externalSetShowPageLayout || setLocalShowPageLayout;
  const showPageThemeSelector = externalSetShowPageThemeSelector ? externalShowPageThemeSelector : localShowPageThemeSelector;
  const setShowPageThemeSelector = externalSetShowPageThemeSelector || setLocalShowPageThemeSelector;
  const [localShowEditorSettings, setLocalShowEditorSettings] = useState(false);
  const showEditorSettings = externalSetShowEditorSettings ? (externalShowEditorSettings ?? false) : localShowEditorSettings;
  const setShowEditorSettings = externalSetShowEditorSettings || setLocalShowEditorSettings;
  
  // Keys to force remount when dialogs are opened
  const [pageLayoutKey, setPageLayoutKey] = useState(0);
  const [pageThemeKey, setPageThemeKey] = useState(0);
  const [pagePaletteKey, setPagePaletteKey] = useState(0);

  // Refs for selector components
  const pagePaletteRef = useRef<PaletteSelectorRef>(null);
  const pageLayoutRef = useRef<LayoutSelectorWrapperRef>(null);
  const pageThemeRef = useRef<ThemeSelectorWrapperRef>(null);

  // Expose applyCurrentSelector method to parent
  useImperativeHandle(ref, () => ({
    applyCurrentSelector: (applyToEntireBook?: boolean) => {
      if (showPagePalette && pagePaletteRef.current) {
        pagePaletteRef.current.apply(applyToEntireBook);
      } else if (showPageLayout && pageLayoutRef.current) {
        pageLayoutRef.current.apply(applyToEntireBook);
      } else if (showPageThemeSelector && pageThemeRef.current) {
        pageThemeRef.current.apply(applyToEntireBook);
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
        <ThemeSelector
          currentTheme={(() => {
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            return currentPage?.themeId || state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
          })()}
          title="Page Theme"
          onThemeSelect={(themeId) => {
            
            // Set page theme (saves history)
            dispatch({ type: 'SET_PAGE_THEME', payload: { pageIndex: state.activePageIndex, themeId } });

            // Apply theme to all elements on current page (no history, part of theme application)
            dispatch({
              type: 'APPLY_THEME_TO_ELEMENTS',
              payload: {
                pageIndex: state.activePageIndex,
                themeId,
                skipHistory: true,
                preserveColors: true
              }
            });

            const theme = getGlobalTheme(themeId);
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
              themeId,
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
                    pageTheme: themeId
                  };
                }
            }
            
            if (!newBackground && theme.pageSettings.backgroundPattern?.enabled) {
              newBackground = {
                type: 'pattern',
                value: theme.pageSettings.backgroundPattern.style,
                opacity: backgroundOpacity,
                pageTheme: themeId,
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
                pageTheme: themeId
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
              const activeTheme = themeId || state.currentBook?.bookTheme || 'default';
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



  if (showEditorSettings) {
    return <EditorSettings />;
  }
  
  if (showBackgroundSettings) {
    return (
      <PageBackgroundSettings
        showColorSelector={showColorSelector}
        setShowColorSelector={setShowColorSelector}
        showBackgroundSettings={showBackgroundSettings}
        setShowBackgroundSettings={setShowBackgroundSettings}
        showPatternSettings={showPatternSettings}
        setShowPatternSettings={setShowPatternSettings}
        setShowBackgroundImageModal={setShowBackgroundImageModal}
        showBackgroundImageTemplateSelector={showBackgroundImageTemplateSelector}
        setShowBackgroundImageTemplateSelector={setShowBackgroundImageTemplateSelector}
        selectedBackgroundImageId={selectedBackgroundImageId}
        onBackgroundImageSelect={onBackgroundImageSelect}
        onApplyBackgroundImage={onApplyBackgroundImage}
        isBackgroundApplyDisabled={isBackgroundApplyDisabled}
      />
    );
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
  
  
  // Get page layout - always use the active layout (page layout or book layout as fallback)
  // Get page layout - use page layout if available, otherwise fall back to book layout
  const pageLayout = pageActiveTemplates.layoutTemplateId
    ? (pageTemplates.find(t => t.id === pageActiveTemplates.layoutTemplateId) || null)
    : (bookActiveTemplates.layoutTemplateId
        ? (pageTemplates.find(t => t.id === bookActiveTemplates.layoutTemplateId) || null)
        : null);
  const pageTheme = getGlobalTheme(pageActiveTemplates.themeId);
  // Get page palette - distinguish between Theme's Default Palette and explicit palette
  const pagePaletteOverrideId = currentPage?.colorPaletteId || null;
  let effectivePaletteId: string | null = null;

  if (pagePaletteOverrideId === null) {
    // Theme's Default Palette - use theme's default palette
    effectivePaletteId = pageActiveTemplates.themeId ? (getThemePaletteId(pageActiveTemplates.themeId) ?? null) : null;
  } else {
    // Explicit palette - use the stored palette ID
    effectivePaletteId = pagePaletteOverrideId;
  }

  const pagePalette = effectivePaletteId
    ? (colorPalettes.find(p => p.id === effectivePaletteId) || null)
    : null;

  return (
    <>
      <div className="space-y-3">
        {state.editorInteractionLevel === 'full_edit_with_settings' && (
          <>
            <div>
              <Label variant="xs" className="text-muted-foreground mb-2 block">General Settings</Label>
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
                  onClick={() => setShowEditorSettings(true)}
                  className="w-full justify-start"
                >
                  <Columns3Cog className="h-4 w-4 mr-2" />
                  Editor
                </Button>
              </div>
            </div>
            
          </>
        )}
        <Separator />
        <div>
          <Label variant="xs" className="text-muted-foreground mb-2 block">Styling Settings</Label>
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
                    {pageLayout && (
                      <div className="ml-2 h-6 w-12 bg-gray-100 rounded border relative overflow-hidden shrink-0">
                        <div className="absolute inset-1 grid grid-cols-2 gap-1">
                          {pageLayout.textboxes.slice(0, 4).map((_, i) => (
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
                    <span className="text-xs text-muted-foreground ml-2">
                      {pageTheme?.name}
                    </span>
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
                    {pagePalette && (
                      <div className="ml-2 flex h-4 w-16 rounded overflow-hidden shrink-0 border border-gray-200">
                        {Object.values(pagePalette.colors).map((color, index) => (
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


      </div>
    </>
  );
});

GeneralSettings.displayName = 'GeneralSettings';