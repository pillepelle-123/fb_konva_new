import { useEditor } from '../../../context/editor-context';

export function StatusBar() {
  const { state } = useEditor();

  if (!state.currentBook) return null;

  return (
    <div className="px-6 py-2 bg-card border-t border-border text-sm text-muted-foreground flex justify-between items-center shrink-0 gap-4">
      <span className="font-medium">Tool: <span className="text-foreground">{state.activeTool}</span></span>
      <span className="font-medium">
        Book ID: <span className="text-foreground">{state.currentBook.id}</span> | 
        Page ID: <span className="text-foreground">{state.currentBook.pages[state.activePageIndex]?.database_id || ''}</span> | 
        Page Number: <span className="text-foreground">{state.activePageIndex + 1}</span>
        {state.pageAssignments[state.activePageIndex + 1] && (
          <> | User: <span className="text-foreground">{state.pageAssignments[state.activePageIndex + 1].id}</span></>
        )}
      </span>
      <span className="font-medium">
        Selected: <span className="text-foreground">{state.selectedElementIds.length}</span> element{state.selectedElementIds.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}