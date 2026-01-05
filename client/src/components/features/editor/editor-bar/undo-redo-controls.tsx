import { Undo, Redo, History } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Popover, PopoverTrigger, PopoverContent } from '../../../ui/overlays/popover';
import { useEditor } from '../../../../context/editor-context';

export default function UndoRedoControls() {
  const { state, undo, redo, goToHistoryStep, getHistoryActions } = useEditor();
  
  const historyActions = getHistoryActions();
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  
  // Disable for authors on unassigned pages
  const isAuthorOnUnassignedPage = state.userRole === 'author' && 
    !state.assignedPages.includes(state.activePageIndex + 1);
  const isDisabled = isAuthorOnUnassignedPage;

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        size="xs"
        onClick={undo}
        disabled={!canUndo || isDisabled}
        className="h-7"
        title="Undo"
      >
        <Undo className="h-5 w-5" />
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            disabled={isDisabled}
            className="h-7 rounded-none"
            title="History"
          >
            <History className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="space-y-1">
            <div className="text-sm font-medium mb-2">Action History</div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {historyActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => goToHistoryStep(index)}
                  className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-muted ${
                    index === state.historyIndex ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {action}
                </button>
              ))}
              {historyActions.length === 0 && (
                <div className="text-xs text-muted-foreground">No actions yet</div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <Button
        variant="outline"
        size="xs"
        onClick={redo}
        disabled={!canRedo || isDisabled}
        className="h-7"
        title="Redo"
      >
        <Redo className="h-5 w-5" />
      </Button>
    </ButtonGroup>
  );
}