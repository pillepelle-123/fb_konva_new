import { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import PDFExportModal from './PDFExportModal';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2, Save, Download, X, BookOpen, PanelTop, Wrench } from 'lucide-react';

export default function EditorBar() {
  const { state, dispatch, saveBook } = useEditor();
  const [isSaving, setIsSaving] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);

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
    <>
      {/* Floating Action Buttons - Mobile Only */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col md:hidden">
        <Button
          onClick={() => dispatch({ type: 'TOGGLE_EDITOR_BAR' })}
          className="h-12 w-12 rounded-t-full rounded-b-none shadow-lg border-b-0"
          size="icon"
          variant={state.editorBarVisible ? "default" : "outline"}
        >
          <PanelTop className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => dispatch({ type: 'TOGGLE_TOOLBAR' })}
          className="h-12 w-12 rounded-b-full rounded-t-none shadow-lg"
          size="icon"
          variant={state.toolbarVisible ? "default" : "outline"}
        >
          <Wrench className="h-5 w-5" />
        </Button>
      </div>

      {/* Editor Bar */}
      <Card className={`rounded-none border-x-0 border-t-0 shadow-sm ${
        !state.editorBarVisible ? 'hidden md:block' : ''
      }`}>
        <CardContent className="p-2 md:p-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 md:gap-4 min-w-max">
            {/* Page Controls */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={state.activePageIndex === 0}
                  className="h-8 w-8 p-0 md:h-9 md:w-9"
                >
                  <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                </Button>

                <div className="flex items-center gap-1 md:gap-2 bg-muted rounded-lg px-2 py-1 md:px-3 md:py-1.5">
                  <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <span className="text-xs md:text-sm font-medium text-foreground min-w-[80px] md:min-w-[100px] text-center">
                    {currentPage}/{pages.length}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={state.activePageIndex === pages.length - 1}
                  className="h-8 w-8 p-0 md:h-9 md:w-9"
                >
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>

              <div className="hidden md:block h-6 w-px bg-border" />

              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPage}
                  className="h-8 md:h-9 px-2 md:px-3"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-2">Add</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicatePage}
                  className="h-8 md:h-9 px-2 md:px-3"
                >
                  <Copy className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-2">Duplicate</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePage}
                  disabled={pages.length <= 1}
                  className="h-8 md:h-9 px-2 md:px-3 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-2">Delete</span>
                </Button>
              </div>
            </div>

            {/* Book Info and Actions */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-auto">
              <div className="text-center md:text-right">
                <h1 className="text-sm md:text-lg font-semibold text-foreground whitespace-nowrap">
                  {state.currentBook.name}
                </h1>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-8 md:h-9 px-2 md:px-3"
                >
                  <Save className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-2">{isSaving ? 'Saving...' : 'Save'}</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowPDFModal(true)}
                  className="h-8 md:h-9 px-2 md:px-3"
                >
                  <Download className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-2">Export</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.history.back()}
                  className="h-8 md:h-9 px-2 md:px-3"
                >
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-2">Close</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <PDFExportModal 
        isOpen={showPDFModal} 
        onClose={() => setShowPDFModal(false)} 
      />
    </>
  );
}