import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, createSampleBook } from '../../context/editor-context';
import EditorBar from '../../components/features/editor/editor-bar';
import Toolbar from '../../components/features/editor/toolbar';
import Canvas from '../../components/features/editor/canvas';


function EditorContent() {
  const { bookId } = useParams<{ bookId: string }>();
  const { state, dispatch, loadBook } = useEditor();

  useEffect(() => {
    if (bookId && !isNaN(Number(bookId))) {
      loadBook(Number(bookId)).catch(() => {
        // Fallback to sample book if load fails
        const sampleBook = createSampleBook(Number(bookId));
        dispatch({ type: 'SET_BOOK', payload: sampleBook });
      });
    } else {
      const sampleBook = createSampleBook();
      dispatch({ type: 'SET_BOOK', payload: sampleBook });
    }
  }, [bookId, loadBook, dispatch]);

  if (!state.currentBook) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>⟲</span>
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <EditorBar />
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col bg-background">
          <div className="flex-1 flex min-h-0">
            <Toolbar />
            <div className="flex-1 overflow-hidden bg-muted">
              <Canvas />
            </div>
          </div>
          
          {/* Status bar */}
          <div className="px-6 py-2 bg-card border-t border-border text-sm text-muted-foreground flex justify-between items-center shrink-0 gap-4">
            <span className="font-medium">Tool: <span className="text-foreground">{state.activeTool}</span></span>
            <span className="font-medium">
              Selected: <span className="text-foreground">{state.selectedElementIds.length}</span> element{state.selectedElementIds.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  return <EditorContent />;
}