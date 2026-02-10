import { Button } from '../../../ui/primitives/button';
import { Download, Eye, Printer, Save } from 'lucide-react';
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
  const { canEditCurrentPage, canEditElement } = useEditor();

  const canEditPageContent = canEditCurrentPage() || canEditElement({ textType: 'answer' });
  const isSaveDisabled = isSaving || !canEditPageContent;
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Tooltip content={isSaving ? 'Saving...' : !canEditPageContent ? 'Cannot save on this page' : 'Save book'} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="xs"
          onClick={onSave}
          disabled={isSaveDisabled}
          className="h-7"
        >
          <Save className="h-5 w-5 stroke-[1.5]" />
          {/* <span className="hidden md:inline ml-2">{isSaving ? 'Saving...' : 'Save'}</span> */}
        </Button>
      </Tooltip>

      <Tooltip content="Preview book" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="xs"
          onClick={onPreview}
          className="h-7"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </Tooltip>

      <Tooltip content="Export as PDF" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="xs"
          onClick={onExport}
          className="h-7"
        >
          <Printer className="h-5 w-5" />
          {/* <span className="hidden md:inline ml-2">Export</span> */}
        </Button>
      </Tooltip>


    </div>
  );
}