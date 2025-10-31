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
import TemplateGallery from '../../components/templates/template-gallery';
import { fetchTemplates, fetchColorPalettes } from '../../services/api';


function EditorContent() {
  const { bookId } = useParams<{ bookId: string }>();
  const { state, dispatch, loadBook, undo, redo, saveBook, canAccessEditor, canEditCanvas } = useEditor();
  const toolSettingsPanelRef = useRef<ToolSettingsPanelRef>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<'preview' | 'questions' | 'manager'>('preview');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);

  // Load templates and palettes on mount
  useEffect(() => {
    const loadTemplateData = async () => {
      try {
        const [templatesData, palettesData] = await Promise.all([
          fetchTemplates(),
          fetchColorPalettes()
        ]);
        dispatch({ type: 'LOAD_TEMPLATES', payload: templatesData.templates });
        dispatch({ type: 'LOAD_COLOR_PALETTES', payload: palettesData.palettes });
      } catch (error) {
        console.error('Failed to load template data:', error);
      }
    };
    
    loadTemplateData();
  }, [dispatch]);
  
  // Apply wizard selections after book is loaded
  useEffect(() => {
    if (state.currentBook && (state.wizardTemplateSelection.selectedTemplateId || state.wizardTemplateSelection.selectedPaletteId) && state.availableTemplates && state.colorPalettes) {
      const template = state.availableTemplates.find(t => t.id === state.wizardTemplateSelection.selectedTemplateId);
      const palette = state.colorPalettes.find(p => p.id === state.wizardTemplateSelection.selectedPaletteId);
      
      if (template) {
        // Apply template to first page
        dispatch({ 
          type: 'APPLY_TEMPLATE', 
          payload: { 
            template, 
            pageIndex: 0, 
            applyToAllPages: false 
          } 
        });
      } else if (!state.wizardTemplateSelection.selectedTemplateId && palette) {
        // No template selected, create simple textbox with palette colors
        const simpleElement = {
          id: `element_${Date.now()}`,
          type: 'text' as const,
          textType: 'text' as const,
          x: 200,
          y: 200,
          width: 400,
          height: 100,
          text: '',
          fontSize: 16,
          fontFamily: 'Century Gothic, sans-serif',
          fontColor: palette.colors.text,
          align: 'left' as const,
          padding: 12,
          cornerRadius: 8
        };
        
        dispatch({ 
          type: 'ADD_ELEMENT', 
          payload: simpleElement 
        });
      }
      
      if (palette) {
        // Apply color palette to first page
        dispatch({ 
          type: 'APPLY_COLOR_PALETTE', 
          payload: { 
            palette, 
            pageIndex: 0, 
            applyToAllPages: false 
          } 
        });
      }
      
      // Clear wizard selection after applying
      dispatch({ 
        type: 'SET_WIZARD_TEMPLATE_SELECTION', 
        payload: {
          selectedTemplateId: null,
          selectedPaletteId: null,
          templateCustomizations: undefined
        }
      });
    }
  }, [state.currentBook, state.wizardTemplateSelection, state.availableTemplates, state.colorPalettes, dispatch]);

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
                bookTheme: tempBook?.bookTheme || 'default'
              })
            });
            
            if (response.ok) {
              const newBook = await response.json();
              
              // Apply wizard selections if available
              if (tempBook?.wizardSelections) {
                const { template, theme, palette } = tempBook.wizardSelections;
                
                // Set wizard template selection in context for later use
                dispatch({ 
                  type: 'SET_WIZARD_TEMPLATE_SELECTION', 
                  payload: {
                    selectedTemplateId: template?.id || null,
                    selectedPaletteId: palette?.id || null,
                    templateCustomizations: { theme }
                  }
                });
              }
              
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
    
    const handleOpenManager = () => {
      setPreviewContent('manager');
      setShowPreview(true);
    };
    
    const handleShowPDFExport = () => {
      setPreviewContent('preview');
      setShowPreview(true);
    };
    
    const handleAddPage = () => {
      setShowNewPageDialog(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openQuestions', handleOpenQuestions);
    window.addEventListener('openManager', handleOpenManager);
    window.addEventListener('showPDFExport', handleShowPDFExport);
    window.addEventListener('addPage', handleAddPage);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openQuestions', handleOpenQuestions);
      window.removeEventListener('openManager', handleOpenManager);
      window.removeEventListener('showPDFExport', handleShowPDFExport);
      window.removeEventListener('addPage', handleAddPage);
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
  
  // Block editor access for no_access level or form_only access
  if (state.editorInteractionLevel === 'no_access' || state.pageAccessLevel === 'form_only') {
    window.location.href = `/books/${bookId}/answers`;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>Redirecting to answer form...</p>
        </div>
      </div>
    );
  }

  // Filter pages based on page access level
  const getVisiblePages = () => {
    if (!state.currentBook) return [];
    
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // Show only assigned pages
      return state.currentBook.pages.filter((_, index) => 
        state.assignedPages.includes(index + 1)
      );
    }
    
    // Show all pages for 'all_pages' or when no restrictions
    return state.currentBook.pages;
  };

  const visiblePages = getVisiblePages();
  
  // If user has own_page access but current page is not visible, redirect to first visible page
  if (state.pageAccessLevel === 'own_page' && visiblePages.length > 0) {
    const currentPageNumber = state.activePageIndex + 1;
    if (!state.assignedPages.includes(currentPageNumber)) {
      const firstVisiblePageIndex = state.currentBook!.pages.findIndex((_, index) => 
        state.assignedPages.includes(index + 1)
      );
      if (firstVisiblePageIndex !== -1 && firstVisiblePageIndex !== state.activePageIndex) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: firstVisiblePageIndex });
        }, 0);
      }
    }
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
            {canEditCanvas() && <Toolbar onOpenTemplates={() => setShowTemplateGallery(true)} />}
            <div className="flex-1 overflow-hidden bg-muted">
              <Canvas />
            </div>
            {canEditCanvas() && <ToolSettingsPanel ref={toolSettingsPanelRef} onOpenTemplates={() => setShowTemplateGallery(true)} />}
          </div>
          
          <StatusBar />
        </div>
        
        <PagePreviewOverlay 
          isOpen={showPreview} 
          onClose={() => setShowPreview(false)}
          content={previewContent}
        />
        
        <TemplateGallery
          isOpen={showTemplateGallery}
          onClose={() => setShowTemplateGallery(false)}
        />
        
        {/* New Page Dialog */}
        {showNewPageDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowNewPageDialog(false)} />
            <div className="relative bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New Page</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowNewPageDialog(false);
                    setShowTemplateGallery(true);
                  }}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">Start from Template</div>
                  <div className="text-sm text-gray-600">Choose from pre-designed layouts</div>
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: 'ADD_PAGE' });
                    setShowNewPageDialog(false);
                  }}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">Blank Page</div>
                  <div className="text-sm text-gray-600">Start with an empty canvas</div>
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowNewPageDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}

export default function Editor() {
  return (
    <EditorContent />
  );
}