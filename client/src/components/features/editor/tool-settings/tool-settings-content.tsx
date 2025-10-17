import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { MousePointer, Hand, MessageCircleMore, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile, AlignLeft, AlignCenter, AlignRight, AlignJustify, Rows4, Rows3, Rows2, Palette, Type } from 'lucide-react';
import { ButtonGroup } from '../../../ui/composites/button-group';
import type { PageBackground } from '../../../../context/editor-context';
import { ThemeSelect } from '../../../../utils/theme-options';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { getThemeDefaults } from '../../../../utils/theme-defaults';
import { useAuth } from '../../../../context/auth-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { GeneralSettings } from './general-settings';
import { commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth } from '../../../../utils/stroke-width-converter';
import { actualToCommon, commonToActual, COMMON_FONT_SIZE_RANGE } from '../../../../utils/font-size-converter';
import { getFontFamily } from '../../../../utils/font-families';
import { FontSelector } from './font-selector';

const getCurrentFontName = (fontFamily: string) => {
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

const TOOL_ICONS = {
  select: MousePointer,
  pan: Hand,
  text: MessageCircleMore,
  question: MessageCircleQuestion,
  answer: MessageCircleHeart,
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
          return settings.fill || '#1f2937';
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
        case 'shape-stroke':
          return settings.strokeOpacity || 1;
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
        case 'shape-stroke':
          updateToolSetting('strokeOpacity', opacity);
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
        case 'text-color':
          updateToolSetting('fill', color);
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

    // Use question element as reference for shared settings
    const element = questionElement;

    if (showFontSelector) {
      return (
        <FontSelector
          currentFont={element.fontFamily || 'Arial, sans-serif'}
          isBold={element.fontWeight === 'bold'}
          isItalic={element.fontStyle === 'italic'}
          onFontSelect={(fontName) => {
            const fontFamily = getFontFamily(fontName, element.fontWeight === 'bold', element.fontStyle === 'italic');
            updateBothElements('fontFamily', fontFamily);
          }}
          onBack={() => setShowFontSelector(false)}
        />
      );
    }

    if (showColorSelector && showColorSelector.startsWith('element-')) {
      const getColorValue = () => {
        switch (showColorSelector) {
          case 'element-text-color':
            return element.fill || '#1f2937';
          case 'element-text-border':
            return element.borderColor || '#000000';
          case 'element-text-background':
            return element.backgroundColor !== undefined ? element.backgroundColor : 'transparent';
          case 'element-ruled-lines-color':
            return element.ruledLinesColor || '#1f2937';
          default:
            return '#1f2937';
        }
      };
      
      const getElementOpacityValue = () => {
        switch (showColorSelector) {
          case 'element-text-color':
            return element.fillOpacity || 1;
          case 'element-text-border':
            return element.borderOpacity || 1;
          case 'element-text-background':
            return element.backgroundOpacity || 1;
          case 'element-ruled-lines-color':
            return 1;
          default:
            return 1;
        }
      };
      
      const handleElementOpacityChange = (opacity: number) => {
        switch (showColorSelector) {
          case 'element-text-color':
            updateBothElements('fillOpacity', opacity);
            break;
          case 'element-text-border':
            updateBothElements('borderOpacity', opacity);
            break;
          case 'element-text-background':
            updateBothElements('backgroundOpacity', opacity);
            break;
        }
      };
      
      const handleElementColorChange = (color: string) => {
        switch (showColorSelector) {
          case 'element-text-color':
            updateBothElements('fill', color);
            break;
          case 'element-text-border':
            updateBothElements('borderColor', color);
            break;
          case 'element-text-background':
            updateBothElements('backgroundColor', color);
            break;
          case 'element-ruled-lines-color':
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
              variant={element.fontWeight === 'bold' ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                const newWeight = element.fontWeight === 'bold' ? 'normal' : 'bold';
                updateBothElements('fontWeight', newWeight);
                const fontName = getCurrentFontName(element.fontFamily);
                const newFontFamily = getFontFamily(fontName, newWeight === 'bold', element.fontStyle === 'italic');
                updateBothElements('fontFamily', newFontFamily);
              }}
              className="px-3"
            >
              <strong>B</strong>
            </Button>
            <Button
              variant={element.fontStyle === 'italic' ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                const newStyle = element.fontStyle === 'italic' ? 'normal' : 'italic';
                updateBothElements('fontStyle', newStyle);
                const fontName = getCurrentFontName(element.fontFamily);
                const newFontFamily = getFontFamily(fontName, element.fontWeight === 'bold', newStyle === 'italic');
                updateBothElements('fontFamily', newFontFamily);
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
            >
              <Type className="h-4 w-4 mr-2" />
              Font
            </Button>
          </div>
        </div>
        <Slider
          label="Size"
          value={actualToCommon(element.fontSize || 58)}
          onChange={(value) => updateBothElements('fontSize', commonToActual(value))}
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
                variant={element.align === 'left' ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateBothElements('align', 'left')}
                className="px-1 h-6 flex-1"
              >
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button
                variant={element.align === 'center' ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateBothElements('align', 'center')}
                className="px-1 h-6 flex-1"
              >
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button
                variant={element.align === 'right' ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateBothElements('align', 'right')}
                className="px-1 h-6 flex-1"
              >
                <AlignRight className="h-3 w-3" />
              </Button>
              <Button
                variant={element.align === 'justify' ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateBothElements('align', 'justify')}
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
                variant={element.paragraphSpacing === 'small' ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateBothElements('paragraphSpacing', 'small')}
                className="px-1 h-6 flex-1"
              >
                <Rows4 className="h-3 w-3" />
              </Button>
              <Button
                variant={(element.paragraphSpacing || 'medium') === 'medium' ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateBothElements('paragraphSpacing', 'medium')}
                className="px-1 h-6 flex-1"
              >
                <Rows3 className="h-3 w-3" />
              </Button>
              <Button
                variant={element.paragraphSpacing === 'large' ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateBothElements('paragraphSpacing', 'large')}
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
              checked={element.ruledLines || false}
              onChange={(e) => updateBothElements('ruledLines', e.target.checked)}
              className="rounded w-3 h-3"
            />
            Ruled Lines
          </Label>
        </div>
        
        {element.ruledLines && (
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
                value={element.ruledLinesTheme || 'rough'}
                onChange={(value) => updateBothElements('ruledLinesTheme', value)}
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
              checked={(element.borderWidth || 0) > 0}
              onChange={(e) => updateBothElements('borderWidth', e.target.checked ? 1 : 0)}
              className="rounded w-3 h-3"
            />
            Border
          </Label>
        </div>
        
        {(element.borderWidth || 0) > 0 && (
          <IndentedSection>
            <Slider
              label="Border Width"
              value={actualToCommonStrokeWidth(element.borderWidth || 1, element.theme || 'default')}
              onChange={(value) => updateBothElements('borderWidth', commonToActualStrokeWidth(value, element.theme || 'default'))}
              min={1}
              max={getMaxStrokeWidth()}
            />            
            
            <div>
              <Label variant="xs">Border Theme</Label>
              <ThemeSelect 
                value={element.theme}
                onChange={(value) => {
                  updateBothElements('theme', value);
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
          </IndentedSection>
        )}
        
        <div>
          <Label className="flex items-center gap-1" variant="xs">
            <input
              type="checkbox"
              checked={element.backgroundColor !== 'transparent' && element.backgroundColor !== undefined}
              onChange={(e) => {
                if (e.target.checked) {
                  updateBothElements('backgroundColor', '#ffffff');
                } else {
                  updateBothElements('backgroundColor', 'transparent');
                }
              }}
              className="rounded w-3 h-3"
            />
            Background
          </Label>
        </div>
        
        {element.backgroundColor !== 'transparent' && element.backgroundColor !== undefined && (
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
        
        {((element.borderWidth || 0) === 0 || (element.theme !== 'candy' && element.theme !== 'zigzag' && element.theme !== 'wobbly')) && (
          <Slider
            label="Corner Radius"
            value={element.cornerRadius || 0}
            onChange={(value) => updateBothElements('cornerRadius', value)}
            min={0}
            max={300}
          />
        )}
        
        <Slider
          label="Padding"
          value={element.padding || 4}
          onChange={(value) => updateBothElements('padding', value)}
          min={0}
          max={100}
        />
      </div>
    );
  };

  const renderElementSettings = (element: any) => {
    const updateElementSetting = (key: string, value: any) => {
      dispatch({ type: 'SAVE_TO_HISTORY', payload: `Update ${element.type} ${key}` });
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: element.id, updates: { [key]: value } }
      });
    };

    if (showFontSelector && element.type === 'text') {
      return (
        <FontSelector
          currentFont={element.fontFamily || 'Arial, sans-serif'}
          isBold={element.fontWeight === 'bold'}
          isItalic={element.fontStyle === 'italic'}
          onFontSelect={(fontName) => {
            const fontFamily = getFontFamily(fontName, element.fontWeight === 'bold', element.fontStyle === 'italic');
            updateElementSetting('fontFamily', fontFamily);
          }}
          onBack={() => setShowFontSelector(false)}
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
            return element.fill || '#1f2937';
          case 'element-text-border':
            return element.borderColor || '#000000';
          case 'element-text-background':
            return element.backgroundColor !== undefined ? element.backgroundColor : 'transparent';
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
          case 'element-shape-stroke':
            return element.strokeOpacity || 1;
          case 'element-shape-fill':
          case 'element-text-color':
            return element.fillOpacity || 1;
          case 'element-text-border':
            return element.borderOpacity || 1;
          case 'element-text-background':
            return element.backgroundOpacity || 1;
          case 'element-ruled-lines-color':
            return 1;
          default:
            return 1;
        }
      };
      
      const handleElementOpacityChange = (opacity: number) => {
        switch (showColorSelector) {
          case 'element-brush-stroke':
          case 'element-line-stroke':
          case 'element-shape-stroke':
            updateElementSetting('strokeOpacity', opacity);
            break;
          case 'element-shape-fill':
          case 'element-text-color':
            updateElementSetting('fillOpacity', opacity);
            break;
          case 'element-text-border':
            updateElementSetting('borderOpacity', opacity);
            break;
          case 'element-text-background':
            updateElementSetting('backgroundOpacity', opacity);
            break;
          case 'element-ruled-lines-color':
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
          case 'element-text-color':
            updateElementSetting('fill', color);
            if (showColorSelector === 'element-shape-fill') {
              localStorage.setItem(`shape-fill-color-${element.id}`, color);
            }
            break;
          case 'element-text-border':
            updateElementSetting('borderColor', color);
            break;
          case 'element-text-background':
            updateElementSetting('backgroundColor', color);
            localStorage.setItem(`text-bg-color-${element.id}`, color);
            break;
          case 'element-ruled-lines-color':
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
          opacity={hasElementOpacity ? getElementOpacityValue() : undefined}
          onOpacityChange={hasElementOpacity ? handleElementOpacityChange : undefined}
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
                value={element.theme}
                onChange={(value) => {
                  updateElementSetting('theme', value);
                }}
              />
            </div>
            
            <Separator />

            <Slider
              label="Brush Size"
              value={actualToCommonStrokeWidth(element.strokeWidth || 3, element.theme || 'default')}
              onChange={(value) => updateElementSetting('strokeWidth', commonToActualStrokeWidth(value, element.theme || 'default'))}
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
                value={element.theme}
                onChange={(value) => {
                  updateElementSetting('theme', value);
                }}
              />
            </div>
            
            <Separator />

            <Slider
              label="Stroke Width"
              value={actualToCommonStrokeWidth(element.strokeWidth || 2, element.theme || 'default')}
              onChange={(value) => updateElementSetting('strokeWidth', commonToActualStrokeWidth(value, element.theme || 'default'))}
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
                value={element.theme}
                onChange={(value) => {
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
                  checked={(element.strokeWidth || 0) > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const lastStrokeWidth = localStorage.getItem(`shape-border-width-${element.id}`) || '2';
                      const lastStrokeColor = localStorage.getItem(`shape-border-color-${element.id}`) || '#1f2937';
                      updateElementSetting('strokeWidth', Math.max(1, parseInt(lastStrokeWidth)));
                      updateElementSetting('stroke', lastStrokeColor);
                    } else {
                      if ((element.strokeWidth || 0) > 0) {
                        localStorage.setItem(`shape-border-width-${element.id}`, String(element.strokeWidth));
                      }
                      localStorage.setItem(`shape-border-color-${element.id}`, element.stroke || '#1f2937');
                      updateElementSetting('theme', 'default');
                      updateElementSetting('strokeWidth', 0);
                    }
                  }}
                  className="rounded w-3 h-3"
                />
                Border
              </Label>
            </div>
            
            {(element.strokeWidth || 0) > 0 && (
              <IndentedSection>
                <Slider
                  label="Border Width"
                  value={actualToCommonStrokeWidth(element.strokeWidth || 0, element.theme || 'default')}
                  onChange={(value) => {
                    const actualWidth = commonToActualStrokeWidth(value, element.theme || 'default');
                    updateElementSetting('strokeWidth', actualWidth);
                    localStorage.setItem(`shape-border-width-${element.id}`, String(actualWidth));
                  }}
                  min={1}
                  max={getMaxStrokeWidth()}
                />
                
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
                  checked={element.fill !== 'transparent' && element.fill !== undefined}
                  onChange={(e) => {
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
            
            {element.fill !== 'transparent' && element.fill !== undefined && (
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
                value={element.cornerRadius || 0}
                onChange={(value) => updateElementSetting('cornerRadius', value)}
                min={0}
                max={300}
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
              value={element.cornerRadius || 0}
              onChange={(value) => updateElementSetting('cornerRadius', value)}
              min={0}
              max={300}
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
                  variant={element.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    const newWeight = element.fontWeight === 'bold' ? 'normal' : 'bold';
                    updateElementSetting('fontWeight', newWeight);
                    const fontName = getCurrentFontName(element.fontFamily);
                    const newFontFamily = getFontFamily(fontName, newWeight === 'bold', element.fontStyle === 'italic');
                    updateElementSetting('fontFamily', newFontFamily);
                  }}
                  className="px-3"
                >
                  <strong>B</strong>
                </Button>
                <Button
                  variant={element.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    const newStyle = element.fontStyle === 'italic' ? 'normal' : 'italic';
                    updateElementSetting('fontStyle', newStyle);
                    const fontName = getCurrentFontName(element.fontFamily);
                    const newFontFamily = getFontFamily(fontName, element.fontWeight === 'bold', newStyle === 'italic');
                    updateElementSetting('fontFamily', newFontFamily);
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
                >
                  <Type className="h-4 w-4 mr-2" />
                  Font
                </Button>
              </div>
            </div>
            <Slider
              label="Size"
              value={actualToCommon(element.fontSize || 58)}
              onChange={(value) => updateElementSetting('fontSize', commonToActual(value))}
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
                    variant={element.align === 'left' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updateElementSetting('align', 'left')}
                    className="px-1 h-6 flex-1"
                  >
                    <AlignLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={element.align === 'center' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updateElementSetting('align', 'center')}
                    className="px-1 h-6 flex-1"
                  >
                    <AlignCenter className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={element.align === 'right' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updateElementSetting('align', 'right')}
                    className="px-1 h-6 flex-1"
                  >
                    <AlignRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={element.align === 'justify' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updateElementSetting('align', 'justify')}
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
                    variant={element.paragraphSpacing === 'small' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updateElementSetting('paragraphSpacing', 'small')}
                    className="px-1 h-6 flex-1"
                  >
                    <Rows4 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={(element.paragraphSpacing || 'medium') === 'medium' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updateElementSetting('paragraphSpacing', 'medium')}
                    className="px-1 h-6 flex-1"
                  >
                    <Rows3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={element.paragraphSpacing === 'large' ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updateElementSetting('paragraphSpacing', 'large')}
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
                  checked={element.ruledLines || false}
                  onChange={(e) => updateElementSetting('ruledLines', e.target.checked)}
                  className="rounded w-3 h-3"
                />
                Ruled Lines
              </Label>
            </div>
            
            {element.ruledLines && (
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
                    value={element.ruledLinesTheme || 'rough'}
                    onChange={(value) => {
                      updateElementSetting('ruledLinesTheme', value);
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
                  checked={(element.borderWidth || 0) > 0}
                  onChange={(e) => updateElementSetting('borderWidth', e.target.checked ? 1 : 0)}
                  className="rounded w-3 h-3"
                />
                Border
              </Label>
            </div>
            
            {(element.borderWidth || 0) > 0 && (
              <IndentedSection>
                <Slider
                  label="Border Width"
                  value={actualToCommonStrokeWidth(element.borderWidth || 1, element.theme || 'default')}
                  onChange={(value) => updateElementSetting('borderWidth', commonToActualStrokeWidth(value, element.theme || 'default'))}
                  min={1}
                  max={getMaxStrokeWidth()}
                />            

                
                <div>
                  <Label variant="xs">Border Theme</Label>
                  <ThemeSelect 
                    value={element.theme}
                    onChange={(value) => {
                      updateElementSetting('theme', value);
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
                  checked={element.backgroundColor !== 'transparent' && element.backgroundColor !== undefined}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const lastBgColor = localStorage.getItem(`text-bg-color-${element.id}`) || '#ffffff';
                      updateElementSetting('backgroundColor', lastBgColor);
                    } else {
                      localStorage.setItem(`text-bg-color-${element.id}`, element.backgroundColor || '#ffffff');
                      updateElementSetting('backgroundColor', 'transparent');
                    }
                  }}
                  className="rounded w-3 h-3"
                />
                Background
              </Label>
            </div>
            
            {element.backgroundColor !== 'transparent' && element.backgroundColor !== undefined && (
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

            
            {(element.textType === 'text' || element.textType === 'question' || element.textType === 'answer') && ((element.borderWidth || 0) === 0 || (element.theme !== 'candy' && element.theme !== 'zigzag' && element.theme !== 'wobbly')) && (
              <Slider
                label="Corner Radius"
                value={element.cornerRadius || 0}
                onChange={(value) => updateElementSetting('cornerRadius', value)}
                min={0}
                max={300}
              />
            )}
            
            <Slider
              label="Padding"
              value={element.padding || 4}
              onChange={(value) => updateElementSetting('padding', value)}
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