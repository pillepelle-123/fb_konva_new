import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EditorProvider, useEditor, createSampleBook } from '../../context/EditorContext';
import Toolbar from './Toolbar';
import Canvas from './Canvas';

function EditorContent() {
  const { bookId } = useParams<{ bookId: string }>();
  const { state, dispatch } = useEditor();

  useEffect(() => {
    // For now, load a sample book
    // In a real app, you'd fetch the book data from the API
    const sampleBook = createSampleBook();
    dispatch({ type: 'SET_BOOK', payload: sampleBook });
  }, [bookId, dispatch]);

  if (!state.currentBook) {
    return <div className="home"><p>Loading editor...</p></div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '1rem 2rem', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>
            {state.currentBook.name}
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            Page {state.activePageIndex + 1} of {state.currentBook.pages.length} • 
            {state.currentBook.pageSize} {state.currentBook.orientation}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#059669', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}>
            Save
          </button>
          <button style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#6b7280', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}>
            Close
          </button>
        </div>
      </div>
      
      <Toolbar />
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Canvas />
      </div>
      
      {/* Status bar */}
      <div style={{
        padding: '0.5rem 2rem',
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.8rem',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between'
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
  return (
    <EditorProvider>
      <EditorContent />
    </EditorProvider>
  );
}