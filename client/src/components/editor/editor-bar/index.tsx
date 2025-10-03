import { useState } from 'react';
import { useEditor } from '../../../context/editor-context';
import PDFExportModal from '../pdf-export-modal';
import { Card, CardContent } from '../../ui/card';
import { FloatingActionButtons } from '../floating-action-buttons';
import { PageNavigation } from './page-navigation';
import { PageActions } from './page-actions';
import { BookTitle } from './book-title';
import { BookActions } from './book-actions';
import UnsavedChangesDialog from '../../cards/unsaved-changes-dialog';
import ConfirmationDialog from '../../cards/confirmation-dialog';
import AlertDialog from '../../cards/alert-dialog';

export default function EditorBar() {
  const { state, dispatch, saveBook } = useEditor();
  const [isSaving, setIsSaving] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);

  if (!state.currentBook) return null;

  const { pages } = state.currentBook;
  const currentPage = state.activePageIndex + 1;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBook();
    } catch (error) {
      setShowAlert({ title: 'Save Failed', message: 'Failed to save book. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (state.hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      window.history.back();
    }
  };

  const handleExitWithoutSaving = () => {
    setShowCloseConfirm(false);
    window.history.back();
  };

  const handleExitWithSaving = async () => {
    setShowCloseConfirm(false);
    await handleSave();
    window.history.back();
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
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDeletePage = () => {
    setShowDeleteConfirm(false);
    dispatch({ type: 'DELETE_PAGE', payload: state.activePageIndex });
  };

  const handleDuplicatePage = () => {
    dispatch({ type: 'DUPLICATE_PAGE', payload: state.activePageIndex });
  };

  return (
    <>
      <FloatingActionButtons
        editorBarVisible={state.editorBarVisible}
        toolbarVisible={state.toolbarVisible}
        onToggleEditorBar={() => dispatch({ type: 'TOGGLE_EDITOR_BAR' })}
        onToggleToolbar={() => dispatch({ type: 'TOGGLE_TOOLBAR' })}
      />

      {/* Editor Bar */}
      <Card className={`rounded-none border-x-0 border-t-0 shadow-sm ${
        !state.editorBarVisible ? 'hidden md:block' : ''
      }`}>
        <CardContent className="p-2 md:p-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 md:gap-4 min-w-max">
            {/* Page Controls */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <PageNavigation
                currentPage={currentPage}
                totalPages={pages.length}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                canGoPrev={state.activePageIndex > 0}
                canGoNext={state.activePageIndex < pages.length - 1}
              />

              <div className="hidden md:block h-6 w-px bg-border" />

              <PageActions
                onAddPage={handleAddPage}
                onDuplicatePage={handleDuplicatePage}
                onDeletePage={handleDeletePage}
                canDelete={pages.length > 1}
              />
            </div>

            {/* Book Info and Actions */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-auto">
              <BookTitle title={state.currentBook.name} />

              <BookActions
                onSave={handleSave}
                onExport={() => setShowPDFModal(true)}
                onClose={handleClose}
                isSaving={isSaving}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <PDFExportModal 
        isOpen={showPDFModal} 
        onClose={() => setShowPDFModal(false)} 
      />
      
      <UnsavedChangesDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        onSaveAndExit={handleExitWithSaving}
        onExitWithoutSaving={handleExitWithoutSaving}
        onCancel={() => setShowCloseConfirm(false)}
      />
      
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Page"
        description={`Are you sure you want to delete page ${currentPage}? This action cannot be undone.`}
        onConfirm={handleConfirmDeletePage}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete Page"
        confirmVariant="destructive"
      />
      
      <AlertDialog
        open={!!showAlert}
        onOpenChange={() => setShowAlert(null)}
        title={showAlert?.title || ''}
        message={showAlert?.message || ''}
        onClose={() => setShowAlert(null)}
      />
    </>
  );
}