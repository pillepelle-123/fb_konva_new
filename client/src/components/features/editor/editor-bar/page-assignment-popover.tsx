import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useEditor } from '../../../../context/editor-context';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/overlays/popover';
import ProfilePicture from '../../users/profile-picture';
import { CircleUser } from 'lucide-react';

interface BookFriend {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface PageAssignmentPopoverProps {
  children: React.ReactNode;
  currentPage: number;
  bookId: number;
  onAssignUser: (user: BookFriend | null) => void;
}

export default function PageAssignmentPopover({ 
  children, 
  currentPage, 
  bookId, 
  onAssignUser 
}: PageAssignmentPopoverProps) {
  const { token, user } = useAuth();
  const { state } = useEditor();
  const [bookFriends, setBookFriends] = useState<BookFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && bookFriends.length === 0) {
      fetchBookFriends();
    }
  }, [open, bookId]);

  const fetchBookFriends = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Add current user (book owner) to the list if not already included
        if (user && !data.find((f: BookFriend) => f.id === user.id)) {
          data.unshift({ id: user.id, name: user.name, email: user.email, role: 'owner' });
        }
        setBookFriends(data);
      }
    } catch (error) {
      console.error('Error fetching book friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = (user: BookFriend | null) => {
    onAssignUser(user);
    setOpen(false);
  };

  const assignedUser = state.pageAssignments[currentPage];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" side="bottom">
        <div className="space-y-2">
          <div className="text-sm font-medium px-2 py-1">
            Assign Page {currentPage}
          </div>
          
          {/* Remove assignment option */}
          {assignedUser && (
            <div 
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
              onClick={() => handleAssignUser(null)}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <CircleUser className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Remove assignment</span>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {bookFriends.map((friend) => (
                <div
                  key={friend.id}
                  className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer ${
                    assignedUser?.id === friend.id ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => handleAssignUser(friend)}
                >
                  <ProfilePicture 
                    name={friend.name} 
                    size="sm" 
                    userId={friend.id} 
                    variant="withColoredBorder"
                    className="w-8 h-8"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.name}</p>
                  </div>
                  {assignedUser?.id === friend.id && (
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
              ))}
              {bookFriends.length === 0 && !loading && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No friends in this book
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}