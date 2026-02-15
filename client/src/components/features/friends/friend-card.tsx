import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/composites/card';
import { Checkbox } from '../../ui/primitives/checkbox';
import ProfilePicture from '../users/profile-picture';
import { MessageCircle, UserCog, UserMinus, Ban, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { List } from '../../shared';
import { Tooltip } from '../../ui/composites/tooltip';

export interface SharedBook {
  bookId: number;
  bookName: string;
  myRole: string;
  friendRole: string;
}

interface Friend {
  id: number;
  name: string;
  email?: string;
  role: string;
  assignedToPage?: boolean;
  sharedBooks?: SharedBook[];
}

interface FriendsCardProps {
  friend: Friend;
  pageNumber?: string | null;
  pendingAssignments?: Set<number>;
  onPageAssignment?: (friendId: number, assign: boolean) => void;
  onRoleChange?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
  onBlock?: (friend: Friend) => void;
  showFriendActions?: boolean;
}

export default function FriendsCard({
  friend,
  pageNumber,
  pendingAssignments,
  onPageAssignment,
  onRoleChange,
  onRemove,
  onBlock,
  showFriendActions = false
}: FriendsCardProps) {
  const navigate = useNavigate();
  const [sharedBooksExpanded, setSharedBooksExpanded] = useState(false);
  const sharedBooks = friend.sharedBooks ?? [];
  const hasSharedBooks = sharedBooks.length > 0;

  const roleBadgeClass = (role: string) =>
    role === 'owner' || role === 'publisher'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';

  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start space-x-4">
          <Link to={`/profile/${friend.id}`}>
            <ProfilePicture name={friend.name} size="md" userId={friend.id} />
          </Link>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg line-clamp-1">
              {friend.name}
            </CardTitle>
            {friend.email && (
              <CardDescription className="text-sm">
                {friend.email}
              </CardDescription>
            )}
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
            <Checkbox
              checked={pendingAssignments?.has(friend.id) || false}
              onCheckedChange={(checked) => onPageAssignment?.(friend.id, checked === true)}
            />
          </div>
        ) : (
          <div className="flex flex-row gap-2">
            <div className="flex min-w-0">
              {/* <Tooltip content="Send Message" side="top" fullWidth> */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full space-x-2"
                  onClick={() => navigate(`/messenger?friendId=${friend.id}`)}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Send message</span>
                </Button>
              {/* </Tooltip> */}
            </div>
            
            {showFriendActions ? (
              <>

                <div className="flex-1 min-w-0">
                  <Tooltip content="Block User" side="top" fullWidth>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full space-x-2"
                      onClick={() => onBlock?.(friend)}
                    >
                      <Ban className="h-5 w-5" />
                    </Button>
                  </Tooltip>
                </div>
                <div className="flex-1 min-w-0">
                  <Tooltip content="Remove from Friends" side="top" fullWidth>
                    <Button 
                      variant="destructive_outline" 
                      size="sm"
                      className="w-full space-x-2"
                      onClick={() => onRemove?.(friend)}
                    >
                      <UserMinus className="h-5 w-5" />
                    </Button>
                  </Tooltip>
                </div>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full space-x-2"
                  onClick={() => onRoleChange?.(friend)}
                >
                  <UserCog className="h-5 w-5" />
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
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full space-x-2 text-destructive hover:text-destructive"
                  onClick={() => onBlock?.(friend)}
                >
                  <Ban className="h-4 w-4" />
                  <span>Block User</span>
                </Button>
              </>
            )}
          </div>
        )}

        {/* Gemeinsame Bücher – aufklappbar, eingeklappt ohne Vorschau */}
        {!pageNumber && (
          <div className={`border rounded-lg overflow-hidden ${!hasSharedBooks ? 'opacity-60' : ''}`}>
            <button
              type="button"
              onClick={() => hasSharedBooks && setSharedBooksExpanded((v) => !v)}
              disabled={!hasSharedBooks}
              className={`w-full flex items-center justify-between gap-2 p-2 text-left transition-colors ${hasSharedBooks ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-not-allowed text-muted-foreground'}`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium truncate">
                  {hasSharedBooks
                    ? `${sharedBooks.length} gemeinsame${sharedBooks.length === 1 ? 's' : ''} Buch${sharedBooks.length === 1 ? '' : 'bücher'}`
                    : 'Gemeinsame Bücher'}
                </span>
              </div>
              {hasSharedBooks && (
                sharedBooksExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )
              )}
            </button>
            {sharedBooksExpanded && (
              <div className="border-t max-h-[160px] overflow-y-auto p-1">
                <List
                  variant='notifications'
                  items={sharedBooks}
                  separator={true}
                  itemsPerPage={10}
                  keyExtractor={(sb) => sb.bookId}
                  renderItem={(sb) => (
                    <div className="p-1 space-y-1">
                      <span className="font-medium block truncate text-xs" title={sb.bookName}>
                        {sb.bookName}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleBadgeClass(sb.myRole)}`}>Du: {sb.myRole}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleBadgeClass(sb.friendRole)}`}>{friend.name}: {sb.friendRole}</span>
                      </div>
                    </div>
                  )}
                  size="sm"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}