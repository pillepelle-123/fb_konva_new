import { Button } from '../../../ui/primitives/button';
import { Plus, Copy, Trash2, Users } from 'lucide-react';
import { Tooltip } from '../../../ui/composites/tooltip';
import { useEditor } from '../../../../context/editor-context';

interface PageActionsProps {
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  onAssignFriends?: () => void;
  canDelete: boolean;
  showAssignFriends?: boolean;
  canAdd?: boolean;
  canDuplicate?: boolean;
  deleteTooltip?: string;
}

export function PageActions({
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onAssignFriends,
  canDelete,
  showAssignFriends = false,
  canAdd = true,
  canDuplicate = true,
  deleteTooltip
}: PageActionsProps) {
  const { canEditBookSettings } = useEditor();
  const canManagePages = canEditBookSettings();
  const addDisabled = !canManagePages || !canAdd;
  const duplicateDisabled = !canManagePages || !canDuplicate;
  const deleteDisabled = !canDelete || !canManagePages;
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Tooltip
        content={addDisabled ? 'Cannot add page pair here' : 'Add page pair'}
        side="bottom_editor_bar"
        backgroundColor="bg-background"
        textColor="text-foreground"
      >
        <Button
          variant="outline"
          size="xs"
          onClick={onAddPage}
          disabled={addDisabled}
          className={`h-7 ${addDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="h-5 w-5" />
          {/* <span className="hidden md:inline ml-2">Add</span> */}
        </Button>
      </Tooltip>

      <Tooltip
        content={duplicateDisabled ? 'Cannot duplicate this page pair' : 'Duplicate current page pair'}
        side="bottom_editor_bar"
        backgroundColor="bg-background"
        textColor="text-foreground"
      >
        <Button
          variant="outline"
          size="xs"
          onClick={onDuplicatePage}
          disabled={duplicateDisabled}
          className={`h-7 ${duplicateDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Copy className="h-5 w-5" />
          {/* <span className="hidden md:inline ml-2">Duplicate</span> */}
        </Button>
      </Tooltip>

      {showAssignFriends && (
        <Tooltip content="Assign friends to this page" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
          <Button
            variant="outline"
            size="xs"
            onClick={onAssignFriends}
            disabled={!canManagePages}
            className={`h-7 ${!canManagePages ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Users className="h-5 w-5" />
          </Button>
        </Tooltip>
      )}

      <Tooltip
        content={
          deleteDisabled
            ? deleteTooltip || 'Cannot delete this page pair'
            : 'Delete current page pair'
        }
        side="bottom_editor_bar"
        backgroundColor="bg-background"
        textColor="text-foreground"
      >
        <Button
          variant="outline"
          size="xs"
          onClick={onDeletePage}
          disabled={deleteDisabled}
          className={`h-7 text-destructive hover:text-destructive ${
            deleteDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Trash2 className="h-5 w-5" />
          {/* <span className="hidden md:inline ml-2">Delete</span> */}
        </Button>
      </Tooltip>
    </div>
  );
}