import { useState } from 'react';
import { useEditor } from '../../context/editor-context';
import { ToolbarContainer } from '../cards/toolbar-container';
import { ToolbarHeader } from '../ui/toolbar-header';
import { ToolbarContent } from '../cards/toolbar-content';
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
  Paintbrush
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
    <ToolbarContainer 
      isExpanded={isExpanded} 
      isVisible={state.toolbarVisible}
    >
      <ToolbarHeader 
        isExpanded={isExpanded} 
        onToggle={() => setIsExpanded(!isExpanded)} 
      />
      <ToolbarContent 
        toolGroups={toolGroups}
        activeTool={state.activeTool}
        isExpanded={isExpanded}
        onToolSelect={(toolId) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: toolId as any })}
      />
    </ToolbarContainer>
  );
}