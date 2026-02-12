import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import CompactList from '../../../shared/compact-list';
import ProfilePicture from '../../users/profile-picture';
import { ChevronLeft, Trash2 } from 'lucide-react';

interface PageAssignmentSettingsProps {
  onBack: () => void;
}

export function PageAssignmentSettings({ onBack }: PageAssignmentSettingsProps) {
  const { state, dispatch, checkUserQuestionConflicts } = useEditor();

  const currentPage = (state.activePageIndex ?? 0) + 1;
  const currentPageMeta = state.currentBook?.pages?.[state.activePageIndex ?? 0];
  const assignedUser = state.pageAssignments?.[currentPage] ?? null;
  const collaborators = state.bookFriends ?? [];

  const isCoverPage =
    currentPageMeta?.pageType === 'back-cover' ||
    currentPageMeta?.pageType === 'front-cover' ||
    currentPage === 1 ||
    currentPage === 2;

  const availableCollaborators = assignedUser && !isCoverPage
    ? collaborators.filter((friend: { id: number }) => friend.id !== assignedUser.id)
    : isCoverPage
      ? []
      : collaborators;

  const handleAssignUser = (user: { id: number; name: string; email: string }) => {
    if (checkUserQuestionConflicts) {
      const conflicts = checkUserQuestionConflicts(user.id, currentPage);
      if (conflicts.length > 0) {
        const conflictMessage = `${user.name} already has the following questions on other pages:\n\n` +
          conflicts.map((c: { questionText: string; pageNumber: number }) => `• "${c.questionText}" on page ${c.pageNumber}`).join('\n') +
          '\n\nThis page assignment cannot be made because a question can be assigned to each user only once.';
        alert(conflictMessage);
        return;
      }
    }

    const updatedAssignments = { ...state.pageAssignments, [currentPage]: user };
    dispatch({
      type: 'UPDATE_PAGE_ASSIGNMENTS',
      payload: {
        assignments: updatedAssignments,
        actionName: 'Update Page Assignments'
      }
    });
  };

  const handleRemoveAssignment = () => {
    const updatedAssignments = { ...state.pageAssignments };
    delete updatedAssignments[currentPage];
    dispatch({
      type: 'UPDATE_PAGE_ASSIGNMENTS',
      payload: {
        assignments: updatedAssignments,
        actionName: 'Update Page Assignments'
      }
    });
  };

  const renderBookFriend = (user: { id: number; name: string; email: string }) => (
    <div
      className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer"
      onClick={() => handleAssignUser(user)}
    >
      <ProfilePicture name={user.name} size="sm" userId={user.id} variant="withColoredBorder" />
      <div className="flex-1">
        <p className="font-medium text-sm">
          {user.name}{' '}
          <span className="text-muted-foreground font-normal">({user.email})</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="w-full justify-start -ml-2 mb-2"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {assignedUser ? (
        <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
          <p className="text-sm font-medium mb-3">Currently assigned to page {currentPage}:</p>
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-background relative">
            <ProfilePicture
              key={assignedUser.id}
              name={assignedUser.name}
              size="sm"
              userId={assignedUser.id}
              variant="withColoredBorder"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {assignedUser.name}{' '}
                <span className="text-muted-foreground font-normal">({assignedUser.email})</span>
              </p>
            </div>
            <Tooltip content="Remove Assignment">
              <Button variant="destructive" size="sm" onClick={handleRemoveAssignment} className="h-8 w-8 p-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">
          {isCoverPage ? 'Cover pages cannot be assigned to collaborators.' : `No user assigned to page ${currentPage}`}
        </p>
      )}

      {isCoverPage ? (
        <p className="text-center text-muted-foreground py-4">Assignments are disabled on Back Cover and Front Cover.</p>
      ) : availableCollaborators.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Book Friends:</p>
          <div className="overflow-y-auto">
            <CompactList
              items={availableCollaborators}
              keyExtractor={(user: { id: number }) => user.id.toString()}
              renderItem={renderBookFriend}
              itemsPerPage={15}
            />
          </div>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">No friends in this book</p>
      )}
    </div>
  );
}
