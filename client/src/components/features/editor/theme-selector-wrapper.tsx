import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/primitives/button';
import { Check, X } from 'lucide-react';
import { ThemeSelector } from './templates/theme-selector';
import { useEditor } from '../../../context/editor-context';
import { getGlobalTheme, getThemePageBackgroundColors, getThemePaletteId } from '../../../utils/global-themes';
import { PreviewImageDialog } from './preview/preview-image-dialog';
import { exportCanvasAsImage } from '../../../utils/canvas-export';
import Konva from 'konva';
import { getActiveTemplateIds } from '../../../utils/template-inheritance';
import { colorPalettes } from '../../../data/templates/color-palettes';
import type { PageBackground } from '../../../context/editor-context';
import { applyBackgroundImageTemplate } from '../../../utils/background-image-utils';

interface ThemeSelectorWrapperProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
}

export function ThemeSelectorWrapper({ onBack, title, isBookLevel = false }: ThemeSelectorWrapperProps) {
  const { state, dispatch } = useEditor();
  const buildBackgroundFromTheme = (
    theme: ReturnType<typeof getGlobalTheme> | undefined,
    resolvedThemeId: string,
    pageColors: { backgroundColor: string; patternBackgroundColor: string },
    backgroundOpacity: number,
  ): PageBackground => {
    if (theme) {
      const backgroundImageConfig = theme.pageSettings.backgroundImage;
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
          return {
            ...imageBackground,
            pageTheme: resolvedThemeId
          };
        }
      }

      if (theme.pageSettings.backgroundPattern?.enabled) {
        return {
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
    }

    return {
      type: 'color',
      value: pageColors.backgroundColor,
      opacity: backgroundOpacity,
      pageTheme: resolvedThemeId
    };
  };
  
  // Get active theme ID with inheritance fallback
  const currentPage = isBookLevel ? undefined : state.currentBook?.pages[state.activePageIndex];
  const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
  const currentTheme = activeTemplateIds.themeId;
  // CRITICAL: Check if page.themeId exists as an OWN property (not inherited)
  // Use Object.prototype.hasOwnProperty to ensure it's not in the prototype chain
  // This distinguishes between "inheriting book theme" (no themeId) and 
  // "explicitly set to same theme" (has themeId, even if matching bookThemeId)
  const pageHasCustomTheme = currentPage 
    ? Object.prototype.hasOwnProperty.call(currentPage, 'themeId') && 
      currentPage.themeId !== undefined && 
      currentPage.themeId !== null
    : false;

  const deriveSelectedTheme = () => {
    if (isBookLevel) {
      return currentTheme || 'default';
    }
    return pageHasCustomTheme ? (currentTheme || 'default') : '__BOOK_THEME__';
  };

  const [selectedTheme, setSelectedTheme] = useState<string>(deriveSelectedTheme());
  const [previewTheme, setPreviewTheme] = useState<string | null>(null); // Separate state for preview
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const originalPageIndexRef = useRef<number>(state.activePageIndex);
  const previewPageIndexRef = useRef<number | null>(null);
  const hasUserSelectedThemeRef = useRef<boolean>(false);
  
  // Update selectedTheme when currentTheme changes (only if user hasn't manually selected)
  useEffect(() => {
    if (!hasUserSelectedThemeRef.current) {
      setSelectedTheme(deriveSelectedTheme());
    }
  }, [currentTheme, pageHasCustomTheme, state.currentBook?.bookTheme, isBookLevel]);
  
  // Erstelle Preview-Seite wenn Dialog öffnet
  useEffect(() => {
    if (!showPreviewDialog || !previewTheme || !state.currentBook) {
      return;
    }
    if (previewTheme === '__BOOK_THEME__') {
      if (!state.currentBook.bookTheme) {
        return;
      }
    } else if (previewTheme === 'default') {
      // allow preview
    }
    
    if (originalPageIndexRef.current === undefined || previewPageIndexRef.current === null) {
      originalPageIndexRef.current = state.activePageIndex;
    }
    
    const hasPreviewPage = state.currentBook.pages.some(p => p.isPreview);
    if (!hasPreviewPage) {
      dispatch({ type: 'CREATE_PREVIEW_PAGE', payload: originalPageIndexRef.current });
    }
  }, [showPreviewDialog, previewTheme, state.currentBook, dispatch]);
  
  useEffect(() => {
    if (!showPreviewDialog || !previewTheme || !state.currentBook) {
      return;
    }
    const themeIdForPreview = previewTheme === '__BOOK_THEME__' ? (state.currentBook.bookTheme || 'default') : previewTheme;
    
    const previewPageIndex = state.currentBook.pages.findIndex(p => p.isPreview);
    if (previewPageIndex === -1) {
      return;
    }
    
    if (previewPageIndexRef.current === previewPageIndex && state.activePageIndex === previewPageIndex) {
      return;
    }
    
    const isAlreadyOnPreviewPage = state.activePageIndex === previewPageIndex;
    previewPageIndexRef.current = previewPageIndex;
    
    const applyThemeAndExport = async () => {
      setIsExporting(true);
      
      try {
        if (!isAlreadyOnPreviewPage) {
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: previewPageIndex });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const resolvedThemeId = themeIdForPreview || 'default';
        dispatch({ type: 'SET_PAGE_THEME', payload: { pageIndex: previewPageIndex, themeId: previewTheme } });
        dispatch({
          type: 'APPLY_THEME_TO_ELEMENTS',
          payload: {
            pageIndex: previewPageIndex,
          themeId: resolvedThemeId,
            skipHistory: true,
            preserveColors: true
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const stage = (window as unknown as { konvaStage?: Konva.Stage }).konvaStage || null;
        if (stage) {
          const dataURL = await exportCanvasAsImage(stage, 0.5, 0.75);
          setPreviewImage(dataURL);
        }
      } catch (error) {
        console.error('Error creating preview:', error);
      } finally {
        setIsExporting(false);
      }
    };
    
    applyThemeAndExport();
  }, [showPreviewDialog, previewTheme, state.currentBook, dispatch]);
  
  const handleApply = () => {
    if (!selectedTheme) return;
    
    if (isBookLevel) {
      dispatch({ type: 'SET_BOOK_THEME', payload: selectedTheme });

      if (state.currentBook) {
        state.currentBook.pages.forEach((page, pageIndex) => {
          // CRITICAL: Check if page.themeId exists as an OWN property (not inherited)
          // Use Object.prototype.hasOwnProperty to ensure it's not in the prototype chain
          // This distinguishes between "inheriting book theme" (no themeId) and 
          // "explicitly set to same theme" (has themeId, even if matching bookThemeId)
          const pageHasCustom = Object.prototype.hasOwnProperty.call(page, 'themeId') && 
                                 page.themeId !== undefined && 
                                 page.themeId !== null;
          const themeForElements = pageHasCustom ? page.themeId! : selectedTheme;

          // CRITICAL: Only update pages that inherit book theme (no themeId)
          // Pages with explicit themeId should NOT be updated, even if they match the new book theme
          if (!pageHasCustom) {
            // Page inherits book theme - update it to inherit the new book theme
            // But don't set themeId - let it remain undefined so it continues to inherit
            // We don't need to call SET_PAGE_THEME here because the page already inherits
            // The background and elements will be updated by SET_BOOK_THEME itself
          }
          dispatch({
            type: 'APPLY_THEME_TO_ELEMENTS',
            payload: {
              pageIndex,
              themeId: themeForElements,
              skipHistory: true,
              preserveColors: false // Don't preserve colors - we want to apply theme/palette fully
            }
          });
          
          // Apply palette colors to elements if palette is available
          const activePaletteId = page?.colorPaletteId || state.currentBook?.colorPaletteId || null;
          if (activePaletteId) {
            const palette = colorPalettes.find(p => p.id === activePaletteId);
            if (palette) {
              dispatch({
                type: 'APPLY_COLOR_PALETTE',
                payload: {
                  palette,
                  pageIndex,
                  applyToAllPages: false,
                  skipHistory: true
                }
              });
            }
          }
        });
      }
    } else {
      const isBookThemeSelection = selectedTheme === '__BOOK_THEME__';
      const resolvedThemeId = isBookThemeSelection ? (state.currentBook?.bookTheme || 'default') : selectedTheme;

      dispatch({
        type: 'SET_PAGE_THEME',
        payload: {
          pageIndex: state.activePageIndex,
          themeId: isBookThemeSelection ? '__BOOK_THEME__' : selectedTheme
        }
      });

      dispatch({
        type: 'APPLY_THEME_TO_ELEMENTS',
        payload: {
          pageIndex: state.activePageIndex,
          themeId: resolvedThemeId,
          skipHistory: true,
          preserveColors: false // Don't preserve colors - we want to apply theme/palette fully
        }
      });

      const theme = getGlobalTheme(resolvedThemeId);
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      if (theme && currentPage) {
        // Automatisch die neue Theme-Palette anwenden
        // SET_PAGE_THEME hat die colorPaletteId aktualisiert - jetzt die Elemente neu einfärben
        const newThemePaletteId = getThemePaletteId(resolvedThemeId);
        let newPalette: any = null;
        if (newThemePaletteId) {
          newPalette = colorPalettes.find(p => p.id === newThemePaletteId);
          if (newPalette) {
            dispatch({
              type: 'APPLY_COLOR_PALETTE',
              payload: {
                palette: newPalette,
                pageIndex: state.activePageIndex,
                applyToAllPages: false,
                skipHistory: true
              }
            });
          }
        }

        const pageColors = getThemePageBackgroundColors(
          resolvedThemeId,
          newPalette || undefined  // Verwende die neue Palette für Background-Berechnung
        );
        const backgroundOpacity = theme.pageSettings.backgroundOpacity || 1;

        const newBackground = buildBackgroundFromTheme(
          theme,
          resolvedThemeId,
          pageColors,
          backgroundOpacity
        );

        dispatch({
          type: 'UPDATE_PAGE_BACKGROUND',
          payload: {
            pageIndex: state.activePageIndex,
            background: newBackground
          }
        });
      }
    }
    
    const historyThemeLabel = selectedTheme === '__BOOK_THEME__'
      ? 'Book Theme'
      : getGlobalTheme(selectedTheme)?.name || selectedTheme;

    dispatch({
      type: 'SAVE_TO_HISTORY',
      payload: `Apply Theme "${historyThemeLabel}" to ${isBookLevel ? 'Book' : 'Page'}`
    });
    
    onBack();
  };
  
  const handleCancel = () => {
    // Lösche Preview-Seite und navigiere zurück
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    onBack();
  };
  
  const handlePreview = (themeId?: string) => {
    const themeToPreview = themeId || selectedTheme;
    if (!themeToPreview) return;
    setPreviewTheme(themeToPreview);
    setShowPreviewDialog(true);
  };
  
  const handleRefreshPreview = async (): Promise<string | null> => {
    if (!previewTheme || !state.currentBook || previewTheme === 'default') {
      return null;
    }
    
    setIsExporting(true);
    
    try {
      // Theme ist bereits auf Preview-Seite angewendet, nur neu exportieren
      const stage = (window as unknown as { konvaStage?: Konva.Stage }).konvaStage || null;
      if (stage) {
        const dataURL = await exportCanvasAsImage(stage, 0.5, 0.75);
        setPreviewImage(dataURL);
        setIsExporting(false);
        return dataURL;
      }
    } catch (error) {
      console.error('Error refreshing preview:', error);
    } finally {
      setIsExporting(false);
    }
    
    return null;
  };
  
  const handleApplyToPage = () => {
    if (!previewTheme) return;
    
    // Lösche Preview-Seite
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    
    // Navigiere zurück zur originalen Seite
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    // Warte kurz für Navigation
    setTimeout(() => {
      const targetPageIndex =
        originalPageIndexRef.current !== undefined
          ? originalPageIndexRef.current
          : state.activePageIndex;
      
      // Wende Theme auf aktuelle Seite an
      const isBookThemeSelection = previewTheme === '__BOOK_THEME__';
      const resolvedThemeId = isBookThemeSelection ? (state.currentBook?.bookTheme || 'default') : previewTheme;

      dispatch({ 
        type: 'SET_PAGE_THEME', 
        payload: { pageIndex: targetPageIndex, themeId: isBookThemeSelection ? '__BOOK_THEME__' : previewTheme }
      });
      
      dispatch({
        type: 'APPLY_THEME_TO_ELEMENTS',
        payload: { pageIndex: targetPageIndex, themeId: resolvedThemeId, skipHistory: true, preserveColors: true }
      });

      const theme = getGlobalTheme(resolvedThemeId);
      const currentPage = state.currentBook?.pages[targetPageIndex];
      if (theme && currentPage) {
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

        const newBackground = buildBackgroundFromTheme(
          theme,
          resolvedThemeId,
          pageColors,
          backgroundOpacity
        );

        dispatch({
          type: 'UPDATE_PAGE_BACKGROUND',
          payload: {
            pageIndex: targetPageIndex,
            background: newBackground
          }
        });
      }
      
      // Update selectedTheme after applying
      setSelectedTheme(previewTheme);
      
      // Speichere zu History
      const previewLabel = previewTheme === '__BOOK_THEME__'
        ? 'Book Theme'
        : getGlobalTheme(previewTheme)?.name || previewTheme;
      
      // Speichere zu History
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Theme "${previewLabel}" to Page`
      });
    }, 100);
  };
  
  const handleApplyToBook = () => {
    if (!previewTheme) return;
    
    // Lösche Preview-Seite
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    
    // Navigiere zurück zur originalen Seite
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    // Warte kurz für Navigation
    setTimeout(() => {
      // Wende Theme auf alle Seiten an
      dispatch({
        type: 'SET_BOOK_THEME',
        payload: previewTheme
      });
      
      // Update selectedTheme after applying
      setSelectedTheme(previewTheme);
      
      // NOTE: SET_BOOK_THEME already handles updating all pages that inherit the book theme
      // It removes themeId, updates backgrounds, and applies theme/palette to elements
      // We don't need to dispatch SET_PAGE_THEME here, as it would interfere with inheritance
      
      // Speichere zu History
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Theme "${getGlobalTheme(previewTheme)?.name || previewTheme}" to Book`
      });
    }, 100);
  };
  
  const handleCancelFromPreview = () => {
    // Lösche Preview-Seite und navigiere zurück
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    setShowPreviewDialog(false);
    setPreviewImage(null);
    setPreviewTheme(null);
  };
  
  // Cleanup: Lösche Preview-Seite wenn Component unmountet oder zurück navigiert wird
  useEffect(() => {
    return () => {
      // Lösche Preview-Seite beim Unmount
      dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    };
  }, [dispatch]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with Apply and Cancel buttons */}
      <div className="flex flex-col items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 justify-right">
            <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="py-5 px-3 h-8"
            >
                <X className="h-4 w-4 mr mr-1" />
                Cancel
            </Button>
            <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={!selectedTheme}
                className="py-5 px-3 h-8"
            >
                <Check className="h-4 w-4 mr-1" />
                Apply
            </Button>
            </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ThemeSelector
          currentTheme={currentTheme}
          selectedTheme={selectedTheme === '__BOOK_THEME__' ? undefined : selectedTheme}
          isBookThemeSelected={!isBookLevel && selectedTheme === '__BOOK_THEME__'}
          showBookThemeOption={!isBookLevel}
          onThemeSelect={(themeId) => {
            hasUserSelectedThemeRef.current = true;
            setSelectedTheme(themeId);
          }}
          onPreviewClick={(themeId) => {
            handlePreview(themeId);
          }}
          title={title}
        />
      </div>
      
      {/* Preview Dialog */}
      <PreviewImageDialog
        isOpen={showPreviewDialog}
        onClose={() => {
          handleCancelFromPreview();
        }}
        previewImage={previewImage}
        onApplyToPage={handleApplyToPage}
        onApplyToBook={handleApplyToBook}
        onCancel={handleCancelFromPreview}
        previewType="theme"
        isBookLevel={isBookLevel}
        onRefreshPreview={handleRefreshPreview}
        isLoading={isExporting}
      />
    </div>
  );
}
