import { useState } from 'react';
import { Button } from '../../ui/primitives/button';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { Label } from '../../ui/primitives/label';
import { getAllCategories, getPalettesByCategory } from '../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../types/template-types';
import { useEditor } from '../../../context/editor-context';
import { getGlobalTheme, getThemePageBackgroundColors } from '../../../utils/global-themes';
import { getToolDefaults } from '../../../utils/tool-defaults';

interface PaletteSelectorProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
}

export function PaletteSelector({ onBack, title, isBookLevel = false }: PaletteSelectorProps) {
  const { state, dispatch } = useEditor();
  const [selectedCategory, setSelectedCategory] = useState<string>('Default');
  
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
  
  const handlePaletteSelect = (palette: ColorPalette) => {
    // Set Book/Page-Level Color Palette (for new elements)
    if (isBookLevel) {
      dispatch({
        type: 'SET_BOOK_COLOR_PALETTE',
        payload: palette.id
      });
    } else {
      dispatch({
        type: 'SET_PAGE_COLOR_PALETTE',
        payload: { 
          pageIndex: state.activePageIndex, 
          colorPaletteId: palette.id 
        }
      });
    }
    
    // Apply palette colors to existing elements using APPLY_COLOR_PALETTE action
    // This action properly handles both page-level and book-level updates
    dispatch({
      type: 'APPLY_COLOR_PALETTE',
      payload: {
        palette,
        pageIndex: isBookLevel ? undefined : state.activePageIndex,
        applyToAllPages: isBookLevel
      }
    });
    
    // Update tool settings to use palette colors for new elements
    const toolUpdates = {
      brush: { strokeColor: palette.colors.primary },
      line: { strokeColor: palette.colors.primary },
      rect: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      circle: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      triangle: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      polygon: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      heart: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      star: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      'speech-bubble': { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      dog: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      cat: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      smiley: { strokeColor: palette.colors.primary, fillColor: palette.colors.surface },
      text: { fontColor: palette.colors.primary, borderColor: palette.colors.secondary, backgroundColor: palette.colors.background },
      question: { fontColor: palette.colors.primary, borderColor: palette.colors.secondary, backgroundColor: palette.colors.surface },
      answer: { fontColor: palette.colors.accent, borderColor: palette.colors.secondary, backgroundColor: palette.colors.background },
      qna_inline: { fontColor: palette.colors.primary, borderColor: palette.colors.secondary, backgroundColor: palette.colors.background }
    };
    
    Object.entries(toolUpdates).forEach(([tool, settings]) => {
      dispatch({
        type: 'UPDATE_TOOL_SETTINGS',
        payload: { tool, settings }
      });
    });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="px-2 h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetColorOverrides}
          className="px-2 h-8 text-xs"
          title="Reset all manual color overrides to allow palette colors to be applied"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset Theme default
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="space-y-2">
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

      {/* Palette Grid */}
      <div className="space-y-2 overflow-y-auto scrollbar-thin ">
        <Label variant="xs">Palettes</Label>
        <div className="space-y-2">
          {getPalettesByCategory(selectedCategory).map(palette => (
            <Button
              key={palette.id}
              variant="ghost"
              className="w-full h-auto p-2 flex flex-col gap-2 hover:bg-muted/80"
              onClick={() => handlePaletteSelect(palette)}
            >
              <div className="w-full">
                {renderPalettePreview(palette)}
              </div>
              <Label variant="xs" className="text-center">{palette.name}</Label>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}