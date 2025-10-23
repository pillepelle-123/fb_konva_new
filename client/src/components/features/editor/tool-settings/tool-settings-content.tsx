import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { SquareMousePointer, Hand, MessageCircle, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile, AlignLeft, AlignCenter, AlignRight, AlignJustify, Rows4, Rows3, Rows2, Palette, Type, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { QuestionPositionTop, QuestionPositionBottom, QuestionPositionLeft, QuestionPositionRight } from '../../../ui/icons/question-position-icons';
import { ButtonGroup } from '../../../ui/composites/button-group';
import type { PageBackground } from '../../../../context/editor-context';
import { ThemeSelect } from '../../../../utils/theme-options';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { IndentedSection } from '../../../ui/primitives/indented-section';
// import { getThemeDefaults } from '../../../../utils/XX_DELETE_theme-defaults';
import { useAuth } from '../../../../context/auth-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { GeneralSettings } from './general-settings';
import { commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth } from '../../../../utils/stroke-width-converter';
import { actualToCommon, commonToActual, COMMON_FONT_SIZE_RANGE } from '../../../../utils/font-size-converter';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getFontFamily as getFontFamilyByName, FONT_GROUPS, hasBoldVariant, hasItalicVariant } from '../../../../utils/font-families';
import { FontSelector } from './font-selector';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getRuledLinesOpacity } from '../../../../utils/ruled-lines-utils';
import { getBorderWidth, getBorderColor, getBorderOpacity, getBorderTheme } from '../../../../utils/border-utils';
import { getFontSize, getFontColor, getFontFamily, getFontWeight, getFontStyle } from '../../../../utils/font-utils';
import { getBackgroundColor, getBackgroundOpacity, getBackgroundEnabled } from '../../../../utils/background-utils';
import { getTextAlign, getParagraphSpacing, getPadding, getFormatConfig } from '../../../../utils/format-utils';
import { getElementTheme, getRuledLinesTheme } from '../../../../utils/theme-utils';

const getEffectiveFontFamily = (element: any, state: any) => {
  // First check element's explicit font
  let fontFamily = getFontFamily(element);
  
  // If no explicit font, get from theme defaults (page theme, book theme, or element theme)
  if (fontFamily === 'Arial, sans-serif') {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const elementTheme = element.theme;
    const activeTheme = pageTheme || bookTheme || elementTheme;
    
    if (activeTheme) {
      const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || 'text');
      fontFamily = themeDefaults?.font?.fontFamily || themeDefaults?.fontFamily;
    }
  }
  
  return fontFamily;
};

const getCurrentFontName = (element: any, state: any) => {
  const fontFamily = getEffectiveFontFamily(element, state);
  
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => 
      f.family === fontFamily || 
      f.bold === fontFamily || 
      f.italic === fontFamily
    );
    if (font) return font.name;
  }
  
  return "Arial";
};

const isFontBold = (element: any, state: any) => {
  const fontFamily = getEffectiveFontFamily(element, state);
  
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => f.bold === fontFamily);
    if (font) return true;
  }
  
  return false;
};

const isFontItalic = (element: any, state: any) => {
  const fontFamily = getEffectiveFontFamily(element, state);
  
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => f.italic === fontFamily);
    if (font) return true;
  }
  
  return false;
};

const TOOL_ICONS = {
  select: SquareMousePointer,
  pan: Hand,
  text: MessageCircle,
  question: MessageCircleQuestion,
  answer: MessageCircleHeart,
  qna: MessageSquare,
  image: Image,
  line: Minus,
  circle: Circle,
  rect: Square,
  brush: Paintbrush,
  heart: Heart,
  star: Star,
  'speech-bubble': MessageSquare,
  dog: Dog,
  cat: Cat,
  smiley: Smile
};

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
  selectedImageElementId: string | null;
  setSelectedImageElementId: (value: string | null) => void;
  showQuestionDialog: boolean;
  setShowQuestionDialog: (value: boolean) => void;
  selectedQuestionElementId: string | null;
  setSelectedQuestionElementId: (value: string | null) => void;
  activeLinkedElement: string | null;
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
  selectedImageElementId,
  setSelectedImageElementId,
  showQuestionDialog,
  setShowQuestionDialog,
  selectedQuestionElementId,
  setSelectedQuestionElementId,
  activeLinkedElement
}: ToolSettingsContentProps) {
  const { state, dispatch } = useEditor();
  const { user } = useAuth();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  
  const toolSettings = state.toolSettings || {};
  const activeTool = state.activeTool;
  
  const updateToolSetting = (key: string, value: any) => {
    dispatch({
      type: 'UPDATE_TOOL_SETTINGS',
      payload: { tool: activeTool, settings: { [key]: value } }
    });
  };

  const shouldShowPanel = activeTool !== 'pan' && (state.selectedElementIds.length > 0 || activeTool === 'select');

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
          return settings.fillOpacity || 1;
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
          updateToolSetting('fillOpacity', opacity);
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
        case 'background-color':
          const updateBackground = (updates: Partial<PageBackground>) => {
            const newBackground = { ...background, ...updates };
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { pageIndex: state.activePageIndex, background: newBackground }
            });
          };
          updateBackground({ opacity });
          break;
        case 'pattern-background':
          const updatePatternBackground = (updates: Partial<PageBackground>) => {
            const newBackground = { ...background, ...updates };
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { pageIndex: state.activePageIndex, background: newBackground }
            });
          };
          updatePatternBackground({ patternBackgroundOpacity: opacity });
          break;
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

  const renderToolSettings = () => {
    if (showColorSelector && !showColorSelector.startsWith('element-')) {
      return renderColorSelectorForTool(showColorSelector);
    }
    
    // Check if we have linked question-answer pair selected
    if (state.selectedElementIds.length === 2 && state.currentBook) {
      const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
        el => state.selectedElementIds.includes(el.id)
      ) || [];
      
      const questionElement = selectedElements.find(el => el.textType === 'question');
      const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);
      
      if (questionElement && answerElement) {
        return renderQuestionAnswerPairSettings(questionElement, answerElement);
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
          {selectedElements.map((element, index) => {
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
      const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
        el => el.id === state.selectedElementIds[0]
      );
      
      if (selectedElement) {
        // console.log('Selected element type:', selectedElement.type, 'textType:', selectedElement.textType);
        return renderElementSettings(selectedElement);
      }
    }
    
    // Show general settings when select tool is active and no elements selected
    if (activeTool === 'select' && state.selectedElementIds.length === 0) {
      return (
        <GeneralSettings
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
        />
      );
    }
    
    return (
      <div className="text-sm text-muted-foreground">
        Select an element to view settings.
      </div>
    );
  };



  const getMaxStrokeWidth = () => {
    return getMaxCommonWidth(); // Always 100 for common scale
  };

  const renderQuestionAnswerPairSettings = (questionElement: any, answerElement: any) => {
    const updateBothElements = (key: string, value: any) => {
      dispatch({ type: 'SAVE_TO_HISTORY', payload: `Update Question-Answer ${key}` });
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: questionElement.id, updates: { [key]: value } }
      });
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: answerElement.id, updates: { [key]: value } }
      });
    };

    const repositionQuestionAnswer = (question: any, answer: any, position: 'top' | 'bottom' | 'left' | 'right') => {
      const gap = 10; // Gap between question and answer
      
      let questionUpdates: any = {};
      let answerUpdates: any = {};
      
      switch (position) {
        case 'top':
          // Question above answer
          questionUpdates = {
            x: answer.x,
            y: answer.y - question.height - gap
          };
          break;
        case 'bottom':
          // Question below answer
          questionUpdates = {
            x: answer.x,
            y: answer.y + answer.height + gap
          };
          break;
        case 'left':
          // Question to the left of answer
          questionUpdates = {
            x: answer.x - question.width - gap,
            y: answer.y
          };
          break;
        case 'right':
          // Question to the right of answer
          questionUpdates = {
            x: answer.x + answer.width + gap,
            y: answer.y
          };
          break;
      }
      
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: question.id, updates: questionUpdates }
      });
    };

    // Use question element as reference for shared settings
    const element = questionElement;

    if (showFontSelector) {
      return (
        <FontSelector
          currentFont={getFontFamily(element)}
          isBold={element.font?.fontBold || element.fontWeight === 'bold'}
          isItalic={element.font?.fontItalic || element.fontStyle === 'italic'}
          onFontSelect={(fontName) => {
            const fontFamily = getFontFamilyByName(fontName, false, false);
            if (element.font) {
              updateBothElements('font', { ...element.font, fontFamily });
            } else {
              updateBothElements('fontFamily', fontFamily);
            }
          }}
          onBack={() => setShowFontSelector(false)}
          element={element}
          state={state}
        />
      );
    }

    if (showColorSelector && showColorSelector.startsWith('element-')) {
      const getColorValue = () => {
        switch (showColorSelector) {
          case 'element-text-color':
            return getFontColor(element);
          case 'element-text-border':
            return getBorderColor(element);
          case 'element-text-background':
            return getBackgroundColor(element);
          case 'element-ruled-lines-color':
            return element.ruledLinesColor || '#1f2937';
          default:
            return '#1f2937';
        }
      };
      
      const getElementOpacityValue = () => {
        switch (showColorSelector) {
          case 'element-text-color':
            return element.font?.fontOpacity ?? element.fontColorOpacity ?? element.fillOpacity ?? 1;
          case 'element-text-border':
            return getBorderOpacity(element);
          case 'element-text-background':
            return getBackgroundOpacity(element);
          case 'element-ruled-lines-color':
            return getRuledLinesOpacity(element);
          default:
            return 1;
        }
      };
      
      const handleElementOpacityChange = (opacity: number) => {
        switch (showColorSelector) {
          case 'element-text-color':
            if (element.font) {
              updateBothElements('font', { ...element.font, fontOpacity: opacity });
            }
            updateBothElements('fontColorOpacity', opacity);
            break;
          case 'element-text-border':
            updateBothElements('border', {
              borderWidth: getBorderWidth(element),
              borderColor: getBorderColor(element),
              borderOpacity: opacity,
              borderTheme: getBorderTheme(element)
            });
            updateBothElements('borderOpacity', opacity);
            break;
          case 'element-text-background':
            updateBothElements('background', {
              backgroundColor: getBackgroundColor(element),
              backgroundOpacity: opacity
            });
            updateBothElements('backgroundOpacity', opacity);
            break;
          case 'element-ruled-lines-color':
            updateBothElements('ruledLines', {
              ...element.ruledLines,
              lineColor: element.ruledLines?.lineColor || element.ruledLinesColor || '#1f2937',
              lineOpacity: opacity
            });
            updateBothElements('ruledLinesOpacity', opacity);
            break;
        }
      };
      
      const handleElementColorChange = (color: string) => {
        switch (showColorSelector) {
          case 'element-text-color':
            if (element.font) {
              updateBothElements('font', { ...element.font, fontColor: color });
            }
            updateBothElements('fontColor', color);
            break;
          case 'element-text-border':
            updateBothElements('border', {
              borderWidth: getBorderWidth(element),
              borderColor: color,
              borderOpacity: getBorderOpacity(element),
              borderTheme: getBorderTheme(element)
            });
            updateBothElements('borderColor', color);
            break;
          case 'element-text-background':
            updateBothElements('background', {
              backgroundColor: color,
              backgroundOpacity: getBackgroundOpacity(element)
            });
            updateBothElements('backgroundColor', color);
            break;
          case 'element-ruled-lines-color':
            updateBothElements('ruledLines', {
              ...element.ruledLines,
              lineColor: color,
              lineOpacity: getRuledLinesOpacity(element)
            });
            updateBothElements('ruledLinesColor', color);
            break;
        }
      };
      
      return (
        <ColorSelector
          value={getColorValue()}
          onChange={handleElementColorChange}
          opacity={getElementOpacityValue()}
          onOpacityChange={handleElementOpacityChange}
          favoriteColors={favoriteStrokeColors}
          onAddFavorite={addFavoriteStrokeColor}
          onRemoveFavorite={removeFavoriteStrokeColor}
          onBack={() => setShowColorSelector(null)}
        />
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-xs font-medium mb-2">Question-Answer Pair</div>
        
        <Label variant='xs'>Font</Label>
        <div>
          <div className="flex gap-2">
            <Button
              variant={isFontBold(element, state) ? 'default' : 'outline'}
              size="xs"
              disabled={!hasBoldVariant(getCurrentFontName(element, state))}
              onClick={() => {
                const currentBold = isFontBold(element, state);
                const newBold = !currentBold;
                const currentItalic = isFontItalic(element, state);
                const fontName = getCurrentFontName(element, state);
                const newFontFamily = getFontFamilyByName(fontName, newBold, currentItalic);
                
                if (element.font) {
                  updateBothElements('font', { ...element.font, fontBold: newBold, fontFamily: newFontFamily });
                } else {
                  updateBothElements('fontWeight', newBold ? 'bold' : 'normal');
                  updateBothElements('fontFamily', newFontFamily);
                }
              }}
              className="px-3"
            >
              <strong>B</strong>
            </Button>
            <Button
              variant={isFontItalic(element, state) ? 'default' : 'outline'}
              size="xs"
              disabled={!hasItalicVariant(getCurrentFontName(element, state))}
              onClick={() => {
                const currentItalic = isFontItalic(element, state);
                const newItalic = !currentItalic;
                const currentBold = isFontBold(element, state);
                const fontName = getCurrentFontName(element, state);
                const newFontFamily = getFontFamilyByName(fontName, currentBold, newItalic);
                
                if (element.font) {
                  updateBothElements('font', { ...element.font, fontItalic: newItalic, fontFamily: newFontFamily });
                } else {
                  updateBothElements('fontStyle', newItalic ? 'italic' : 'normal');
                  updateBothElements('fontFamily', newFontFamily);
                }
              }}
              className="px-3"
            >
              <em>I</em>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowFontSelector(true)}
              className="flex-1 justify-start"
              style={{ fontFamily: getEffectiveFontFamily(element, state) }}
            >
              <Type className="h-4 w-4 mr-2" />
              <span className="truncate">{getCurrentFontName(element, state)}</span>
            </Button>
          </div>
        </div>
        <Slider
          label="Size"
          value={actualToCommon((() => {
            let fontSize = getFontSize(element);
            if (fontSize === 16) {
              const currentPage = state.currentBook?.pages[state.activePageIndex];
              const pageTheme = currentPage?.background?.pageTheme;
              const bookTheme = state.currentBook?.bookTheme;
              const elementTheme = element.theme;
              const activeTheme = pageTheme || bookTheme || elementTheme;
              if (activeTheme) {
                const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || 'text');
                fontSize = themeDefaults?.font?.fontSize || 16;
              }
            }
            return fontSize;
          })())}
          onChange={(value) => {
            const newSize = commonToActual(value);
            if (element.font) {
              updateBothElements('font', { ...element.font, fontSize: newSize });
            }
            updateBothElements('fontSize', newSize);
          }}
          min={COMMON_FONT_SIZE_RANGE.min}
          max={COMMON_FONT_SIZE_RANGE.max}
          step={1}
        />
                       
        <div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowColorSelector('element-text-color')}
            className="w-full"
          >
            <Palette className="w-4 mr-2" />
            Text Color
          </Button>
        </div>
        
        <Separator />
                    
        <div className='flex flex-row gap-3'>
          <div className="flex-1">
            <Label variant="xs">Text Align</Label>
            <ButtonGroup className="mt-1 flex flex-row">
              <Button
                variant={getTextAlign(element) === 'left' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  if (element.format) {
                    updateBothElements('format', { ...element.format, align: 'left' });
                  } else {
                    updateBothElements('align', 'left');
                  }
                }}
                className="px-1 h-6 flex-1"
              >
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button
                variant={getTextAlign(element) === 'center' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  if (element.format) {
                    updateBothElements('format', { ...element.format, align: 'center' });
                  } else {
                    updateBothElements('align', 'center');
                  }
                }}
                className="px-1 h-6 flex-1"
              >
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button
                variant={getTextAlign(element) === 'right' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  if (element.format) {
                    updateBothElements('format', { ...element.format, align: 'right' });
                  } else {
                    updateBothElements('align', 'right');
                  }
                }}
                className="px-1 h-6 flex-1"
              >
                <AlignRight className="h-3 w-3" />
              </Button>
              <Button
                variant={getTextAlign(element) === 'justify' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  if (element.format) {
                    updateBothElements('format', { ...element.format, align: 'justify' });
                  } else {
                    updateBothElements('align', 'justify');
                  }
                }}
                className="px-1 h-6 flex-1"
              >
                <AlignJustify className="h-3 w-3" />
              </Button>
            </ButtonGroup>
          </div>
          
          <div className="flex-1">
            <Label variant="xs">Paragraph Spacing</Label>
            <ButtonGroup className="mt-1 flex flex-row">
              <Button
                variant={getParagraphSpacing(element) === 'small' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  if (element.format) {
                    updateBothElements('format', { ...element.format, paragraphSpacing: 'small' });
                  } else {
                    updateBothElements('paragraphSpacing', 'small');
                  }
                }}
                className="px-1 h-6 flex-1"
              >
                <Rows4 className="h-3 w-3" />
              </Button>
              <Button
                variant={getParagraphSpacing(element) === 'medium' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  if (element.format) {
                    updateBothElements('format', { ...element.format, paragraphSpacing: 'medium' });
                  } else {
                    updateBothElements('paragraphSpacing', 'medium');
                  }
                }}
                className="px-1 h-6 flex-1"
              >
                <Rows3 className="h-3 w-3" />
              </Button>
              <Button
                variant={getParagraphSpacing(element) === 'large' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  if (element.format) {
                    updateBothElements('format', { ...element.format, paragraphSpacing: 'large' });
                  } else {
                    updateBothElements('paragraphSpacing', 'large');
                  }
                }}
                className="px-1 h-6 flex-1"
              >
                <Rows2 className="h-3 w-3" />
              </Button>
            </ButtonGroup>
          </div>
        </div>
                    
        <div>
          <Label className="flex items-center gap-1" variant="xs">
            <input
              type="checkbox"
              checked={element.ruledLines?.enabled !== undefined ? element.ruledLines.enabled : (element.ruledLines || false)}
              onChange={(e) => updateBothElements('ruledLines', { ...element.ruledLines, enabled: e.target.checked })}
              className="rounded w-3 h-3"
            />
            Ruled Lines
          </Label>
        </div>
        
        {(element.ruledLines?.enabled !== undefined ? element.ruledLines.enabled : (element.ruledLines || false)) && (
          <IndentedSection>
            <Slider
              label="Line Width"
              value={element.ruledLinesWidth || 0.8}
              onChange={(value) => updateBothElements('ruledLinesWidth', value)}
              min={0.01}
              max={30}
              step={0.1}
            />

            <div>
              <Label variant="xs">Ruled Lines Theme</Label>
              <ThemeSelect 
                value={getRuledLinesTheme(element)}
                onChange={(value) => {
                  updateBothElements('ruledLines', { 
                    enabled: element.ruledLines?.enabled !== undefined ? element.ruledLines.enabled : (element.ruledLines || false),
                    ruledLinesTheme: value,
                    lineWidth: element.ruledLinesWidth || 0.8,
                    lineColor: element.ruledLines?.lineColor || element.ruledLinesColor || '#1f2937',
                    lineOpacity: getRuledLinesOpacity(element)
                  });
                  updateBothElements('ruledLinesTheme', value);
                }}
              />
            </div>
            
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-ruled-lines-color')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Line Color
              </Button>
            </div>
          </IndentedSection>
        )}

        <Separator />
                    
        <div>
          <Label className="flex items-center gap-1" variant="xs">
            <input
              type="checkbox"
              checked={element.border?.enabled !== undefined ? element.border.enabled : getBorderWidth(element) > 0}
              onChange={(e) => {
                const storedWidth = element.border?.originalBorderWidth ?? element.originalBorderWidth ?? getBorderWidth(element);
                const newWidth = e.target.checked ? storedWidth : 0;
                updateBothElements('border', {
                  enabled: e.target.checked,
                  borderWidth: newWidth,
                  originalBorderWidth: storedWidth,
                  borderColor: getBorderColor(element),
                  borderOpacity: getBorderOpacity(element),
                  borderTheme: getBorderTheme(element)
                });
              }}
              className="rounded w-3 h-3"
            />
            Border
          </Label>
        </div>
        
        {(element.border?.enabled !== undefined ? element.border.enabled : getBorderWidth(element) > 0) && (
          <IndentedSection>
            <Slider
              label="Border Width"
              value={actualToCommonStrokeWidth(getBorderWidth(element), getBorderTheme(element))}
              onChange={(value) => {
                const newWidth = commonToActualStrokeWidth(value, getBorderTheme(element));
                updateBothElements('border', {
                  enabled: element.border?.enabled !== undefined ? element.border.enabled : true,
                  borderWidth: newWidth,
                  borderColor: getBorderColor(element),
                  borderOpacity: getBorderOpacity(element),
                  borderTheme: getBorderTheme(element)
                });
              }}
              min={1}
              max={getMaxStrokeWidth()}
            />            
            
            <div>
              <Label variant="xs">Border Theme</Label>
              <ThemeSelect 
                value={getBorderTheme(element)}
                onChange={(value) => {
                  updateBothElements('border', {
                    enabled: element.border?.enabled !== undefined ? element.border.enabled : true,
                    borderWidth: getBorderWidth(element),
                    borderColor: getBorderColor(element),
                    borderOpacity: getBorderOpacity(element),
                    borderTheme: value
                  });
                  updateBothElements('cornerRadius', 0);
                }}
              />
            </div>
            
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-text-border')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Border Color
              </Button>
            </div>
            
            <Slider
              label="Corner Radius"
              value={actualToCommonRadius(element.cornerRadius || 0)}
              onChange={(value) => {
                const newRadius = commonToActualRadius(value);
                updateBothElements('cornerRadius', newRadius);
              }}
              min={COMMON_CORNER_RADIUS_RANGE.min}
              max={COMMON_CORNER_RADIUS_RANGE.max}
              step={1}
            />
          </IndentedSection>
        )}
        
        <div>
          <Label className="flex items-center gap-1" variant="xs">
            <input
              type="checkbox"
              checked={getBackgroundEnabled(element)}
              onChange={(e) => {
                const storedColor = element.background?.originalBackgroundColor ?? element.originalBackgroundColor ?? (getBackgroundColor(element) !== 'transparent' ? getBackgroundColor(element) : '#ffffff');
                const storedOpacity = element.background?.originalBackgroundOpacity ?? element.originalBackgroundOpacity ?? getBackgroundOpacity(element);
                updateBothElements('background', {
                  enabled: e.target.checked,
                  backgroundColor: e.target.checked ? storedColor : 'transparent',
                  backgroundOpacity: storedOpacity,
                  originalBackgroundColor: storedColor,
                  originalBackgroundOpacity: storedOpacity
                });
              }}
              className="rounded w-3 h-3"
            />
            Background
          </Label>
        </div>
        
        {getBackgroundEnabled(element) && (
          <IndentedSection>
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-text-background')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Background Color
              </Button>
            </div>
          </IndentedSection>
        )}
        
        <Separator />
        
        <div>
          <Label variant="xs">Question Position</Label>
          <ButtonGroup className="mt-1">
            <Button
              variant={(questionElement.questionPosition || 'top') === 'top' ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                updateBothElements('questionPosition', 'top');
                repositionQuestionAnswer(questionElement, answerElement, 'top');
              }}
              className="w-8 h-8 p-0"
            >
              <QuestionPositionTop className="w-4 h-4" />
            </Button>
            <Button
              variant={(questionElement.questionPosition || 'top') === 'left' ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                updateBothElements('questionPosition', 'left');
                repositionQuestionAnswer(questionElement, answerElement, 'left');
              }}
              className="w-8 h-8 p-0"
            >
              <QuestionPositionLeft className="w-4 h-4" />
            </Button>
            <Button
              variant={(questionElement.questionPosition || 'top') === 'right' ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                updateBothElements('questionPosition', 'right');
                repositionQuestionAnswer(questionElement, answerElement, 'right');
              }}
              className="w-8 h-8 p-0"
            >
              <QuestionPositionRight className="w-4 h-4" />
            </Button>
            <Button
              variant={(questionElement.questionPosition || 'top') === 'bottom' ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                updateBothElements('questionPosition', 'bottom');
                repositionQuestionAnswer(questionElement, answerElement, 'bottom');
              }}
              className="w-8 h-8 p-0"
            >
              <QuestionPositionBottom className="w-4 h-4" />
            </Button>
          </ButtonGroup>
        </div>
        
        {((element.borderWidth || 0) === 0 || (element.theme !== 'candy' && element.theme !== 'zigzag' && element.theme !== 'wobbly')) && (
          <Slider
            label="Corner Radius"
            value={actualToCommonRadius(element.cornerRadius || 0)}
            onChange={(value) => updateBothElements('cornerRadius', commonToActualRadius(value))}
            min={COMMON_CORNER_RADIUS_RANGE.min}
            max={COMMON_CORNER_RADIUS_RANGE.max}
          />
        )}
        
        <Slider
          label="Padding"
          value={getPadding(element)}
          onChange={(value) => {
            if (element.format) {
              updateBothElements('format', { ...element.format, padding: value });
            } else {
              updateBothElements('padding', value);
            }
          }}
          min={0}
          max={100}
        />
      </div>
    );
  };

  const renderElementSettings = (element: any) => {
    const updateElementSetting = (key: string, value: any) => {
      dispatch({ type: 'SAVE_TO_HISTORY', payload: `Update ${element.type} ${key}` });
      const updates = { [key]: value };

      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: element.id, updates }
      });
    };

    if (showFontSelector && element.type === 'text') {
      return (
        <FontSelector
          currentFont={getFontFamily(element)}
          isBold={element.font?.fontBold || element.fontWeight === 'bold'}
          isItalic={element.font?.fontItalic || element.fontStyle === 'italic'}
          onFontSelect={(fontName) => {
            const fontFamily = getFontFamilyByName(fontName, false, false);
            if (element.font) {
              updateElementSetting('font', { ...element.font, fontFamily });
            }
            updateElementSetting('fontFamily', fontFamily);
          }}
          onBack={() => setShowFontSelector(false)}
          element={element}
          state={state}
        />
      );
    }

    if (showColorSelector && showColorSelector.startsWith('element-')) {
      const getColorValue = () => {
        switch (showColorSelector) {
          case 'element-brush-stroke':
          case 'element-line-stroke':
          case 'element-shape-stroke':
            return element.stroke || '#1f2937';
          case 'element-shape-fill':
            return element.fill !== undefined ? element.fill : 'transparent';
          case 'element-text-color':
            return getFontColor(element);
          case 'element-text-border':
            return getBorderColor(element);
          case 'element-text-background':
            return getBackgroundColor(element);
          case 'element-ruled-lines-color':
            return element.ruledLinesColor || '#1f2937';
          default:
            return '#1f2937';
        }
      };
      
      const getElementOpacityValue = () => {
        switch (showColorSelector) {
          case 'element-brush-stroke':
          case 'element-line-stroke':
            return element.strokeOpacity || 1;
          case 'element-shape-stroke':
            return element.opacity || 1;
          case 'element-shape-fill':
          case 'element-text-color':
            return element.font?.fontOpacity || element.fillOpacity || 1;
          case 'element-text-border':
            return getBorderOpacity(element);
          case 'element-text-background':
            return getBackgroundOpacity(element);
          case 'element-ruled-lines-color':
            return getRuledLinesOpacity(element);
          default:
            return 1;
        }
      };
      
      const handleElementOpacityChange = (opacity: number) => {
        switch (showColorSelector) {
          case 'element-brush-stroke':
          case 'element-line-stroke':
            updateElementSetting('strokeOpacity', opacity);
            break;
          case 'element-shape-stroke':
            updateElementSetting('opacity', opacity);
            break;
          case 'element-shape-fill':
            updateElementSetting('fillOpacity', opacity);
            break;
          case 'element-text-color':
            if (element.font) {
              updateElementSetting('font', { ...element.font, fontOpacity: opacity });
            }
            updateElementSetting('fillOpacity', opacity);
            break;
          case 'element-text-border':
            updateElementSetting('border', {
              borderWidth: getBorderWidth(element),
              borderColor: getBorderColor(element),
              borderOpacity: opacity,
              borderTheme: getBorderTheme(element)
            });
            updateElementSetting('borderOpacity', opacity);
            break;
          case 'element-text-background':
            updateElementSetting('background', {
              backgroundColor: getBackgroundColor(element),
              backgroundOpacity: opacity
            });
            updateElementSetting('backgroundOpacity', opacity);
            break;
          case 'element-ruled-lines-color':
            updateElementSetting('ruledLines', {
              ...element.ruledLines,
              lineColor: element.ruledLines?.lineColor || element.ruledLinesColor || '#1f2937',
              lineOpacity: opacity
            });
            updateElementSetting('ruledLinesOpacity', opacity);
            break;
        }
      };
      
      const handleElementColorChange = (color: string) => {
        switch (showColorSelector) {
          case 'element-brush-stroke':
          case 'element-line-stroke':
          case 'element-shape-stroke':
            updateElementSetting('stroke', color);
            localStorage.setItem(`shape-border-color-${element.id}`, color);
            break;
          case 'element-shape-fill':
            updateElementSetting('fill', color);
            localStorage.setItem(`shape-fill-color-${element.id}`, color);
            break;
          case 'element-text-color':
            if (element.font) {
              updateElementSetting('font', { ...element.font, fontColor: color });
            }
            updateElementSetting('fontColor', color);
            updateElementSetting('fill', color);
            break;
          case 'element-text-border':
            updateElementSetting('border', {
              borderWidth: getBorderWidth(element),
              borderColor: color,
              borderOpacity: getBorderOpacity(element),
              borderTheme: getBorderTheme(element)
            });
            updateElementSetting('borderColor', color);
            break;
          case 'element-text-background':
            updateElementSetting('background', {
              backgroundColor: color,
              backgroundOpacity: getBackgroundOpacity(element)
            });
            updateElementSetting('backgroundColor', color);
            localStorage.setItem(`text-bg-color-${element.id}`, color);
            break;
          case 'element-ruled-lines-color':
            updateElementSetting('ruledLines', {
              ...element.ruledLines,
              lineColor: color,
              lineOpacity: getRuledLinesOpacity(element)
            });
            updateElementSetting('ruledLinesColor', color);
            break;
          default:
            updateElementSetting('stroke', color);
        }
      };
      
      const hasElementOpacity = true;
      
      return (
        <ColorSelector
          value={getColorValue()}
          onChange={handleElementColorChange}
          opacity={showColorSelector === 'element-shape-stroke' || showColorSelector === 'element-shape-fill' ? undefined : (hasElementOpacity ? getElementOpacityValue() : undefined)}
          onOpacityChange={showColorSelector === 'element-shape-stroke' || showColorSelector === 'element-shape-fill' ? undefined : (hasElementOpacity ? handleElementOpacityChange : undefined)}
          favoriteColors={favoriteStrokeColors}
          onAddFavorite={addFavoriteStrokeColor}
          onRemoveFavorite={removeFavoriteStrokeColor}
          onBack={() => setShowColorSelector(null)}
        />
      );
    }

    switch (element.type) {
      case 'brush':
        return (
          <div className="space-y-2">
            <div>
              <Label variant="xs">Theme</Label>
              <ThemeSelect 
                value={getElementTheme(element)}
                onChange={(value) => {
                  updateElementSetting('theme', value);
                  updateElementSetting('inheritTheme', value);
                }}
              />
            </div>
            
            <Separator />

            <Slider
              label="Brush Size"
              value={actualToCommonStrokeWidth(element.strokeWidth || 3, getElementTheme(element))}
              onChange={(value) => updateElementSetting('strokeWidth', commonToActualStrokeWidth(value, getElementTheme(element)))}
              min={1}
              max={getMaxStrokeWidth()}
            />
            
            {element.theme === 'candy' && (
              <div className="flex items-center gap-2 h-12">
                <Label className="flex items-center gap-1" variant="xs">
                  <input
                    type="checkbox"
                    checked={element.candyRandomness || false}
                    onChange={(e) => updateElementSetting('candyRandomness', e.target.checked)}
                    className="rounded w-3 h-3"
                  />
                  Random bubble size
                </Label>
                {element.candyRandomness && (
                  <ButtonGroup>
                    <Button
                      variant={(!element.candyIntensity || element.candyIntensity === 'weak') ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateElementSetting('candyIntensity', 'weak')}
                    >
                      S
                    </Button>
                    <Button
                      variant={element.candyIntensity === 'middle' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateElementSetting('candyIntensity', 'middle')}
                    >
                      M
                    </Button>
                    <Button
                      variant={element.candyIntensity === 'strong' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateElementSetting('candyIntensity', 'strong')}
                    >
                      L
                    </Button>
                  </ButtonGroup>
                )}
              </div>
            )}            
            
            <Separator />
            
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-brush-stroke')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Color
              </Button>
            </div>
          </div>
        );

      case 'line':
        return (
          <div className="space-y-2">
            <div>
              <Label variant="xs">Theme</Label>
              <ThemeSelect 
                value={getElementTheme(element)}
                onChange={(value) => {
                  updateElementSetting('theme', value);
                  updateElementSetting('inheritTheme', value);
                }}
              />
            </div>
            
            <Separator />

            <Slider
              label="Stroke Width"
              value={actualToCommonStrokeWidth(element.strokeWidth || 2, getElementTheme(element))}
              onChange={(value) => updateElementSetting('strokeWidth', commonToActualStrokeWidth(value, getElementTheme(element)))}
              min={1}
              max={getMaxStrokeWidth()}
            />
            
            <Separator />
            
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-line-stroke')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Color
              </Button>
            </div>
          </div>
        );

      case 'rect':
      case 'circle':
      case 'heart':
      case 'star':
      case 'speech-bubble':
      case 'dog':
      case 'cat':
      case 'smiley':
        return (
          <div className="space-y-2">
            <div>
              <Label variant="xs">Theme</Label>
              <ThemeSelect 
                value={getElementTheme(element)}
                onChange={(value) => {
                  updateElementSetting('inheritTheme', value);
                  updateElementSetting('theme', value);
                }}
              />
            </div>
            
            <Separator />
            
            {/* <Slider
              label="Stroke dddd"
              value={element.strokeWidth || 2}
              onChange={(value) => updateElementSetting('strokeWidth', value)}
              min={1}
              max={getMaxStrokeWidth(element.type, element.theme || 'default')}
            /> */}
                        
            <div>
              <Label className="flex items-center gap-1" variant="xs">
                <input
                  type="checkbox"
                  checked={element.borderEnabled !== undefined ? element.borderEnabled : (element.strokeWidth || 0) > 0}
                  onChange={(e) => {
                    updateElementSetting('borderEnabled', e.target.checked);
                    if (e.target.checked) {
                      const lastBorderWidth = localStorage.getItem(`shape-border-width-${element.id}`) || '2';
                      const lastBorderColor = localStorage.getItem(`shape-border-color-${element.id}`) || '#1f2937';
                      updateElementSetting('strokeWidth', Math.max(1, parseInt(lastBorderWidth)));
                      updateElementSetting('stroke', lastBorderColor);
                    } else {
                      if ((element.strokeWidth || 0) > 0) {
                        localStorage.setItem(`shape-border-width-${element.id}`, String(element.strokeWidth));
                      }
                      localStorage.setItem(`shape-border-color-${element.id}`, element.stroke || '#1f2937');
                      updateElementSetting('strokeWidth', 0);
                    }
                  }}
                  className="rounded w-3 h-3"
                />
                Border
              </Label>
            </div>
            
            {(element.borderEnabled !== undefined ? element.borderEnabled : (element.strokeWidth || 0) > 0) && (
              <IndentedSection>
                <Slider
                  label="Border Width"
                  value={actualToCommonStrokeWidth(element.strokeWidth || 0, getElementTheme(element))}
                  onChange={(value) => {
                    const actualWidth = commonToActualStrokeWidth(value, getElementTheme(element));
                    updateElementSetting('strokeWidth', actualWidth);
                    localStorage.setItem(`shape-border-width-${element.id}`, String(actualWidth));
                  }}
                  min={1}
                  max={getMaxStrokeWidth()}
                />
                
                {/* <div>
                  <Label variant="xs">Theme</Label>
                  <ThemeSelect 
                    value={element.inheritTheme || element.theme || 'default'}
                    onChange={(value) => {
                      updateElementSetting('theme', value);
                      updateElementSetting('inheritTheme', value);
                    }}
                  />
                </div> */}
                
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowColorSelector('element-shape-stroke')}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Border Color
                  </Button>
                </div>
              </IndentedSection>
            )}
            
            <div>
              <Label className="flex items-center gap-1" variant="xs">
                <input
                  type="checkbox"
                  checked={element.backgroundEnabled !== undefined ? element.backgroundEnabled : (element.fill !== 'transparent' && element.fill !== undefined)}
                  onChange={(e) => {
                    updateElementSetting('backgroundEnabled', e.target.checked);
                    if (e.target.checked) {
                      const lastFillColor = localStorage.getItem(`shape-fill-color-${element.id}`) || '#ffffff';
                      updateElementSetting('fill', lastFillColor);
                    } else {
                      localStorage.setItem(`shape-fill-color-${element.id}`, element.fill || '#ffffff');
                      updateElementSetting('fill', 'transparent');
                    }
                  }}
                  className="rounded w-3 h-3"
                />
                Background
              </Label>
            </div>
            
            {(element.backgroundEnabled !== undefined ? element.backgroundEnabled : (element.fill !== 'transparent' && element.fill !== undefined)) && (
              <IndentedSection>
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowColorSelector('element-shape-fill')}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Background Color
                  </Button>
                </div>
              </IndentedSection>
            )}
            
            <Slider
              label="Opacity"
              value={Math.round((element.opacity || element.strokeOpacity || 1) * 100)}
              onChange={(value) => updateElementSetting('opacity', value / 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
            />
            
            {element.theme === 'candy' && (
              <div>
                <Separator />
                <div className="flex items-center gap-2 h-12">
                  <Label className="flex items-center gap-1" variant="xs">
                    <input
                      type="checkbox"
                      checked={element.candyRandomness || false}
                      onChange={(e) => updateElementSetting('candyRandomness', e.target.checked)}
                      className="rounded w-3 h-3"
                    />
                    Randomness
                  </Label>
                  {element.candyRandomness && (
                    <ButtonGroup>
                      <Button
                        variant={(!element.candyIntensity || element.candyIntensity === 'weak') ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateElementSetting('candyIntensity', 'weak')}
                      >
                        weak
                      </Button>
                      <Button
                        variant={element.candyIntensity === 'middle' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateElementSetting('candyIntensity', 'middle')}
                      >
                        middle
                      </Button>
                      <Button
                        variant={element.candyIntensity === 'strong' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateElementSetting('candyIntensity', 'strong')}
                      >
                        strong
                      </Button>
                    </ButtonGroup>
                  )}
                </div>
              </div>
            )}
            
            {element.type === 'rect' && (element.theme !== 'candy' && element.theme !== 'zigzag' && element.theme !== 'wobbly') && ( 
              <Slider
                label="Corner Radius"
                value={actualToCommonRadius(element.cornerRadius || 0)}
                onChange={(value) => updateElementSetting('cornerRadius', commonToActualRadius(value))}
                min={COMMON_CORNER_RADIUS_RANGE.min}
                max={COMMON_CORNER_RADIUS_RANGE.max}
              />
            )}
          </div>
        );

      case 'image':
      case 'placeholder':
        return (
          <div className="space-y-2">
            <Slider
              label="Corner Radius"
              value={actualToCommonRadius(element.cornerRadius || 0)}
              onChange={(value) => updateElementSetting('cornerRadius', commonToActualRadius(value))}
              min={COMMON_CORNER_RADIUS_RANGE.min}
              max={COMMON_CORNER_RADIUS_RANGE.max}
            />
            
            <Separator />
            
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setSelectedImageElementId(element.id);
                setShowImageModal(true);
              }}
              className="w-full"
            >
              <Image className="h-4 w-4 mr-2" />
              Change Image
            </Button>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Label variant='xs'>Font</Label>
            <div>
              <div className="flex gap-2">
                <Button
                  variant={isFontBold(element, state) ? 'default' : 'outline'}
                  size="xs"
                  disabled={!hasBoldVariant(getCurrentFontName(element, state))}
                  onClick={() => {
                    const currentBold = isFontBold(element, state);
                    const newBold = !currentBold;
                    const currentItalic = isFontItalic(element, state);
                    const fontName = getCurrentFontName(element, state);
                    const newFontFamily = getFontFamilyByName(fontName, newBold, currentItalic);
                    
                    if (element.font) {
                      updateElementSetting('font', { ...element.font, fontBold: newBold, fontFamily: newFontFamily });
                    } else {
                      updateElementSetting('fontWeight', newBold ? 'bold' : 'normal');
                      updateElementSetting('fontFamily', newFontFamily);
                    }
                  }}
                  className="px-3"
                >
                  <strong>B</strong>
                </Button>
                <Button
                  variant={isFontItalic(element, state) ? 'default' : 'outline'}
                  size="xs"
                  disabled={!hasItalicVariant(getCurrentFontName(element, state))}
                  onClick={() => {
                    const currentItalic = isFontItalic(element, state);
                    const newItalic = !currentItalic;
                    const currentBold = isFontBold(element, state);
                    const fontName = getCurrentFontName(element, state);
                    const newFontFamily = getFontFamilyByName(fontName, currentBold, newItalic);
                    
                    if (element.font) {
                      updateElementSetting('font', { ...element.font, fontItalic: newItalic, fontFamily: newFontFamily });
                    } else {
                      updateElementSetting('fontStyle', newItalic ? 'italic' : 'normal');
                      updateElementSetting('fontFamily', newFontFamily);
                    }
                  }}
                  className="px-3"
                >
                  <em>I</em>
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowFontSelector(true)}
                  className="flex-1 justify-start"
                  style={{ fontFamily: getEffectiveFontFamily(element, state) }}
                >
                  <Type className="h-4 w-4 mr-2" />
                  <span className="truncate">{getCurrentFontName(element, state)}</span>
                </Button>
              </div>
            </div>
            <Slider
              label="Size"
              value={actualToCommon((() => {
                let fontSize = getFontSize(element);
                if (fontSize === 16) {
                  const currentPage = state.currentBook?.pages[state.activePageIndex];
                  const pageTheme = currentPage?.background?.pageTheme;
                  const bookTheme = state.currentBook?.bookTheme;
                  const elementTheme = element.theme;
                  const activeTheme = pageTheme || bookTheme || elementTheme;
                  if (activeTheme) {
                    const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || 'text');
                    fontSize = themeDefaults?.font?.fontSize || 16;
                  }
                }
                return fontSize;
              })())}
              onChange={(value) => {
                const newSize = commonToActual(value);
                if (element.font) {
                  updateElementSetting('font', { ...element.font, fontSize: newSize });
                }
                updateElementSetting('fontSize', newSize);
              }}
              min={COMMON_FONT_SIZE_RANGE.min}
              max={COMMON_FONT_SIZE_RANGE.max}
              step={1}
            />
                           
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-text-color')}
                className="w-full"
              >
                <Palette className="w-4 mr-2" />
                Text Color
              </Button>
            </div>
            
            <Separator />
                        
            <div className='flex flex-row gap-3'>
              <div className="flex-1">
                <Label variant="xs">Text Align</Label>
                <ButtonGroup className="mt-1 flex flex-row">
                  <Button
                    variant={getTextAlign(element) === 'left' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      if (element.format) {
                        updateElementSetting('format', { ...element.format, align: 'left' });
                      }
                      updateElementSetting('align', 'left');
                    }}
                    className="px-1 h-6 flex-1"
                  >
                    <AlignLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={getTextAlign(element) === 'center' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      if (element.format) {
                        updateElementSetting('format', { ...element.format, align: 'center' });
                      }
                      updateElementSetting('align', 'center');
                    }}
                    className="px-1 h-6 flex-1"
                  >
                    <AlignCenter className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={getTextAlign(element) === 'right' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      if (element.format) {
                        updateElementSetting('format', { ...element.format, align: 'right' });
                      }
                      updateElementSetting('align', 'right');
                    }}
                    className="px-1 h-6 flex-1"
                  >
                    <AlignRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={getTextAlign(element) === 'justify' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      if (element.format) {
                        updateElementSetting('format', { ...element.format, align: 'justify' });
                      }
                      updateElementSetting('align', 'justify');
                    }}
                    className="px-1 h-6 flex-1"
                  >
                    <AlignJustify className="h-3 w-3" />
                  </Button>
                </ButtonGroup>
              </div>
              
              <div className="flex-1">
                <Label variant="xs">Paragraph Spacing</Label>
                <ButtonGroup className="mt-1 flex flex-row">
                  <Button
                    variant={getParagraphSpacing(element) === 'small' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      if (element.format) {
                        updateElementSetting('format', { ...element.format, paragraphSpacing: 'small' });
                      }
                      updateElementSetting('paragraphSpacing', 'small');
                    }}
                    className="px-1 h-6 flex-1"
                  >
                    <Rows4 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={getParagraphSpacing(element) === 'medium' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      if (element.format) {
                        updateElementSetting('format', { ...element.format, paragraphSpacing: 'medium' });
                      }
                      updateElementSetting('paragraphSpacing', 'medium');
                    }}
                    className="px-1 h-6 flex-1"
                  >
                    <Rows3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={getParagraphSpacing(element) === 'large' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => {
                      if (element.format) {
                        updateElementSetting('format', { ...element.format, paragraphSpacing: 'large' });
                      }
                      updateElementSetting('paragraphSpacing', 'large');
                    }}
                    className="px-1 h-6 flex-1"
                  >
                    <Rows2 className="h-3 w-3" />
                  </Button>
                </ButtonGroup>
              </div>
            </div>
                        
            <div>
              <Label className="flex items-center gap-1" variant="xs">
                <input
                  type="checkbox"
                  checked={element.ruledLines?.enabled !== undefined ? element.ruledLines.enabled : (element.ruledLines || false)}
                  onChange={(e) => updateElementSetting('ruledLines', { ...element.ruledLines, enabled: e.target.checked })}
                  className="rounded w-3 h-3"
                />
                Ruled Lines
              </Label>
            </div>
            
            {(element.ruledLines?.enabled !== undefined ? element.ruledLines.enabled : (element.ruledLines || false)) && (
              <IndentedSection>
                
                <Slider
                  label="Line Width"
                  value={element.ruledLinesWidth || 0.8}
                  onChange={(value) => updateElementSetting('ruledLinesWidth', value)}
                  min={0.01}
                  max={30}
                  step={0.1}
                />

                <div>
                  <Label variant="xs">Ruled Lines Theme</Label>
                  <ThemeSelect 
                    value={getRuledLinesTheme(element)}
                    onChange={(value) => {
                      updateElementSetting('ruledLines', {
                        enabled: element.ruledLines?.enabled !== undefined ? element.ruledLines.enabled : (element.ruledLines || false),
                        inheritTheme: value,
                        lineWidth: element.ruledLinesWidth || 0.8,
                        lineColor: element.ruledLinesColor || '#1f2937',
                        lineOpacity: 0.5
                      });
                    }}
                  />
                </div>
                
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowColorSelector('element-ruled-lines-color')}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Line Color
                  </Button>
                </div>

              </IndentedSection>
            )}

            <Separator />
                        
            <div>
              <Label className="flex items-center gap-1" variant="xs">
                <input
                  type="checkbox"
                  checked={element.border?.enabled !== undefined ? element.border.enabled : getBorderWidth(element) > 0}
                  onChange={(e) => {
                    const storedWidth = element.border?.originalBorderWidth ?? element.originalBorderWidth ?? getBorderWidth(element);
                    const newWidth = e.target.checked ? storedWidth : 0;
                    updateElementSetting('border', {
                      enabled: e.target.checked,
                      borderWidth: newWidth,
                      originalBorderWidth: storedWidth,
                      borderColor: getBorderColor(element),
                      borderOpacity: getBorderOpacity(element),
                      borderTheme: getBorderTheme(element)
                    });
                  }}
                  className="rounded w-3 h-3"
                />
                Border
              </Label>
            </div>
            
            {(element.border?.enabled !== undefined ? element.border.enabled : getBorderWidth(element) > 0) && (
              <IndentedSection>
                <Slider
                  label="Border Width"
                  value={actualToCommonStrokeWidth(getBorderWidth(element), getBorderTheme(element))}
                  onChange={(value) => {
                    const actualWidth = commonToActualStrokeWidth(value, getBorderTheme(element));
                    updateElementSetting('border', {
                      enabled: element.border?.enabled !== undefined ? element.border.enabled : true,
                      borderWidth: actualWidth,
                      borderColor: getBorderColor(element),
                      borderOpacity: getBorderOpacity(element),
                      borderTheme: getBorderTheme(element)
                    });
                  }}
                  min={1}
                  max={getMaxStrokeWidth()}
                />            

                
                <div>
                  <Label variant="xs">Border Theme</Label>
                  <ThemeSelect 
                    value={getBorderTheme(element)}
                    onChange={(value) => {
                      updateElementSetting('border', {
                        enabled: element.border?.enabled !== undefined ? element.border.enabled : true,
                        borderWidth: getBorderWidth(element),
                        borderColor: getBorderColor(element),
                        borderOpacity: getBorderOpacity(element),
                        borderTheme: value
                      });
                      updateElementSetting('cornerRadius', 0);
                    }}
                  />
                </div>
                
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowColorSelector('element-text-border')}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Border Color
                  </Button>
                </div>
              </IndentedSection>
            )}
            

            <div>
              <Label className="flex items-center gap-1" variant="xs">
                <input
                  type="checkbox"
                  checked={getBackgroundEnabled(element)}
                  onChange={(e) => {
                    const storedColor = element.background?.originalBackgroundColor ?? element.originalBackgroundColor ?? (getBackgroundColor(element) !== 'transparent' ? getBackgroundColor(element) : '#ffffff');
                    const storedOpacity = element.background?.originalBackgroundOpacity ?? element.originalBackgroundOpacity ?? getBackgroundOpacity(element);
                    updateElementSetting('background', {
                      enabled: e.target.checked,
                      backgroundColor: e.target.checked ? storedColor : 'transparent',
                      backgroundOpacity: storedOpacity,
                      originalBackgroundColor: storedColor,
                      originalBackgroundOpacity: storedOpacity
                    });
                  }}
                  className="rounded w-3 h-3"
                />
                Background
              </Label>
            </div>
            
            {getBackgroundEnabled(element) && (
              <IndentedSection>
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowColorSelector('element-text-background')}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Background Color
                  </Button>
                </div>
              </IndentedSection>
            )}
            
            <Separator />

            
            {(element.textType === 'text' || element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna') && ((element.borderWidth || 0) === 0 || (element.theme !== 'candy' && element.theme !== 'zigzag' && element.theme !== 'wobbly')) && (
              <Slider
                label="Corner Radius"
                value={actualToCommonRadius(element.cornerRadius || 0)}
                onChange={(value) => updateElementSetting('cornerRadius', commonToActualRadius(value))}
                min={COMMON_CORNER_RADIUS_RANGE.min}
                max={COMMON_CORNER_RADIUS_RANGE.max}
              />
            )}
            
            <Slider
              label="Padding"
              value={getPadding(element)}
              onChange={(value) => {
                if (element.format) {
                  updateElementSetting('format', { ...element.format, padding: value });
                }
                updateElementSetting('padding', value);
              }}
              min={0}
              max={100}
            />
            
            {element.textType === 'question' && user?.role !== 'author' && (
              <>
                <Separator />
                
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setSelectedQuestionElementId(element.id);
                    setShowQuestionDialog(true);
                  }}
                  className="w-full"
                >
                  Question...
                </Button>
              </>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No settings available for this element.
          </div>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-2 border">
      {shouldShowPanel ? renderToolSettings() : (
        <div className="text-xs text-muted-foreground">
          Select a tool or element to view settings.
        </div>
      )}
    </div>
  );
}