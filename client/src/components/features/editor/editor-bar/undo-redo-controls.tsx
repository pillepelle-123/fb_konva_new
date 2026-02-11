import { Undo, Redo, History } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Popover, PopoverTrigger, PopoverContent } from '../../../ui/overlays/popover';
import { useEditor } from '../../../../context/editor-context';

export default function UndoRedoControls() {
  const { state, undo, redo, goToHistoryStep, getHistoryActions, canEditCurrentPage, canEditElement } = useEditor();
  
  const historyActions = getHistoryActions();
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const groupedActions = historyActions.reduce(
    (acc, action, index) => {
      const last = acc[acc.length - 1];
      if (last && last.action === action) {
        last.endIndex = index;
        last.count += 1;
        last.label = `${action} (x${last.count})`;
      } else {
        acc.push({ action, label: action, startIndex: index, endIndex: index, count: 1 });
      }
      return acc;
    },
    [] as Array<{ action: string; label: string; startIndex: number; endIndex: number; count: number }>
  );
  
  const canEditPageContent = canEditCurrentPage() || canEditElement({ textType: 'answer' });
  const isDisabled = !canEditPageContent;

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
              {groupedActions.map((group) => (
                <button
                  key={`${group.action}-${group.startIndex}-${group.endIndex}`}
                  onClick={() => goToHistoryStep(group.endIndex)}
                  className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-muted ${
                    state.historyIndex >= group.startIndex && state.historyIndex <= group.endIndex
                      ? 'bg-primary text-primary-foreground'
                      : ''
                  }`}
                >
                  {group.label}
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