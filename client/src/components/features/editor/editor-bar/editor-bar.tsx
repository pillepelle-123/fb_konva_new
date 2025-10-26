import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import PDFExportModal from '../pdf-export-modal';
import StackedAvatarGroup from '../../../shared/cards/stacked-avatar-group';
import { Toast } from '../../../ui/overlays/toast';

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../ui/composites/accordion-horizontal';

import { FloatingActionButtons } from '../floating-action-buttons';
import { PageNavigation } from './page-navigation';
import { PageActions } from './page-actions';
import { BookTitle } from './book-title';
import { BookActions } from './book-actions';
import UndoRedoControls from './undo-redo-controls';
import UnsavedChangesDialog from '../../../ui/overlays/unsaved-changes-dialog';
import ConfirmationDialog from '../../../ui/overlays/confirmation-dialog';
import AlertDialog from '../../../ui/overlays/alert-dialog';
import { LayoutGrid, Settings, Palette, Divide, Book, CircleUser, BookOpen } from 'lucide-react';
import PagePreview from '../../books/page-preview';
import { Button } from '../../../ui/primitives/button';
import { X } from 'lucide-react';
import { Tooltip } from '../../../ui/composites/tooltip';
import { EditorBarContainer } from './editor-bar-container';
import PageAssignmentDialog from '../page-assignment-dialog';
import ProfilePicture from '../../users/profile-picture';
import { PagesSubmenu } from './page-explorer';

interface EditorBarProps {
  toolSettingsPanelRef: React.RefObject<{ openBookTheme: () => void }>;
}

export default function EditorBar({ toolSettingsPanelRef }: EditorBarProps) {
  const { state, dispatch, saveBook, refreshPageAssignments, getVisiblePages, getVisiblePageNumbers } = useEditor();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);
  const [showPageAssignment, setShowPageAssignment] = useState(false);
  const [showPagesSubmenu, setShowPagesSubmenu] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);




  if (!state.currentBook) return null;

  const { pages } = state.currentBook;
  const visiblePages = getVisiblePages();
  const visiblePageNumbers = getVisiblePageNumbers();
  const currentPage = state.activePageIndex + 1;
  
  // For own_page access, calculate visible page index and total
  const getVisiblePageInfo = () => {
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      const visibleIndex = visiblePageNumbers.indexOf(currentPage);
      return {
        currentVisiblePage: visibleIndex + 1,
        totalVisiblePages: visiblePageNumbers.length,
        canGoPrev: visibleIndex > 0,
        canGoNext: visibleIndex < visiblePageNumbers.length - 1
      };
    }
    return {
      currentVisiblePage: currentPage,
      totalVisiblePages: pages.length,
      canGoPrev: state.activePageIndex > 0,
      canGoNext: state.activePageIndex < pages.length - 1
    };
  };
  
  const { currentVisiblePage, totalVisiblePages, canGoPrev, canGoNext } = getVisiblePageInfo();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBook();
      setShowSaveToast(true);
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
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      const currentVisibleIndex = visiblePageNumbers.indexOf(currentPage);
      if (currentVisibleIndex > 0) {
        const prevPageNumber = visiblePageNumbers[currentVisibleIndex - 1];
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: prevPageNumber - 1 });
      }
    } else {
      if (state.activePageIndex > 0) {
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: state.activePageIndex - 1 });
      }
    }
  };

  const handleNextPage = () => {
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      const currentVisibleIndex = visiblePageNumbers.indexOf(currentPage);
      if (currentVisibleIndex < visiblePageNumbers.length - 1) {
        const nextPageNumber = visiblePageNumbers[currentVisibleIndex + 1];
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: nextPageNumber - 1 });
      }
    } else {
      if (state.activePageIndex < pages.length - 1) {
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: state.activePageIndex + 1 });
      }
    }
  };

  const handleAddPage = () => {
    dispatch({ type: 'ADD_PAGE' });
    // Jump to the newly added page
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: pages.length });
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
    // Navigate to the newly created page (current index + 1)
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: state.activePageIndex + 1 });
  };

  const handleGoToPage = (page: number) => {
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // For own_page access, page parameter is the visible page number (1-based)
      if (page >= 1 && page <= visiblePageNumbers.length) {
        const actualPageNumber = visiblePageNumbers[page - 1];
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: actualPageNumber - 1 });
      }
    } else {
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: page - 1 });
    }
  };

  const handleReorderPages = (fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_PAGES', payload: { fromIndex, toIndex } });
  };

  return (
    <>
      <FloatingActionButtons
        editorBarVisible={state.editorBarVisible}
        toolbarVisible={state.toolbarVisible}
        settingsPanelVisible={state.settingsPanelVisible}
        onToggleEditorBar={() => dispatch({ type: 'TOGGLE_EDITOR_BAR' })}
        onToggleToolbar={() => dispatch({ type: 'TOGGLE_TOOLBAR' })}
        onToggleSettingsPanel={() => dispatch({ type: 'TOGGLE_SETTINGS_PANEL' })}
      />

      {/* Editor Bar */}
      <EditorBarContainer isVisible={state.editorBarVisible}>
        {showPagesSubmenu ? (
          <PagesSubmenu 
            pages={state.pageAccessLevel === 'own_page' ? visiblePages : pages}
            activePageIndex={state.pageAccessLevel === 'own_page' ? visiblePageNumbers.indexOf(currentPage) : state.activePageIndex}
            onClose={() => setShowPagesSubmenu(false)}
            onPageSelect={handleGoToPage}
            onReorderPages={handleReorderPages}
            bookId={state.currentBook.id}
            isRestrictedView={state.pageAccessLevel === 'own_page'}
          />
        ) : (
          <div className="flex items-center justify-between w-full h-12 px-4 py-1 gap-4">
            {/* Left Section - Page Controls */}
            <div className="flex items-center gap-3">
              <PageNavigation
                currentPage={currentVisiblePage}
                totalPages={totalVisiblePages}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onGoToPage={handleGoToPage}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onOpenPagesSubmenu={() => setShowPagesSubmenu(true)}
              />
              
              {state.userRole !== 'author' && (
                <PageActions
                  onAddPage={handleAddPage}
                  onDuplicatePage={handleDuplicatePage}
                  onDeletePage={handleDeletePage}
                  canDelete={pages.length > 1}
                  showAssignFriends={false}
                />
              )}
            </div>

            {/* Center Section - Book Title */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <BookTitle title={state.currentBook.name} readOnly={state.userRole === 'author'} />
            </div>

            {/* Right Section - User Assignment & Settings */}
            <div className="flex items-center gap-3">
              <PageAssignmentButton 
                currentPage={currentPage} 
                bookId={state.currentBook.id} 
                onOpenDialog={() => setShowPageAssignment(true)} 
              />
              
              {(state.userRole !== 'author' || (state.userRole === 'author' && state.editorInteractionLevel === 'full_edit_with_settings')) && (
                <Tooltip content="Settings" side="bottom_editor_bar">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
                    }}
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </Tooltip>
              )}
              
              <UndoRedoControls />
              
              <BookActions
                onSave={handleSave}
                onExport={() => setShowPDFModal(true)}
                onClose={handleClose}
                isSaving={isSaving}
              />
              
              <Tooltip content="Close Editor" side="bottom_editor_bar">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </EditorBarContainer>
      
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
      
      <PageAssignmentDialog
        open={showPageAssignment}
        onOpenChange={setShowPageAssignment}
        currentPage={currentPage}
        bookId={state.currentBook.id}
      />
      <Toast 
        message="Book saved successfully" 
        isVisible={showSaveToast} 
        onClose={() => setShowSaveToast(false)} 
      />
    </>
  );
}

function PageAssignmentButton({ currentPage, bookId, onOpenDialog }: { currentPage: number; bookId: number; onOpenDialog: () => void }) {
  const { state } = useEditor();
  const { user } = useAuth();
  const assignedUser = state.pageAssignments[currentPage];
  const isAuthor = state.userRole === 'author';
  
  const handleClick = () => {
    onOpenDialog();
  };
  
  // Force re-render when assignments change
  const assignmentKey = `${currentPage}-${assignedUser?.id || 'none'}`;

  if (assignedUser) {
    if (isAuthor) {
      return (
        <Tooltip content={`Assigned to ${assignedUser.name}`} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
          <div className="h-full w-full p-0 pt-1.5 rounded-full" key={assignmentKey}>
            <ProfilePicture name={assignedUser.name} size="sm" userId={assignedUser.id} variant='withColoredBorder' className='h-full w-full' />
          </div>
        </Tooltip>
      );
    }
    return (
      <Tooltip content={`Assigned to ${assignedUser.name}`} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="ghost"
          size="md"
          onClick={handleClick}
          className="h-full w-full p-0 pt-1.5 rounded-full"
          key={assignmentKey}
        >
          <ProfilePicture name={assignedUser.name} size="sm" userId={assignedUser.id} variant='withColoredBorder' className='h-full w-full hover:ring hover:ring-highlight hover:ring-offset-1' />
        </Button>
      </Tooltip>
    );
  }

  if (isAuthor) {
    return (
      <Tooltip content="Assign user to page" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <div className="h-full w-full p-0 pt-1.5 rounded-full">
          <CircleUser className="rounded-full h-10 w-10 stroke-highlight" />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Assign user to page" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="h-full w-full p-0 pt-1.5 rounded-full"
      >
        <CircleUser className="rounded-full h-10 w-10 stroke-highlight hover:bg-highlight hover:stroke-background transition-all duration-300 ease-in-out" />
      </Button>
    </Tooltip>
  );
}

