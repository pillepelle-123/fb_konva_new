import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EditorProvider, useEditor, createSampleBook } from '../../context/EditorContext';
import Toolbar from './Toolbar';
import Canvas from './Canvas';

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
  }, [bookId]);

  if (!state.currentBook) {
    return <div className="home"><p>Loading editor...</p></div>;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Toolbar />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Canvas />
        </div>
      </div>
      
      {/* Status bar */}
      <div style={{
        padding: '0.5rem 2rem',
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.8rem',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span>Tool: {state.activeTool}</span>
        <span>
          Selected: {state.selectedElementIds.length} element{state.selectedElementIds.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

export default function Editor() {
  return <EditorContent />;
}