import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import CompactList from '../../../shared/list';
import ProfilePicture from '../../users/profile-picture';
import { Trash2 } from 'lucide-react';
import type { BookFriend } from '../book-manager-content';

interface PagesAssignmentsTabProps {
  assignedUser: BookFriend | null;
  currentPage: number;
  onRemoveAssignment: () => void;
  collaborators: BookFriend[];
  renderBookFriend: (friend: BookFriend) => React.ReactNode;
}

export function PagesAssignmentsTab({
  assignedUser,
  currentPage,
  onRemoveAssignment,
  collaborators,
  renderBookFriend,
}: PagesAssignmentsTabProps) {
  const availableCollaborators = assignedUser
    ? collaborators.filter((friend) => friend.id !== assignedUser.id)
    : collaborators;

  return (
    <div className="space-y-4">
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
              <Button variant="destructive" size="sm" onClick={onRemoveAssignment} className="h-8 w-8 p-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">No user assigned to page {currentPage}</p>
      )}

      {availableCollaborators.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Book Friends:</p>
          <div className="overflow-y-auto">
            <CompactList
              items={availableCollaborators}
              keyExtractor={(user) => user.id.toString()}
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

