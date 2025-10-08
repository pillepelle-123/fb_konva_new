import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import ProfilePicture from '../users/profile-picture';
import { UserPlus } from 'lucide-react';

interface Friend {
  id: number;
  name: string;
  email: string;
}

interface FriendsBookAssignCardProps {
  friend: Friend;
  onAssignToBook: (friendId: number) => void;
  isAlreadyAssigned?: boolean;
}

export default function FriendsBookAssignCard({ friend, onAssignToBook, isAlreadyAssigned }: FriendsBookAssignCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ProfilePicture name={friend.name} size="sm" userId={friend.id} />
            <div>
              <p className="font-medium">{friend.name}</p>
              <p className="text-sm text-muted-foreground">{friend.email}</p>
            </div>
          </div>
          {isAlreadyAssigned ? (
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded">
              Already assigned
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onAssignToBook(friend.id)}
              className="space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Assign to Book</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}