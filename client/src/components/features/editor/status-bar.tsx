import { useMemo, useState } from 'react';
import { useEditor } from '../../../context/editor-context';
import type { CanvasElement } from '../../../context/editor-context';
import { Button } from '../../../components/ui/primitives';
import { ChevronDown, ChevronUp, Download, Layout } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/composites/tabs';
import { exportThemeAndPalette } from '../../../utils/theme-palette-exporter';
import { exportLayout } from '../../../utils/layout-exporter';
import { calculatePageDimensions } from '../../../utils/template-utils';
import { PagesSubmenu } from './editor-bar/page-explorer';

const matchesElementDescriptor = (element: CanvasElement, value: string) => {
  const fallbackType = (element as CanvasElement & { type?: string }).type;
  return element.textType === value || fallbackType === value;
};

type StatusBarSection = 'details' | 'pages';

export function StatusBar() {
  const { state, dispatch, getVisiblePages, ensurePagesLoaded } = useEditor();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<StatusBarSection>('pages');

  const visiblePages = useMemo(() => getVisiblePages(), [getVisiblePages]);

  if (!state.currentBook) return null;
  const currentBook = state.currentBook;
  const isRestrictedView = state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0;

  const handleExportThemeAndPalette = () => {
    const currentPage = currentBook.pages[state.activePageIndex];
    if (!currentPage) {
      console.warn('No current page found');
      return;
    }

    const elements = (currentPage.elements || []) as CanvasElement[];
    
    // Check if we have the required elements
    const hasQna = elements.some((el) => matchesElementDescriptor(el, 'qna_inline'));
    const hasFreeText = elements.some((el) => matchesElementDescriptor(el, 'free_text'));
    const hasShape = elements.some(el => 
      el.type === 'rect' || el.type === 'circle' || el.type === 'triangle' || 
      el.type === 'polygon' || el.type === 'heart' || el.type === 'star' ||
      el.type === 'speech-bubble' || el.type === 'dog' || el.type === 'cat' || el.type === 'smiley'
    );

    if (!hasQna && !hasFreeText && !hasShape) {
      alert('Bitte fügen Sie mindestens ein Element hinzu:\n- QnA Inline Textbox\n- Free Text Textbox\n- Shape (Rect, Circle, etc.)');
      return;
    }

    // Prompt for theme and palette names
    const themeName = prompt('Geben Sie einen Namen für das Theme ein:');
    if (!themeName || themeName.trim() === '') {
      return;
    }

    const paletteName = prompt('Geben Sie einen Namen für die Color Palette ein:', themeName);
    if (!paletteName || paletteName.trim() === '') {
      return;
    }

    exportThemeAndPalette(
      themeName.trim(),
      paletteName.trim(),
      elements,
      currentPage.background,
      currentPage.themeId || currentPage.background?.pageTheme
    );
  };

  const handleExportLayout = () => {
    const currentPage = currentBook.pages[state.activePageIndex];
    if (!currentPage) {
      console.warn('No current page found');
      return;
    }

    const elements = (currentPage.elements || []) as CanvasElement[];
    
    // Check if we have qna_inline or image elements
    const hasQna = elements.some((el) => matchesElementDescriptor(el, 'qna_inline'));
    const hasImage = elements.some(el => el.type === 'image');

    if (!hasQna && !hasImage) {
      alert('Bitte fügen Sie mindestens ein Element hinzu:\n- QnA Inline Textbox\n- Image');
      return;
    }

    // Prompt for template details
    const templateName = prompt('Geben Sie einen Namen für das Layout ein:');
    if (!templateName || templateName.trim() === '') {
      return;
    }

    const templateId = prompt('Geben Sie eine ID für das Layout ein (z.B. "my-layout-1"):', 
      templateName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    if (!templateId || templateId.trim() === '') {
      return;
    }

    const categoryInput = prompt('Geben Sie die Kategorie ein (structured/freeform/mixed):', 'freeform');
    const category = (categoryInput === 'structured' || categoryInput === 'freeform' || categoryInput === 'mixed') 
      ? categoryInput 
      : 'freeform';

    // Berechne Canvas-Größe aus pageSize und orientation
    const pageSize = state.currentBook?.pageSize || 'A4';
    const orientation = state.currentBook?.orientation || 'portrait';
    const canvasSize = calculatePageDimensions(pageSize, orientation);

    exportLayout(
      templateId.trim(),
      templateName.trim(),
      category,
      elements,
      currentPage.background,
      currentPage.themeId || currentPage.background?.pageTheme,
      currentPage.colorPaletteId,
      undefined, // thumbnail
      canvasSize
    );
  };

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

  const toggleExpanded = () => setIsExpanded((prev) => !prev);
  const ToggleIcon = isExpanded ? ChevronDown : ChevronUp;

  const renderDetailsContent = (condensed: boolean) => (
    <div
      className={`flex items-center ${condensed ? 'gap-3 text-[11px]' : 'gap-4 text-sm flex-wrap'} text-muted-foreground overflow-hidden`}
    >
      <span className="font-medium whitespace-nowrap">
        Tool: <span className="text-foreground">{state.activeTool}</span>
      </span>
      <span className="font-medium whitespace-nowrap hidden sm:inline">
        Book ID: <span className="text-foreground">{currentBook.id}</span> | Page ID:{' '}
        <span className="text-foreground">
          {currentBook.pages[state.activePageIndex]?.database_id || ''}
        </span>{' '}
        | Page Number: <span className="text-foreground">{state.activePageIndex + 1}</span>
      </span>
      {state.pageAssignments[state.activePageIndex + 1] && (
        <span className="font-medium whitespace-nowrap hidden lg:inline">
          User: <span className="text-foreground">{state.pageAssignments[state.activePageIndex + 1].id}</span>
        </span>
      )}
      <span className="font-medium whitespace-nowrap">
        Selected:{' '}
        <span className="text-foreground">
          {state.selectedElementIds.length}
        </span>{' '}
        element{state.selectedElementIds.length !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportLayout}
          className={`h-7 text-xs ${condensed ? 'px-2' : ''}`}
        >
          <Layout className="h-3 w-3 mr-1" />
          Export Layout
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportThemeAndPalette}
          className={`h-7 text-xs ${condensed ? 'px-2' : ''}`}
        >
          <Download className="h-3 w-3 mr-1" />
          Export Theme + Palette
        </Button>
      </div>
    </div>
  );

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
    />
  );

  return (
    <div className="bg-card border-t border-border text-muted-foreground shrink-0">
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-4 h-12">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleExpanded}
          >
            <ToggleIcon className="h-4 w-4" />
            <span className="sr-only">{isExpanded ? 'Collapse status bar' : 'Expand status bar'}</span>
          </Button>

          <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as StatusBarSection)} className="shrink-0">
            <TabsList className="h-8 bg-muted">
              <TabsTrigger value="details" className="px-3 py-1 text-xs sm:text-sm">
                Details
              </TabsTrigger>
              <TabsTrigger value="pages" className="px-3 py-1 text-xs sm:text-sm">
                Pages
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!isExpanded && (
            <div className="flex-1 min-w-0">
              {activeSection === 'details' ? (
                renderDetailsContent(true)
              ) : (
                <div className="max-w-full">
                  {renderPageExplorer('micro')}
                </div>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="border-t border-border/70 bg-muted/30 px-4 py-3">
            {activeSection === 'details' ? (
              renderDetailsContent(false)
            ) : (
              renderPageExplorer('expanded')
            )}
          </div>
        )}
      </div>
    </div>
  );
}