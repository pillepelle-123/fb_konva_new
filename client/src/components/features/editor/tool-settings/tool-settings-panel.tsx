import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronRight, ChevronLeft, MousePointer, Hand, MessageCircleMore, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile, AlignLeft, AlignCenter, AlignRight, AlignJustify, Settings, Rows4, Rows3, Rows2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolSettingsContainer } from './tool-settings-container';
import { Dialog, DialogContent } from '../../../ui/overlays/dialog';
import QuestionsManagerContent from '../../questions/questions-manager-content';
import { useAuth } from '../../../../context/auth-context';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/composites/tabs';
import { ButtonGroup } from '../../../ui/composites/button-group';

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
  photo: Image,
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

  const shouldShowPanel = !['select', 'pan'].includes(activeTool) || state.selectedElementIds.length > 0;

  const renderToolSettings = () => {
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
    
    // Otherwise show tool settings
    const settings = toolSettings[activeTool] || {};

    switch (activeTool) {
      case 'line':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2">Stroke Width</label>
              <input
                type="range"
                value={settings.strokeWidth || 2}
                onChange={(e) => updateToolSetting('strokeWidth', parseInt(e.target.value))}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{settings.strokeWidth || 2}px</span>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Color</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      (settings.stroke || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateToolSetting('stroke', color)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'brush':
        return (
          <div className="space-y-2">
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Brush Size</label>
              <input
                type="range"
                value={settings.strokeWidth || 3}
                onChange={(e) => updateToolSetting('strokeWidth', parseInt(e.target.value))}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{settings.strokeWidth || 3}px</span>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Color</label>
              <div className={COLOR_GRID_CLASS}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`${COLOR_BUTTON_CLASS} ${
                      (settings.stroke || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateToolSetting('stroke', color)}
                  />
                ))}
              </div>
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
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Stroke Width</label>
              <input
                type="range"
                value={settings.strokeWidth || 2}
                onChange={(e) => updateToolSetting('strokeWidth', parseInt(e.target.value))}
                max={20}
                min={0}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{settings.strokeWidth || 2}px</span>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Stroke Color</label>
              <div className={COLOR_GRID_CLASS}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`${COLOR_BUTTON_CLASS} ${
                      (settings.stroke || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateToolSetting('stroke', color)}
                  />
                ))}
              </div>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Fill Color</label>
              <div className={COLOR_GRID_CLASS}>
                <button
                  className={`${COLOR_BUTTON_CLASS} ${
                    (settings.fill || 'transparent') === 'transparent' ? 'border-gray-400' : 'border-gray-200'
                  } bg-white relative`}
                  onClick={() => updateToolSetting('fill', 'transparent')}
                >
                  <div className="absolute inset-0 bg-red-500 transform rotate-45 w-px h-full left-1/2 top-0"></div>
                </button>
                {COLORS.slice(0, 9).map(color => (
                  <button
                    key={color}
                    className={`${COLOR_BUTTON_CLASS} ${
                      (settings.fill || 'transparent') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateToolSetting('fill', color)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'text':
      case 'question':
      case 'answer':
        return (
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium block mb-1">Font Size</label>
              <input
                type="range"
                value={settings.fontSize || 64}
                onChange={(e) => updateToolSetting('fontSize', parseInt(e.target.value))}
                max={200}
                min={12}
                step={2}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{settings.fontSize || 64}px</span>
            </div>
            
            <div>
              <label className="text-xs font-medium block mb-1">Font Family</label>
              <select
                value={settings.fontFamily || 'Arial, sans-serif'}
                onChange={(e) => updateToolSetting('fontFamily', e.target.value)}
                className="w-full p-1 text-xs border rounded"
              >
                {FONTS.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium block mb-1">Text Color</label>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border ${
                      (settings.fill || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateToolSetting('fill', color)}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium block mb-1">Text Align</label>
              <ButtonGroup className="mt-1">
                <Button
                  variant={settings.align === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'left')}
                  className="px-1 h-6"
                >
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant={settings.align === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'center')}
                  className="px-1 h-6"
                >
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button
                  variant={settings.align === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'right')}
                  className="px-1 h-6"
                >
                  <AlignRight className="h-3 w-3" />
                </Button>
                <Button
                  variant={settings.align === 'justify' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'justify')}
                  className="px-1 h-6"
                >
                  <AlignJustify className="h-3 w-3" />
                </Button>
              </ButtonGroup>
            </div>
            
            {activeTool !== 'question' && (
              <div>
                <label className="text-xs font-medium block mb-1">Paragraph Spacing</label>
                <ButtonGroup className="mt-1">
                  <Button
                    variant={settings.paragraphSpacing === 'small' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateToolSetting('paragraphSpacing', 'small')}
                    className="px-1 h-6"
                  >
                    <Rows4 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={(settings.paragraphSpacing || 'medium') === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateToolSetting('paragraphSpacing', 'medium')}
                    className="px-1 h-6"
                  >
                    <Rows3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={settings.paragraphSpacing === 'large' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateToolSetting('paragraphSpacing', 'large')}
                    className="px-1 h-6"
                  >
                    <Rows2 className="h-3 w-3" />
                  </Button>
                </ButtonGroup>
              </div>
            )}
            
            <div>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={settings.ruledLines || false}
                  onChange={(e) => updateToolSetting('ruledLines', e.target.checked)}
                  className="rounded w-3 h-3"
                />
                Ruled Lines
              </label>
            </div>

          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No settings available for this tool.
          </div>
        );
    }
  };

  const renderElementSettings = (element: any) => {
    const updateElementSetting = (key: string, value: any) => {
      // Save to history before updating element
      dispatch({ type: 'SAVE_TO_HISTORY', payload: `Update ${element.type} ${key}` });
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: element.id, updates: { [key]: value } }
      });
    };

    switch (element.type) {
      case 'brush':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Brush Size</label>
              <input
                type="range"
                value={element.strokeWidth || 3}
                onChange={(e) => updateElementSetting('strokeWidth', parseInt(e.target.value))}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{element.strokeWidth || 3}px</span>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Color</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      (element.stroke || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementSetting('stroke', color)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'line':
        return (
          <div className="space-y-1">
            <div>
              <label className="text-xs font-medium block mb-1">Stroke Width</label>
              <input
                type="range"
                value={element.strokeWidth || 2}
                onChange={(e) => updateElementSetting('strokeWidth', parseInt(e.target.value))}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground 0">{element.strokeWidth || 2}px</span>
            </div>
            
            <div>
              <label className="text-xs font-medium block mb-1">Color</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      (element.stroke || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementSetting('stroke', color)}
                  />
                ))}
              </div>
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
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Stroke Width</label>
              <input
                type="range"
                value={element.strokeWidth || 2}
                onChange={(e) => updateElementSetting('strokeWidth', parseInt(e.target.value))}
                max={20}
                min={0}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{element.strokeWidth || 2}px</span>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Stroke Color</label>
              <div className={COLOR_GRID_CLASS}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`${COLOR_BUTTON_CLASS} ${
                      (element.stroke || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementSetting('stroke', color)}
                  />
                ))}
              </div>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Fill Color</label>
              <div className={COLOR_GRID_CLASS}>
                <button
                  className={`${COLOR_BUTTON_CLASS} ${
                    (element.fill || 'transparent') === 'transparent' ? 'border-gray-400' : 'border-gray-200'
                  } bg-white relative`}
                  onClick={() => updateElementSetting('fill', 'transparent')}
                >
                  <div className="absolute inset-0 bg-red-500 transform rotate-45 w-px h-full left-1/2 top-0"></div>
                </button>
                {COLORS.slice(0, 9).map(color => (
                  <button
                    key={color}
                    className={`${COLOR_BUTTON_CLASS} ${
                      (element.fill || 'transparent') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementSetting('fill', color)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'photo':
      case 'placeholder':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Photo element settings
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Font Size</label>
              <input
                type="range"
                value={element.fontSize || 64}
                onChange={(e) => updateElementSetting('fontSize', parseInt(e.target.value))}
                max={200}
                min={12}
                step={2}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{element.fontSize || 64}px</span>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Font Family</label>
              <select
                value={element.fontFamily || 'Arial, sans-serif'}
                onChange={(e) => updateElementSetting('fontFamily', e.target.value)}
                className="w-full p-1 text-xs border rounded"
              >
                {FONTS.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Text Color</label>
              <div className={COLOR_GRID_CLASS}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`${COLOR_BUTTON_CLASS} ${
                      (element.fill || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementSetting('fill', color)}
                  />
                ))}
              </div>
            </div>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Text Align</label>
              <ButtonGroup className="mt-1">
                <Button
                  variant={element.align === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'left')}
                  className="px-1 h-6"
                >
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant={element.align === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'center')}
                  className="px-1 h-6"
                >
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button
                  variant={element.align === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'right')}
                  className="px-1 h-6"
                >
                  <AlignRight className="h-3 w-3" />
                </Button>
                <Button
                  variant={element.align === 'justify' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'justify')}
                  className="px-1 h-6"
                >
                  <AlignJustify className="h-3 w-3" />
                </Button>
              </ButtonGroup>
            </div>
            
            {element.textType !== 'question' && (
              <div className={SETTINGS_SECTION_CLASS}>
                <label className={SETTINGS_LABEL_CLASS}>Paragraph Spacing</label>
                <ButtonGroup className="mt-1">
                  <Button
                    variant={element.paragraphSpacing === 'small' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateElementSetting('paragraphSpacing', 'small')}
                    className="px-1 h-6"
                  >
                    <Rows4 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={(element.paragraphSpacing || 'medium') === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateElementSetting('paragraphSpacing', 'medium')}
                    className="px-1 h-6"
                  >
                    <Rows3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={element.paragraphSpacing === 'large' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateElementSetting('paragraphSpacing', 'large')}
                    className="px-1 h-6"
                  >
                    <Rows2 className="h-3 w-3" />
                  </Button>
                </ButtonGroup>
              </div>
            )}
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={element.ruledLines || false}
                  onChange={(e) => updateElementSetting('ruledLines', e.target.checked)}
                  className="rounded w-3 h-3"
                />
                Ruled Lines
              </label>
            </div>
            
            {element.textType === 'question' && user?.role !== 'author' && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedQuestionElementId(element.id);
                    setShowQuestionDialog(true);
                  }}
                  className="w-full"
                >
                  Question...
                </Button>
              </div>
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
        <div className="flex items-center justify-between py-1 px-2 border-b">
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
                        className="flex-1"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value={questionElement.id} className="text-sm">
                            <MessageCircleQuestion className="h-4 w-4 mr-1" />
                            Question
                          </TabsTrigger>
                          <TabsTrigger value={answerElement.id} className="text-sm">
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
                      <Tabs 
                        value={0} 
                        className="flex-1"
                      >
                        <TabsList className="grid w-full grid-cols-1">
                          <TabsTrigger value={selectedElement.id} className="text-sm text-primary">
                            {IconComponent && <IconComponent className="h-4 w-4 mr-1" />}
                            {elementType.charAt(0).toUpperCase() + elementType.slice(1)}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    );
                  }
                  return `Element Settings (${state.selectedElementIds.length})`;
                } else {
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
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
          <div className="flex-1 overflow-y-auto p-2">
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
    </>
  );
}