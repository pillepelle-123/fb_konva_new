import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/primitives/button';
import { Input } from '../ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/overlays/dialog';
import FriendsSearchCard from './friends-search-card';
import { Search } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface FindFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FindFriendsDialog({ open, onOpenChange }: FindFriendsDialogProps) {
  const { token } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/search?q=${encodeURIComponent(searchText)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friendships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ friendId: userId })
      });
      if (response.ok) {
        setSearchResults(searchResults.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find Friends</DialogTitle>
          <DialogDescription>
            Search for users by name or email to add them to your friends list
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search by name or email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} className="space-x-2">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </div>
          
          <div className="space-y-2">
            {searchResults.map(user => (
              <FriendsSearchCard
                key={user.id}
                user={user}
                onAddFriend={handleAddFriend}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}