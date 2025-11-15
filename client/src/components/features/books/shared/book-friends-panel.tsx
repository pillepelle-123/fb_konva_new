import { type ReactNode } from 'react';
import { Button } from '../../../ui/primitives/button';
import { Plus, Send } from 'lucide-react';
import CompactList from '../../../shared/compact-list';
import type { BookFriend } from '../book-manager-content';

interface BookFriendsPanelProps {
  friends: BookFriend[];
  onAddFriend: () => void;
  onInviteFriend: () => void;
  renderFriend: (friend: BookFriend) => React.ReactNode;
  leftControls?: ReactNode;
}

export function BookFriendsPanel({
  friends,
  onAddFriend,
  onInviteFriend,
  renderFriend,
  leftControls,
}: BookFriendsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {leftControls ? (
          <div className="min-h-[2.5rem] flex items-center">{leftControls}</div>
        ) : (
          <div className="min-h-[2.5rem]" />
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAddFriend}>
            <Plus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
          <Button onClick={onInviteFriend} className=" bg-[hsl(var(--highlight))] hover:bg-[hsl(var(--highlight))]/90">
            <Send className="h-4 w-4 mr-2" />
            Invite Friend
          </Button>
        </div>
      </div>
      {friends.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-y-auto">
            <CompactList items={friends} keyExtractor={(friend) => friend.id.toString()} renderItem={renderFriend} itemsPerPage={15} />
          </div>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">No friends in this book</p>
      )}
    </div>
  );
}

