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
}

export function PageActions({
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onAssignFriends,
  canDelete,
  showAssignFriends = false
}: PageActionsProps) {
  const { user } = useAuth();
  const isAuthor = user?.role === 'author';
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Tooltip content="Add new page" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddPage}
          disabled={isAuthor}
          className={`h-8 md:h-9 px-2 md:px-3 ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
          {/* <span className="hidden md:inline ml-2">Add</span> */}
        </Button>
      </Tooltip>

      <Tooltip content="Duplicate current page" side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onDuplicatePage}
          disabled={isAuthor}
          className={`h-8 md:h-9 px-2 md:px-3 ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      <Tooltip content={canDelete ? "Delete current page" : "Cannot delete the last page"} side="bottom_editor_bar" backgroundColor="bg-background" textColor="text-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={onDeletePage}
          disabled={!canDelete || isAuthor}
          className={`h-8 md:h-9 px-2 md:px-3 text-destructive hover:text-destructive ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
          {/* <span className="hidden md:inline ml-2">Delete</span> */}
        </Button>
      </Tooltip>
    </div>
  );
}