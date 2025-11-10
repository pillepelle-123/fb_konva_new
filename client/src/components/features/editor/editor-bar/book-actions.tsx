import { Button } from '../../../ui/primitives/button';
import { Download, Eye, Save } from 'lucide-react';
import { Tooltip } from '../../../ui/composites/tooltip';
import { useEditor } from '../../../../context/editor-context';

interface BookActionsProps {
  onSave: () => void;
  onExport: () => void;
  isSaving: boolean;
  onPreview: () => void;
}

export function BookActions({
  onSave,
  onExport,
  isSaving,
  onPreview
}: BookActionsProps) {
  const { state } = useEditor();
  
  // Disable save for authors on unassigned pages
  const isAuthorOnUnassignedPage = state.userRole === 'author' && 
    !state.assignedPages.includes(state.activePageIndex + 1);
  const isSaveDisabled = isSaving || isAuthorOnUnassignedPage;
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Tooltip content={isSaving ? 'Saving...' : isAuthorOnUnassignedPage ? 'Cannot save - not your assigned page' : 'Save book'} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaveDisabled}
          className="h-8 md:h-9 px-2 md:px-3"
        >
          <Save className="h-4 w-4 md:h-5 md:w-5" />
          {/* <span className="hidden md:inline ml-2">{isSaving ? 'Saving...' : 'Save'}</span> */}
        </Button>
      </Tooltip>

      <Tooltip content="Preview book" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="h-8 md:h-9 px-2 md:px-3"
        >
          <Eye className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </Tooltip>

      <Tooltip content="Export as PDF" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8 md:h-9 px-2 md:px-3"
        >
          <Download className="h-4 w-4 md:h-5 md:w-5" />
          {/* <span className="hidden md:inline ml-2">Export</span> */}
        </Button>
      </Tooltip>


    </div>
  );
}