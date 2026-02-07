// React
import { useState } from 'react';

// Context & Hooks
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';

// UI Components
import { Button } from '../../../ui/primitives/button';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Tooltip } from '../../../ui/composites/tooltip';

// Icons
import { Palette, ChevronLeft, ArrowLeft, Check, BookCheck } from 'lucide-react';

// Settings Components
import { GeneralSettings, type GeneralSettingsRef } from './general-settings';
import { QnASettingsForm } from './qna-settings-form';
import { FreeTextSettingsForm } from './free-text-settings-form';
import { ShapeSettingsForm } from './shape-settings-form';
import { ImageSettingsForm } from './image-settings-form';
import { StickerSettingsForm } from './sticker-settings-form';
import { ColorSelector } from './color-selector';

// Utils
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getBorderWidth, getBorderTheme } from '../../../../utils/border-utils';
import { getFontSize, getFontColor, getFontFamily } from '../../../../utils/font-utils';
import { getBackgroundEnabled } from '../../../../utils/background-utils';
import { getTextAlign, getParagraphSpacing, getPadding } from '../../../../utils/format-utils';
import { getRuledLinesTheme } from '../../../../utils/theme-utils';
import { TOOL_ICONS } from './tool-settings-utils';
import { getCurrentMenu, getParentMenu, getMenuTitle } from './settings-navigation';

// Data
import { svgRawImports } from '../../../../data/templates/stickers';

// Other Components
import ChatWindow from '../../messenger/chat-window';

// Types
import type { PageBackground } from '../../../../context/editor-context';
import type { Conversation } from '../../messenger/types';

interface ToolSettingsContentProps {
  showColorSelector: string | null;
  setShowColorSelector: (value: string | null) => void;
  showFontSelector: boolean;
  setShowFontSelector: (value: boolean) => void;
  showBackgroundSettings: boolean;
  setShowBackgroundSettings: (value: boolean) => void;
  showPatternSettings: boolean;
  setShowPatternSettings: (value: boolean) => void;
  showPageTheme: boolean;
  setShowPageTheme: (value: boolean) => void;
  showBookTheme: boolean;
  setShowBookTheme: (value: boolean) => void;
  showImageModal: boolean;
  setShowImageModal: (value: boolean) => void;
  showBackgroundImageModal: boolean;
  setShowBackgroundImageModal: (value: boolean) => void;
  showBackgroundImageTemplateSelector: boolean;
  setShowBackgroundImageTemplateSelector: (value: boolean) => void;
  selectedImageElementId: string | null;
  setSelectedImageElementId: (value: string | null) => void;
  showQuestionDialog: boolean;
  setShowQuestionDialog: (value: boolean) => void;
  selectedQuestionElementId: string | null;
  setSelectedQuestionElementId: (value: string | null) => void;
  activeLinkedElement: string | null;
  selectedBackgroundImageId?: string | null;
  onBackgroundImageSelect?: (imageId: string | null) => void;
  onApplyBackgroundImage?: () => void;
  isBackgroundApplyDisabled?: boolean;
  isBookChatAvailable?: boolean;
  onOpenBookChat?: () => void;
  showBookChatPanel?: boolean;
  onCloseBookChat?: () => void;
  bookChatConversation?: Conversation | null;
  bookChatLoading?: boolean;
  bookChatError?: string | null;
  onRetryBookChat?: () => void;
  bookChatShouldFocusInput?: boolean;
  onChatInputFocused?: () => void;
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
  showEditorSettings?: boolean;
  setShowEditorSettings?: (value: boolean) => void;
  generalSettingsRef?: React.RefObject<GeneralSettingsRef>;
}

export function ToolSettingsContent({
  showColorSelector,
  setShowColorSelector,
  showFontSelector,
  setShowFontSelector,
  showBackgroundSettings,
  setShowBackgroundSettings,
  showPatternSettings,
  setShowPatternSettings,
  showPageTheme,
  setShowPageTheme,
  showBookTheme,
  setShowBookTheme,
  showImageModal,
  setShowImageModal,
  showBackgroundImageModal,
  setShowBackgroundImageModal,
  showBackgroundImageTemplateSelector,
  setShowBackgroundImageTemplateSelector,
  selectedImageElementId,
  setSelectedImageElementId,
  showQuestionDialog,
  setShowQuestionDialog,
  selectedQuestionElementId,
  setSelectedQuestionElementId,
  activeLinkedElement,
  selectedBackgroundImageId,
  onBackgroundImageSelect,
  onApplyBackgroundImage,
  isBackgroundApplyDisabled,
  isBookChatAvailable = false,
  onOpenBookChat,
  showBookChatPanel = false,
  onCloseBookChat,
  bookChatConversation,
  bookChatLoading = false,
  bookChatError,
  onRetryBookChat,
  bookChatShouldFocusInput = false,
  onChatInputFocused,
  showPagePalette = false,
  setShowPagePalette,
  showBookPalette = false,
  setShowBookPalette,
  showPageLayout = false,
  setShowPageLayout,
  showBookLayout = false,
  setShowBookLayout,
  showPageThemeSelector = false,
  setShowPageThemeSelector,
  showBookThemeSelector = false,
  setShowBookThemeSelector,
  showEditorSettings = false,
  setShowEditorSettings,
  generalSettingsRef
}: ToolSettingsContentProps) {
  const { state, dispatch } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  
  const toolSettings = state.toolSettings || {};
  const activeTool = state.activeTool;
  
  // State for "Apply to entire book" checkbox
  const [applyToEntireBook, setApplyToEntireBook] = useState(false);
  
  const updateToolSetting = (key: string, value: any) => {
    dispatch({
      type: 'UPDATE_TOOL_SETTINGS',
      payload: { tool: activeTool, settings: { [key]: value } }
    });
  };

  const deriveStickerFilePath = (url?: string | null) => {
    if (!url || url.startsWith('data:')) return null;
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\/+/, '');
    } catch {
      return url.replace(/^\/+/, '');
    }
  };

  const buildStickerColorDataUrl = async (element: any, color: string) => {
    const baseUrl = element.stickerOriginalUrl || element.src;
    const stickerFilePath = element.stickerFilePath || deriveStickerFilePath(baseUrl);
    const looksLikeSvg = (stickerFilePath && stickerFilePath.toLowerCase().endsWith('.svg')) || (baseUrl && baseUrl.toLowerCase().endsWith('.svg'));
    if (!baseUrl || (element.stickerFormat && element.stickerFormat === 'pixel') || !looksLikeSvg) {
      return null;
    }

    const cachedSvg = stickerFilePath ? svgRawImports[stickerFilePath] : undefined;
    let svgContent = cachedSvg;

    if (!svgContent && baseUrl && !baseUrl.startsWith('data:')) {
      try {
        const response = await fetch(baseUrl);
        if (response.ok) {
          svgContent = await response.text();
        }
      } catch (error) {
        console.warn('Sticker-SVG konnte nicht geladen werden:', error);
      }
    }

    if (!svgContent) return null;

    const coloredSvg = svgContent.replace(/currentColor/gi, color || '#000000');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloredSvg)}`;
  };

  const applyStickerColor = async (element: any, color: string) => {
    const baseUrl = element.stickerOriginalUrl || element.src;
    const stickerFilePath = element.stickerFilePath || deriveStickerFilePath(baseUrl);
    const updates: Record<string, any> = {
      stickerColor: color,
      stickerOriginalUrl: baseUrl,
    };
    if (stickerFilePath) {
      updates.stickerFilePath = stickerFilePath;
    }

    const coloredUrl = await buildStickerColorDataUrl(
      { ...element, stickerOriginalUrl: baseUrl, stickerFilePath },
      color
    );
    if (coloredUrl) {
      updates.src = coloredUrl;
    }

    updateElementSetting(element.id, updates);
    dispatch({
      type: 'MARK_COLOR_OVERRIDE',
      payload: { elementIds: [element.id], colorProperty: 'stickerColor' }
    });
  };

  const shouldShowPanel = activeTool !== 'pan' && (state.selectedElementIds.length > 0 || activeTool === 'select');

  if (showBookChatPanel) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center mb-3">
          <span className="text-sm font-semibold">Buch-Chat</span>
        </div>
        <div className="flex-1 min-h-0 rounded-lg border border-border/50 bg-muted/40 p-2">
          {bookChatLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Chat wird geladen...
            </div>
          ) : bookChatError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
              <p className="text-sm text-destructive">{bookChatError}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onCloseBookChat?.()}>
                  Schließen
                </Button>
                {onRetryBookChat && (
                  <Button size="sm" onClick={onRetryBookChat}>
                    Erneut versuchen
                  </Button>
                )}
              </div>
            </div>
          ) : bookChatConversation ? (
            <div className="h-full flex flex-col">
              <ChatWindow
                conversationId={bookChatConversation.id}
                conversationMeta={bookChatConversation}
                onMessageSent={() => {}}
                shouldFocusInput={bookChatShouldFocusInput}
                onInputFocused={onChatInputFocused}
                variant="embedded"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
              Kein Chat verfügbar.
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderColorSelectorForTool = (colorType: string) => {
    const settings = toolSettings[activeTool] || {};
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    
    const getColorValue = () => {
      switch (colorType) {
        case 'line-stroke':
        case 'brush-stroke':
        case 'shape-stroke':
          return settings.stroke || '#1f2937';
        case 'shape-fill':
          return settings.fill || 'transparent';
        case 'text-color':
          return settings.fontColor || settings.fill || '#1f2937';
        case 'text-border':
          return settings.borderColor || '#000000';
        case 'text-background':
          return settings.backgroundColor || 'transparent';
        case 'background-color':
          return background.type === 'pattern' ? (background.patternForegroundColor || '#666666') : background.value;
        case 'pattern-background':
          return background.patternBackgroundColor || 'transparent';
        case 'ruled-lines-color':
          return settings.ruledLinesColor || '#1f2937';
        default:
          return '#1f2937';
      }
    };
    
    const getOpacityValue = () => {
      switch (colorType) {
        case 'line-stroke':
        case 'brush-stroke':
          return settings.strokeOpacity || 1;
        case 'shape-stroke':
          return settings.opacity || 1;
        case 'shape-fill':
          return settings.backgroundOpacity || 1;
        case 'text-color':
          return settings.fillOpacity || 1;
        case 'text-border':
          return settings.borderOpacity || 1;
        case 'text-background':
          return settings.backgroundOpacity || 1;
        case 'background-color':
          return background.opacity || 1;
        case 'pattern-background':
          return background.patternBackgroundOpacity || 1;
        case 'ruled-lines-color':
          return 1;
        default:
          return 1;
      }
    };
    
    const handleOpacityChange = (opacity: number) => {
      switch (colorType) {
        case 'line-stroke':
        case 'brush-stroke':
          updateToolSetting('strokeOpacity', opacity);
          break;
        case 'shape-stroke':
          updateToolSetting('opacity', opacity);
          break;
        case 'shape-fill':
          updateToolSetting('backgroundOpacity', opacity);
          break;
        case 'text-color':
          updateToolSetting('fillOpacity', opacity);
          break;
        case 'text-border':
          updateToolSetting('borderOpacity', opacity);
          break;
        case 'text-background':
          updateToolSetting('backgroundOpacity', opacity);
          break;
        case 'background-color': {
          const updateBackground = (updates: Partial<PageBackground>) => {
            const newBackground = { ...background, ...updates };
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { pageIndex: state.activePageIndex, background: newBackground }
            });
          };
          updateBackground({ opacity });
          break;
        }
        case 'pattern-background': {
          const updatePatternBackground = (updates: Partial<PageBackground>) => {
            const newBackground = { ...background, ...updates };
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { pageIndex: state.activePageIndex, background: newBackground }
            });
          };
          updatePatternBackground({ patternBackgroundOpacity: opacity });
          break;
        }
        case 'ruled-lines-color':
          break;
      }
    };
    
    const handleColorChange = (color: string) => {
      const updateBackground = (updates: Partial<PageBackground>) => {
        const newBackground = { ...background, ...updates };
        dispatch({
          type: 'UPDATE_PAGE_BACKGROUND',
          payload: { pageIndex: state.activePageIndex, background: newBackground }
        });
      };
      
      switch (colorType) {
        case 'line-stroke':
        case 'brush-stroke':
        case 'shape-stroke':
          updateToolSetting('stroke', color);
          break;
        case 'shape-fill':
          updateToolSetting('fill', color);
          break;
        case 'text-color':
          updateToolSetting('fontColor', color);
          break;
        case 'text-border':
          updateToolSetting('borderColor', color);
          break;
        case 'text-background':
          updateToolSetting('backgroundColor', color);
          break;
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
        case 'ruled-lines-color':
          updateToolSetting('ruledLinesColor', color);
          break;
        default:
          updateToolSetting('stroke', color);
      }
    };
    
    const hasOpacity = true;
    
    return (
      <ColorSelector
        value={getColorValue()}
        onChange={handleColorChange}
        opacity={hasOpacity ? getOpacityValue() : undefined}
        onOpacityChange={hasOpacity ? handleOpacityChange : undefined}
        favoriteColors={favoriteStrokeColors}
        onAddFavorite={addFavoriteStrokeColor}
        onRemoveFavorite={removeFavoriteStrokeColor}
        onBack={() => setShowColorSelector(null)}
      />
    );
  };

  const updateElementSetting = (elementId: string, updates: Partial<any>) => {
    // Check if this is a color update and mark as override
    const colorProperties = ['stroke', 'fill', 'fontColor', 'borderColor', 'backgroundColor', 'stickerColor'];
    const hasColorUpdate = colorProperties.some(prop => updates[prop] !== undefined);
    
    if (hasColorUpdate) {
      // Mark the color properties as manually overridden
      const colorOverrides = {};
      colorProperties.forEach(prop => {
        if (updates[prop] !== undefined) {
          colorOverrides[prop] = true;
        }
      });
      updates.colorOverrides = { ...updates.colorOverrides, ...colorOverrides };
    }
    
    if (state.selectedGroupedElement) {
      dispatch({
        type: 'UPDATE_GROUPED_ELEMENT',
        payload: {
          groupId: state.selectedGroupedElement.groupId,
          elementId: state.selectedGroupedElement.elementId,
          updates
        }
      });
    } else {
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: elementId, updates }
      });
    }
  };
  
  const renderElementColorSelector = (element: any, colorType: string) => {
    const getColorValue = () => {
      switch (colorType) {
        case 'element-shape-stroke':
          return element.stroke || '#1f2937';
        case 'element-shape-fill':
          return element.fill || 'transparent';
        case 'element-image-frame-stroke':
          return element.stroke || '#1f2937';
        case 'element-sticker-color':
          return element.stickerColor || '#1f2937';
        default:
          return '#1f2937';
      }
    };
    
    const getOpacityValue = () => {
      switch (colorType) {
        case 'element-shape-stroke':
          return element.opacity || element.strokeOpacity || 1;
        case 'element-shape-fill':
          return element.backgroundOpacity || element.opacity || 1;
        case 'element-image-frame-stroke':
          return element.strokeOpacity || 1;
        case 'element-sticker-color':
          return element.imageOpacity !== undefined ? element.imageOpacity : 1;
        default:
          return 1;
      }
    };
    
    const getIsOverridden = () => {
      const overrides = element.colorOverrides || {};
      switch (colorType) {
        case 'element-shape-stroke':
          return overrides.borderColor === true;
        case 'element-shape-fill':
          return overrides.backgroundColor === true;
        case 'element-image-frame-stroke':
          return overrides.stroke === true;
        case 'element-sticker-color':
          return overrides.stickerColor === true;
        default:
          return false;
      }
    };
    
    const handleColorChange = (color: string) => {
      switch (colorType) {
        case 'element-shape-stroke':
          updateElementSetting(element.id, { stroke: color });
          // Mark borderColor as manually overridden
          dispatch({
            type: 'MARK_COLOR_OVERRIDE',
            payload: { elementIds: [element.id], colorProperty: 'borderColor' }
          });
          break;
        case 'element-shape-fill':
          updateElementSetting(element.id, { fill: color });
          // Mark backgroundColor as manually overridden
          dispatch({
            type: 'MARK_COLOR_OVERRIDE',
            payload: { elementIds: [element.id], colorProperty: 'backgroundColor' }
          });
          break;
        case 'element-image-frame-stroke':
          updateElementSetting(element.id, { stroke: color });
          // Mark stroke as manually overridden
          dispatch({
            type: 'MARK_COLOR_OVERRIDE',
            payload: { elementIds: [element.id], colorProperty: 'stroke' }
          });
          break;
        case 'element-sticker-color':
          void applyStickerColor(element, color);
          break;
      }
    };
    
    const handleOpacityChange = (opacity: number) => {
      switch (colorType) {
        case 'element-shape-stroke':
          updateElementSetting(element.id, { opacity });
          break;
        case 'element-shape-fill':
          updateElementSetting(element.id, { backgroundOpacity: opacity });
          break;
        case 'element-image-frame-stroke':
          updateElementSetting(element.id, { borderOpacity: opacity });
          break;
        case 'element-sticker-color':
          updateElementSetting(element.id, { imageOpacity: opacity });
          break;
      }
    };
    
    const handleResetOverride = () => {
      let colorProperty: string;
      const updates: Record<string, any> = {};
      switch (colorType) {
        case 'element-shape-stroke':
        case 'element-image-frame-stroke':
          colorProperty = 'stroke';
          break;
        case 'element-shape-fill':
          colorProperty = 'fill';
          break;
        case 'element-sticker-color':
          colorProperty = 'stickerColor';
          updates.stickerColor = undefined;
          if (element.stickerOriginalUrl) {
            updates.src = element.stickerOriginalUrl;
          }
          break;
        default:
          colorProperty = 'stroke';
      }

      if (Object.keys(updates).length > 0) {
        updateElementSetting(element.id, updates);
      }

      dispatch({
        type: 'RESET_COLOR_OVERRIDES',
        payload: { elementIds: [element.id], colorProperties: [colorProperty] }
      });
    };
    
    return (
      <ColorSelector
        value={getColorValue()}
        onChange={handleColorChange}
        opacity={getOpacityValue()}
        onOpacityChange={handleOpacityChange}
        favoriteColors={favoriteStrokeColors}
        onAddFavorite={addFavoriteStrokeColor}
        onRemoveFavorite={removeFavoriteStrokeColor}
        onBack={() => setShowColorSelector(null)}
        isOverridden={getIsOverridden()}
        onResetOverride={handleResetOverride}
        showOpacitySlider={colorType !== 'element-sticker-color'}
      />
    );
  };

  const renderToolSettings = () => {
    if (showColorSelector && !showColorSelector.startsWith('element-')) {
      return renderColorSelectorForTool(showColorSelector);
    }
    
    // Handle element-specific color selectors
    if (showColorSelector && showColorSelector.startsWith('element-') && state.selectedElementIds.length === 1 && state.currentBook) {
      const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
        el => el.id === state.selectedElementIds[0]
      );
      
      if (selectedElement) {
        // Special handling for QnA elements - render ColorSelector directly
        if (selectedElement.textType === 'qna') {
          
          const getColorValue = () => {
            switch (showColorSelector) {
              case 'element-text-color':
                const activeSection = state.qnaActiveSection || 'question';
                if (activeSection === 'question') {
                  return selectedElement.questionSettings?.fontColor || '#666666';
                } else {
                  return selectedElement.answerSettings?.fontColor || '#1f2937';
                }
              case 'element-border-color':
                return selectedElement.borderColor || '#000000';
              case 'element-background-color':
                return selectedElement.backgroundColor || '#ffffff';
              case 'element-ruled-lines-color':
                return selectedElement.ruledLinesColor || '#1f2937';
              default:
                return '#1f2937';
            }
          };
          
          const getOpacityValue = () => {
            switch (showColorSelector) {
              case 'element-text-color':
                const activeSection = state.qnaActiveSection || 'question';
                if (activeSection === 'question') {
                  return selectedElement.questionSettings?.fontOpacity ?? 1;
                } else {
                  return selectedElement.answerSettings?.fontOpacity ?? 1;
                }
              case 'element-border-color':
                return selectedElement.borderOpacity ?? 1;
              case 'element-background-color':
                return selectedElement.backgroundOpacity ?? 1;
              case 'element-ruled-lines-color':
                return selectedElement.ruledLinesOpacity ?? 1;
              default:
                return 1;
            }
          };
          
          const handleColorChange = (color: string) => {
            const colorValue = color || '#000000';
            const activeSection = state.qnaActiveSection || 'question';
            
            switch (showColorSelector) {
              case 'element-text-color':
                if (activeSection === 'question') {
                  updateElementSetting(selectedElement.id, {
                    questionSettings: {
                      ...selectedElement.questionSettings,
                      fontColor: colorValue
                    }
                  });
                } else {
                  updateElementSetting(selectedElement.id, {
                    answerSettings: {
                      ...selectedElement.answerSettings,
                      fontColor: colorValue
                    }
                  });
                }
                break;
              case 'element-border-color':
                updateElementSetting(selectedElement.id, { borderColor: colorValue });
                break;
              case 'element-background-color':
                updateElementSetting(selectedElement.id, { backgroundColor: colorValue });
                break;
              case 'element-ruled-lines-color':
                updateElementSetting(selectedElement.id, { ruledLinesColor: colorValue });
                break;
            }
          };
          
          const handleOpacityChange = (opacity: number) => {
            const activeSection = state.qnaActiveSection || 'question';
            
            switch (showColorSelector) {
              case 'element-text-color':
                if (activeSection === 'question') {
                  updateElementSetting(selectedElement.id, {
                    questionSettings: {
                      ...selectedElement.questionSettings,
                      fontOpacity: opacity
                    }
                  });
                } else {
                  updateElementSetting(selectedElement.id, {
                    answerSettings: {
                      ...selectedElement.answerSettings,
                      fontOpacity: opacity
                    }
                  });
                }
                break;
              case 'element-border-color':
                updateElementSetting(selectedElement.id, { borderOpacity: opacity });
                break;
              case 'element-background-color':
                updateElementSetting(selectedElement.id, { backgroundOpacity: opacity });
                break;
              case 'element-ruled-lines-color':
                updateElementSetting(selectedElement.id, { ruledLinesOpacity: opacity });
                break;
            }
          };
          
          return (
            <ColorSelector
              value={getColorValue()}
              onChange={handleColorChange}
              opacity={getOpacityValue()}
              onOpacityChange={handleOpacityChange}
              favoriteColors={favoriteStrokeColors}
              onAddFavorite={addFavoriteStrokeColor}
              onRemoveFavorite={removeFavoriteStrokeColor}
              onBack={() => setShowColorSelector(null)}
              showOpacitySlider={showColorSelector === 'element-text-color' || showColorSelector === 'element-border-color' || showColorSelector === 'element-background-color'}
            />
          );
        }
        
        return renderElementColorSelector(selectedElement, showColorSelector);
      }
    }
    

    // If multiple elements are selected (not linked pair), show selection list
    if (state.selectedElementIds.length > 1 && state.currentBook) {
      const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
        el => state.selectedElementIds.includes(el.id)
      ) || [];
      
      return (
        <div className="space-y-1">
          <div className="text-xs font-medium mb-2">Selected Items ({selectedElements.length})</div>
          {selectedElements.map((element) => {
            const elementType = element.type === 'text' && element.textType 
              ? element.textType 
              : element.type;
            const IconComponent = TOOL_ICONS[elementType as keyof typeof TOOL_ICONS];
            return (
              <div 
                key={element.id} 
                className="flex items-center gap-1 p-1 bg-muted rounded text-xs cursor-pointer hover:bg-muted/80"
                onClick={() => dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] })}
              >
                {IconComponent && <IconComponent className="h-3 w-3" />}
                <span>{elementType.charAt(0).toUpperCase() + elementType.slice(1)}</span>
                {element.text && (
                  <span className="text-muted-foreground truncate max-w-20">
                    - {element.text.length > 15 ? element.text.substring(0, 15) + '...' : element.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    
    // If single element is selected, show settings for that element
    if (state.selectedElementIds.length === 1 && state.currentBook) {
      let selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
        el => el.id === state.selectedElementIds[0]
      );
      
      // If a grouped element is selected, show that element's settings
      if (state.selectedGroupedElement && selectedElement?.groupedElements) {
        const parentElement = selectedElement;
        selectedElement = selectedElement.groupedElements.find(
          el => el.id === state.selectedGroupedElement.elementId
        );
        
        // Show individual grouped element settings
        if (selectedElement) {
          return (
            <div className="space-y-2">
              {renderElementSettings(selectedElement)}
            </div>
          );
        }
      }
      
      if (selectedElement) {
        // Special handling for grouped elements (including brush-multicolor)
        if ((selectedElement.type === 'group' || selectedElement.type === 'brush-multicolor') && selectedElement.groupedElements) {
          // If brush-multicolor has only one item, show individual brush settings
          if (selectedElement.type === 'brush-multicolor' && selectedElement.groupedElements.length === 1) {
            const singleBrush = selectedElement.groupedElements[0];
            
            // Show color selector if requested
            if (showColorSelector === 'element-brush-stroke') {
              return (
                <ColorSelector
                  value={singleBrush.stroke || '#1f2937'}
                  onChange={(color) => {
                    dispatch({
                      type: 'UPDATE_GROUPED_ELEMENT',
                      payload: {
                        groupId: selectedElement.id,
                        elementId: singleBrush.id,
                        updates: { stroke: color }
                      }
                    });
                  }}
                  opacity={(singleBrush as any).strokeOpacity || 1}
                  onOpacityChange={(opacity) => {
                    dispatch({
                      type: 'UPDATE_GROUPED_ELEMENT',
                      payload: {
                        groupId: selectedElement.id,
                        elementId: singleBrush.id,
                        updates: { strokeOpacity: opacity } as any
                      }
                    });
                  }}
                  favoriteColors={favoriteStrokeColors}
                  onAddFavorite={addFavoriteStrokeColor}
                  onRemoveFavorite={removeFavoriteStrokeColor}
                  onBack={() => setShowColorSelector(null)}
                />
              );
            }
            
            return (
              <div className="space-y-2">
                <Slider
                  label="Stroke Size"
                  value={Math.round(singleBrush.strokeWidth || 2)}
                  displayValue={Math.round(singleBrush.strokeWidth || 2)}
                  onChange={(value) => {
                    dispatch({
                      type: 'UPDATE_GROUPED_ELEMENT',
                      payload: {
                        groupId: selectedElement.id,
                        elementId: singleBrush.id,
                        updates: { 
                          strokeWidth: value,
                          originalStrokeWidth: (singleBrush as any).originalStrokeWidth || value
                        }
                      }
                    });
                  }}
                  min={1}
                  max={100}
                />
                
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowColorSelector('element-brush-stroke')}
                  className="w-full"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Brush Color
                </Button>
                
                <Slider
                  label="Brush Opacity"
                  value={Math.round(((singleBrush as any).strokeOpacity || 1) * 100)}
                  onChange={(value) => {
                    dispatch({
                      type: 'UPDATE_GROUPED_ELEMENT',
                      payload: {
                        groupId: selectedElement.id,
                        elementId: singleBrush.id,
                        updates: { strokeOpacity: value / 100 } as any
                      }
                    });
                  }}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                />
              </div>
            );
          }
          
          const brushElements = selectedElement.groupedElements.filter(el => el.type === 'brush');
          const hasBrushElements = brushElements.length > 0;
          
          // Calculate current relative scale from smallest brush
          const minStrokeWidth = hasBrushElements ? Math.min(...brushElements.map(el => (el as any).strokeWidth || 2)) : 2;
          const maxPossibleScale = Math.floor((100 / minStrokeWidth) * 100);
          const currentScale = hasBrushElements ? Math.round(((brushElements[0] as any).strokeWidth || 2) / ((brushElements[0] as any).originalStrokeWidth || (brushElements[0] as any).strokeWidth || 2) * 100) : 100;
          
          return (
            <div className="space-y-1">
              {hasBrushElements && (
                <>
                  <div className="text-xs font-medium mb-2">Brush Size</div>
                  <Slider
                    label="Relative Brush Size"
                    value={currentScale}
                    displayValue={currentScale}
                    onChange={(value) => {
                      const scaleFactor = value / 100;
                      brushElements.forEach(brushEl => {
                        const originalWidth = (brushEl as any).originalStrokeWidth || (brushEl as any).strokeWidth || 2;
                        const newWidth = Math.max(0.5, originalWidth * scaleFactor);
                        dispatch({
                          type: 'UPDATE_GROUPED_ELEMENT',
                          payload: {
                            groupId: selectedElement.id,
                            elementId: brushEl.id,
                            updates: { 
                              strokeWidth: newWidth,
                              originalStrokeWidth: originalWidth
                            }
                          }
                        });
                      });
                    }}
                    min={10}
                    max={Math.min(300, maxPossibleScale)}
                    step={5}
                  />
                  <Separator />
                </>
              )}
              <div className="text-xs font-medium mb-2">Grouped Items ({selectedElement.groupedElements.length})</div>
              {selectedElement.groupedElements.map((element) => {
                const elementType = element.type === 'text' && element.textType 
                  ? element.textType 
                  : element.type;
                const IconComponent = TOOL_ICONS[elementType as keyof typeof TOOL_ICONS];
                return (
                  <div 
                    key={element.id} 
                    className="flex items-center gap-1 p-1 bg-muted rounded text-xs cursor-pointer hover:bg-muted/80"
                    onMouseEnter={() => dispatch({ type: 'SET_HOVERED_ELEMENT', payload: element.id })}
                    onMouseLeave={() => dispatch({ type: 'SET_HOVERED_ELEMENT', payload: null })}
                    onClick={() => {
                      dispatch({ 
                        type: 'SELECT_GROUPED_ELEMENT', 
                        payload: { 
                          groupId: selectedElement.id, 
                          elementId: element.id 
                        } 
                      });
                    }}
                  >
                    {IconComponent && <IconComponent className="h-3 w-3" />}
                    <span>{elementType.charAt(0).toUpperCase() + elementType.slice(1)}</span>
                    {element.text && (
                      <span className="text-muted-foreground truncate max-w-20">
                        - {element.text.length > 15 ? element.text.substring(0, 15) + '...' : element.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        // Handle QnA textboxes
        if (selectedElement.textType === 'qna') {
          const activeSection = state.qnaActiveSection;
          const setActiveSection = (section: 'question' | 'answer') => {
            dispatch({ type: 'SET_QNA_ACTIVE_SECTION', payload: section });
          };
          
          const individualSettings = selectedElement.qnaIndividualSettings ?? false;
          
          // Get tool defaults for fallback values
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
          const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
          const pageLayoutTemplateId = currentPage?.layoutTemplateId;
          const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
          const pageColorPaletteId = currentPage?.colorPaletteId;
          const bookColorPaletteId = state.currentBook?.colorPaletteId;
          const activeTheme = pageTheme || bookTheme || 'default';
          const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
          const toolDefaults = getGlobalThemeDefaults(activeTheme, 'qna', effectivePaletteId);
          
          const updateQuestionSetting = (key: string, value: any) => {
            const updates = {
              questionSettings: {
                ...selectedElement.questionSettings,
                [key]: value
              }
            };
            updateElementSetting(selectedElement.id, updates);
          };
          
          const updateAnswerSetting = (key: string, value: any) => {
            const updates = {
              answerSettings: {
                ...selectedElement.answerSettings,
                [key]: value
              }
            };
            updateElementSetting(selectedElement.id, updates);
          };
          
          return (
            <div className="space-y-2">
              {/* <div className="text-xs font-medium mb-2">QnA Inline Textbox</div> */}
              <QnASettingsForm
                sectionType="shared"
                element={selectedElement}
                state={state}
                currentStyle={{
                  fontSize: selectedElement.questionSettings?.fontSize ?? selectedElement.answerSettings?.fontSize ?? toolDefaults.answerSettings?.fontSize ?? toolDefaults.fontSize ?? 50,
                  fontFamily: selectedElement.questionSettings?.fontFamily || selectedElement.answerSettings?.fontFamily || toolDefaults.answerSettings?.fontFamily || toolDefaults.fontFamily || 'Arial, sans-serif',
                  fontBold: selectedElement.questionSettings?.fontBold ?? selectedElement.answerSettings?.fontBold ?? toolDefaults.answerSettings?.fontBold ?? false,
                  fontItalic: selectedElement.questionSettings?.fontItalic ?? selectedElement.answerSettings?.fontItalic ?? toolDefaults.answerSettings?.fontItalic ?? false,
                  fontColor: selectedElement.questionSettings?.fontColor || selectedElement.answerSettings?.fontColor || toolDefaults.answerSettings?.fontColor || toolDefaults.fontColor || '#1f2937',
                  fontOpacity: selectedElement.questionSettings?.fontOpacity ?? selectedElement.answerSettings?.fontOpacity ?? toolDefaults.answerSettings?.fontOpacity ?? 1
                }}
                updateSetting={(key: string, value: any) => {
                  updateQuestionSetting(key, value);
                  updateAnswerSetting(key, value);
                }}
                setShowFontSelector={setShowFontSelector}
                setShowColorSelector={setShowColorSelector}
                showLayoutControls={true}
                individualSettings={individualSettings}
                onIndividualSettingsChange={(enabled: boolean) => {
                  const updates: any = { qnaIndividualSettings: enabled };
                  updateElementSetting(selectedElement.id, updates);
                }}
                activeSection={activeSection}
                onActiveSectionChange={setActiveSection}
                updateQuestionSetting={updateQuestionSetting}
                updateAnswerSetting={updateAnswerSetting}
                showFontSelector={showFontSelector}
                showColorSelector={showColorSelector}
              />
            </div>
          );
        }
        return renderElementSettings(selectedElement);
      }
    }
    
    // Show general settings when select tool is active and no elements selected
    if (activeTool === 'select' && state.selectedElementIds.length === 0) {
      return (
        <GeneralSettings
          ref={generalSettingsRef}
          showColorSelector={showColorSelector}
          setShowColorSelector={setShowColorSelector}
          showBackgroundSettings={showBackgroundSettings}
          setShowBackgroundSettings={setShowBackgroundSettings}
          showPatternSettings={showPatternSettings}
          setShowPatternSettings={setShowPatternSettings}
          showPageTheme={showPageTheme}
          setShowPageTheme={setShowPageTheme}
          showBookTheme={showBookTheme}
          setShowBookTheme={setShowBookTheme}
          setShowBackgroundImageModal={setShowBackgroundImageModal}
          showBackgroundImageTemplateSelector={showBackgroundImageTemplateSelector}
          setShowBackgroundImageTemplateSelector={setShowBackgroundImageTemplateSelector}
          selectedBackgroundImageId={selectedBackgroundImageId}
          onBackgroundImageSelect={onBackgroundImageSelect}
          onApplyBackgroundImage={onApplyBackgroundImage}
          isBackgroundApplyDisabled={isBackgroundApplyDisabled}
          isBookChatAvailable={isBookChatAvailable}
          onOpenBookChat={onOpenBookChat}
          showPagePalette={showPagePalette}
          setShowPagePalette={setShowPagePalette}
          showBookPalette={showBookPalette}
          setShowBookPalette={setShowBookPalette}
          showPageLayout={showPageLayout}
          setShowPageLayout={setShowPageLayout}
          showBookLayout={showBookLayout}
          setShowBookLayout={setShowBookLayout}
          showPageThemeSelector={showPageThemeSelector}
          setShowPageThemeSelector={setShowPageThemeSelector}
          showBookThemeSelector={showBookThemeSelector}
          setShowBookThemeSelector={setShowBookThemeSelector}
          showEditorSettings={showEditorSettings}
          setShowEditorSettings={setShowEditorSettings}
          onOpenTemplates={() => {}}
          onOpenLayouts={() => {}}
          onOpenThemes={() => {}}
          onOpenPalettes={() => {}}
        />
      );
    }
    
    return (
      <div className="text-sm text-muted-foreground">
        Select an element to view settings.
      </div>
    );
  };






  

  

  


  const renderElementSettings = (element: any) => {
    const updateElementSettingLocal = (key: string, value: any) => {
      updateElementSetting(element.id, { [key]: value });
    };

    switch (element.type) {
      case 'brush':
      case 'line':
      case 'rect':
      case 'circle':
      case 'triangle':
      case 'polygon':
      case 'heart':
      case 'star':
      case 'speech-bubble':
      case 'dog':
      case 'cat':
      case 'smiley':
        return (
          <ShapeSettingsForm
            element={element}
            updateSetting={updateElementSettingLocal}
            setShowColorSelector={setShowColorSelector}
          />
        );

      case 'image':
      case 'placeholder':
        return (
          <ImageSettingsForm
            element={element}
            updateSetting={updateElementSettingLocal}
            updateSettings={(updates) => updateElementSetting(element.id, updates)}
            setSelectedImageElementId={setSelectedImageElementId}
            setShowImageModal={setShowImageModal}
            setShowColorSelector={setShowColorSelector}
          />
        );

      case 'sticker':
        return (
          <StickerSettingsForm
            element={element}
            updateElementSettingLocal={updateElementSettingLocal}
            setShowColorSelector={setShowColorSelector}
          />
        );

      case 'text': {
        // Create a style object compatible with FreeTextSettingsForm
        const textStyle = {
          fontFamily: getFontFamily(element),
          fontSize: getFontSize(element),
          fontBold: element.font?.fontBold || element.fontWeight === 'bold',
          fontItalic: element.font?.fontItalic || element.fontStyle === 'italic',
          fontColor: getFontColor(element),
          align: getTextAlign(element),
          paragraphSpacing: getParagraphSpacing(element),
          ruledLines: element.ruledLines?.enabled !== undefined ? element.ruledLines.enabled : (element.ruledLines || false),
          ruledLinesWidth: element.ruledLinesWidth || 0.8,
          ruledLinesTheme: getRuledLinesTheme(element),
          background: {
            enabled: getBackgroundEnabled(element)
          },
          border: {
            enabled: element.border?.enabled !== undefined ? element.border.enabled : getBorderWidth(element) > 0,
            width: getBorderWidth(element),
            theme: getBorderTheme(element)
          },
          cornerRadius: element.cornerRadius || 0,
          padding: getPadding(element)
        };
        
        return (
          <FreeTextSettingsForm
            element={element}
            state={state}
            currentStyle={textStyle}
            updateSetting={updateElementSettingLocal}
            setShowFontSelector={setShowFontSelector}
            setShowColorSelector={setShowColorSelector}
            showFontSelector={showFontSelector}
            showColorSelector={showColorSelector}
          />
        );
      }

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No settings available for this element.
          </div>
        );
    }
  };



  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 min-h-0">
        {shouldShowPanel ? renderToolSettings() : (
          <div className="text-xs text-muted-foreground">
            Select a tool or element to view settings.
          </div>
        )}
      </div>
    </div>
  );
}