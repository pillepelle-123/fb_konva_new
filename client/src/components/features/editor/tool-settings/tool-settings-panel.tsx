import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronRight, ChevronLeft, MousePointer, Hand, MessageCircleMore, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile, AlignLeft, AlignCenter, AlignRight, AlignJustify, Settings, Rows4, Rows3, Rows2, Palette } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolSettingsContainer } from './tool-settings-container';
import { Dialog, DialogContent } from '../../../ui/overlays/dialog';
import QuestionsManagerContent from '../../questions/questions-manager-content';
import { useAuth } from '../../../../context/auth-context';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/composites/tabs';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Modal } from '../../../ui/overlays/modal';
import ImagesContent from '../../images/images-content';
import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { ThemeSelect } from '../../../../utils/theme-options';
import { ColorPicker } from '../../../ui/primitives/color-picker';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { ColorSelector } from './color-selector';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { getThemeDefaults } from '../../../../utils/theme-defaults';


const COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
];

const FONTS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Courier New, monospace', label: 'Courier' }
];

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

// Global styles for settings sections
const SETTINGS_SECTION_CLASS = '';
const SETTINGS_LABEL_CLASS = 'text-xs font-medium block mb-1';
const COLOR_GRID_CLASS = 'grid grid-cols-5 gap-1 mt-1';
const COLOR_BUTTON_CLASS = 'w-6 h-6 rounded border';

export default function ToolSettingsPanel() {
  const { state, dispatch } = useEditor();
  const { token, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [selectedQuestionElementId, setSelectedQuestionElementId] = useState<string | null>(null);
  const [activeLinkedElement, setActiveLinkedElement] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageElementId, setSelectedImageElementId] = useState<string | null>(null);
  const [showBackgroundImageModal, setShowBackgroundImageModal] = useState(false);
  const [showPatternSettings, setShowPatternSettings] = useState(false);
  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
  const [showColorSelector, setShowColorSelector] = useState<string | null>(null);

  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  
  const toolSettings = state.toolSettings || {};
  const activeTool = state.activeTool;
  
  const updateToolSetting = (key: string, value: any) => {
    dispatch({
      type: 'UPDATE_TOOL_SETTINGS',
      payload: { tool: activeTool, settings: { [key]: value } }
    });
  };

  // Set default active element for linked pairs (removed auto-expand logic)
  useEffect(() => {
    if (state.selectedElementIds.length === 2 && state.currentBook) {
      const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
        el => state.selectedElementIds.includes(el.id)
      ) || [];
      
      const questionElement = selectedElements.find(el => el.textType === 'question');
      const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);
      
      if (questionElement && answerElement && !activeLinkedElement) {
        setActiveLinkedElement(questionElement.id);
      }
    } else {
      setActiveLinkedElement(null);
    }
  }, [state.selectedElementIds.length, state.currentBook, state.activePageIndex, activeLinkedElement]);

  // Flash effect when elements are selected
  useEffect(() => {
    if (state.selectedElementIds.length > 0 && isCollapsed) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [state.selectedElementIds.length, isCollapsed]);

  const isOnAssignedPage = state.userRole === 'author' 
    ? state.assignedPages.includes(state.activePageIndex + 1)
    : true;
  
  // Force collapsed state for authors on non-assigned pages, auto-open for assigned pages
  useEffect(() => {
    if (state.userRole === 'author') {
      if (!isOnAssignedPage) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    }
  }, [state.userRole, isOnAssignedPage]);

  // Reset settings views when not showing background settings
  useEffect(() => {
    if (activeTool !== 'select' || state.selectedElementIds.length > 0) {
      setShowPatternSettings(false);
      setShowBackgroundSettings(false);
    }
    // Reset color selector when element selection changes
    setShowColorSelector(null);
  }, [activeTool, state.selectedElementIds]);

  const shouldShowPanel = activeTool !== 'pan' && (state.selectedElementIds.length > 0 || activeTool === 'select');

  const getColorSelectorTitle = (colorType: string) => {
    switch (colorType) {
      case 'line-stroke':
      case 'brush-stroke':
        return 'Color';
      case 'shape-stroke':
      case 'element-brush-stroke':
      case 'element-line-stroke':
      case 'element-shape-stroke':
        return 'Stroke Color';
      case 'shape-fill':
      case 'element-shape-fill':
        return 'Fill Color';
      case 'text-color':
      case 'element-text-color':
        return 'Text Color';
      case 'text-border':
      case 'element-text-border':
        return 'Border Color';
      case 'text-background':
      case 'element-text-background':
        return 'Background Color';
      case 'background-color':
        return 'Color';
      case 'pattern-background':
        return 'Background Color';
      case 'ruled-lines-color':
      case 'element-ruled-lines-color':
        return 'Line Color';
      default:
        return 'Color Selector';
    }
  };

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
    
    const hasOpacity = true; // All colors now support opacity
    
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
      
      // Check if they are linked question-answer pair
      const questionElement = selectedElements.find(el => el.textType === 'question');
      const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);
      
      if (questionElement && answerElement) {
        const activeElement = activeLinkedElement === questionElement.id ? questionElement : answerElement;
        
        return renderElementSettings(activeElement);
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
      return renderGeneralSettings();
    }
    
    // No tool settings - using defaults from tool-defaults.ts
    return (
      <div className="text-sm text-muted-foreground">
        Select an element to view settings.
      </div>
    );
  };

  const renderGeneralSettings = () => {
    if (showBackgroundSettings) {
      return renderBackgroundSettings();
    }

    return (
      <div className="space-y-1">
        <Button
          variant="ghost_hover"
          size="default"
          onClick={() => setShowBackgroundSettings(true)}
          className="w-full justify-start hover:bg-muted/80"
        >
          <Settings className="h-4 w-4 mr-2 hidden" />
          Background
        </Button>
        <Separator />
        <Button
          variant="ghost_hover"
          size="default"
          // onClick={() => setShowBackgroundSettings(true)}
          className="w-full justify-start"
        >
          {/* <Settings className="h-4 w-4 mr-2" /> */}
          <Settings className="h-4 w-4 mr-2 hidden" />
          Setting 2
        </Button>
        <Separator />
        <Button
          variant="ghost_hover"
          size="default"
          // onClick={() => setShowBackgroundSettings(true)}
          className="w-full justify-start"
        >
          {/* <Settings className="h-4 w-4 mr-2" /> */}
          <Settings className="h-4 w-4 mr-2 hidden" />
          Setting 3
        </Button>
        <Separator />
      </div>
    );
  };

  const updateBackground = (updates: Partial<PageBackground>) => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    const newBackground = { ...background, ...updates };
    dispatch({
      type: 'UPDATE_PAGE_BACKGROUND',
      payload: { pageIndex: state.activePageIndex, background: newBackground }
    });
  };

  const renderBackgroundSettings = () => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    const isPattern = background.type === 'pattern';
    const currentColor = isPattern ? (background.patternForegroundColor || '#666666') : background.value;

    const togglePattern = (checked: boolean) => {
      if (checked) {
        updateBackground({
          type: 'pattern',
          value: 'dots',
          patternForegroundColor: currentColor,
          patternBackgroundColor: 'transparent'
        });
        // setShowPatternSettings(true);
      } else {
        updateBackground({
          type: 'color',
          value: currentColor
        });
        setShowPatternSettings(false);
      }
    };

    if (showPatternSettings && isPattern) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPatternSettings(false)}
              className="px-2 h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          
          <div>
            <Label variant="xs">Pattern</Label>
            <div className="grid grid-cols-2 gap-1">
              {PATTERNS.map((pattern) => {
                const patternDataUrl = createPatternDataUrl(
                  pattern,
                  "black",
                  'transparent'
                );
                
                return (
                  <button
                    key={pattern.id}
                    className={`w-full h-8 border rounded ${
                      background.value === pattern.id ? 'border-4 border-[hsl(var(--ring))]' : 'border-gray-200'
                    }`}
                    style={{ backgroundImage: `url(${patternDataUrl})` }}
                    onClick={() => updateBackground({ value: pattern.id })}
                    title={pattern.name}
                  />
                );
              })}
            </div>
          </div>
          
          <Slider
            label="Pattern Size"
            value={background.patternSize || 1}
            onChange={(value) => updateBackground({ patternSize: value })}
            min={1}
            max={10}
            unit=""
          />
          
          <Slider
            label="Pattern Stroke Width"
            value={background.patternStrokeWidth || 1}
            onChange={(value) => updateBackground({ patternStrokeWidth: value })}
            min={1}
            max={10}
            step={1}
            // step={background.patternSize > 5 ? 1 : 4}
          />
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('pattern-background')}
              className="w-full"
            >
              <Palette className="h-4 w-4 mr-2" />
              Background Color
            </Button>
          </div>
          
          {/* <Slider
            label="Opacity"
            value={Math.round((background.patternBackgroundOpacity || 1) * 100)}
            onChange={(value) => updateBackground({ patternBackgroundOpacity: value / 100 })}
            min={0}
            max={100}
            step={5}
            unit="%"
          /> */}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBackgroundSettings(false)}
            className="px-2 h-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        <div>
          <Tabs 
            value={background.type === 'image' ? 'image' : 'color'} 
            onValueChange={(value) => {
              if (value === 'color') {
                updateBackground({ type: 'color', value: '#ffffff' });
              } else {
                updateBackground({ type: 'image', value: '', imageSize: 'cover' });
              }
            }}
          >
            <TabsList variant="bootstrap" className='w-full'>
              <TabsTrigger variant="bootstrap" value="color">Color</TabsTrigger>
              <TabsTrigger variant="bootstrap" value="image">Image</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {(background.type === 'color' || background.type === 'pattern') && (
          <div className="space-y-2">
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('background-color')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Color
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-row gap-5 items-center h-12 space-x-2">
                <span className="flex items-center gap-1 text-xs font-medium">
                <Checkbox
                  id="pattern"
                  checked={isPattern}
                  onCheckedChange={togglePattern}
                />
                <Label htmlFor="pattern" className="text-sm font-medium cursor-pointer">
                  Pattern
                </Label>
                </span>
                {isPattern && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowPatternSettings(true)}
                    className="ml-4 w-full"
                  >
                    Pattern Settings
                  </Button>
                )}
              </div>
              
              {/* {isPattern && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowPatternSettings(true)}
                  className="w-full"
                >
                  Pattern Settings
                </Button>
              )} */}
            </div>
          </div>
        )}

        {background.type === 'image' && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowBackgroundImageModal(true)}
              className="w-full"
            >
              <Image className="h-4 w-4 mr-2" />
              {background.value ? 'Change Image' : 'Select Image'}
            </Button>
            
            {background.value && (
              <div className="space-y-2">
                <div>
                  <Label variant="xs">Size</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      variant={background.imageSize === 'cover' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateBackground({ imageSize: 'cover' })}
                      className="text-xs"
                    >
                      Cover
                    </Button>
                    <Button
                      variant={background.imageSize === 'contain' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateBackground({ imageSize: 'contain' })}
                      className="text-xs"
                    >
                      Contain
                    </Button>
                    <Button
                      variant={background.imageSize === 'stretch' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateBackground({ imageSize: 'stretch' })}
                      className="text-xs"
                    >
                      Stretch
                    </Button>
                  </div>
                </div>
                
                {background.imageSize === 'contain' && (
                  <div>
                    <Label className="flex items-center gap-1" variant="xs">
                      <input
                        type="checkbox"
                        checked={background.imageRepeat || false}
                        onChange={(e) => updateBackground({ imageRepeat: e.target.checked })}
                        className="rounded w-3 h-3"
                      />
                      Repeat
                    </Label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getMaxStrokeWidth = (elementType: string, theme: string) => {
    if (elementType === 'brush') {
      switch (theme) {
        case 'wobbly': return 500;
        case 'candy': return 80;
        case 'rough': return 100;
        default: return 150;
      }
    } else if (elementType === 'line') {
      switch (theme) {
        case 'wobbly': return 500;
        case 'candy': return 80;
        case 'rough':
        case 'default':
        default: return 100;
      }
    } else if (elementType === 'text') {
      switch (theme) {
        case 'wobbly': return 80;
        case 'candy': return 80;
        case 'rough':
        case 'default':
        default: return 30;
      }
    } else {
      switch (theme) {
        case 'wobbly': return 300;
        case 'candy': return 80;
        case 'rough':
        case 'default':
        default: return 150;
      }
    }
  };

  const renderElementSettings = (element: any) => {
    const updateElementSetting = (key: string, value: any) => {
      dispatch({ type: 'SAVE_TO_HISTORY', payload: `Update ${element.type} ${key}` });
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: element.id, updates: { [key]: value } }
      });
    };

    if (showColorSelector && showColorSelector.startsWith('element-')) {
      const getColorValue = () => {
        switch (showColorSelector) {
          case 'element-brush-stroke':
          case 'element-line-stroke':
          case 'element-shape-stroke':
            return element.stroke || '#1f2937';
          case 'element-shape-fill':
            return element.fill || 'transparent';
          case 'element-text-color':
            return element.fill || '#1f2937';
          case 'element-text-border':
            return element.borderColor || '#000000';
          case 'element-text-background':
            return element.backgroundColor || 'transparent';
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
            break;
          case 'element-shape-fill':
          case 'element-text-color':
            updateElementSetting('fill', color);
            break;
          case 'element-text-border':
            updateElementSetting('borderColor', color);
            break;
          case 'element-text-background':
            updateElementSetting('backgroundColor', color);
            break;
          case 'element-ruled-lines-color':
            updateElementSetting('ruledLinesColor', color);
            break;
          default:
            updateElementSetting('stroke', color);
        }
      };
      
      const hasElementOpacity = true; // All element colors now support opacity
      
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
            {/* Appearance & Style */}
            <div>
              <Label variant="xs">Theme</Label>
              <ThemeSelect 
                value={element.theme}
                onChange={(value) => {
                  const themeDefaults = getThemeDefaults(value);
                  updateElementSetting('theme', value);
                  updateElementSetting('strokeWidth', themeDefaults.strokeWidth);
                  updateElementSetting('stroke', themeDefaults.stroke);
                }}
              />
            </div>
            
            <Separator />

            {/* Size & Dimensions */}
            <Slider
              label="Brush Size"
              value={element.strokeWidth || 3}
              onChange={(value) => updateElementSetting('strokeWidth', value)}
              min={1}
              max={getMaxStrokeWidth('brush', element.theme || 'default')}
            />
            
            {/* Effects & Decorations */}
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
            
            {/* Colors */}
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

            {/* Appearance & Style */}
            <div>
              <Label variant="xs">Theme</Label>
              <ThemeSelect 
                value={element.theme}
                onChange={(value) => {
                  const themeDefaults = getThemeDefaults(value);
                  updateElementSetting('theme', value);
                  updateElementSetting('strokeWidth', themeDefaults.strokeWidth);
                  updateElementSetting('stroke', themeDefaults.stroke);
                }}
              />
            </div>
            
            <Separator />

            {/* Size & Dimensions */}
            <Slider
              label="Stroke Width"
              value={element.strokeWidth || 2}
              onChange={(value) => updateElementSetting('strokeWidth', value)}
              min={1}
              max={getMaxStrokeWidth('line', element.theme || 'default')}
            />
            
            <Separator />
            
            {/* Colors */}
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
            {/* Appearance & Style */}
            <div>
              <Label variant="xs">Theme</Label>
              <ThemeSelect 
                value={element.theme}
                onChange={(value) => {
                  const themeDefaults = getThemeDefaults(value);
                  updateElementSetting('theme', value);
                  updateElementSetting('strokeWidth', themeDefaults.strokeWidth);
                  updateElementSetting('stroke', themeDefaults.stroke);
                  updateElementSetting('fill', themeDefaults.fill);
                }}
              />
            </div>
            
            <Separator />
            {/* Size & Dimensions */}
            <Slider
              label="Stroke Width"
              value={element.strokeWidth || 2}
              onChange={(value) => updateElementSetting('strokeWidth', value)}
              min={1}
              max={getMaxStrokeWidth(element.type, element.theme || 'default')}
            />
                        
            {/* Colors */}
            <div className='flex flex-row gap-3'>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-shape-stroke')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Stroke Color
              </Button>
         
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowColorSelector('element-shape-fill')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Fill Color
              </Button>
            </div>
            
            
            {/* Effects & Decorations */}
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
            {/* Effects & Decorations */}
            <Slider
              label="Corner Radius"
              value={element.cornerRadius || 0}
              onChange={(value) => updateElementSetting('cornerRadius', value)}
              min={0}
              max={300}
            />
            
            <Separator />
            
            {/* Actions */}
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
            {/* Size & Dimensions */}
            <Label variant='xs'>Font</Label>
            <div>
              <div className="flex gap-2">
                <Button
                  variant={element.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => updateElementSetting('fontWeight', element.fontWeight === 'bold' ? 'normal' : 'bold')}
                  className="px-3"
                >
                  <strong>B</strong>
                </Button>
                <Button
                  variant={element.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => updateElementSetting('fontStyle', element.fontStyle === 'italic' ? 'normal' : 'italic')}
                  className="px-3"
                >
                  <em>I</em>
                </Button>
                <select
                  value={element.fontFamily || 'Arial, sans-serif'}
                  onChange={(e) => updateElementSetting('fontFamily', e.target.value)}
                  className="flex-1 px-1 text-xs border rounded h-7"
                >
                  {FONTS.map(font => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Slider
              label="Size"
              value={element.fontSize || 64}
              onChange={(value) => updateElementSetting('fontSize', value)}
              min={12}
              max={200}
              step={2}
            />
                           
            {/* Colors */}
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
                        
            {/* Layout & Alignment */}
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
                        
            {/* Effects & Decorations */}
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
            
            {/* Ruled Lines Settings - only show when checkbox is checked */}
            {element.ruledLines && (
              <IndentedSection>
                <div>
                  <Label variant="xs">Ruled Lines Theme</Label>
                  <ThemeSelect 
                    value={element.ruledLinesTheme || 'rough'}
                    onChange={(value) => {
                      const themeDefaults = getThemeDefaults(value);
                      updateElementSetting('ruledLinesTheme', value);
                      updateElementSetting('ruledLinesWidth', themeDefaults.strokeWidth);
                      updateElementSetting('ruledLinesColor', themeDefaults.stroke);
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
                
                <Slider
                  label="Line Width"
                  value={element.ruledLinesWidth || 0.8}
                  onChange={(value) => updateElementSetting('ruledLinesWidth', value)}
                  min={0.01}
                  max={30}
                  step={0.1}
                />
              </IndentedSection>
            )}

            <Separator />
                        
            {/* Border & Background */}
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
                  value={element.borderWidth || 1}
                  onChange={(value) => updateElementSetting('borderWidth', value)}
                  min={1}
                  max={getMaxStrokeWidth('text', element.theme || 'default')}
                />            
            
                {(element.textType === 'text' || element.textType === 'question' || element.textType === 'answer') && (
                  <Slider
                    label="Corner Radius"
                    value={element.cornerRadius || 0}
                    onChange={(value) => updateElementSetting('cornerRadius', value)}
                    min={0}
                    max={300}
                  />
                )}
                
                <div>
                  <Label variant="xs">Border Theme</Label>
                  <ThemeSelect 
                    value={element.theme}
                    onChange={(value) => {
                      const themeDefaults = getThemeDefaults(value);
                      updateElementSetting('theme', value);
                      updateElementSetting('borderWidth', themeDefaults.strokeWidth);
                      updateElementSetting('borderColor', themeDefaults.stroke);
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
            
            {(element.backgroundColor && element.backgroundColor !== 'transparent') && (
              <Slider
                label="Background Opacity"
                value={Math.round((element.backgroundOpacity || 1) * 100)}
                onChange={(value) => updateElementSetting('backgroundOpacity', value / 100)}
                min={0}
                max={100}
                step={5}
                unit="%"
              />
            )}
            
            <Separator />
            
            {/* Spacing & Position */}
            <Slider
              label="Padding"
              value={element.padding || 4}
              onChange={(value) => updateElementSetting('padding', value)}
              min={0}
              max={50}
            />
            
            {element.textType === 'question' && user?.role !== 'author' && (
              <>
                <Separator />
                
                {/* Actions */}
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
    <>
      <ToolSettingsContainer 
        isExpanded={!isCollapsed} 
        isVisible={true}
      >

        {/* Header with Collapse Button */}
        <div className="flex items-center justify-between px-2 border-b pb-0">
          {!isCollapsed && (
            <div className="font-semibold text-sm flex items-center gap-2 flex-1">
              {(() => {
                // Check for linked question-answer pair
                if (state.selectedElementIds.length === 2 && state.currentBook) {
                  const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
                    el => state.selectedElementIds.includes(el.id)
                  ) || [];
                  
                  const questionElement = selectedElements.find(el => el.textType === 'question');
                  const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);
                  
                  if (questionElement && answerElement) {
                    return (
                      <Tabs 
                        value={activeLinkedElement || questionElement.id} 
                        onValueChange={setActiveLinkedElement}
                        className="flex-1 h-7"
                      >
                        <TabsList variant="bootstrap" className="grid w-full grid-cols-2">
                          <TabsTrigger variant="bootstrap" value={questionElement.id} className="text-sm h-7">
                            <MessageCircleQuestion className="h-4 w-4 mr-1" />
                            Question
                          </TabsTrigger>
                          <TabsTrigger variant="bootstrap" value={answerElement.id} className="text-sm h-7">
                            <MessageCircleHeart className="h-4 w-4 mr-1" />
                            Answer
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    );
                  }
                }
                
                if (state.selectedElementIds.length > 1) {
                  const IconComponent = TOOL_ICONS.select;
                  return (
                    <>
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      Select Settings
                    </>
                  );
                } else if (state.selectedElementIds.length === 1 && state.currentBook) {
                  const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
                    el => el.id === state.selectedElementIds[0]
                  );
                  if (selectedElement) {
                    const elementType = selectedElement.type === 'text' && selectedElement.textType 
                      ? selectedElement.textType 
                      : selectedElement.type;
                    const IconComponent = TOOL_ICONS[elementType as keyof typeof TOOL_ICONS];
                    return (
                      // <Tabs 
                      //   value={0} 
                      //   className="flex-1"
                      // >
                      //   <TabsList className="grid w-full grid-cols-1 h-8">
                      //     <TabsTrigger value={selectedElement.id} className="text-sm text-primary h-8 -mt-1">
                      //       {IconComponent && <IconComponent className="h-4 w-4 mr-1" />}
                      //       {elementType.charAt(0).toUpperCase() + elementType.slice(1)}
                      //     </TabsTrigger>
                      //   </TabsList>
                      // </Tabs>

                    <Button variant="ghost" size="sm" className="h-8 px-0 gap-2">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      {showColorSelector ? getColorSelectorTitle(showColorSelector) : `${elementType.charAt(0).toUpperCase() + elementType.slice(1)} Settings`}
                    </Button>
                    );
                  }
                  return `Element Settings (${state.selectedElementIds.length})`;
                } else {
                  if (activeTool === 'select') {
                    let settingsName = 'Page Settings';
                    if (showBackgroundSettings) {
                      if (showPatternSettings) {
                        settingsName = 'Pattern Settings';
                      } else {
                        settingsName = 'Background Settings';
                      }
                    } else if (showColorSelector) {
                      settingsName = getColorSelectorTitle(showColorSelector);
                    }
                    return (
                      <>
                        <Settings className="h-4 w-4" />
                        {settingsName}
                      </>
                    );
                  }
                  const IconComponent = TOOL_ICONS[activeTool as keyof typeof TOOL_ICONS];
                  return (
                    <>
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} 
                    </>
                  );
                }
              })()} 
            </div>
          )}
          {!(state.userRole === 'author' && !isOnAssignedPage) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
        
        {/* Selected Tool Icon Preview (when collapsed) */}
        {isCollapsed && state.selectedElementIds.length > 0 && (
          <div className="p-1 pt-3">
            <div className="flex items-center justify-center p-1">
              {(() => {
                // Get the appropriate icon for selected element(s) - same logic as header
                let IconComponent = null;
                
                if (state.selectedElementIds.length === 2 && state.currentBook) {
                  const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
                    el => state.selectedElementIds.includes(el.id)
                  ) || [];
                  
                  const questionElement = selectedElements.find(el => el.textType === 'question');
                  const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);
                  
                  if (questionElement && answerElement) {
                    IconComponent = MessageCircleQuestion;
                  }
                } else if (state.selectedElementIds.length > 1) {
                  IconComponent = TOOL_ICONS.select;
                } else if (state.selectedElementIds.length === 1 && state.currentBook) {
                  const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
                    el => el.id === state.selectedElementIds[0]
                  );
                  if (selectedElement) {
                    const elementType = selectedElement.type === 'text' && selectedElement.textType 
                      ? selectedElement.textType 
                      : selectedElement.type;
                    IconComponent = TOOL_ICONS[elementType as keyof typeof TOOL_ICONS];
                  }
                }
                
                return IconComponent ? (
                  <IconComponent className={`h-6 w-6 ${isFlashing ? 'animate-pulse text-blue-500' : 'text-muted-foreground'}`} />
                ) : null;
              })()} 
            </div>
          </div>
        )}
        
        {/* Tool Settings Main Area */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2 border">
            {shouldShowPanel ? renderToolSettings() : (
              <div className="text-xs text-muted-foreground">
                Select a tool or element to view settings.
              </div>
            )}
          </div>
        )}
      </ToolSettingsContainer>
      
      {showQuestionDialog && state.currentBook && token && (
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <QuestionsManagerContent
              bookId={state.currentBook.id}
              bookName={state.currentBook.name}
              mode="select"
              token={token}
              onQuestionSelect={(questionId, questionText) => {
                if (selectedQuestionElementId) {
                  const updates = questionId === 0 
                    ? { text: '', fill: '#9ca3af', questionId: undefined }
                    : { text: questionText, fill: '#1f2937', questionId: questionId };
                  dispatch({
                    type: 'UPDATE_ELEMENT',
                    payload: {
                      id: selectedQuestionElementId,
                      updates
                    }
                  });
                }
                setShowQuestionDialog(false);
                setSelectedQuestionElementId(null);
              }}
              onClose={() => {
                setShowQuestionDialog(false);
                setSelectedQuestionElementId(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      
      <Modal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setSelectedImageElementId(null);
        }}
        title="Select Image"
      >
        <ImagesContent
          token={token || ''}
          mode="select"
          onImageSelect={(imageId: number, imageUrl: string) => {
            if (selectedImageElementId) {
              const currentElement = state.currentBook?.pages[state.activePageIndex]?.elements.find(el => el.id === selectedImageElementId);
              if (currentElement) {
                const img = new window.Image();
                img.onload = () => {
                  const currentWidth = currentElement.width;
                  const currentHeight = currentElement.height;
                  const newAspectRatio = img.width / img.height;
                  const currentAspectRatio = currentWidth / currentHeight;
                  
                  let newWidth, newHeight;
                  
                  if (Math.abs(newAspectRatio - currentAspectRatio) > 0.5) {
                    // Significant aspect ratio change - swap dimensions
                    const targetArea = currentWidth * currentHeight;
                    newHeight = Math.sqrt(targetArea / newAspectRatio);
                    newWidth = newHeight * newAspectRatio;
                  } else {
                    // Similar aspect ratio - maintain current size
                    if (newAspectRatio > currentAspectRatio) {
                      newWidth = currentWidth;
                      newHeight = currentWidth / newAspectRatio;
                    } else {
                      newHeight = currentHeight;
                      newWidth = currentHeight * newAspectRatio;
                    }
                  }
                  
                  const cacheBustedUrl = `${imageUrl}?t=${Date.now()}`;
                  dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Change Image' });
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: selectedImageElementId,
                      updates: { 
                        src: cacheBustedUrl,
                        width: Math.round(newWidth),
                        height: Math.round(newHeight)
                      }
                    }
                  });
                  setTimeout(() => {
                    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
                    setTimeout(() => {
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [selectedImageElementId] });
                    }, 10);
                  }, 10);
                };
                img.src = imageUrl;
              }
            }
            setShowImageModal(false);
            setSelectedImageElementId(null);
          }}
          onImageUpload={(imageUrl) => {
            if (selectedImageElementId) {
              const currentElement = state.currentBook?.pages[state.activePageIndex]?.elements.find(el => el.id === selectedImageElementId);
              if (currentElement) {
                const img = new window.Image();
                img.onload = () => {
                  const currentWidth = currentElement.width;
                  const currentHeight = currentElement.height;
                  const newAspectRatio = img.width / img.height;
                  const currentAspectRatio = currentWidth / currentHeight;
                  
                  let newWidth, newHeight;
                  
                  if (Math.abs(newAspectRatio - currentAspectRatio) > 0.5) {
                    // Significant aspect ratio change - swap dimensions
                    const targetArea = currentWidth * currentHeight;
                    newHeight = Math.sqrt(targetArea / newAspectRatio);
                    newWidth = newHeight * newAspectRatio;
                  } else {
                    // Similar aspect ratio - maintain current size
                    if (newAspectRatio > currentAspectRatio) {
                      newWidth = currentWidth;
                      newHeight = currentWidth / newAspectRatio;
                    } else {
                      newHeight = currentHeight;
                      newWidth = currentHeight * newAspectRatio;
                    }
                  }
                  
                  const cacheBustedUrl = `${imageUrl}?t=${Date.now()}`;
                  dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Change Image' });
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: selectedImageElementId,
                      updates: { 
                        src: cacheBustedUrl,
                        width: Math.round(newWidth),
                        height: Math.round(newHeight)
                      }
                    }
                  });
                  setTimeout(() => {
                    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
                    setTimeout(() => {
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [selectedImageElementId] });
                    }, 10);
                  }, 10);
                };
                img.src = imageUrl;
              }
            }
            setShowImageModal(false);
            setSelectedImageElementId(null);
          }}
          onClose={() => {
            setShowImageModal(false);
            setSelectedImageElementId(null);
          }}
        />
      </Modal>
      
      <Modal
        isOpen={showBackgroundImageModal}
        onClose={() => setShowBackgroundImageModal(false)}
        title="Select Background Image"
      >
        <ImagesContent
          token={token || ''}
          mode="select"
          onImageSelect={(imageId: number, imageUrl: string) => {
            updateBackground({ type: 'image', value: imageUrl });
            setShowBackgroundImageModal(false);
          }}
          onClose={() => setShowBackgroundImageModal(false)}
        />
      </Modal>

    </>
  );
}