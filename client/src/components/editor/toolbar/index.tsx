import { useState } from 'react';
import { useEditor } from '../../../context/editor-context';
import { ToolbarContainer } from '../../cards/toolbar-container';
import { ToolbarHeader } from './toolbar-header';
import { ToolbarContent } from '../../cards/toolbar-content';
import { TooltipProvider } from '../../ui/tooltip';
import { 
  MousePointer, 
  Hand, 
  MessageCircleMore, 
  MessageCircleQuestion, 
  MessageCircleHeart, 
  Image, 
  Minus, 
  Circle, 
  Square, 
  Paintbrush,
  Palette,
  Wrench,
  Settings,
  Heart,
  Star,
  MessageSquare,
  Dog,
  Cat,
  Smile
} from 'lucide-react';

export default function Toolbar() {
  const { state, dispatch } = useEditor();
  const [isExpanded, setIsExpanded] = useState(true);


  const toolGroups = [
    {
      name: 'Selection',
      tools: [
        { id: 'select', label: 'Select', icon: MousePointer },
        { id: 'pan', label: 'Pan', icon: Hand },
      ]
    },
    {
      name: 'Text',
      tools: [
        { id: 'text', label: 'Text', icon: MessageCircleMore },
        { id: 'question', label: 'Question', icon: MessageCircleQuestion },
        { id: 'answer', label: 'Answer', icon: MessageCircleHeart },
      ]
    },
    {
      name: 'Photos',
      tools: [
        { id: 'photo', label: 'Photo', icon: Image },
      ]
    },
    {
      name: 'Shapes',
      tools: [
        { id: 'line', label: 'Line', icon: Minus },
        { id: 'circle', label: 'Circle', icon: Circle },
        { id: 'rect', label: 'Rectangle', icon: Square },
        { id: 'heart', label: 'Heart', icon: Heart },
        { id: 'star', label: 'Star', icon: Star },
        { id: 'speech-bubble', label: 'Speech Bubble', icon: MessageSquare },
        { id: 'dog', label: 'Dog', icon: Dog },
        { id: 'cat', label: 'Cat', icon: Cat },
        { id: 'smiley', label: 'Smiley', icon: Smile },
      ]
    },
    {
      name: 'Drawing',
      tools: [
        { id: 'brush', label: 'Brush', icon: Paintbrush },
      ]
    },
  ];

  return (
    <TooltipProvider>
      <ToolbarContainer 
        isExpanded={isExpanded} 
        isVisible={state.toolbarVisible}
      >
        <ToolbarHeader 
          isExpanded={isExpanded} 
          onToggle={() => setIsExpanded(!isExpanded)}
        />
        <div className="px-2">
          <ToolbarContent 
            toolGroups={toolGroups}
            activeTool={state.activeTool}
            isExpanded={isExpanded}
            onToolSelect={(toolId) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: toolId as any })}
          />
        </div>
      </ToolbarContainer>
    </TooltipProvider>
  );
}

// Re-export components for external use
export { ToolButton } from './tool-button';
export { ToolGroup } from './tool-group';
export { ToolGroupLabel } from './tool-group-label';
export { ToolGroupSeparator } from './tool-group-separator';
export { ToolbarHeader } from './toolbar-header';
export { ToolbarToggle } from './toolbar-toggle';