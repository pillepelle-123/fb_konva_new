import { useState } from 'react';
import { useEditor } from '../../context/EditorContext';

export default function EditorBar() {
  const { state, dispatch, saveBook } = useEditor();
  const [isSaving, setIsSaving] = useState(false);

  if (!state.currentBook) return null;

  const { pages } = state.currentBook;
  const currentPage = state.activePageIndex + 1;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBook();
    } catch (error) {
      alert('Failed to save book');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevPage = () => {
    if (state.activePageIndex > 0) {
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: state.activePageIndex - 1 });
    }
  };

  const handleNextPage = () => {
    if (state.activePageIndex < pages.length - 1) {
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: state.activePageIndex + 1 });
    }
  };

  const handleAddPage = () => {
    dispatch({ type: 'ADD_PAGE' });
  };

  const handleDeletePage = () => {
    if (pages.length > 1) {
      dispatch({ type: 'DELETE_PAGE', payload: state.activePageIndex });
    }
  };

  const handleDuplicatePage = () => {
    dispatch({ type: 'DUPLICATE_PAGE', payload: state.activePageIndex });
  };

  return (
    <div style={{ 
      padding: '1rem 2rem', 
      backgroundColor: 'white', 
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      {/* Page Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <button
          onClick={handlePrevPage}
          disabled={state.activePageIndex === 0}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: state.activePageIndex === 0 ? '#e5e7eb' : '#3b82f6',
            color: state.activePageIndex === 0 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.activePageIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ← Prev
        </button>

        <span style={{ fontSize: '0.9rem', color: '#374151', minWidth: '80px', textAlign: 'center' }}>
          Page {currentPage} of {pages.length}
        </span>

        <button
          onClick={handleNextPage}
          disabled={state.activePageIndex === pages.length - 1}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: state.activePageIndex === pages.length - 1 ? '#e5e7eb' : '#3b82f6',
            color: state.activePageIndex === pages.length - 1 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.activePageIndex === pages.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem'
          }}
        >
          Next →
        </button>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#d1d5db', margin: '0 0.5rem' }} />

        <button
          onClick={handleAddPage}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          + Add Page
        </button>

        <button
          onClick={handleDuplicatePage}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          Duplicate
        </button>

        <button
          onClick={handleDeletePage}
          disabled={pages.length <= 1}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: pages.length <= 1 ? '#e5e7eb' : '#dc2626',
            color: pages.length <= 1 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: pages.length <= 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem'
          }}
        >
          Delete Page
        </button>
      </div>
      {/* Book Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>
            {state.currentBook.name}
          </h1>
       
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: isSaving ? '#9ca3af' : '#059669', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: isSaving ? 'not-allowed' : 'pointer' 
            }}
          >
            {isSaving ? 'Saving...' : 'Save Book'}
          </button>
          <button 
            onClick={() => window.history.back()}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#6b7280', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}