import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../../../context/editor-context';
import type { Page } from '../../../../context/editor-context';
import { MIN_TOTAL_PAGES, MAX_TOTAL_PAGES } from '../../../../constants/book-limits';
import { isContentPairPage } from '../../../../utils/book-structure';
import BookExportModal from '../book-export-modal';
import { BookPreviewModal } from '../preview/book-preview-modal';
import BookManagerModal from '../../books/book-manager-modal';
import { Button } from '../../../ui/primitives/button';
import { toast } from 'sonner';

import { FloatingEditorToggleButton } from '../floating-editor-toggle-button';
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

import { PagesSubmenu } from './page-explorer-compact';
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
  toolSettingsPanelRef: React.RefObject<{ openThemeSelector: () => void }>;
  initialPreviewOpen?: boolean;
  isSandboxMode?: boolean;
}

export default function EditorBar({ toolSettingsPanelRef, initialPreviewOpen = false, isSandboxMode = false }: EditorBarProps) {
  const {
    state,
    dispatch,
    saveBook,
    refreshPageAssignments,
    getVisiblePages,
    getVisiblePageNumbers,
    ensurePagesLoaded,
    canEditBookSettings,
    canViewAllPages
  } = useEditor();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showBookPreview, setShowBookPreview] = useState(initialPreviewOpen);
  const [showBookManager, setShowBookManager] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);

  const [showPagesSubmenu, setShowPagesSubmenu] = useState(false);
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [addPageInsertionIndex, setAddPageInsertionIndex] = useState<number | null>(null);

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
  const totalPages = state.pagePagination?.totalPages ?? state.currentBook.pages.length;
  const activePairIsContentPair = activePairPages.every((p) => isContentPairPage(p?.pageNumber ?? -1, totalPages));
  const activePairLocked = activePairPages.some((page) => page?.isLocked);
  const activePairSpecial = activePairPages.some((page) => page?.isSpecialPage);
  const activePairNonPrintable = activePairPages.some((page) => page?.isPrintable === false);
  const canDuplicateSpread = activePairPages.length > 0 && activePairIsContentPair && !activePairLocked && !activePairSpecial && !activePairNonPrintable;
  const remainingPagesAfterDelete = state.currentBook.pages.length - activePairPages.length;
  const deleteLeavesMinimum = remainingPagesAfterDelete >= MIN_TOTAL_PAGES;
  const canDeleteSpread = canDuplicateSpread && deleteLeavesMinimum;
  const deleteTooltip = !deleteLeavesMinimum
    ? `Books must keep at least ${MIN_TOTAL_PAGES} pages.`
    : !activePairIsContentPair
      ? 'Only content page pairs can be deleted.'
      : activePairSpecial
        ? 'Special page pairs cannot be deleted.'
        : activePairLocked
          ? 'This page pair is locked.'
          : undefined;
  const canAddSpread = state.currentBook.pages.length + 2 <= MAX_TOTAL_PAGES;
  const duplicateBlockedMessage = !activePairIsContentPair
    ? 'Only content page pairs can be duplicated.'
    : activePairSpecial
      ? 'Special page pairs cannot be duplicated.'
      : activePairLocked
        ? 'This page pair is locked and cannot be duplicated.'
        : activePairNonPrintable
          ? 'Non-printable page pairs cannot be duplicated.'
          : 'This page pair cannot be duplicated.';
  const addBlockedMessage = `Books can have at most ${MAX_TOTAL_PAGES} pages. Delete a page pair before adding another one.`;

  const { pages } = state.currentBook;
  const visiblePages = getVisiblePages();
  const visiblePageNumbers = getVisiblePageNumbers();
  const currentPage = state.currentBook.pages[state.activePageIndex]?.pageNumber ?? state.activePageIndex;
  
  const isRestrictedView = !canViewAllPages();

  // For own_page access, calculate visible page index and total (0-based page numbers)
  const getVisiblePageInfo = () => {
    if (isRestrictedView && visiblePageNumbers.length > 0) {
      const visibleIndex = visiblePageNumbers.indexOf(currentPage);
      return {
        currentVisiblePage: visibleIndex >= 0 ? visibleIndex : 0,
        totalVisiblePages: visiblePageNumbers.length,
        canGoPrev: visibleIndex > 0,
        canGoNext: visibleIndex >= 0 && visibleIndex < visiblePageNumbers.length - 1
      };
    }
    return {
      currentVisiblePage: currentPage,
      totalVisiblePages: visiblePages.length,
      canGoPrev: state.activePageIndex > 0,
      canGoNext: state.activePageIndex < visiblePages.length - 1
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

  const handleShowAddPageDialog = (insertionIndex: number) => {
    setAddPageInsertionIndex(insertionIndex);
    setShowAddPageDialog(true);
  };

  const handleConfirmAddPage = () => {
    if (addPageInsertionIndex !== null) {
      dispatch({ type: 'ADD_PAGE_PAIR_AT_INDEX', payload: { insertionIndex: addPageInsertionIndex } });
    }
    setShowAddPageDialog(false);
    setAddPageInsertionIndex(null);
  };

  const handleCancelAddPage = () => {
    setShowAddPageDialog(false);
    setAddPageInsertionIndex(null);
  };

  const handleExitWithSaving = async () => {
    setShowCloseConfirm(false);
    await handleSave();
    navigate('/books');
  };

  const handlePrevPage = () => {
    if (isRestrictedView) {
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
    if (isRestrictedView) {
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
    const totalPages = state.pagePagination?.totalPages ?? state.currentBook.pages.length;
    const insertionIndex = activePairPages.length
      ? Math.max(
          0,
          Math.min(
            ...activePairPages.map((page) => (page.pageNumber ?? 1) - 1)
          )
        )
      : totalPages;
    handleShowAddPageDialog(insertionIndex);
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
    if (isRestrictedView) {
      // For own_page access, page is 0-based index into visiblePageNumbers
      if (page >= 0 && page < visiblePageNumbers.length) {
        const actualPageNumber = visiblePageNumbers[page];
        const pageIndex = state.currentBook!.pages.findIndex((p) => (p.pageNumber ?? -1) === actualPageNumber);
        if (pageIndex >= 0) {
          ensurePagesLoaded(pageIndex, pageIndex + 1);
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: pageIndex });
        }
      }
    } else {
      // 0-based page number
      ensurePagesLoaded(page, page + 1);
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: page });
    }
  };

  const handleReorderPages = (fromIndex: number, toIndex: number, count: number = 2) => {
    dispatch({ type: 'REORDER_PAGES', payload: { fromIndex, toIndex, count } });
  };

  return (
    <>
      <FloatingEditorToggleButton
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
            activePageIndex={isRestrictedView ? visiblePageNumbers.indexOf(currentPage) : visiblePages.findIndex((p) => (p.pageNumber ?? -1) === currentPage)}
            onClose={() => setShowPagesSubmenu(false)}
            onPageSelect={handleGoToPage}
            onReorderPages={handleReorderPages}
            bookId={state.currentBook.id}
            isRestrictedView={isRestrictedView}
            onShowAddPageDialog={handleShowAddPageDialog}
          />
        ) : (
          <div className="flex items-center justify-between w-full p-0 pt-1 gap-2 relative z-[100]">
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
              
              {canEditBookSettings() && (
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
              <BookTitle title={state.currentBook.name} readOnly={!canEditBookSettings()} />
            </div>

            <div className="mr-2">
            <PageAssignmentButton
                currentPage={Number(currentPage)}
                bookId={Number(state.currentBook.id)}
              />
              </div>

            {/* Right Section - User Assignment & Settings */}
            <div className="flex items-center gap-2">
              
              
              {canEditBookSettings() && (
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
              
              {!isSandboxMode && (
                <BookActions
                  onSave={handleSave}
                  onExport={() => setShowPDFModal(true)}
                  isSaving={isSaving}
                  onPreview={() => setShowBookPreview(true)}
                />
              )}
              
              <Tooltip content={isSandboxMode ? 'Back to Admin' : 'Close Editor'} side="bottom_editor_bar">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={isSandboxMode ? () => navigate('/admin') : handleClose}
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
          bookId={Number(state.currentBook.id)}
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
        open={showAddPageDialog}
        onOpenChange={setShowAddPageDialog}
        title="Add Page Pair"
        description="Are you sure you want to add a new page pair at this position? This will shift all subsequent pages."
        onConfirm={handleConfirmAddPage}
        onCancel={handleCancelAddPage}
        confirmText="Add Pages"
        cancelText="Cancel"
        confirmVariant="default"
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

