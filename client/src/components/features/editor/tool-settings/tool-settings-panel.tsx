import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronRight, ChevronLeft, MousePointer, Hand, MessageCircleMore, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolSettingsContainer } from './tool-settings-container';
import { Dialog, DialogContent } from '../../../ui/overlays/dialog';
import QuestionsManagerContent from '../../questions/questions-manager-content';
import { useAuth } from '../../../../context/auth-context';
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

export default function ToolSettingsPanel() {
  const { state, dispatch } = useEditor();
  const { token, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [selectedQuestionElementId, setSelectedQuestionElementId] = useState<string | null>(null);
  const [activeLinkedElement, setActiveLinkedElement] = useState<string | null>(null);
  
  const toolSettings = state.toolSettings || {};
  const activeTool = state.activeTool;
  
  const updateToolSetting = (key: string, value: any) => {
    dispatch({
      type: 'UPDATE_TOOL_SETTINGS',
      payload: { tool: activeTool, settings: { [key]: value } }
    });
  };

  // Auto-expand when tool is selected or elements are selected
  useEffect(() => {
    const shouldExpand = !['select', 'pan'].includes(activeTool) || state.selectedElementIds.length > 0;
    if (shouldExpand) {
      setIsCollapsed(false);
    }
    
    // Set default active element for linked pairs
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
  }, [activeTool, state.selectedElementIds.length, state.currentBook, state.activePageIndex, activeLinkedElement]);

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
        
        return (
          <div className="space-y-4">
            <ButtonGroup className="w-full">
              <Button
                variant={activeLinkedElement === questionElement.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveLinkedElement(questionElement.id)}
                className="flex-1"
              >
                <MessageCircleQuestion className="h-4 w-4 mr-1" />
                Question
              </Button>
              <Button
                variant={activeLinkedElement === answerElement.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveLinkedElement(answerElement.id)}
                className="flex-1"
              >
                <MessageCircleHeart className="h-4 w-4 mr-1" />
                Answer
              </Button>
            </ButtonGroup>
            {renderElementSettings(activeElement)}
          </div>
        );
      }
    }
    
    // If multiple elements are selected (not linked pair), show selection list
    if (state.selectedElementIds.length > 1 && state.currentBook) {
      const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
        el => state.selectedElementIds.includes(el.id)
      ) || [];
      
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium mb-3">Selected Items ({selectedElements.length})</div>
          {selectedElements.map((element, index) => {
            const elementType = element.type === 'text' && element.textType 
              ? element.textType 
              : element.type;
            const IconComponent = TOOL_ICONS[elementType as keyof typeof TOOL_ICONS];
            return (
              <div key={element.id} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
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
              <label className="text-sm font-medium block mb-2">Stroke Width</label>
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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Brush Size</label>
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

      case 'rect':
      case 'circle':
      case 'heart':
      case 'star':
      case 'speech-bubble':
      case 'dog':
      case 'cat':
      case 'smiley':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Stroke Width</label>
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
            
            <div>
              <label className="text-sm font-medium block mb-2">Stroke Color</label>
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
            
            <div>
              <label className="text-sm font-medium block mb-2">Fill Color</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                <button
                  className={`w-8 h-8 rounded border-2 ${
                    (settings.fill || 'transparent') === 'transparent' ? 'border-gray-400' : 'border-gray-200'
                  } bg-white relative`}
                  onClick={() => updateToolSetting('fill', 'transparent')}
                >
                  <div className="absolute inset-0 bg-red-500 transform rotate-45 w-px h-full left-1/2 top-0"></div>
                </button>
                {COLORS.slice(0, 9).map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Font Size</label>
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
              <label className="text-sm font-medium block mb-2">Font Family</label>
              <select
                value={settings.fontFamily || 'Arial, sans-serif'}
                onChange={(e) => updateToolSetting('fontFamily', e.target.value)}
                className="w-full p-2 border rounded"
              >
                {FONTS.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Text Color</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      (settings.fill || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateToolSetting('fill', color)}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Text Align</label>
              <ButtonGroup className="mt-2">
                <Button
                  variant={settings.align === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'left')}
                  className="px-2"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={settings.align === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'center')}
                  className="px-2"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={settings.align === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'right')}
                  className="px-2"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                  variant={settings.align === 'justify' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateToolSetting('align', 'justify')}
                  className="px-2"
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </ButtonGroup>
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
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: { id: element.id, updates: { [key]: value } }
      });
    };

    switch (element.type) {
      case 'line':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Stroke Width</label>
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

      case 'rect':
      case 'circle':
      case 'heart':
      case 'star':
      case 'speech-bubble':
      case 'dog':
      case 'cat':
      case 'smiley':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Stroke Width</label>
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
            
            <div>
              <label className="text-sm font-medium block mb-2">Stroke Color</label>
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
            
            <div>
              <label className="text-sm font-medium block mb-2">Fill Color</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                <button
                  className={`w-8 h-8 rounded border-2 ${
                    (element.fill || 'transparent') === 'transparent' ? 'border-gray-400' : 'border-gray-200'
                  } bg-white relative`}
                  onClick={() => updateElementSetting('fill', 'transparent')}
                >
                  <div className="absolute inset-0 bg-red-500 transform rotate-45 w-px h-full left-1/2 top-0"></div>
                </button>
                {COLORS.slice(0, 9).map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
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

      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Font Size</label>
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
            
            <div>
              <label className="text-sm font-medium block mb-2">Font Family</label>
              <select
                value={element.fontFamily || 'Arial, sans-serif'}
                onChange={(e) => updateElementSetting('fontFamily', e.target.value)}
                className="w-full p-2 border rounded"
              >
                {FONTS.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Text Color</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      (element.fill || '#1f2937') === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementSetting('fill', color)}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Text Align</label>
              <ButtonGroup className="mt-2">
                <Button
                  variant={element.align === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'left')}
                  className="px-2"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={element.align === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'center')}
                  className="px-2"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={element.align === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'right')}
                  className="px-2"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                  variant={element.align === 'justify' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateElementSetting('align', 'justify')}
                  className="px-2"
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </ButtonGroup>
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
        <div className="flex items-center justify-between p-4 border-b">
          {!isCollapsed && (
            <h3 className="font-semibold text-sm flex items-center gap-2">
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
                      <>
                        <MessageCircleQuestion className="h-4 w-4" />
                        Question & Answer Settings
                      </>
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
                      <>
                        {IconComponent && <IconComponent className="h-4 w-4" />}
                        {elementType.charAt(0).toUpperCase() + elementType.slice(1)} Settings
                      </>
                    );
                  }
                  return `Element Settings (${state.selectedElementIds.length})`;
                } else {
                  const IconComponent = TOOL_ICONS[activeTool as keyof typeof TOOL_ICONS];
                  return (
                    <>
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Settings
                    </>
                  );
                }
              })()} 
            </h3>
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
        
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            {shouldShowPanel ? renderToolSettings() : (
              <div className="text-sm text-muted-foreground">
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