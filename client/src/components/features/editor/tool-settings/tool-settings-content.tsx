import { useEditor } from '../../../../context/editor-context';

import { Button } from '../../../ui/primitives/button';
import { SquareMousePointer, Hand, MessageCircle, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile, AlignLeft, AlignCenter, AlignRight, AlignJustify, Rows4, Rows3, Rows2, Palette, Type, SquareRoundCorner, PanelTopBottomDashed, Triangle, Pentagon, ChevronLeft } from 'lucide-react';
import { QuestionPositionTop, QuestionPositionBottom, QuestionPositionLeft, QuestionPositionRight } from '../../../ui/icons/question-position-icons';
import { ButtonGroup } from '../../../ui/composites/button-group';
// ARCHIVED: import { QnASettingsForm } from './qna-settings-form';
// ARCHIVED: import { QnA2SettingsForm } from './qna2-settings-form';
import { QnAInlineSettingsForm } from './qna-inline-settings-form';
import { FreeTextSettingsForm } from './free-text-settings-form';
import { ShapeSettingsForm } from './shape-settings-form';
import { ImageSettingsForm } from './image-settings-form';
import type { PageBackground } from '../../../../context/editor-context';
import { ThemeSelect } from '../../../../utils/theme-options';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { IndentedSection } from '../../../ui/primitives/indented-section';

import { Tooltip } from '../../../ui';

import { useAuth } from '../../../../context/auth-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { GeneralSettings } from './general-settings';
import { actualToCommon, commonToActual, COMMON_FONT_SIZE_RANGE } from '../../../../utils/font-size-converter';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getFontFamily as getFontFamilyByName, hasBoldVariant, hasItalicVariant } from '../../../../utils/font-families';
import { FontSelector } from './font-selector';
import { getQnAThemeDefaults } from '../../../../utils/global-themes';
import { getRuledLinesOpacity } from '../../../../utils/ruled-lines-utils';
import { getBorderWidth, getBorderColor, getBorderOpacity, getBorderTheme } from '../../../../utils/border-utils';
import { getFontSize, getFontColor, getFontFamily } from '../../../../utils/font-utils';
import { getBackgroundColor, getBackgroundOpacity, getBackgroundEnabled } from '../../../../utils/background-utils';
import { getTextAlign, getParagraphSpacing, getPadding } from '../../../../utils/format-utils';
import { getRuledLinesTheme } from '../../../../utils/theme-utils';



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
  'brush-multicolor': Paintbrush,
  heart: Heart,
  star: Star,
  'speech-bubble': MessageSquare,
  dog: Dog,
  cat: Cat,
  smiley: Smile,
  triangle: Triangle,
  polygon: Pentagon
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
  showBackgroundImageTemplateSelector: boolean;
  setShowBackgroundImageTemplateSelector: (value: boolean) => void;
  selectedImageElementId: string | null;
  setSelectedImageElementId: (value: string | null) => void;
  showQuestionDialog: boolean;
  setShowQuestionDialog: (value: boolean) => void;
  selectedQuestionElementId: string | null;
  setSelectedQuestionElementId: (value: string | null) => void;
  activeLinkedElement: string | null;
  onOpenTemplates: () => void;
  onOpenLayouts: () => void;
  onOpenBookLayouts: () => void;
  onOpenThemes: () => void;
  onOpenPalettes: () => void;
  selectedBackgroundImageId?: string | null;
  onBackgroundImageSelect?: (imageId: string | null) => void;
  onApplyBackgroundImage?: () => void;
  isBackgroundApplyDisabled?: boolean;
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
  onOpenTemplates,
  onOpenLayouts,
  onOpenBookLayouts,
  onOpenThemes,
  onOpenPalettes,
  selectedBackgroundImageId,
  onBackgroundImageSelect,
  onApplyBackgroundImage,
  isBackgroundApplyDisabled
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
    const colorProperties = ['stroke', 'fill', 'fontColor', 'borderColor', 'backgroundColor'];
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
        default:
          return '#1f2937';
      }
    };
    
    const getOpacityValue = () => {
      switch (colorType) {
        case 'element-shape-stroke':
          return element.opacity || element.strokeOpacity || 1;
        case 'element-shape-fill':
          return element.fillOpacity || element.opacity || 1;
        case 'element-image-frame-stroke':
          return element.strokeOpacity || 1;
        default:
          return 1;
      }
    };
    
    const getIsOverridden = () => {
      const overrides = element.colorOverrides || {};
      switch (colorType) {
        case 'element-shape-stroke':
          return overrides.stroke === true;
        case 'element-shape-fill':
          return overrides.fill === true;
        case 'element-image-frame-stroke':
          return overrides.stroke === true;
        default:
          return false;
      }
    };
    
    const handleColorChange = (color: string) => {
      switch (colorType) {
        case 'element-shape-stroke':
          updateElementSetting(element.id, { stroke: color });
          // Mark stroke as manually overridden
          dispatch({
            type: 'MARK_COLOR_OVERRIDE',
            payload: { elementIds: [element.id], colorProperty: 'stroke' }
          });
          break;
        case 'element-shape-fill':
          updateElementSetting(element.id, { fill: color });
          // Mark fill as manually overridden
          dispatch({
            type: 'MARK_COLOR_OVERRIDE',
            payload: { elementIds: [element.id], colorProperty: 'fill' }
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
      }
    };
    
    const handleOpacityChange = (opacity: number) => {
      switch (colorType) {
        case 'element-shape-stroke':
          updateElementSetting(element.id, { opacity });
          break;
        case 'element-shape-fill':
          updateElementSetting(element.id, { fillOpacity: opacity });
          break;
        case 'element-image-frame-stroke':
          updateElementSetting(element.id, { strokeOpacity: opacity });
          break;
      }
    };
    
    const handleResetOverride = () => {
      let colorProperty: string;
      switch (colorType) {
        case 'element-shape-stroke':
        case 'element-image-frame-stroke':
          colorProperty = 'stroke';
          break;
        case 'element-shape-fill':
          colorProperty = 'fill';
          break;
        default:
          colorProperty = 'stroke';
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
        
        // Show Back button for individual grouped element
        if (selectedElement) {
          return (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clear the grouped element selection first
                  dispatch({ 
                    type: 'SET_SELECTED_ELEMENTS', 
                    payload: [] 
                  });
                  // Then select the parent group
                  setTimeout(() => {
                    dispatch({ 
                      type: 'SET_SELECTED_ELEMENTS', 
                      payload: [parentElement.id] 
                    });
                  }, 0);
                }}
                className="w-full justify-start gap-1 h-7 px-2"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="text-sm">Back</span>
              </Button>
              <Separator />
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
                  label="Brush Size"
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
        if (selectedElement.textType === 'qna' || selectedElement.textType === 'qna_inline' || selectedElement.textType === 'qna2') {
          const activeSection = state.qnaActiveSection;
          const setActiveSection = (section: 'question' | 'answer') => {
            dispatch({ type: 'SET_QNA_ACTIVE_SECTION', payload: section });
          };
          
          const individualSettings = selectedElement.qnaIndividualSettings ?? false;
          
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
              <QnAInlineSettingsForm
                sectionType="shared"
                element={selectedElement}
                state={state}
                currentStyle={{
                  fontSize: selectedElement.questionSettings?.fontSize || selectedElement.answerSettings?.fontSize || 16,
                  fontFamily: selectedElement.questionSettings?.fontFamily || selectedElement.answerSettings?.fontFamily || 'Arial, sans-serif',
                  fontBold: selectedElement.questionSettings?.fontBold || selectedElement.answerSettings?.fontBold || false,
                  fontItalic: selectedElement.questionSettings?.fontItalic || selectedElement.answerSettings?.fontItalic || false,
                  fontColor: selectedElement.questionSettings?.fontColor || selectedElement.answerSettings?.fontColor || '#1f2937',
                  fontOpacity: selectedElement.questionSettings?.fontOpacity || selectedElement.answerSettings?.fontOpacity || 1
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
          onOpenTemplates={onOpenTemplates}
          onOpenLayouts={onOpenLayouts}
          onOpenBookLayouts={onOpenBookLayouts}
          onOpenThemes={onOpenThemes}
          onOpenPalettes={onOpenPalettes}
          selectedBackgroundImageId={selectedBackgroundImageId}
          onBackgroundImageSelect={onBackgroundImageSelect}
          onApplyBackgroundImage={onApplyBackgroundImage}
          isBackgroundApplyDisabled={isBackgroundApplyDisabled}
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
    <div className="flex-1 overflow-y-auto scrollbar-hide p-2 border min-h-0">
      {shouldShowPanel ? renderToolSettings() : (
        <div className="text-xs text-muted-foreground">
          Select a tool or element to view settings.
        </div>
      )}
    </div>
  );
}