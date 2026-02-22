import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { ToolbarContainer } from './toolbar-container';
import { ToolbarHeader } from './toolbar-header';
import { ToolbarContent } from './toolbar-content';
import { TooltipProvider } from '../../../ui/composites/tooltip';

export default function Toolbar() {
  const { state, dispatch, canUseTool } = useEditor();
  const [isExpanded, setIsExpanded] = useState(true);
  const toolbarContentRef = useRef<{ closeSubmenus: () => void }>(null);

  const toolAccessAllowed = canUseTool(state.activeTool);
  const isAnswerOnly = canUseTool('select');
  
  // Force collapsed state when tools are not available (except answer-only mode where select/pan/zoom work)
  useEffect(() => {
    if (!toolAccessAllowed && !isAnswerOnly) {
      setIsExpanded(false);
    }
  }, [toolAccessAllowed, isAnswerOnly]);

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
          hideToggle={!toolAccessAllowed && !isAnswerOnly}
        />
        <ToolbarContent 
          ref={toolbarContentRef}
          activeTool={state.activeTool}
          isExpanded={isExpanded}
          onToolSelect={(toolId) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: toolId as any })}
        />
      </ToolbarContainer>
    </TooltipProvider>
  );
}