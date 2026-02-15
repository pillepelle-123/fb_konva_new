import { Grid } from '../../shared';
import FriendsCard from './friend-card';

interface Friend {
  id: number;
  name: string;
  email?: string;
  role: string;
  sharedBooks?: { bookId: number; bookName: string; myRole: string; friendRole: string }[];
}

interface FriendGridProps {
  friends: Friend[];
  itemsPerPage?: number;
  onRoleChange?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
  onBlock?: (friend: Friend) => void;
}

export default function FriendGrid({ 
  friends, 
  itemsPerPage = 12, 
  onRoleChange, 
  onRemove,
  onBlock 
}: FriendGridProps) {
  return (
    <Grid
      items={friends}
      itemsPerPage={itemsPerPage}
      keyExtractor={(friend) => friend.id}
      gridClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      renderItem={(friend) => (
        <FriendsCard
          friend={friend}
          onRoleChange={onRoleChange}
          onRemove={onRemove}
          onBlock={onBlock}
          showFriendActions={true}
        />
      )}
    />
  );
}