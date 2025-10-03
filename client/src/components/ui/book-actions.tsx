import { Button } from './button';
import { Save, Download, X } from 'lucide-react';

interface BookActionsProps {
  onSave: () => void;
  onExport: () => void;
  onClose: () => void;
  isSaving: boolean;
}

export default function BookActions({
  onSave,
  onExport,
  onClose,
  isSaving
}: BookActionsProps) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="h-8 md:h-9 px-2 md:px-3"
      >
        <Save className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">{isSaving ? 'Saving...' : 'Save'}</span>
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={onExport}
        className="h-8 md:h-9 px-2 md:px-3"
      >
        <Download className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">Export</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 md:h-9 px-2 md:px-3"
      >
        <X className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">Close</span>
      </Button>
    </div>
  );
}