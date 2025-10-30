import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { ToolbarContainer } from './toolbar-container';
import { ToolbarHeader } from './toolbar-header';
import { ToolbarContent } from './toolbar-content';
import { TooltipProvider } from '../../../ui/composites/tooltip';

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
          hideToggle={state.userRole === 'author' && !isOnAssignedPage}
        />
        <ToolbarContent 
          ref={toolbarContentRef}
          activeTool={state.activeTool}
          isExpanded={isExpanded}
          userRole={state.userRole}
          isOnAssignedPage={isOnAssignedPage}
          onToolSelect={(toolId) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: toolId as any })}
        />
      </ToolbarContainer>
    </TooltipProvider>
  );
}