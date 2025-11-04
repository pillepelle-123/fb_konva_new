import { useEditor } from '../../../context/editor-context';
import { Button } from '../../../components/ui/primitives';
import { Download, Layout } from 'lucide-react';
import { exportThemeAndPalette } from '../../../utils/theme-palette-exporter';
import { exportLayout } from '../../../utils/layout-exporter';

export function StatusBar() {
  const { state } = useEditor();

  if (!state.currentBook) return null;

  const handleExportThemeAndPalette = () => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    if (!currentPage) {
      console.warn('No current page found');
      return;
    }

    const elements = currentPage.elements || [];
    
    // Check if we have the required elements
    const hasQna = elements.some(el => el.textType === 'qna_inline' || el.type === 'qna_inline');
    const hasFreeText = elements.some(el => el.textType === 'free_text' || el.type === 'free_text');
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
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    if (!currentPage) {
      console.warn('No current page found');
      return;
    }

    const elements = currentPage.elements || [];
    
    // Check if we have qna_inline or image elements
    const hasQna = elements.some(el => el.textType === 'qna_inline' || el.type === 'qna_inline');
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

    exportLayout(
      templateId.trim(),
      templateName.trim(),
      category,
      elements,
      currentPage.background,
      currentPage.themeId || currentPage.background?.pageTheme,
      currentPage.colorPaletteId
    );
  };

  return (
    <div className="px-6 py-2 bg-card border-t border-border text-sm text-muted-foreground flex justify-between items-center shrink-0 gap-4">
      <span className="font-medium">Tool: <span className="text-foreground">{state.activeTool}</span></span>
      <span className="font-medium">
        Book ID: <span className="text-foreground">{state.currentBook.id}</span> | 
        Page ID: <span className="text-foreground">{state.currentBook.pages[state.activePageIndex]?.database_id || ''}</span> | 
        Page Number: <span className="text-foreground">{state.activePageIndex + 1}</span>
        {state.pageAssignments[state.activePageIndex + 1] && (
          <> | User: <span className="text-foreground">{state.pageAssignments[state.activePageIndex + 1].id}</span></>
        )}
      </span>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportLayout}
          className="h-7 text-xs"
        >
          <Layout className="h-3 w-3 mr-1" />
          Export Layout
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportThemeAndPalette}
          className="h-7 text-xs"
        >
          <Download className="h-3 w-3 mr-1" />
          Export Theme + Palette
        </Button>
        <span className="font-medium">
          Selected: <span className="text-foreground">{state.selectedElementIds.length}</span> element{state.selectedElementIds.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}