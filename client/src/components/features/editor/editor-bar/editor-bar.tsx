import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import PDFExportModal from '../pdf-export-modal';
import StackedAvatarGroup from '../../../shared/cards/stacked-avatar-group';

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
import { LayoutGrid, Settings, Palette, Divide, Book, UserPen, UserStar, Users, File } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { X } from 'lucide-react';
import { Tooltip } from '../../../ui/composites/tooltip';
import { EditorBarContainer } from './editor-bar-container';
import PageUserSheet from '../../books/page-user-sheet';
import PageUserIcon from '../../../ui/icons/page-user-icon';

export default function EditorBar() {
  const { state, dispatch, saveBook, refreshPageAssignments } = useEditor();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);
  const [showPagesSheet, setShowPagesSheet] = useState(false);




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
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: page - 1 });
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
      <EditorBarContainer isVisible={state.editorBarVisible}>
        <Accordion type="single" collapsible defaultValue="controls">
          <AccordionItem value="controls">
            <AccordionTrigger className="flex items-center space-x-2 py-2">
              <Tooltip content="Show controls for book and pages" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
                <LayoutGrid className="h-6 w-6" />
              </Tooltip>
              {/* <span>Controls</span> */}
            </AccordionTrigger>
            <AccordionContent className="overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 md:gap-4 w-full">
                {/* Page Controls */}
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                  <PageNavigation
                    currentPage={currentPage}
                    totalPages={pages.length}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                    onGoToPage={handleGoToPage}
                    canGoPrev={state.activePageIndex > 0}
                    canGoNext={state.activePageIndex < pages.length - 1}
                  />

                  <div className="hidden md:block h-6 w-px bg-border" />

                  <PageActions
                    onAddPage={handleAddPage}
                    onDuplicatePage={handleDuplicatePage}
                    onDeletePage={handleDeletePage}
                    canDelete={pages.length > 1}
                    showAssignFriends={false}
                    userRole={state.userRole}
                  />
                  
                  <div className="hidden md:block h-6 w-px bg-border" />
                  
                  {state.userRole === 'publisher' && (
                    <Tooltip content="Page User Manager" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPagesSheet(true)}
                        className="h-8 md:h-9 px-2"
                      >
                          <PageUserIcon className="h-8 w-8" />
                      </Button>
                    </Tooltip>
                  )}
                  
                  <PageAssignments currentPage={currentPage} bookId={state.currentBook.id} />
                </div>

                {/* Book Info and Actions */}
                <div className="flex items-center gap-4 md:gap-8 flex-shrink-0 ml-auto">
                  <div className="flex items-center gap-2">
                    <BookTitle title={state.currentBook.name} />
                    <Book className="h-4 w-4 text-ref-icon" />
                  </div>

                  <UndoRedoControls />
                  
                  <BookActions
                    onSave={handleSave}
                    onExport={() => setShowPDFModal(true)}
                    onClose={handleClose}
                    isSaving={isSaving}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <div className="w-px bg-gray-200 mx-1 self-stretch" />
          
          <AccordionItem value="settings">
            <AccordionTrigger className="flex items-center space-x-2 py-2">
              <Tooltip content="Show settings" side="bottom_editor_bar">
                <Settings className="h-6 w-6" />
              </Tooltip>
              {/* <span>Settings</span> */}
            </AccordionTrigger>
            <AccordionContent className="overflow-x-auto scrollbar-hide">
              <div className="flex items-center justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {}}
                >
                  <Palette className="h-4 w-4" />
                  <span>Theme</span>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <div className="w-px bg-gray-200 mx-1 self-stretch" />
          
          <div className="flex items-center py-2">
            <Tooltip content="Close editor and return to books" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 md:h-9 md:w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </Accordion>
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
      
      <PageUserSheet
        open={showPagesSheet}
        onOpenChange={setShowPagesSheet}
        bookId={state.currentBook.id}
        onSaved={() => {
          // Refresh page assignments display
          refreshPageAssignments();
        }}
      />
    </>
  );
}

function PageAssignments({ currentPage, bookId }: { currentPage: number; bookId: number }) {
  const { token } = useAuth();
  const { state } = useEditor();
  const [assignedUser, setAssignedUser] = useState<any>(null);
  const [publisher, setPublisher] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchPageAssignments();
    fetchPublisher();
  }, [currentPage, bookId, refreshTrigger, state.pageAssignments]);

  // Listen for page assignment updates
  useEffect(() => {
    const handlePageAssignmentUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener('pageAssignmentUpdated', handlePageAssignmentUpdate);
    return () => window.removeEventListener('pageAssignmentUpdated', handlePageAssignmentUpdate);
  }, []);

  const fetchPageAssignments = async () => {
    try {
      // Always check editor context first for current assignments
      const assignment = state.pageAssignments[currentPage];
      if (assignment !== undefined) {
        setAssignedUser(assignment);
        return;
      }
      
      // Fallback to database only if no assignment in state
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/page-assignments/book/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const pageAssignment = data.find((assignment: any) => assignment.page_id === currentPage);
        setAssignedUser(pageAssignment ? {
          id: pageAssignment.user_id,
          name: pageAssignment.name,
          email: pageAssignment.email
        } : null);
      }
    } catch (error) {
      // Error fetching page assignments
    }
  };

  const fetchPublisher = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const bookData = await response.json();
        const ownerId = bookData.owner_id || bookData.user_id || bookData.created_by || bookData.publisher_id;
        if (ownerId) {
          const userResponse = await fetch(`${apiUrl}/users/${ownerId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();

            setPublisher({
              id: userData.id,
              name: userData.name,
              email: userData.email
            });
          }
        }
      }
    } catch (error) {
      // Error fetching publisher
    }
  };

  return (
    <div className="flex items-center gap-4">
      {assignedUser && (
        <div className="flex items-center gap-2">
          <Tooltip content="Assigned author" side="bottom_editor_bar">
            <span className="text-xs text-muted-foreground">
              <UserPen className="h-3 w-3 md:h-4 md:w-4" />
            </span>
          </Tooltip>
          <StackedAvatarGroup users={[assignedUser]} maxVisible={1} />
          <div className="hidden md:block h-6 w-px bg-border" />
        </div>
      )}
      {/* {publisher ? (
        <div className="flex items-center gap-2">
          <Tooltip content="Book's publisher" side="bottom_editor_bar">
            <span className="text-xs text-muted-foreground">
              <UserStar className="h-3 w-3 md:h-4 md:w-4" />
            </span>
          </Tooltip>
          <StackedAvatarGroup users={[publisher]} maxVisible={1} />
        </div>
      ) : (
        <Tooltip content="Book's publisher" side="bottom">
          <div className="text-xs text-muted-foreground">
            <UserStar className="h-3 w-3 md:h-4 md:w-4" />
          </div>
        </Tooltip>
      )} */}
    </div>
  );
}