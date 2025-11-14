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
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('addPage'))}
          disabled={addDisabled}
          className={`h-8 md:h-9 px-2 md:px-3 ${addDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
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
          size="sm"
          onClick={onDuplicatePage}
          disabled={duplicateDisabled}
          className={`h-8 md:h-9 px-2 md:px-3 ${duplicateDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Copy className="h-4 w-4 md:h-5 md:w-5" />
          {/* <span className="hidden md:inline ml-2">Duplicate</span> */}
        </Button>
      </Tooltip>

      {showAssignFriends && (
        <Tooltip content="Assign friends to this page" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
          <Button
            variant="outline"
            size="sm"
            onClick={onAssignFriends}
            disabled={isAuthor}
            className={`h-8 md:h-9 px-2 md:px-3 ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Users className="h-4 w-4 md:h-5 md:w-5" />
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
          size="sm"
          onClick={onDeletePage}
          disabled={deleteDisabled}
          className={`h-8 md:h-9 px-2 md:px-3 text-destructive hover:text-destructive ${
            deleteDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
          {/* <span className="hidden md:inline ml-2">Delete</span> */}
        </Button>
      </Tooltip>
    </div>
  );
}