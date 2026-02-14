import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import ProfilePicture from '../users/profile-picture';
import { UserPlus } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email?: string;
}

interface FriendsSearchCardProps {
  user: User;
  onAddFriend: (userId: number) => void;
  onSelectFriend?: (user: User) => void;
  isAlreadyFriend?: boolean;
}

export default function FriendsSearchCard({ user, onAddFriend, onSelectFriend, isAlreadyFriend }: FriendsSearchCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ProfilePicture name={user.name} size="sm" userId={user.id} />
            <div>
              <p className="font-medium">{user.name}</p>
              {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
            </div>
          </div>
          {isAlreadyFriend ? (
            onSelectFriend ? (
              <Button
                size="sm"
                onClick={() => onSelectFriend(user)}
                className="space-x-2"
              >
                <span>Select</span>
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded">
                Already friends
              </div>
            )
          ) : (
            <Button
              size="sm"
              onClick={() => onAddFriend(user.id)}
              className="space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add to Friends List</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}