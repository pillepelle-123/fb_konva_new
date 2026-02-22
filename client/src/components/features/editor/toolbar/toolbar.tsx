import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { ToolbarContainer } from './toolbar-container';
import { ToolbarHeader } from './toolbar-header';
import { ToolbarContent } from './toolbar-content';
import { TooltipProvider } from '../../../ui/composites/tooltip';

export default function Toolbar() {
  const { state, dispatch, canUseTool, isAuthorOnViewOnlyPage } = useEditor();
  const [isExpanded, setIsExpanded] = useState(true);
  const toolbarContentRef = useRef<{ closeSubmenus: () => void }>(null);

  const toolAccessAllowed = canUseTool(state.activeTool);
  const isAnswerOnly = canUseTool('select');
  const isViewOnlyPage = isAuthorOnViewOnlyPage();
  
  // Eingeklappt wenn Tools nicht verfügbar oder Autor auf nicht zugewiesener Seite; ausgeklappt wenn Autor auf zugewiesener Seite
  useEffect(() => {
    if ((!toolAccessAllowed && !isAnswerOnly) || isViewOnlyPage) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [toolAccessAllowed, isAnswerOnly, isViewOnlyPage]);

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
          onlyPanZoomEnabled={isViewOnlyPage}
        />
      </ToolbarContainer>
    </TooltipProvider>
  );
}