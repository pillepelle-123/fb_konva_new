import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/primitives/button';
import { Check, X } from 'lucide-react';
import { GlobalThemeSelector } from './templates/global-theme-selector';
import { useEditor } from '../../../context/editor-context';
import { getGlobalTheme, getThemePageBackgroundColors } from '../../../utils/global-themes';
import type { PageBackground } from '../../../context/editor-context';
import { PreviewImageDialog } from './preview/preview-image-dialog';
import { exportCanvasAsImage } from '../../../utils/canvas-export';
import Konva from 'konva';
import { ButtonGroup } from '../../ui';

interface ThemeSelectorWrapperProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
}

export function ThemeSelectorWrapper({ onBack, title, isBookLevel = false }: ThemeSelectorWrapperProps) {
  const { state, dispatch } = useEditor();
  
  // Initialize with current book/page theme if available
  const currentTheme = isBookLevel
    ? state.currentBook?.bookTheme || 'default'
    : state.currentBook?.pages[state.activePageIndex]?.background?.pageTheme || 
      state.currentBook?.pages[state.activePageIndex]?.themeId ||
      state.currentBook?.bookTheme || 
      'default';
  
  const [selectedTheme, setSelectedTheme] = useState<string>(currentTheme);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const originalPageIndexRef = useRef<number>(state.activePageIndex);
  const previewPageIndexRef = useRef<number | null>(null);
  
  // Update selectedTheme when currentTheme changes
  useEffect(() => {
    setSelectedTheme(currentTheme);
  }, [currentTheme]);
  
  // Erstelle Preview-Seite wenn Dialog öffnet
  useEffect(() => {
    if (!showPreviewDialog || !selectedTheme || !state.currentBook || selectedTheme === 'default') {
      return;
    }
    
    // Speichere ursprüngliche Page-Index (wird nur einmal beim Öffnen gesetzt)
    if (originalPageIndexRef.current === undefined || previewPageIndexRef.current === null) {
      originalPageIndexRef.current = state.activePageIndex;
    }
    
    // Erstelle Preview-Seite nur wenn noch keine existiert
    const hasPreviewPage = state.currentBook.pages.some(p => p.isPreview);
    if (!hasPreviewPage) {
      dispatch({ type: 'CREATE_PREVIEW_PAGE', payload: originalPageIndexRef.current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewDialog, selectedTheme, state.currentBook, dispatch]);
  
  // Wenn Preview-Seite erstellt wurde, navigiere dorthin und wende Theme an
  useEffect(() => {
    if (!showPreviewDialog || !selectedTheme || !state.currentBook || selectedTheme === 'default') {
      return;
    }
    
    const previewPageIndex = state.currentBook.pages.findIndex(p => p.isPreview);
    if (previewPageIndex === -1) {
      return; // Preview-Seite noch nicht erstellt
    }
    
    // Verhindere Endlosschleife: Nur verarbeiten, wenn wir noch nicht auf der Preview-Seite sind
    // oder wenn wir noch nicht verarbeitet haben
    if (previewPageIndexRef.current === previewPageIndex && state.activePageIndex === previewPageIndex) {
      return; // Bereits verarbeitet und auf Preview-Seite
    }
    
    // Wenn wir bereits auf der Preview-Seite sind, aber noch nicht verarbeitet haben,
    // dann haben wir bereits die Navigation gemacht, nur noch Theme anwenden
    const isAlreadyOnPreviewPage = state.activePageIndex === previewPageIndex;
    previewPageIndexRef.current = previewPageIndex;
    
    const applyThemeAndExport = async () => {
      setIsExporting(true);
      
      try {
        // Navigiere zur Preview-Seite nur wenn noch nicht dort
        if (!isAlreadyOnPreviewPage) {
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: previewPageIndex });
          // Warte kurz für React-Rendering
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Wende Theme auf Preview-Seite an (skip history)
        if (isBookLevel) {
          dispatch({ type: 'SET_BOOK_THEME', payload: selectedTheme, skipHistory: true });
          
          if (state.currentBook) {
            state.currentBook.pages.forEach((_, pageIndex) => {
              dispatch({
                type: 'APPLY_THEME_TO_ELEMENTS',
                payload: { 
                  pageIndex, 
                  themeId: selectedTheme,
                  applyToAllPages: true,
                  skipHistory: true
                }
              });
            });
          }
        } else {
          dispatch({ 
            type: 'SET_PAGE_THEME', 
            payload: { pageIndex: previewPageIndex, themeId: selectedTheme, skipHistory: true }
          });
          
          dispatch({
            type: 'APPLY_THEME_TO_ELEMENTS',
            payload: { 
              pageIndex: previewPageIndex, 
              themeId: selectedTheme,
              applyToAllPages: false,
              skipHistory: true
            }
          });
        }
        
        // Wende Background-Theme an
        const theme = getGlobalTheme(selectedTheme);
        if (theme) {
          const pageColors = getThemePageBackgroundColors(selectedTheme);
          const newBackground: PageBackground = {
            type: (theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color') as 'color' | 'pattern' | 'image',
            value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
            opacity: theme.pageSettings.backgroundOpacity || 1,
            pageTheme: isBookLevel ? undefined : selectedTheme,
            ...(theme.pageSettings.backgroundPattern?.enabled && {
              patternSize: theme.pageSettings.backgroundPattern.size,
              patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
              patternForegroundColor: pageColors.backgroundColor,
              patternBackgroundColor: pageColors.patternBackgroundColor,
              patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
            })
          };
          
          if (isBookLevel) {
            // Für Book-Level: Wende auf alle Seiten an (inkl. Preview)
            if (state.currentBook) {
              state.currentBook.pages.forEach((_, pageIndex) => {
                dispatch({
                  type: 'UPDATE_PAGE_BACKGROUND',
                  payload: { 
                    pageIndex, 
                    background: { ...newBackground, pageTheme: undefined } as PageBackground,
                    skipHistory: true
                  }
                });
              });
            }
          } else {
            // Für Page-Level: Nur Preview-Seite
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { 
                pageIndex: previewPageIndex, 
                background: newBackground as PageBackground,
                skipHistory: true
              }
            });
          }
        }
        
        // Warte für Rendering
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Exportiere Canvas
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewDialog, selectedTheme, state.currentBook?.pages, isBookLevel, dispatch]);
  
  const handleApply = () => {
    if (!selectedTheme || selectedTheme === 'default') return;
    
    // Apply theme permanently (save to history)
    if (isBookLevel) {
      dispatch({ type: 'SET_BOOK_THEME', payload: selectedTheme });
      
      if (state.currentBook) {
        state.currentBook.pages.forEach((_, pageIndex) => {
          dispatch({
            type: 'APPLY_THEME_TO_ELEMENTS',
            payload: { pageIndex, themeId: selectedTheme, applyToAllPages: true, skipHistory: true }
          });
        });
        
        const theme = getGlobalTheme(selectedTheme);
        if (theme) {
          state.currentBook.pages.forEach((_, pageIndex) => {
            const pageColors = getThemePageBackgroundColors(selectedTheme);
            const newBackground: PageBackground = {
              type: (theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color') as 'color' | 'pattern' | 'image',
              value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
              opacity: theme.pageSettings.backgroundOpacity || 1,
              pageTheme: undefined,
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
                background: newBackground,
                skipHistory: true
              }
            });
          });
        }
      }
    } else {
      dispatch({ 
        type: 'SET_PAGE_THEME', 
        payload: { pageIndex: state.activePageIndex, themeId: selectedTheme }
      });
      
      dispatch({
        type: 'APPLY_THEME_TO_ELEMENTS',
        payload: { pageIndex: state.activePageIndex, themeId: selectedTheme, skipHistory: true }
      });
      
      const theme = getGlobalTheme(selectedTheme);
      if (theme) {
        const pageColors = getThemePageBackgroundColors(selectedTheme);
        const newBackground: PageBackground = {
          type: (theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color') as 'color' | 'pattern' | 'image',
          value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
          opacity: theme.pageSettings.backgroundOpacity || 1,
          pageTheme: selectedTheme,
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
            background: newBackground,
            skipHistory: true
          }
        });
      }
    }
    
    // Speichere zu History nach vollständiger Anwendung
    dispatch({
      type: 'SAVE_TO_HISTORY',
      payload: `Apply Theme "${getGlobalTheme(selectedTheme)?.name || selectedTheme}" to ${isBookLevel ? 'Book' : 'Page'}`
    });
    
    onBack();
  };
  
  const handleCancel = () => {
    // Lösche Preview-Seite und navigiere zurück
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    onBack();
  };
  
  const handlePreview = () => {
    if (!selectedTheme || selectedTheme === 'default') return;
    setShowPreviewDialog(true);
  };
  
  const handleRefreshPreview = async (): Promise<string | null> => {
    if (!selectedTheme || !state.currentBook || selectedTheme === 'default') {
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
    if (!selectedTheme || selectedTheme === 'default') return;
    
    // Lösche Preview-Seite
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    
    // Navigiere zurück zur originalen Seite
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    // Warte kurz für Navigation
    setTimeout(() => {
      // Wende Theme auf aktuelle Seite an
      dispatch({ 
        type: 'SET_PAGE_THEME', 
        payload: { pageIndex: state.activePageIndex, themeId: selectedTheme }
      });
      
      dispatch({
        type: 'APPLY_THEME_TO_ELEMENTS',
        payload: { pageIndex: state.activePageIndex, themeId: selectedTheme, skipHistory: true }
      });
      
      const theme = getGlobalTheme(selectedTheme);
      if (theme) {
        const pageColors = getThemePageBackgroundColors(selectedTheme);
        const newBackground: PageBackground = {
          type: (theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color') as 'color' | 'pattern' | 'image',
          value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
          opacity: theme.pageSettings.backgroundOpacity || 1,
          pageTheme: selectedTheme,
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
            background: newBackground,
            skipHistory: true
          }
        });
      }
      
      // Speichere zu History
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Theme "${getGlobalTheme(selectedTheme)?.name || selectedTheme}" to Page`
      });
    }, 100);
  };
  
  const handleApplyToBook = () => {
    if (!selectedTheme || selectedTheme === 'default') return;
    
    // Lösche Preview-Seite
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    
    // Navigiere zurück zur originalen Seite
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    // Warte kurz für Navigation
    setTimeout(() => {
      // Wende Theme auf alle Seiten an
      dispatch({ type: 'SET_BOOK_THEME', payload: selectedTheme });
      
      if (state.currentBook) {
        state.currentBook.pages.forEach((_, pageIndex) => {
          dispatch({
            type: 'APPLY_THEME_TO_ELEMENTS',
            payload: { pageIndex, themeId: selectedTheme, applyToAllPages: true, skipHistory: true }
          });
        });
        
        const theme = getGlobalTheme(selectedTheme);
        if (theme) {
          state.currentBook.pages.forEach((_, pageIndex) => {
            const pageColors = getThemePageBackgroundColors(selectedTheme);
            const newBackground: PageBackground = {
              type: (theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color') as 'color' | 'pattern' | 'image',
              value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
              opacity: theme.pageSettings.backgroundOpacity || 1,
              pageTheme: undefined,
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
                background: newBackground,
                skipHistory: true
              }
            });
          });
        }
      }
      
      // Speichere zu History
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Theme "${getGlobalTheme(selectedTheme)?.name || selectedTheme}" to Book`
      });
    }, 100);
  };
  
  const handleCancelFromPreview = () => {
    // Lösche Preview-Seite und navigiere zurück
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    setShowPreviewDialog(false);
    setPreviewImage(null);
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
                disabled={!selectedTheme || selectedTheme === 'default'}
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
        <GlobalThemeSelector
          currentTheme={currentTheme}
          selectedTheme={selectedTheme}
          onThemeSelect={setSelectedTheme}
          onPreviewClick={(themeId) => {
            setSelectedTheme(themeId);
            handlePreview();
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
