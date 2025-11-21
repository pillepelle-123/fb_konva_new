import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Input } from '../../ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import CompactList from '../../shared/compact-list';
import ProfilePicture from '../users/profile-picture';
import { Search } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface SelectFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFriend: (user: User) => void;
  excludeUserIds?: number[]; // User IDs to exclude from the list
}

export default function SelectFriendDialog({ 
  open, 
  onOpenChange, 
  onSelectFriend,
  excludeUserIds = []
}: SelectFriendDialogProps) {
  const { token, user } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (open) {
      fetchFriends();
      setSearchText(''); // Reset search when dialog opens
    }
  }, [open]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friendships/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter out current user and excluded users
        const filtered = data.filter((friend: User) => 
          friend.id !== user?.id && !excludeUserIds.includes(friend.id)
        );
        setFriends(filtered);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter friends locally based on search text
  const filteredFriends = useMemo(() => {
    if (!searchText.trim()) {
      return friends;
    }
    
    const searchLower = searchText.toLowerCase();
    return friends.filter(friend => 
      friend.name.toLowerCase().includes(searchLower) ||
      friend.email.toLowerCase().includes(searchLower)
    );
  }, [friends, searchText]);

  const handleSelectFriend = (selectedUser: User) => {
    onSelectFriend(selectedUser);
    onOpenChange(false);
  };

  const renderFriend = (friend: User) => (
    <div
      className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={() => handleSelectFriend(friend)}
    >
      <ProfilePicture 
        name={friend.name} 
        size="sm" 
        userId={friend.id} 
        variant="withColoredBorder"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{friend.name}</p>
        <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Friend</DialogTitle>
          <DialogDescription>
            Choose a friend to assign to this page
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          {/* Search Bar */}
          <div className="flex space-x-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading friends...</p>
                </div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">
                  {searchText.trim() ? 'No friends found matching your search' : 'No friends available'}
                </p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto pr-2">
                <CompactList
                  items={filteredFriends}
                  keyExtractor={(friend) => friend.id.toString()}
                  renderItem={renderFriend}
                  itemsPerPage={10}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

