import { Button } from '../../ui/primitives/button';
import { Save, Download} from 'lucide-react';
import { Tooltip } from '../../ui/tooltip';

interface BookActionsProps {
  onSave: () => void;
  onExport: () => void;
  onClose: () => void;
  isSaving: boolean;
}

export function BookActions({
  onSave,
  onExport,
  isSaving
}: BookActionsProps) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Tooltip content={isSaving ? 'Saving...' : 'Save book'} side="bottom" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="h-8 md:h-9 px-2 md:px-3"
        >
          <Save className="h-3 w-3 md:h-4 md:w-4" />
          {/* <span className="hidden md:inline ml-2">{isSaving ? 'Saving...' : 'Save'}</span> */}
        </Button>
      </Tooltip>

      <Tooltip content="Export as PDF" side="bottom" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8 md:h-9 px-2 md:px-3"
        >
          <Download className="h-3 w-3 md:h-4 md:w-4" />
          {/* <span className="hidden md:inline ml-2">Export</span> */}
        </Button>
      </Tooltip>


    </div>
  );
}