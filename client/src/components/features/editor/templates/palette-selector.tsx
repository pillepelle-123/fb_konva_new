import { useState, useEffect, useRef } from 'react';
import { Button } from '../../../ui/primitives/button';
import { RotateCcw, SwatchBook, Check, X, Eye } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { getAllCategories, getPalettesByCategory, colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { useEditor } from '../../../../context/editor-context';
import { getGlobalTheme, getThemePageBackgroundColors } from '../../../../utils/global-themes';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { PreviewImageDialog } from '../preview/preview-image-dialog';
import { exportCanvasAsImage } from '../../../../utils/canvas-export';
import Konva from 'konva';

interface PaletteSelectorProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
  previewPosition?: 'top' | 'bottom'; // 'bottom' = Preview below list (default), 'top' = Preview above list
}

export function PaletteSelector({ onBack, title, isBookLevel = false, previewPosition = 'bottom' }: PaletteSelectorProps) {
  const { state, dispatch } = useEditor();
  const [selectedCategory, setSelectedCategory] = useState<string>('Default');
  
  // Initialize with current book/page palette if available
  const currentPaletteId = isBookLevel
    ? state.currentBook?.colorPaletteId
    : state.currentBook?.pages[state.activePageIndex]?.colorPaletteId;
  const currentPalette = currentPaletteId
    ? colorPalettes.find(p => p.id === currentPaletteId) || null
    : null;
  
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(currentPalette);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const originalPageIndexRef = useRef<number>(state.activePageIndex);
  const previewPageIndexRef = useRef<number | null>(null);
  
  // Cleanup: Lösche Preview-Seite wenn Component unmountet
  useEffect(() => {
    return () => {
      dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    };
  }, [dispatch]);
  
  // Update selectedPalette when currentPaletteId changes
  useEffect(() => {
    if (currentPaletteId && currentPalette) {
      setSelectedPalette(currentPalette);
    } else if (!currentPaletteId) {
      setSelectedPalette(null);
    }
  }, [currentPaletteId, currentPalette]);
  
  const categories = getAllCategories();
  
  const resetColorOverrides = () => {
    if (!state.currentBook) return;
    
    // Mimic the theme selection process - this is the easiest and most reliable way
    // to reset colors to theme defaults, just like when clicking a theme in GlobalThemeSelector
    if (isBookLevel) {
      // Book-Level: Re-apply book theme to all pages
      const bookTheme = state.currentBook.bookTheme || 'default';
      
      // Reset color overrides for all pages first
      state.currentBook.pages.forEach((page, pageIndex) => {
        const elementIds = page.elements
          .filter(el => el.colorOverrides && Object.keys(el.colorOverrides).length > 0)
          .map(el => el.id);
        
        if (elementIds.length > 0) {
          dispatch({
            type: 'RESET_COLOR_OVERRIDES',
            payload: { elementIds, pageIndex }
          });
        }
      });
      
      // Remove book color palette override so theme palette is used instead
      dispatch({ type: 'SET_BOOK_COLOR_PALETTE', payload: null });
      
      // Re-apply book theme to all elements and backgrounds on all pages (same as clicking theme in GlobalThemeSelector)
      setTimeout(() => {
        const theme = getGlobalTheme(bookTheme);
        if (theme) {
          const pageColors = getThemePageBackgroundColors(bookTheme);
          
          state.currentBook!.pages.forEach((_, pageIndex) => {
            // Apply theme to elements
            dispatch({
              type: 'APPLY_THEME_TO_ELEMENTS',
              payload: { pageIndex, themeId: bookTheme }
            });
            
            // Reset page background to theme defaults
            const newBackground = {
              type: (theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color') as 'pattern' | 'color' | 'image',
              value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
              opacity: theme.pageSettings.backgroundOpacity || 1,
              pageTheme: bookTheme,
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
          
          // Reset tool settings to theme defaults (not palette defaults) for new elements
          // Use getToolDefaults without palette IDs to get pure theme colors
          const toolTypes = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna_inline', 'free_text'];
          const toolUpdates: Record<string, any> = {};
          
          toolTypes.forEach(toolType => {
            // Get theme defaults WITHOUT palette - just pure theme colors
            const themeDefaults = getToolDefaults(
              toolType as any,
              bookTheme, // pageTheme (none for book level, so use book theme)
              bookTheme, // bookTheme
              undefined,
              undefined, // Don't pass toolSettings - we want pure theme defaults
              undefined, // pageLayoutTemplateId
              state.currentBook!.layoutTemplateId, // bookLayoutTemplateId
              null, // Don't use page palette - reset to theme colors
              null  // Don't use book palette - reset to theme colors
            );
            
            // Build tool settings from theme defaults
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
              // Only set fillColor if there's a fill value (not transparent)
              if (themeDefaults.fill && themeDefaults.fill !== 'transparent') {
                updates.fillColor = themeDefaults.fill;
              } else {
                // Explicitly set to transparent to override any existing value
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
          
          // Update tool settings with theme defaults - batch all updates together
          // This ensures all tool settings are reset properly
          Object.entries(toolUpdates).forEach(([tool, settings]) => {
            // Remove undefined values to ensure clean reset
            const cleanSettings = Object.fromEntries(
              Object.entries(settings).filter(([, value]) => value !== undefined)
            );
            
            dispatch({
              type: 'UPDATE_TOOL_SETTINGS',
              payload: { tool, settings: cleanSettings }
            });
          });
        }
      }, 50);
    } else {
      // Page-Level: Re-apply page theme or book theme to current page
      const currentPage = state.currentBook.pages[state.activePageIndex];
      if (currentPage) {
        // Determine which theme to use (page theme > book theme > default)
        const pageTheme = currentPage.themeId || 
                        currentPage.background?.pageTheme || 
                        state.currentBook.bookTheme || 
                        'default';
        
        // Reset color overrides for current page first
        const elementIds = currentPage.elements
          .filter(el => el.colorOverrides && Object.keys(el.colorOverrides).length > 0)
          .map(el => el.id);
        
        if (elementIds.length > 0) {
          dispatch({
            type: 'RESET_COLOR_OVERRIDES',
            payload: { elementIds, pageIndex: state.activePageIndex }
          });
        }
        
        // Remove page color palette override so theme palette is used instead
        dispatch({
          type: 'SET_PAGE_COLOR_PALETTE',
          payload: { pageIndex: state.activePageIndex, colorPaletteId: null }
        });
        
        // Re-apply theme to all elements and background on current page (same as clicking theme in GlobalThemeSelector)
        setTimeout(() => {
          const theme = getGlobalTheme(pageTheme);
          if (theme) {
            // Apply theme to elements
            dispatch({
              type: 'APPLY_THEME_TO_ELEMENTS',
              payload: { pageIndex: state.activePageIndex, themeId: pageTheme }
            });
            
            // Reset page background to theme defaults
            const pageColors = getThemePageBackgroundColors(pageTheme);
            const newBackground = {
              type: (theme.pageSettings.backgroundPattern?.enabled ? 'pattern' : 'color') as 'pattern' | 'color' | 'image',
              value: theme.pageSettings.backgroundPattern?.enabled ? theme.pageSettings.backgroundPattern.style : pageColors.backgroundColor,
              opacity: theme.pageSettings.backgroundOpacity || 1,
              pageTheme: pageTheme,
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
            
            // Reset tool settings to theme defaults (not palette defaults) for new elements
            // Use getToolDefaults without palette IDs to get pure theme colors
            if (state.currentBook) {
              const pageLayoutTemplateId = currentPage?.layoutTemplateId;
              const bookLayoutTemplateId = state.currentBook.layoutTemplateId;
              
              const toolTypes = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna_inline', 'free_text'];
              const toolUpdates: Record<string, any> = {};
              
              toolTypes.forEach(toolType => {
                // Get theme defaults WITHOUT palette - just pure theme colors
                const themeDefaults = getToolDefaults(
                  toolType as any,
                  pageTheme, // pageTheme
                  state.currentBook!.bookTheme || 'default', // bookTheme
                  undefined,
                  undefined, // Don't pass toolSettings - we want pure theme defaults
                  pageLayoutTemplateId, // pageLayoutTemplateId
                  bookLayoutTemplateId, // bookLayoutTemplateId
                  null, // Don't use page palette - reset to theme colors
                  null  // Don't use book palette - reset to theme colors
                );
              
              // Build tool settings from theme defaults
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
                // Only set fillColor if there's a fill value (not transparent)
                if (themeDefaults.fill && themeDefaults.fill !== 'transparent') {
                  updates.fillColor = themeDefaults.fill;
                } else {
                  // Explicitly set to transparent to override any existing value
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
              
              // Update tool settings with theme defaults - batch all updates together
              // This ensures all tool settings are reset properly
              Object.entries(toolUpdates).forEach(([tool, settings]) => {
                // Remove undefined values to ensure clean reset
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
        }, 50);
      }
    }
  };
  
  // Erstelle Preview-Seite wenn Dialog öffnet
  useEffect(() => {
    if (!showPreviewDialog || !selectedPalette || !state.currentBook) {
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
  }, [showPreviewDialog, selectedPalette, state.currentBook, dispatch]);
  
  // Wenn Preview-Seite erstellt wurde, navigiere dorthin und wende Palette an
  useEffect(() => {
    if (!showPreviewDialog || !selectedPalette || !state.currentBook) {
      return;
    }
    
    const previewPageIndex = state.currentBook.pages.findIndex(p => p.isPreview);
    if (previewPageIndex === -1) {
      return;
    }
    
    // Verhindere Endlosschleife: Nur verarbeiten, wenn wir noch nicht auf der Preview-Seite sind
    // oder wenn wir noch nicht verarbeitet haben
    if (previewPageIndexRef.current === previewPageIndex && state.activePageIndex === previewPageIndex) {
      return; // Bereits verarbeitet und auf Preview-Seite
    }
    
    // Wenn wir bereits auf der Preview-Seite sind, aber noch nicht verarbeitet haben,
    // dann haben wir bereits die Navigation gemacht, nur noch Palette anwenden
    const isAlreadyOnPreviewPage = state.activePageIndex === previewPageIndex;
    previewPageIndexRef.current = previewPageIndex;
    
    const applyPaletteAndExport = async () => {
      setIsExporting(true);
      
      try {
        // Navigiere zur Preview-Seite nur wenn noch nicht dort
        if (!isAlreadyOnPreviewPage) {
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: previewPageIndex });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Wende Palette auf Preview-Seite an (skip history)
        if (isBookLevel) {
          dispatch({
            type: 'SET_BOOK_COLOR_PALETTE',
            payload: selectedPalette.id,
            skipHistory: true
          });
        } else {
          dispatch({
            type: 'SET_PAGE_COLOR_PALETTE',
            payload: { 
              pageIndex: previewPageIndex, 
              colorPaletteId: selectedPalette.id,
              skipHistory: true
            }
          });
        }
        
        dispatch({
          type: 'APPLY_COLOR_PALETTE',
          payload: {
            palette: selectedPalette,
            pageIndex: previewPageIndex,
            applyToAllPages: isBookLevel
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
    
    applyPaletteAndExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewDialog, selectedPalette, state.currentBook?.pages, isBookLevel, dispatch]);
  
  const handlePaletteSelect = (palette: ColorPalette) => {
    setSelectedPalette(palette);
  };
  
  const handleApply = () => {
    if (!selectedPalette) return;
    
    // Apply palette permanently (save to history)
    if (isBookLevel) {
      dispatch({
        type: 'SET_BOOK_COLOR_PALETTE',
        payload: selectedPalette.id
      });
    } else {
      dispatch({
        type: 'SET_PAGE_COLOR_PALETTE',
        payload: { 
          pageIndex: state.activePageIndex, 
          colorPaletteId: selectedPalette.id
        }
      });
    }
    
    // Apply palette colors to existing elements
    dispatch({
      type: 'APPLY_COLOR_PALETTE',
      payload: {
        palette: selectedPalette,
        pageIndex: isBookLevel ? undefined : state.activePageIndex,
        applyToAllPages: isBookLevel
      }
    });
    
    // Update tool settings to use palette colors for new elements
    const toolUpdates = {
      brush: { strokeColor: selectedPalette.colors.primary },
      line: { strokeColor: selectedPalette.colors.primary },
      rect: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      circle: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      triangle: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      polygon: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      heart: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      star: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      'speech-bubble': { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      dog: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      cat: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      smiley: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
      text: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background },
      question: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.surface },
      answer: { fontColor: selectedPalette.colors.accent, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background },
      qna_inline: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background }
    };
    
    Object.entries(toolUpdates).forEach(([tool, settings]) => {
      dispatch({
        type: 'UPDATE_TOOL_SETTINGS',
        payload: { tool, settings }
      });
    });
    
    // Save current state to history (changes are already applied, now we make them permanent)
    dispatch({
      type: 'SAVE_TO_HISTORY',
      payload: `Apply ${isBookLevel ? 'Book' : 'Page'} Color Palette: ${selectedPalette.name}`
    });
    
    onBack();
  };
  
  const handleCancel = () => {
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    onBack();
  };
  
  const handlePreview = (palette?: ColorPalette) => {
    const paletteToUse = palette || selectedPalette;
    if (!paletteToUse) return;
    // Setze das Palette, falls es noch nicht gesetzt ist
    if (palette && palette.id !== selectedPalette?.id) {
      setSelectedPalette(palette);
    }
    setShowPreviewDialog(true);
  };
  
  const handleRefreshPreview = async (): Promise<string | null> => {
    const stage = (window as unknown as { konvaStage?: Konva.Stage }).konvaStage || null;
    if (stage) {
      const dataURL = await exportCanvasAsImage(stage, 0.5, 0.75);
      setPreviewImage(dataURL);
      return dataURL;
    }
    return null;
  };
  
  const handleApplyToPage = () => {
    if (!selectedPalette) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
      dispatch({
        type: 'SET_PAGE_COLOR_PALETTE',
        payload: { 
          pageIndex: state.activePageIndex, 
          colorPaletteId: selectedPalette.id
        }
      });
      
      dispatch({
        type: 'APPLY_COLOR_PALETTE',
        payload: {
          palette: selectedPalette,
          pageIndex: state.activePageIndex,
          applyToAllPages: false
        }
      });
      
      // Update tool settings
      const toolUpdates = {
        brush: { strokeColor: selectedPalette.colors.primary },
        line: { strokeColor: selectedPalette.colors.primary },
        rect: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        circle: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        triangle: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        polygon: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        heart: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        star: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        'speech-bubble': { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        dog: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        cat: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        smiley: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        text: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background },
        question: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.surface },
        answer: { fontColor: selectedPalette.colors.accent, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background },
        qna_inline: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background }
      };
      
      Object.entries(toolUpdates).forEach(([tool, settings]) => {
        dispatch({
          type: 'UPDATE_TOOL_SETTINGS',
          payload: { tool, settings }
        });
      });
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Page Color Palette: ${selectedPalette.name}`
      });
    }, 100);
  };
  
  const handleApplyToBook = () => {
    if (!selectedPalette) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
      dispatch({
        type: 'SET_BOOK_COLOR_PALETTE',
        payload: selectedPalette.id
      });
      
      dispatch({
        type: 'APPLY_COLOR_PALETTE',
        payload: {
          palette: selectedPalette,
          pageIndex: undefined,
          applyToAllPages: true
        }
      });
      
      const toolUpdates = {
        brush: { strokeColor: selectedPalette.colors.primary },
        line: { strokeColor: selectedPalette.colors.primary },
        rect: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        circle: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        triangle: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        polygon: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        heart: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        star: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        'speech-bubble': { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        dog: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        cat: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        smiley: { strokeColor: selectedPalette.colors.primary, fillColor: selectedPalette.colors.surface },
        text: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background },
        question: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.surface },
        answer: { fontColor: selectedPalette.colors.accent, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background },
        qna_inline: { fontColor: selectedPalette.colors.primary, borderColor: selectedPalette.colors.secondary, backgroundColor: selectedPalette.colors.background }
      };
      
      Object.entries(toolUpdates).forEach(([tool, settings]) => {
        dispatch({
          type: 'UPDATE_TOOL_SETTINGS',
          payload: { tool, settings }
        });
      });
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Book Color Palette: ${selectedPalette.name}`
      });
    }, 100);
  };
  
  const handleCancelFromPreview = () => {
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    setShowPreviewDialog(false);
    setPreviewImage(null);
  };

  const renderPalettePreview = (palette: ColorPalette) => (
    <div className="flex h-6 w-full rounded overflow-hidden">
      {Object.values(palette.colors).map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  const previewSection = (
    <div className="p-4 border-t border-gray-200 shrink-0" style={{ display: 'none' }}>
      <h3 className="text-sm font-medium mb-3">Preview</h3>
      {selectedPalette ? (
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-medium mb-2">{selectedPalette.name}</div>
          <div className="aspect-[210/297] bg-gray-50 border rounded p-4 flex flex-col gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Primary</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.primary }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Secondary</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.secondary }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Accent</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.accent }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Background</span>
                <div 
                  className="flex-1 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: selectedPalette.colors.background }}
                />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-600 mb-2">Color Preview</div>
              {renderPalettePreview(selectedPalette)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Select a palette to see preview</div>
      )}
    </div>
  );

  const listSection = (
    <div className="p-2 flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <SwatchBook className="h-4 w-4" />
          {title}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={resetColorOverrides}
          className="px-2 h-7 text-xs"
          title="Reset all manual color overrides to allow palette colors to be applied"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="space-y-2 mb-3">
        <Label variant="xs">Categories</Label>
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="xs"
              onClick={() => setSelectedCategory(category)}
              className="text-xs"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Palette List */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {getPalettesByCategory(selectedCategory).map(palette => (
          <div
            key={palette.id}
            className={`w-full p-3 border rounded-lg transition-colors flex items-start gap-2 ${
              selectedPalette?.id === palette.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <button
              onClick={() => handlePaletteSelect(palette)}
              className="flex-1 text-left"
              type="button"
            >
              <div className="font-medium text-sm mb-1">{palette.name}</div>
              <div className="mb-2">
                {renderPalettePreview(palette)}
              </div>
              <div className="text-xs text-gray-600">{palette.contrast} contrast</div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handlePreview(palette);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 mt-1"
              title="Preview Page with this Color Palette"
              type="button"
            >
              <Eye className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with Apply and Cancel buttons */}
      <div className="flex flex-col items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
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
                disabled={!selectedPalette}
                className="py-5 px-3 h-8"
            >
                <Check className="h-4 w-4 mr-1" />
                Apply
            </Button>
            </div>
        </div>
      </div>

      {/* Content area - flex-1 to take remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        {previewPosition === 'top' ? (
          <>
            {previewSection}
            {listSection}
          </>
        ) : (
          <>
            {listSection}
            {previewSection}
          </>
        )}
      </div>

      {/* Preview Dialog */}
      <PreviewImageDialog
        isOpen={showPreviewDialog}
        onClose={() => handleCancelFromPreview()}
        previewImage={previewImage}
        onApplyToPage={handleApplyToPage}
        onApplyToBook={handleApplyToBook}
        onCancel={handleCancelFromPreview}
        previewType="palette"
        isBookLevel={isBookLevel}
        onRefreshPreview={handleRefreshPreview}
        isLoading={isExporting}
      />
    </div>
  );
}

