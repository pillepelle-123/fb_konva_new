import type { BookFriend } from '../book-manager-content';
import { BookFriendsPanel } from '../shared/book-friends-panel';

interface FriendsTabProps {
  friends: BookFriend[];
  onAddFriend: () => void;
  onInviteFriend: () => void;
  renderBookParticipant: (friend: BookFriend) => React.ReactNode;
}

export function FriendsTab({ friends, onAddFriend, onInviteFriend, renderBookParticipant }: FriendsTabProps) {
  return (
    <BookFriendsPanel
      friends={friends}
      onAddFriend={onAddFriend}
      onInviteFriend={onInviteFriend}
      renderFriend={renderBookParticipant}
    />
  );
}

