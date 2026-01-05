import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../../../context/editor-context';
import type { Page } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { MIN_TOTAL_PAGES, MAX_TOTAL_PAGES } from '../../../../constants/book-limits';
import BookExportModal from '../book-export-modal';
import { BookPreviewModal } from '../preview/book-preview-modal';
import { Modal } from '../../../ui/overlays/modal';
import BookManagerContent from '../../books/book-manager-content';
import { Button } from '../../../ui/primitives/button';
import { toast } from 'sonner';

import { FloatingActionButtons } from '../floating-action-buttons';
import { PageNavigation } from './page-navigation';
import { PageActions } from './page-actions';
import { BookTitle } from './book-title';
import { BookActions } from './book-actions';
import UndoRedoControls from './undo-redo-controls';
import UnsavedChangesDialog from '../../../ui/overlays/unsaved-changes-dialog';
import ConfirmationDialog from '../../../ui/overlays/confirmation-dialog';
import AlertDialog from '../../../ui/overlays/alert-dialog';
import { Settings, X } from 'lucide-react';
import { Tooltip } from '../../../ui/composites/tooltip';
import { EditorBarContainer } from './editor-bar-container';

import { PagesSubmenu } from './page-explorer';
import { PageAssignmentButton } from './page-assignment-button';



function getPairPages(pages: Page[], index: number): Page[] {
  if (!pages.length || index < 0 || index >= pages.length) {
    return [];
  }
  const pairId = pages[index]?.pagePairId;
  if (!pairId) {
    const start = index % 2 === 0 ? index : Math.max(0, index - 1);
    const end = Math.min(pages.length, start + 2);
    return pages.slice(start, end);
  }
  return pages.filter((page) => page.pagePairId === pairId);
}

interface EditorBarProps {
  toolSettingsPanelRef: React.RefObject<{ openBookTheme: () => void }>;
  initialPreviewOpen?: boolean;
}

export default function EditorBar({ toolSettingsPanelRef, initialPreviewOpen = false }: EditorBarProps) {
  const { state, dispatch, saveBook, refreshPageAssignments, getVisiblePages, getVisiblePageNumbers, ensurePagesLoaded } = useEditor();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showBookPreview, setShowBookPreview] = useState(initialPreviewOpen);
  const [showBookManager, setShowBookManager] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);

  const [showPagesSubmenu, setShowPagesSubmenu] = useState(false);

  useEffect(() => {
    if (initialPreviewOpen) {
      setShowBookPreview(true);
    }
  }, [initialPreviewOpen]);

  const [bookManagerTab, setBookManagerTab] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleOpenBookManager = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: string }>;
      setBookManagerTab(customEvent.detail?.tab);
      setShowBookManager(true);
    };

    window.addEventListener('openBookManager', handleOpenBookManager);
    return () => {
      window.removeEventListener('openBookManager', handleOpenBookManager);
    };
  }, []);

  if (!state.currentBook) return null;

  const activePairPages = getPairPages(state.currentBook.pages, state.activePageIndex);
  const activePairLocked = activePairPages.some((page) => page?.isLocked);
  const activePairSpecial = activePairPages.some((page) => page?.isSpecialPage);
  const activePairNonPrintable = activePairPages.some((page) => page?.isPrintable === false);
  const canDuplicateSpread = activePairPages.length > 0 && !activePairLocked && !activePairSpecial && !activePairNonPrintable;
  const remainingPagesAfterDelete = state.currentBook.pages.length - activePairPages.length;
  const deleteLeavesMinimum = remainingPagesAfterDelete >= MIN_TOTAL_PAGES;
  const canDeleteSpread = canDuplicateSpread && deleteLeavesMinimum;
  const deleteTooltip = !deleteLeavesMinimum
    ? `Books must keep at least ${MIN_TOTAL_PAGES} pages.`
    : activePairSpecial
      ? 'Special spreads cannot be deleted.'
      : activePairLocked
        ? 'This spread is locked.'
        : undefined;
  const canAddSpread = state.currentBook.pages.length + 2 <= MAX_TOTAL_PAGES;
  const duplicateBlockedMessage = activePairSpecial
    ? 'Special spreads cannot be duplicated.'
    : activePairLocked
      ? 'This spread is locked and cannot be duplicated.'
      : activePairNonPrintable
        ? 'Non-printable spreads cannot be duplicated.'
        : 'This spread cannot be duplicated.';
  const addBlockedMessage = `Books can have at most ${MAX_TOTAL_PAGES} pages. Delete a spread before adding another one.`;

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
      totalVisiblePages: visiblePages.length, // Use visiblePages instead of pages
      canGoPrev: state.activePageIndex > 0,
      canGoNext: state.activePageIndex < visiblePages.length - 1 // Use visiblePages instead of pages
    };
  };
  
  const { currentVisiblePage, totalVisiblePages, canGoPrev, canGoNext } = getVisiblePageInfo();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveBook();
      toast.success('Book saved successfully');
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
      navigate('/books');
    }
  };

  const handleExitWithoutSaving = () => {
    setShowCloseConfirm(false);
    navigate('/books');
  };

  const handleExitWithSaving = async () => {
    setShowCloseConfirm(false);
    await handleSave();
    navigate('/books');
  };

  const handlePrevPage = () => {
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      const currentVisibleIndex = visiblePageNumbers.indexOf(currentPage);
      if (currentVisibleIndex > 0) {
        const prevPageNumber = visiblePageNumbers[currentVisibleIndex - 1];
        ensurePagesLoaded(prevPageNumber - 1, prevPageNumber);
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: prevPageNumber - 1 });
      }
    } else {
      // Find previous visible page (skip preview pages)
      const currentVisibleIndex = visiblePages.findIndex((p) => {
        const pageIndex = state.currentBook.pages.findIndex(pp => pp.id === p.id);
        return pageIndex === state.activePageIndex;
      });
      
      if (currentVisibleIndex > 0) {
        const prevVisiblePage = visiblePages[currentVisibleIndex - 1];
        const prevPageIndex = state.currentBook.pages.findIndex(p => p.id === prevVisiblePage.id);
        if (prevPageIndex !== -1) {
          ensurePagesLoaded(prevPageIndex, prevPageIndex + 1);
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: prevPageIndex });
        }
      }
    }
  };

  const handleNextPage = () => {
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      const currentVisibleIndex = visiblePageNumbers.indexOf(currentPage);
      if (currentVisibleIndex < visiblePageNumbers.length - 1) {
        const nextPageNumber = visiblePageNumbers[currentVisibleIndex + 1];
        ensurePagesLoaded(nextPageNumber - 1, nextPageNumber);
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: nextPageNumber - 1 });
      }
    } else {
      // Find next visible page (skip preview pages)
      const currentVisibleIndex = visiblePages.findIndex((p) => {
        const pageIndex = state.currentBook.pages.findIndex(pp => pp.id === p.id);
        return pageIndex === state.activePageIndex;
      });
      
      if (currentVisibleIndex >= 0 && currentVisibleIndex < visiblePages.length - 1) {
        const nextVisiblePage = visiblePages[currentVisibleIndex + 1];
        const nextPageIndex = state.currentBook.pages.findIndex(p => p.id === nextVisiblePage.id);
        if (nextPageIndex !== -1) {
          ensurePagesLoaded(nextPageIndex, nextPageIndex + 1);
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: nextPageIndex });
        }
      }
    }
  };

  const deleteBlockedMessage = deleteTooltip ?? 'This spread cannot be deleted.';

  const handleAddPage = () => {
    if (!canAddSpread) {
      setShowAlert({ title: 'Cannot add spread', message: addBlockedMessage });
      return;
    }
    dispatch({ type: 'ADD_PAGE' });
    // Jump to the newly added page (use visiblePages to get correct count)
    const newVisiblePages = getVisiblePages();
    if (newVisiblePages.length > 0) {
      const lastPage = newVisiblePages[newVisiblePages.length - 1];
      const lastPageIndex = state.currentBook.pages.findIndex(p => p.id === lastPage.id);
      if (lastPageIndex !== -1) {
        ensurePagesLoaded(lastPageIndex, lastPageIndex + 1);
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: lastPageIndex });
      }
    }
  };

  const handleDeletePage = () => {
    if (!canDeleteSpread) {
      setShowAlert({ title: 'Cannot delete spread', message: deleteBlockedMessage });
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeletePage = () => {
    if (!canDeleteSpread) {
      setShowDeleteConfirm(false);
      return;
    }
    setShowDeleteConfirm(false);
    dispatch({ type: 'DELETE_PAGE', payload: state.activePageIndex });
  };

  const handleDuplicatePage = () => {
    if (!canDuplicateSpread) {
      setShowAlert({ title: 'Cannot duplicate spread', message: duplicateBlockedMessage });
      return;
    }
    dispatch({ type: 'DUPLICATE_PAGE', payload: state.activePageIndex });
  };

  const handleGoToPage = (page: number) => {
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // For own_page access, page parameter is the visible page number (1-based)
      if (page >= 1 && page <= visiblePageNumbers.length) {
        const actualPageNumber = visiblePageNumbers[page - 1];
        ensurePagesLoaded(actualPageNumber - 1, actualPageNumber);
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: actualPageNumber - 1 });
      }
    } else {
      ensurePagesLoaded(page - 1, page);
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: page - 1 });
    }
  };

  const handleReorderPages = (fromIndex: number, toIndex: number, count: number = 2) => {
    dispatch({ type: 'REORDER_PAGES', payload: { fromIndex, toIndex, count } });
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
            pages={visiblePages} // Always use visiblePages to exclude preview pages
            activePageIndex={state.pageAccessLevel === 'own_page' ? visiblePageNumbers.indexOf(currentPage) : visiblePages.findIndex((p, idx) => idx === state.activePageIndex)}
            onClose={() => setShowPagesSubmenu(false)}
            onPageSelect={handleGoToPage}
            onReorderPages={handleReorderPages}
            bookId={state.currentBook.id}
            isRestrictedView={state.pageAccessLevel === 'own_page'}
          />
        ) : (
          <div className="flex items-center justify-between w-full h-11 px-0 gap-2 relative z-[100]">
            {/* Left Section - Page Controls */}
            <div className="flex items-center gap-2">
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
                  canDelete={canDeleteSpread}
                  canAdd={canAddSpread}
                  canDuplicate={canDuplicateSpread}
                  deleteTooltip={deleteBlockedMessage}
                  showAssignFriends={false}
                />
              )}
            </div>

            {/* Center Section - Book Title */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <BookTitle title={state.currentBook.name} readOnly={state.userRole === 'author'} />
            </div>

            <div className="mr-2" style={{ transform: 'translateY(-1px)' }}>
            <PageAssignmentButton
                currentPage={currentPage}
                bookId={state.currentBook.id}
              />
              </div>

            {/* Right Section - User Assignment & Settings */}
            <div className="flex items-center gap-2">
              
              
              {(state.userRole !== 'author' || (state.userRole === 'author' && state.editorInteractionLevel === 'full_edit_with_settings')) && (
                <Tooltip content="Settings" side="bottom_editor_bar">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
                      setShowBookManager(true);
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
                isSaving={isSaving}
                onPreview={() => setShowBookPreview(true)}
              />
              
              <Tooltip content="Close Editor" side="bottom_editor_bar">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleClose}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </EditorBarContainer>
      
      <BookExportModal 
        isOpen={showPDFModal} 
        onClose={() => setShowPDFModal(false)} 
      />

      <BookPreviewModal
        isOpen={showBookPreview}
        onClose={() => setShowBookPreview(false)}
      />

      {state.currentBook && (
        <BookManagerModal
          isOpen={showBookManager}
          onClose={() => {
            setShowBookManager(false);
            setBookManagerTab(undefined);
          }}
          bookId={state.currentBook.id}
          initialTab={bookManagerTab}
        />
      )}
      
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

function BookManagerModal({ isOpen, onClose, bookId, initialTab }: { isOpen: boolean; onClose: () => void; bookId: number; initialTab?: string }) {
  const [actions, setActions] = useState<React.ReactNode>(null);
  
  // Memoize the callback to prevent infinite loops
  const handleActionsReady = useCallback((newActions: React.ReactNode) => {
    setActions(newActions);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Manager"
      size="lg"
      closeOnBackdrop={false}
      actions={actions}
    >
      <BookManagerContent 
        bookId={bookId} 
        onClose={onClose}
        hideActions={true}
        onActionsReady={handleActionsReady}
        initialTab={initialTab}
      />
    </Modal>
  );
}


