import { Button } from './primitives/button';
import { Plus, Copy, Trash2 } from 'lucide-react';

interface PageActionsProps {
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  canDelete: boolean;
}

export function PageActions({
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  canDelete
}: PageActionsProps) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddPage}
        className="h-8 md:h-9 px-2 md:px-3"
      >
        <Plus className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">Add</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onDuplicatePage}
        className="h-8 md:h-9 px-2 md:px-3"
      >
        <Copy className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">Duplicate</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onDeletePage}
        disabled={!canDelete}
        className="h-8 md:h-9 px-2 md:px-3 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">Delete</span>
      </Button>
    </div>
  );
}