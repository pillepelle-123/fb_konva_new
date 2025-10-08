import { Grid } from '../../shared';
import FriendsCard from './friend-card';

interface Friend {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface FriendGridProps {
  friends: Friend[];
  itemsPerPage?: number;
  onRoleChange?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
}

export default function FriendGrid({ 
  friends, 
  itemsPerPage = 10, 
  onRoleChange, 
  onRemove 
}: FriendGridProps) {
  return (
    <Grid
      items={friends}
      itemsPerPage={itemsPerPage}
      keyExtractor={(friend) => friend.id}
      renderItem={(friend) => (
        <FriendsCard
          friend={friend}
          onRoleChange={onRoleChange}
          onRemove={onRemove}
          showFriendActions={true}
        />
      )}
    />
  );
}