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
import { Modal } from '../../../ui/overlays/modal';
import ImagesContent from '../../images/images-content';
import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';

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
  }, [activeTool, state.selectedElementIds.length]);

  const shouldShowPanel = activeTool !== 'pan' && (state.selectedElementIds.length > 0 || activeTool === 'select');

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
    
    // Show general settings when select tool is active and no elements selected
    if (activeTool === 'select' && state.selectedElementIds.length === 0) {
      return renderGeneralSettings();
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
                min={1}
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
            
            {activeTool === 'rect' && (
              <div className={SETTINGS_SECTION_CLASS}>
                <label className={SETTINGS_LABEL_CLASS}>Corner Radius</label>
                <input
                  type="range"
                  value={settings.cornerRadius || 0}
                  onChange={(e) => updateToolSetting('cornerRadius', parseInt(e.target.value))}
                  max={50}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{settings.cornerRadius || 0}px</span>
              </div>
            )}
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
            
            {(activeTool === 'text' || activeTool === 'question' || activeTool === 'answer') && (
              <div>
                <label className="text-xs font-medium block mb-1">Corner Radius</label>
                <input
                  type="range"
                  value={settings.cornerRadius || 0}
                  onChange={(e) => updateToolSetting('cornerRadius', parseInt(e.target.value))}
                  max={300}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{settings.cornerRadius || 0}px</span>
              </div>
            )}
            
            <div>
              <label className="text-xs font-medium block mb-1">Border Width</label>
              <input
                type="range"
                value={settings.borderWidth || 0}
                onChange={(e) => updateToolSetting('borderWidth', parseInt(e.target.value))}
                max={20}
                min={0}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{settings.borderWidth || 0}px</span>
            </div>
            
            {(settings.borderWidth || 0) > 0 && (
              <div>
                <label className="text-xs font-medium block mb-1">Border Color</label>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border ${
                        (settings.borderColor || '#000000') === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateToolSetting('borderColor', color)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="text-xs font-medium block mb-1">Background Color</label>
              <div className="grid grid-cols-5 gap-1 mt-1">
                <button
                  className={`w-6 h-6 rounded border ${
                    (settings.backgroundColor || 'transparent') === 'transparent' ? 'border-gray-400' : 'border-gray-200'
                  } bg-white relative`}
                  onClick={() => updateToolSetting('backgroundColor', 'transparent')}
                >
                  <div className="absolute inset-0 bg-red-500 transform rotate-45 w-px h-full left-1/2 top-0"></div>
                </button>
                {COLORS.slice(0, 9).map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border ${
                      (settings.backgroundColor || 'transparent') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateToolSetting('backgroundColor', color)}
                  />
                ))}
              </div>
            </div>
            
            {(settings.backgroundColor && settings.backgroundColor !== 'transparent') && (
              <div>
                <label className="text-xs font-medium block mb-1">Background Opacity</label>
                <input
                  type="range"
                  value={(settings.backgroundOpacity || 1) * 100}
                  onChange={(e) => updateToolSetting('backgroundOpacity', parseInt(e.target.value) / 100)}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{Math.round((settings.backgroundOpacity || 1) * 100)}%</span>
              </div>
            )}
            
            <div>
              <label className="text-xs font-medium block mb-1">Padding</label>
              <input
                type="range"
                value={settings.padding || 4}
                onChange={(e) => updateToolSetting('padding', parseInt(e.target.value))}
                max={50}
                min={0}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{settings.padding || 4}px</span>
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

  const renderGeneralSettings = () => {
    if (showBackgroundSettings) {
      return renderBackgroundSettings();
    }

    return (
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="default"
          onClick={() => setShowBackgroundSettings(true)}
          className="w-full justify-start"
        >
          <Settings className="h-4 w-4 mr-2 hidden" />
          Background
        </Button>
        {/* Separator */}
        <div className="h-px bg-gray-200 my-1" />
        <Button
          variant="ghost"
          size="default"
          // onClick={() => setShowBackgroundSettings(true)}
          className="w-full justify-start"
        >
          {/* <Settings className="h-4 w-4 mr-2" /> */}
          <Settings className="h-4 w-4 mr-2 hidden" />
          Setting 2
        </Button>
        <div className="h-px bg-gray-200 my-1" />
        <Button
          variant="ghost"
          size="default"
          // onClick={() => setShowBackgroundSettings(true)}
          className="w-full justify-start"
        >
          {/* <Settings className="h-4 w-4 mr-2" /> */}
          <Settings className="h-4 w-4 mr-2 hidden" />
          Setting 3
        </Button>
        <div className="h-px bg-gray-200 my-1" />
      </div>
    );
  };

  const renderBackgroundSettings = () => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
    const isPattern = background.type === 'pattern';
    const currentColor = isPattern ? (background.patternForegroundColor || '#666666') : background.value;

    const updateBackground = (updates: Partial<PageBackground>) => {
      const newBackground = { ...background, ...updates };
      dispatch({
        type: 'UPDATE_PAGE_BACKGROUND',
        payload: { pageIndex: state.activePageIndex, background: newBackground }
      });
    };

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
            <label className="text-xs font-medium block mb-1">Pattern</label>
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
          
          <div>
            <label className="text-xs font-medium block mb-1">Pattern Size</label>
            <input
              type="range"
              value={background.patternSize || 1}
              onChange={(e) => updateBackground({ patternSize: parseInt(e.target.value) })}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">Size: {background.patternSize || 1}</span>
          </div>
          
          <div>
            <label className="text-xs font-medium block mb-1">Pattern Stroke Width</label>
            <input
              type="range"
              value={background.patternStrokeWidth || 1}
              onChange={(e) => updateBackground({ patternStrokeWidth: parseInt(e.target.value) })}
              max={10}
              min={1}
              step={background.patternSize > 5 ? 1 : 4}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{background.patternStrokeWidth || 1}px</span>
          </div>
          
          <div>
            <label className="text-xs font-medium block mb-1">Background Color</label>
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border ${
                    (background.patternBackgroundColor || 'transparent') === color ? 'border-gray-400' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateBackground({ patternBackgroundColor: color })}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium block mb-1">Opacity</label>
            <input
              type="range"
              value={(background.patternBackgroundOpacity || 1) * 100}
              onChange={(e) => updateBackground({ patternBackgroundOpacity: parseInt(e.target.value) / 100 })}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{Math.round((background.patternBackgroundOpacity || 1) * 100)}%</span>
          </div>
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
              <label className="text-xs font-medium block mb-1">Color</label>
              <div className="grid grid-cols-5 gap-1">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border ${
                      currentColor === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (isPattern) {
                        updateBackground({ patternForegroundColor: color });
                      } else {
                        updateBackground({ value: color });
                      }
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-row gap-5 items-center h-12 space-x-2">
                <span className="flex items-center gap-1 text-xs font-medium">
                <Checkbox
                  id="pattern"
                  checked={isPattern}
                  onCheckedChange={togglePattern}
                />
                <label htmlFor="pattern" className="text-sm font-medium cursor-pointer">
                  Pattern
                </label>
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
                  size="sm"
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
              size="sm"
              onClick={() => setShowBackgroundImageModal(true)}
              className="w-full"
            >
              <Image className="h-4 w-4 mr-2" />
              {background.value ? 'Change Image' : 'Select Image'}
            </Button>
            
            {background.value && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium block mb-1">Size</label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      variant={background.imageSize === 'cover' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateBackground({ imageSize: 'cover' })}
                      className="text-xs"
                    >
                      Cover
                    </Button>
                    <Button
                      variant={background.imageSize === 'contain' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateBackground({ imageSize: 'contain' })}
                      className="text-xs"
                    >
                      Contain
                    </Button>
                    <Button
                      variant={background.imageSize === 'stretch' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateBackground({ imageSize: 'stretch' })}
                      className="text-xs"
                    >
                      Stretch
                    </Button>
                  </div>
                </div>
                
                {background.imageSize === 'contain' && (
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={background.imageRepeat || false}
                        onChange={(e) => updateBackground({ imageRepeat: e.target.checked })}
                        className="rounded w-3 h-3"
                      />
                      Repeat
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-medium block mb-1">Opacity</label>
          <input
            type="range"
            value={(background.opacity || 1) * 100}
            onChange={(e) => updateBackground({ opacity: parseInt(e.target.value) / 100 })}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <span className="text-xs text-muted-foreground">{Math.round((background.opacity || 1) * 100)}%</span>
        </div>
      </div>
    );
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
                min={1}
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
            
            {element.type === 'rect' && (
              <div className={SETTINGS_SECTION_CLASS}>
                <label className={SETTINGS_LABEL_CLASS}>Corner Radius</label>
                <input
                  type="range"
                  value={element.cornerRadius || 0}
                  onChange={(e) => updateElementSetting('cornerRadius', parseInt(e.target.value))}
                  max={300}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{element.cornerRadius || 0}px</span>
              </div>
            )}
          </div>
        );

      case 'image':
      case 'placeholder':
        return (
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedImageElementId(element.id);
                setShowImageModal(true);
              }}
              className="w-full"
            >
              <Image className="h-4 w-4 mr-2" />
              Change Image
            </Button>
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Corner Radius</label>
              <input
                type="range"
                value={element.cornerRadius || 0}
                onChange={(e) => updateElementSetting('cornerRadius', parseInt(e.target.value))}
                max={300}
                min={0}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{element.cornerRadius || 0}px</span>
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
            
            {(element.textType === 'text' || element.textType === 'question' || element.textType === 'answer') && (
              <div className={SETTINGS_SECTION_CLASS}>
                <label className={SETTINGS_LABEL_CLASS}>Corner Radius</label>
                <input
                  type="range"
                  value={element.cornerRadius || 0}
                  onChange={(e) => updateElementSetting('cornerRadius', parseInt(e.target.value))}
                  max={300}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{element.cornerRadius || 0}px</span>
              </div>
            )}
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Border Width</label>
              <input
                type="range"
                value={element.borderWidth || 0}
                onChange={(e) => updateElementSetting('borderWidth', parseInt(e.target.value))}
                max={20}
                min={0}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{element.borderWidth || 0}px</span>
            </div>
            
            {(element.borderWidth || 0) > 0 && (
              <div className={SETTINGS_SECTION_CLASS}>
                <label className={SETTINGS_LABEL_CLASS}>Border Color</label>
                <div className={COLOR_GRID_CLASS}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`${COLOR_BUTTON_CLASS} ${
                        (element.borderColor || '#000000') === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateElementSetting('borderColor', color)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Background Color</label>
              <div className={COLOR_GRID_CLASS}>
                <button
                  className={`${COLOR_BUTTON_CLASS} ${
                    (element.backgroundColor || 'transparent') === 'transparent' ? 'border-gray-400' : 'border-gray-200'
                  } bg-white relative`}
                  onClick={() => updateElementSetting('backgroundColor', 'transparent')}
                >
                  <div className="absolute inset-0 bg-red-500 transform rotate-45 w-px h-full left-1/2 top-0"></div>
                </button>
                {COLORS.slice(0, 9).map(color => (
                  <button
                    key={color}
                    className={`${COLOR_BUTTON_CLASS} ${
                      (element.backgroundColor || 'transparent') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementSetting('backgroundColor', color)}
                  />
                ))}
              </div>
            </div>
            
            {(element.backgroundColor && element.backgroundColor !== 'transparent') && (
              <div className={SETTINGS_SECTION_CLASS}>
                <label className={SETTINGS_LABEL_CLASS}>Background Opacity</label>
                <input
                  type="range"
                  value={(element.backgroundOpacity || 1) * 100}
                  onChange={(e) => updateElementSetting('backgroundOpacity', parseInt(e.target.value) / 100)}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{Math.round((element.backgroundOpacity || 1) * 100)}%</span>
              </div>
            )}
            
            <div className={SETTINGS_SECTION_CLASS}>
              <label className={SETTINGS_LABEL_CLASS}>Padding</label>
              <input
                type="range"
                value={element.padding || 4}
                onChange={(e) => updateElementSetting('padding', parseInt(e.target.value))}
                max={50}
                min={0}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{element.padding || 4}px</span>
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
                      {elementType.charAt(0).toUpperCase() + elementType.slice(1)} Settings   
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
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
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