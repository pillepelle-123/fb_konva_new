import { Link } from 'react-router-dom';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/composites/card';
import ProfilePicture from '../users/profile-picture';
import { MessageCircle, UserCog, UserMinus } from 'lucide-react';

interface Friend {
  id: number;
  name: string;
  email: string;
  role: string;
  assignedToPage?: boolean;
}

interface FriendsCardProps {
  friend: Friend;
  pageNumber?: string | null;
  pendingAssignments?: Set<number>;
  onPageAssignment?: (friendId: number, assign: boolean) => void;
  onRoleChange?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
  showFriendActions?: boolean;
}

export default function FriendsCard({
  friend,
  pageNumber,
  pendingAssignments,
  onPageAssignment,
  onRoleChange,
  onRemove,
  showFriendActions = false
}: FriendsCardProps) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start space-x-4">
          <Link to={`/profile/${friend.id}`}>
            <ProfilePicture name={friend.name} size="md" userId={friend.id} />
          </Link>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {friend.name}
            </CardTitle>
            <CardDescription className="text-sm">
              {friend.email}
            </CardDescription>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              friend.role === 'publisher' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {friend.role}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pageNumber ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Assign to page {pageNumber}
            </span>
            <input
              type="checkbox"
              checked={pendingAssignments?.has(friend.id) || false}
              onChange={(e) => onPageAssignment?.(friend.id, e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full space-x-2"
              onClick={() => {/* TODO: Implement messaging */}}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Send Message</span>
            </Button>
            
            {showFriendActions ? (
              <Button 
                variant="outline" 
                size="sm"
                className="w-full space-x-2 text-destructive hover:text-destructive"
                onClick={() => onRemove?.(friend)}
              >
                <UserMinus className="h-4 w-4" />
                <span>Remove from Friends List</span>
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full space-x-2"
                  onClick={() => onRoleChange?.(friend)}
                >
                  <UserCog className="h-4 w-4" />
                  <span>Change Role</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full space-x-2 text-destructive hover:text-destructive"
                  onClick={() => onRemove?.(friend)}
                >
                  <UserMinus className="h-4 w-4" />
                  <span>Remove Access</span>
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}