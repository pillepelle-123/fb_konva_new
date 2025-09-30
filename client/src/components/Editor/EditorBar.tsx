import { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import PDFExportModal from './PDFExportModal';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2, Save, Download, X, BookOpen } from 'lucide-react';

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
      <Card className="rounded-none border-x-0 border-t-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Page Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={state.activePageIndex === 0}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground min-w-[100px] text-center">
                    Page {currentPage} of {pages.length}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={state.activePageIndex === pages.length - 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPage}
                  className="space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Page</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicatePage}
                  className="space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Duplicate</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePage}
                  disabled={pages.length <= 1}
                  className="space-x-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Book Info and Actions */}
            <div className="flex items-center gap-4">
              <div className="text-center lg:text-right">
                <h1 className="text-lg font-semibold text-foreground line-clamp-1">
                  {state.currentBook.name}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowPDFModal(true)}
                  className="space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.history.back()}
                  className="space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
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