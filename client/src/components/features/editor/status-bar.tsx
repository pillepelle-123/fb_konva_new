import { useMemo, useState, useEffect } from 'react';
import { useEditor } from '../../../context/editor-context';
import { PagesSubmenu } from './editor-bar/page-explorer-compact';
import { PageExplorer, type PageItem } from './editor-bar/page-explorer';
import { Button } from '../../ui/primitives/button';
import { PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import { Tooltip } from '../../ui';
import AddPageConfirmationDialog from '../../ui/overlays/add-page-confirmation-dialog';

const ANIMATION_DURATION_MS = 200;
const COMPACT_ROW_HEIGHT = 40;
const EXPANDED_PANEL_HEIGHT = 90;

export function StatusBar() {
  const { state, dispatch, getVisiblePages, ensurePagesLoaded } = useEditor();
  const [showPageExplorerPanel, setShowPageExplorerPanel] = useState(false);
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [addPageInsertionIndex, setAddPageInsertionIndex] = useState<number | null>(null);

  // Authors dürfen das PageExplorer-Panel nicht öffnen – beim Rollenwechsel schließen
  useEffect(() => {
    if (state.userRole === 'author') {
      setShowPageExplorerPanel(false);
    }
  }, [state.userRole]);

  const visiblePages = useMemo(() => getVisiblePages(), [getVisiblePages]);

  // Pages for PageExplorer (DnD panel): from currentBook in page order
  const pageExplorerPages = useMemo<PageItem[]>(() => {
    if (!state.currentBook?.pages) return [];
    return state.currentBook.pages
      .filter((p) => !(p as { isPreview?: boolean }).isPreview && !(p as { isPlaceholder?: boolean }).isPlaceholder)
      .map((p) => ({ pageNumber: p.pageNumber ?? 0, pageType: p.pageType, id: (p as { id?: number }).id }));
  }, [state.currentBook?.pages]);

  // pageAssignments keyed by page number (1-based)
  const pageAssignmentsMap = useMemo(() => {
    const map: Record<number, { id: number; name: string; email: string }> = {};
    if (!state.pageAssignments) return map;
    Object.entries(state.pageAssignments).forEach(([key, user]) => {
      const pageNum = typeof key === 'string' ? parseInt(key, 10) : key;
      if (!isNaN(pageNum) && user) {
        map[pageNum] = { id: user.id, name: user.name, email: user.email };
      }
    });
    return map;
  }, [state.pageAssignments]);

  const handlePageOrderChange = (newPageOrder: number[]) => {
    dispatch({ type: 'REORDER_PAGES_TO_ORDER', payload: { pageOrder: newPageOrder } });
  };

  if (!state.currentBook) return null;
  const currentBook = state.currentBook;
  const isRestrictedView = state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0;

  const handlePageSelect = (pageNumber: number) => {
    if (!currentBook) return;
    if (isRestrictedView && !state.assignedPages.includes(pageNumber)) {
      return;
    }
    const pageIndex = currentBook.pages.findIndex((page) => page.pageNumber === pageNumber);
    if (pageIndex === -1) return;
    ensurePagesLoaded(pageIndex, pageIndex + 1);
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: pageIndex });
  };

  const handleReorderPages = (fromIndex: number, toIndex: number, count: number = 2) => {
    dispatch({ type: 'REORDER_PAGES', payload: { fromIndex, toIndex, count } });
  };

  const handleShowAddPageDialog = (insertionIndex: number) => {
    setAddPageInsertionIndex(insertionIndex);
    setShowAddPageDialog(true);
  };

  const handleAddPagesWithLayout = () => {
    if (addPageInsertionIndex !== null) {
      dispatch({ type: 'ADD_PAGE_PAIR_AT_INDEX', payload: { insertionIndex: addPageInsertionIndex } });
    }
    setShowAddPageDialog(false);
    setAddPageInsertionIndex(null);
  };

  const handleAddEmptyPages = () => {
    if (addPageInsertionIndex !== null) {
      dispatch({ type: 'ADD_EMPTY_PAGE_PAIR_AT_INDEX', payload: { insertionIndex: addPageInsertionIndex } });
    }
    setShowAddPageDialog(false);
    setAddPageInsertionIndex(null);
  };

  const handleCancelAddPage = () => {
    setShowAddPageDialog(false);
    setAddPageInsertionIndex(null);
  };


  const renderPageExplorer = (mode: 'expanded' | 'compact' | 'micro') => (
    <PagesSubmenu
      pages={visiblePages}
      activePageIndex={state.activePageIndex}
      onPageSelect={handlePageSelect}
      onReorderPages={handleReorderPages}
      bookId={currentBook.id}
      isRestrictedView={isRestrictedView}
      viewMode={
        mode === 'expanded' ? 'default' : mode === 'compact' ? 'compact' : 'micro'
      }
      showHeader={false}
      compactLabelMode={mode === 'expanded' ? 'default' : mode === 'compact' ? 'minimal' : 'minimal'}
      onShowAddPageDialog={handleShowAddPageDialog}
    />
  );

  return (
    <>
      <div
        className="bg-card border-t border-border text-muted-foreground shrink-0 relative z-[1000]"
        style={{
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1000
        }}
      >
        <div className="flex flex-col">
          {/* Wie Toolbar: Inhalte immer im DOM, nur Höhe animiert (transition-all duration-200) */}
          <div
            className="overflow-hidden transition-all ease-in-out shrink-0"
            style={{ height: showPageExplorerPanel ? 0 : COMPACT_ROW_HEIGHT, transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
          >
            <div className="flex items-center gap-2 px-2 h-10 shrink-0">
              {state.userRole !== 'author' && (
                <Tooltip
                  content="Open page order panel"
                  side="right"
                  backgroundColor="bg-background"
                  textColor="text-foreground"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPageExplorerPanel(true)}
                    className="h-8 w-8 p-0 flex items-center justify-center"
                  >
                    <PanelBottomOpen className="h-5 w-5" />
                  </Button>
                </Tooltip>
              )}
              <div className="flex-1 min-w-0 p-0">
                <div className="max-w-full">
                  {renderPageExplorer('micro')}
                </div>
              </div>
            </div>
          </div>
          <div
            className="overflow-hidden transition-all ease-in-out shrink-0"
            style={{ height: showPageExplorerPanel ? EXPANDED_PANEL_HEIGHT : 0, transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
          >
            <div className="flex items-end gap-2 px-2 pb-2 pt-1 min-h-[70px]">
              <Tooltip
                content="Close page order panel"
                side="top"
                backgroundColor="bg-background"
                textColor="text-foreground"
              >
                <div className="flex-shrink-0 pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPageExplorerPanel(false)}
                    className="h-8 w-8 p-0 flex items-center justify-center"
                  >
                    <PanelBottomClose className="h-5 w-5" />
                  </Button>
                </div>
              </Tooltip>
              <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-thin">
                <PageExplorer
                  pages={pageExplorerPages}
                  pageAssignments={pageAssignmentsMap}
                  onPageOrderChange={handlePageOrderChange}
                  layout="horizontal"
                  activePageNumber={currentBook.pages[state.activePageIndex]?.pageNumber}
                  onPageSelect={handlePageSelect}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddPageConfirmationDialog
        open={showAddPageDialog}
        onOpenChange={setShowAddPageDialog}
        title="Add Page Pair"
        description="Are you sure you want to add a new page pair at this position? This will shift all subsequent pages."
        onCancel={handleCancelAddPage}
        onAddWithLayout={handleAddPagesWithLayout}
        onAddEmpty={handleAddEmptyPages}
        cancelText="Cancel"
        addWithLayoutText="Add Pages with Layout"
        addEmptyText="Add empty Pages"
      />
    </>
  );
}