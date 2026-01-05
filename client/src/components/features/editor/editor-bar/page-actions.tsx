import { Button } from '../../../ui/primitives/button';
import { Plus, Copy, Trash2, Users } from 'lucide-react';
import { Tooltip } from '../../../ui/composites/tooltip';
import { useAuth } from '../../../../context/auth-context';

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
  const { user } = useAuth();
  const isAuthor = user?.role === 'author';
  const addDisabled = isAuthor || !canAdd;
  const duplicateDisabled = isAuthor || !canDuplicate;
  const deleteDisabled = !canDelete || isAuthor;
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Tooltip
        content={addDisabled ? 'Cannot add a spread here' : 'Add new spread'}
        side="bottom_editor_bar"
        backgroundColor="bg-background"
        textColor="text-foreground"
      >
        <Button
          variant="outline"
          size="xs"
          onClick={() => window.dispatchEvent(new CustomEvent('addPage'))}
          disabled={addDisabled}
          className={`h-7 ${addDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="h-5 w-5" />
          {/* <span className="hidden md:inline ml-2">Add</span> */}
        </Button>
      </Tooltip>

      <Tooltip
        content={duplicateDisabled ? 'Cannot duplicate this spread' : 'Duplicate current spread'}
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
            disabled={isAuthor}
            className={`h-7 ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Users className="h-5 w-5" />
          </Button>
        </Tooltip>
      )}

      <Tooltip
        content={
          deleteDisabled
            ? deleteTooltip || 'Cannot delete this spread'
            : 'Delete current spread'
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