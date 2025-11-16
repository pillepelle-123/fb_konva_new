import { useState, useEffect, useRef } from 'react';
import { Button } from '../../../ui/primitives/button';
import { RotateCcw, SwatchBook, Check, X, Eye } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { getAllCategories, getPalettesByCategory, colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { useEditor } from '../../../../context/editor-context';
import { getGlobalTheme, getThemePageBackgroundColors, getThemePaletteId } from '../../../../utils/global-themes';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { PreviewImageDialog } from '../preview/preview-image-dialog';
import { exportCanvasAsImage } from '../../../../utils/canvas-export';
import Konva from 'konva';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { SelectorShell, SelectorListSection } from './selector-shell';

interface PaletteSelectorProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
  previewPosition?: 'top' | 'bottom'; // 'bottom' = Preview below list (default), 'top' = Preview above list
  themeId?: string; // Theme ID to get default palette from
}

export function PaletteSelector({ onBack, title, isBookLevel = false, previewPosition = 'bottom', themeId }: PaletteSelectorProps) {
  const { state, dispatch } = useEditor();
  const [selectedCategory, setSelectedCategory] = useState<string>('Default');
  
  // Get active color palette ID with inheritance fallback
  const currentPage = isBookLevel ? undefined : state.currentBook?.pages[state.activePageIndex];
  const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
  const currentPaletteId = activeTemplateIds.colorPaletteId;
  const currentPalette = currentPaletteId
    ? colorPalettes.find(p => p.id === currentPaletteId) || null
    : null;
  const pagePaletteOverrideId = !isBookLevel ? currentPage?.colorPaletteId || null : null;
  const bookPaletteId = state.currentBook?.colorPaletteId || null;
  
  // Get theme default palette if themeId is provided
  const effectiveThemeId = themeId || activeTemplateIds.themeId;
  const themePaletteId = effectiveThemeId ? getThemePaletteId(effectiveThemeId) : undefined;
  const themePalette = themePaletteId ? colorPalettes.find(p => p.id === themePaletteId) || null : null;
  
  // Get book palette: if bookPaletteId is set, use it; otherwise use book theme's palette
  const bookThemeId = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
  const bookThemePaletteId = bookPaletteId ? null : getThemePaletteId(bookThemeId);
  const bookPalette = bookPaletteId
    ? (colorPalettes.find(p => p.id === bookPaletteId) || null)
    : (bookThemePaletteId ? colorPalettes.find(p => p.id === bookThemePaletteId) || null : null);
  
  // Determine if we should use theme default palette (when no explicit palette is set)
  // For book level: if bookPaletteId is null, use theme palette
  // For page level: default to Book Color Palette (not Theme's Default Palette)
  const shouldUseThemePalette = isBookLevel 
    ? (!bookPaletteId && !!themePalette)
    : (!currentPaletteId && !!themePalette && pagePaletteOverrideId === themePaletteId);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(
    isBookLevel
      ? (bookPalette || (shouldUseThemePalette ? themePalette : null))
      : (currentPalette || (shouldUseThemePalette ? themePalette : bookPalette || null))
  );
  const [useThemePalette, setUseThemePalette] = useState<boolean>(shouldUseThemePalette);
  const [useBookPalette, setUseBookPalette] = useState<boolean>(
    isBookLevel 
      ? false // Book level doesn't use "Book Color Palette" option
      : (pagePaletteOverrideId === null) // Page level: use Book Color Palette if no override
  );
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
  
  // Update selected palette state when overrides or book palette change
  useEffect(() => {
    if (isBookLevel) {
      // Book level: if bookPaletteId is null, use theme palette
      const shouldUseTheme = !bookPaletteId && !!themePalette;
      setSelectedPalette(bookPalette || (shouldUseTheme ? themePalette : null));
      setUseThemePalette(shouldUseTheme);
      return;
    }

    // Page level: distinguish between three cases:
    // 1. Explicit page palette (pagePaletteOverrideId is set and not themePaletteId)
    // 2. Book Color Palette (pagePaletteOverrideId is null)
    // 3. Theme's Default Palette (pagePaletteOverrideId === themePaletteId)
    
    if (pagePaletteOverrideId === null) {
      // Page inherits book palette -> Book Color Palette
      setUseBookPalette(true);
      setUseThemePalette(false);
      setSelectedPalette(bookPalette || null);
    } else if (pagePaletteOverrideId === themePaletteId) {
      // Page explicitly uses theme palette -> Theme's Default Palette
      setUseBookPalette(false);
      setUseThemePalette(true);
      setSelectedPalette(themePalette);
    } else {
      // Page has explicit palette -> explicit palette
      setUseBookPalette(false);
      setUseThemePalette(false);
      setSelectedPalette(currentPalette || null);
    }
  }, [isBookLevel, pagePaletteOverrideId, currentPaletteId, currentPalette, bookPalette, themePalette, themePaletteId, bookPaletteId]);

  const getEffectivePalette = (): ColorPalette | null => {
    if (isBookLevel) {
      return useThemePalette ? themePalette : selectedPalette;
    }

    if (useThemePalette) {
      return themePalette;
    }

    if (useBookPalette) {
      return bookPalette || selectedPalette;
    }

    return selectedPalette;
  };
  
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
    if (!showPreviewDialog || !state.currentBook) {
      return;
    }
    
    const paletteForPreview = getEffectivePalette();
    if (!paletteForPreview) {
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
            payload: paletteForPreview.id,
            skipHistory: true
          });
        } else {
          dispatch({
            type: 'SET_PAGE_COLOR_PALETTE',
            payload: { 
              pageIndex: previewPageIndex, 
              colorPaletteId: useBookPalette ? null : paletteForPreview.id,
              skipHistory: true
            }
          });
        }
        
        dispatch({
          type: 'APPLY_COLOR_PALETTE',
          payload: {
            palette: paletteForPreview,
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
  }, [showPreviewDialog, selectedPalette, state.currentBook?.pages, isBookLevel, dispatch, useBookPalette, bookPalette]);
  
  const handlePaletteSelect = (palette: ColorPalette) => {
    setUseBookPalette(false);
    setUseThemePalette(false);
    setSelectedPalette(palette);
  };
  
  const handleSelectThemePalette = () => {
    setUseBookPalette(false);
    setUseThemePalette(true);
    if (themePalette) {
      setSelectedPalette(themePalette);
    }
  };
  
  const handleSelectBookPalette = () => {
    setUseBookPalette(true);
    setUseThemePalette(false);
    if (bookPalette) {
      setSelectedPalette(bookPalette);
    } else {
      setSelectedPalette(null);
    }
  };
  
  const handleApply = () => {
    const paletteToApply = getEffectivePalette();
    if (!paletteToApply) return;
    
    // Apply palette permanently (save to history)
    if (isBookLevel) {
      // If using theme palette, set to null so theme palette is used
      dispatch({
        type: 'SET_BOOK_COLOR_PALETTE',
        payload: useThemePalette ? null : paletteToApply.id
      });
    } else {
      // If using theme palette, explicitly set the theme palette ID so it's used instead of book palette
      const colorPaletteIdToSet = useThemePalette 
        ? (themePaletteId || null)  // Explicitly set theme palette ID
        : (useBookPalette ? null : paletteToApply.id);  // null for book palette, or explicit palette ID
      
      dispatch({
        type: 'SET_PAGE_COLOR_PALETTE',
        payload: { 
          pageIndex: state.activePageIndex, 
          colorPaletteId: colorPaletteIdToSet
        }
      });
    }
    
    // Apply palette colors to existing elements
    dispatch({
      type: 'APPLY_COLOR_PALETTE',
      payload: {
        palette: paletteToApply,
        pageIndex: isBookLevel ? undefined : state.activePageIndex,
        applyToAllPages: isBookLevel
      }
    });
    
    // Update tool settings to use palette colors for new elements
    const toolUpdates = {
      brush: { strokeColor: paletteToApply.colors.primary },
      line: { strokeColor: paletteToApply.colors.primary },
      rect: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      circle: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      triangle: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      polygon: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      heart: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      star: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      'speech-bubble': { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      dog: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      cat: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      smiley: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      text: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background },
      question: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.surface },
      answer: { fontColor: paletteToApply.colors.accent, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background },
      qna_inline: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background }
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
      payload: `Apply ${isBookLevel ? 'Book' : 'Page'} Color Palette: ${paletteToApply.name}`
    });
    
    onBack();
  };
  
  const handleCancel = () => {
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    onBack();
  };
  
  const handlePreview = (palette?: ColorPalette, inheritBookPalette = false) => {
    const paletteToUse = inheritBookPalette
      ? bookPalette || palette || selectedPalette
      : palette || selectedPalette;
    if (!paletteToUse) return;
    // Setze Palette-Auswahl abhängig von Quelle
    if (inheritBookPalette) {
      setUseBookPalette(true);
      setSelectedPalette(paletteToUse);
    } else if (palette && palette.id !== selectedPalette?.id) {
      setUseBookPalette(false);
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
    const paletteToApply = getEffectivePalette();
    if (!paletteToApply) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
    const targetPageIndex =
      originalPageIndexRef.current !== undefined
        ? originalPageIndexRef.current
        : state.activePageIndex;
    
      // If using theme palette, explicitly set the theme palette ID so it's used instead of book palette
      const colorPaletteIdToSet = useThemePalette 
        ? (themePaletteId || null)  // Explicitly set theme palette ID
        : (useBookPalette ? null : paletteToApply.id);  // null for book palette, or explicit palette ID
      
      dispatch({
        type: 'SET_PAGE_COLOR_PALETTE',
        payload: { 
        pageIndex: targetPageIndex, 
          colorPaletteId: colorPaletteIdToSet
        }
      });
      
      dispatch({
        type: 'APPLY_COLOR_PALETTE',
        payload: {
          palette: paletteToApply,
        pageIndex: targetPageIndex,
          applyToAllPages: false
        }
      });
      
      // Update tool settings
      const toolUpdates = {
        brush: { strokeColor: paletteToApply.colors.primary },
        line: { strokeColor: paletteToApply.colors.primary },
        rect: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        circle: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        triangle: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        polygon: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        heart: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        star: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        'speech-bubble': { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        dog: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        cat: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        smiley: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        text: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background },
        question: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.surface },
        answer: { fontColor: paletteToApply.colors.accent, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background },
        qna_inline: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background }
      };
      
      Object.entries(toolUpdates).forEach(([tool, settings]) => {
        dispatch({
          type: 'UPDATE_TOOL_SETTINGS',
          payload: { tool, settings }
        });
      });
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Page Color Palette: ${paletteToApply.name}`
      });
    }, 100);
  };
  
  const handleApplyToBook = () => {
    const paletteToApply = getEffectivePalette();
    if (!paletteToApply) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
      dispatch({
        type: 'SET_BOOK_COLOR_PALETTE',
        payload: useThemePalette ? null : paletteToApply.id
      });
      
      // When applying theme palette, also update backgrounds explicitly
      if (useThemePalette && state.currentBook) {
        state.currentBook.pages.forEach((page, pageIndex) => {
          // Skip pages with individual palettes - they should keep their own palette
          if (page.colorPaletteId) return;
          
          const currentBackground = page.background || { type: 'color' as const, value: '#ffffff' };
          let updatedBackground: typeof currentBackground;
          
          if (currentBackground.type === 'color') {
            updatedBackground = {
              ...currentBackground,
              value: paletteToApply.colors.background
            };
          } else if (currentBackground.type === 'pattern') {
            updatedBackground = {
              ...currentBackground,
              patternBackgroundColor: paletteToApply.colors.primary,
              patternForegroundColor: paletteToApply.colors.background
            };
          } else {
            // For 'image' type, preserve everything - color palette doesn't affect image backgrounds
            updatedBackground = currentBackground;
          }
          
          dispatch({
            type: 'UPDATE_PAGE_BACKGROUND',
            payload: {
              pageIndex,
              background: updatedBackground,
              skipHistory: true
            }
          });
        });
      }
      
      dispatch({
        type: 'APPLY_COLOR_PALETTE',
        payload: {
          palette: paletteToApply,
          pageIndex: undefined,
          applyToAllPages: true
        }
      });
      
      const toolUpdates = {
        brush: { strokeColor: paletteToApply.colors.primary },
        line: { strokeColor: paletteToApply.colors.primary },
        rect: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        circle: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        triangle: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        polygon: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        heart: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        star: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        'speech-bubble': { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        dog: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        cat: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        smiley: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
        text: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background },
        question: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.surface },
        answer: { fontColor: paletteToApply.colors.accent, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background },
        qna_inline: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background }
      };
      
      Object.entries(toolUpdates).forEach(([tool, settings]) => {
        dispatch({
          type: 'UPDATE_TOOL_SETTINGS',
          payload: { tool, settings }
        });
      });
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Book Color Palette: ${paletteToApply.name}`
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
    <SelectorListSection
      title={
        <>
          <SwatchBook className="h-4 w-4" />
          {title}
        </>
      }
      headerActions={
        isBookLevel ? (
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
        ) : null
      }
      beforeList={(
        <div className="space-y-2 mb-3 w-full">
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
      )}
    >
      {!isBookLevel && bookPalette && (
        <div
          key="book-palette-entry"
          className={`w-full p-3 border rounded-lg transition-colors flex items-start gap-2 ${
            useBookPalette
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <button
            onClick={() => handleSelectBookPalette()}
            className="flex-1 text-left"
            type="button"
          >
            <div className="font-medium text-sm mb-1">Book Color Palette</div>
            <div className="mb-2">
              {renderPalettePreview(bookPalette)}
            </div>
            <div className="text-xs text-gray-600">{bookPalette.name}</div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePreview(bookPalette, true);
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
      )}
      {themePalette && (
        <div
          key="theme-palette-entry"
          className={`w-full p-3 border rounded-lg transition-colors flex items-start gap-2 ${
            useThemePalette && (isBookLevel || !useBookPalette)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <button
            onClick={() => handleSelectThemePalette()}
            className="flex-1 text-left"
            type="button"
          >
            <div className="font-medium text-sm mb-1">Theme's Default Palette</div>
            <div className="mb-2">
              {renderPalettePreview(themePalette)}
            </div>
            {/* <div className="text-xs text-gray-600">{themePalette.name}</div> */}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePreview(themePalette);
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
      )}
      {getPalettesByCategory(selectedCategory).map(palette => (
        <div
          key={palette.id}
          className={`w-full p-3 border rounded-lg transition-colors flex items-start gap-2 ${
            !useBookPalette && !useThemePalette && selectedPalette?.id === palette.id
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
            {/* <div className="text-xs text-gray-600">{palette.contrast} contrast</div> */}
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
    </SelectorListSection>
  );

  return (
    <>
      <SelectorShell
        headerContent={
          <>
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="py-5 px-3 h-8"
              >
                <X className="h-4 w-4 mr-1" />
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
          </>
        }
        listSection={listSection}
        previewSection={previewSection}
        previewPosition={previewPosition}
      />

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
    </>
  );
}

