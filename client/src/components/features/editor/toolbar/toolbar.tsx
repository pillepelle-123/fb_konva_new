import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { ToolbarContainer } from './toolbar-container';
import { ToolbarHeader } from './toolbar-header';
import { ToolbarContent } from './toolbar-content';
import { TooltipProvider } from '../../../ui/composites/tooltip';
import { 
  SquareMousePointer, 
  Hand, 
  MessageCircle, 
  MessageCircleQuestion, 
  MessageCircleHeart, 
  MessageCircleMore,
  Image, 
  Minus, 
  Circle, 
  Square, 
  Paintbrush,
  Heart,
  Star,
  MessageSquare,
  Dog,
  Cat,
  Smile,
  MessagesSquare,
  Triangle,
  Pentagon
} from 'lucide-react';

export default function Toolbar() {
  const { state, dispatch } = useEditor();
  const [isExpanded, setIsExpanded] = useState(true);
  const toolbarContentRef = useRef<{ closeSubmenus: () => void }>(null);
  
  const isOnAssignedPage = state.userRole === 'author' 
    ? state.assignedPages.includes(state.activePageIndex + 1)
    : true;
  

  
  // Force collapsed state for authors on non-assigned pages
  useEffect(() => {
    if (state.userRole === 'author' && !isOnAssignedPage) {
      setIsExpanded(false);
    }
  }, [state.userRole, isOnAssignedPage]);

  const toolGroups = [
    {
      name: 'Selection',
      tools: [
        { id: 'select', label: 'Select', icon: SquareMousePointer },
        { id: 'pan', label: 'Pan', icon: Hand },
      ]
    },
    {
      name: 'Text',
      tools: [
        { id: 'text', label: 'Text', icon: MessageCircle },
        { id: 'question', label: 'Question', icon: MessageCircleQuestion },
        { id: 'answer', label: 'Answer', icon: MessageCircleHeart },
        { id: 'qna', label: 'Q&A', icon: MessagesSquare },
        { id: 'qna_inline', label: 'Rich Text', icon: MessageCircleMore },
      ]
    },
    {
      name: 'Images',
      tools: [
        { id: 'image', label: 'Image', icon: Image },
      ]
    },
    {
      name: 'Shapes',
      tools: [
        { id: 'line', label: 'Line', icon: Minus },
        { id: 'circle', label: 'Circle', icon: Circle },
        { id: 'triangle', label: 'Triangle', icon: Triangle },
        { id: 'rect', label: 'Rectangle', icon: Square },
        { id: 'polygon', label: 'Polygon', icon: Pentagon },
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
          onToggle={() => {
            if (isExpanded) {
              toolbarContentRef.current?.closeSubmenus();
            }
            setIsExpanded(!isExpanded);
          }}
          activeTool={state.activeTool}
          toolGroups={toolGroups}
          hideToggle={state.userRole === 'author' && !isOnAssignedPage}
        />
        {/* <div className='p-0'> */}
          <ToolbarContent 
            ref={toolbarContentRef}
            toolGroups={toolGroups}
            activeTool={state.activeTool}
            isExpanded={isExpanded}
            userRole={state.userRole}
            isOnAssignedPage={isOnAssignedPage}
            onToolSelect={(toolId) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: toolId as any })}
          />
        {/* </div> */}
      </ToolbarContainer>
    </TooltipProvider>
  );
}