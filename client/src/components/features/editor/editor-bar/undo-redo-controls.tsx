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

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        className="h-8 md:h-9 px-2 md:px-3"
        title="Undo"
      >
        <Undo className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 md:h-9 px-2 md:px-3"
            title="History"
          >
            <History className="h-3 w-3 md:h-4 md:w-4" />
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
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        className="h-8 md:h-9 px-2 md:px-3"
        title="Redo"
      >
        <Redo className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
    </ButtonGroup>
  );
}