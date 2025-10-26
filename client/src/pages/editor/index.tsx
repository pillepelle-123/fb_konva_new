import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, createSampleBook } from '../../context/editor-context';
import EditorBar from '../../components/features/editor/editor-bar';
import Toolbar from '../../components/features/editor/toolbar';
import Canvas from '../../components/features/editor/canvas';
import ToolSettingsPanel, { type ToolSettingsPanelRef } from '../../components/features/editor/tool-settings/tool-settings-panel';
import { StatusBar } from '../../components/features/editor/status-bar';
import { Toast } from '../../components/ui/overlays/toast';
import QuestionSelectionHandler from '../../components/features/editor/question-selection-handler';
import PagePreviewOverlay from '../../components/features/editor/preview/page-preview-overlay';


function EditorContent() {
  const { bookId } = useParams<{ bookId: string }>();
  const { state, dispatch, loadBook, undo, redo, saveBook, canAccessEditor, canEditCanvas } = useEditor();
  const toolSettingsPanelRef = useRef<ToolSettingsPanelRef>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<'preview' | 'questions'>('preview');

  useEffect(() => {
    if (bookId) {
      // Check if it's a temporary book ID
      if (bookId.startsWith('temp_') || bookId === 'new') {
        // Get temporary book data from window.tempBooks
        const tempBooks = (window as any).tempBooks;
        const tempBook = tempBooks?.get(bookId);
        
        // Create a new book in database immediately
        const createNewBook = async () => {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${apiUrl}/books`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                name: tempBook?.name || 'New Book',
                pageSize: tempBook?.pageSize || 'A4',
                orientation: tempBook?.orientation || 'portrait',
                bookTheme: 'default'
              })
            });
            
            if (response.ok) {
              const newBook = await response.json();
              // Clean up temporary book
              if (tempBooks) {
                tempBooks.delete(bookId);
              }
              // Load the newly created book
              loadBook(newBook.id);
              // Update URL to use real ID
              window.history.replaceState(null, '', `/editor/${newBook.id}`);
            } else {
              console.error('Failed to create book');
            }
          } catch (error) {
            console.error('Failed to create book:', error);
          }
        };
        
        createNewBook();
        return;
      }
      
      // Try to load existing book from database
      if (!isNaN(Number(bookId))) {
        loadBook(Number(bookId)).catch((error) => {
          console.error('Failed to load book:', error);
        });
      }
    }
  }, [bookId, loadBook, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveBook().then(() => {
          setShowSaveToast(true);
        }).catch(console.error);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowPreview(true);
      }
    };
    
    const handleOpenQuestions = () => {
      setPreviewContent('questions');
      setShowPreview(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openQuestions', handleOpenQuestions);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openQuestions', handleOpenQuestions);
    };
  }, [undo, redo, saveBook]);

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
  
  // Block editor access for no_access level
  if (state.editorInteractionLevel === 'no_access') {
    window.location.href = `/books/${bookId}/answers`;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>Redirecting to answer form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <QuestionSelectionHandler />
      <EditorBar toolSettingsPanelRef={toolSettingsPanelRef} />
      
      <div className="flex-1 min-h-0">
        <Toast 
        message="Book saved successfully" 
        isVisible={showSaveToast} 
        onClose={() => setShowSaveToast(false)} 
      />
        <div className="h-full flex flex-col bg-background">
          <div className="flex-1 flex min-h-0">
            {canEditCanvas() && <Toolbar />}
            <div className="flex-1 overflow-hidden bg-muted">
              <Canvas />
            </div>
            {canEditCanvas() && <ToolSettingsPanel ref={toolSettingsPanelRef} />}
          </div>
          
          <StatusBar />
        </div>
        
        <PagePreviewOverlay 
          isOpen={showPreview} 
          onClose={() => setShowPreview(false)}
          content={previewContent}
        />
      </div>
      
    </div>
  );
}

export default function Editor() {
  return (
    <EditorContent />
  );
}