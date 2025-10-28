import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent } from '../../components/ui/composites/card';
import { Input } from '../../components/ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import FriendGrid from '../../components/features/friends/friend-grid';
import FindFriendsDialog from '../../components/features/friends/find-friends-dialog';
import { Contact, UserSearch, UserPlus, Users } from 'lucide-react';
import FloatingActionButton from '../../components/ui/composites/floating-action-button';

interface Friend {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function FriendsList() {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState<Friend | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<Friend | null>(null);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [showFindFriendsDialog, setShowFindFriendsDialog] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friendships/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (friendId: number, newRole: string) => {
    // TODO: Implement global friend role change
    setShowRoleModal(null);
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friendships/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
    setShowRemoveConfirm(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading friends...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center space-x-2">
              <Users/>
              <span>My Friends</span>
            </h1>
            <p className="text-muted-foreground">Manage your friends and collaborators</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFindFriendsDialog(true)}
              className="space-x-2"
            >
              <UserSearch className="h-4 w-4" />
              <span>Find Friends</span>
            </Button>
            <Button variant={'highlight'} onClick={() => setShowCollaboratorModal(true)} className="space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Invite new Friends</span>
            </Button>
          </div>
        </div>

        {/* Friends Grid */}
        {friends.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <Contact className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No friends yet</h3>
              <p className="text-muted-foreground mb-6">
                Start building your network by searching for friends or inviting new users to collaborate.
              </p>
              {/* <Button 
                variant={'highlight'} 
                onClick={() => setShowCollaboratorModal(true)} 
                className="space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite Your First Friend</span>
              </Button> */}
            </CardContent>
          </Card>
        ) : (
          <FriendGrid 
            friends={friends} 
            onRoleChange={setShowRoleModal} 
            onRemove={setShowRemoveConfirm} 
          />
        )}

        {/* Role Change Dialog */}
        <Dialog open={!!showRoleModal} onOpenChange={() => setShowRoleModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Select a new role for {showRoleModal?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => showRoleModal && handleRoleChange(showRoleModal.id, 'author')}
              >
                Author - Can edit assigned pages.
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => showRoleModal && handleRoleChange(showRoleModal.id, 'publisher')}
              >
                Publisher - Full access including managing friends
              </Button>
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setShowRoleModal(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Confirmation Dialog */}
        <Dialog open={!!showRemoveConfirm} onOpenChange={() => setShowRemoveConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Friend</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {showRemoveConfirm?.name} from your friends? This will remove them from all shared books.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowRemoveConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => showRemoveConfirm && handleRemoveFriend(showRemoveConfirm.id)} 
                className="flex-1"
              >
                Remove Friend
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Find Friends Dialog */}
        <FindFriendsDialog 
          open={showFindFriendsDialog} 
          onOpenChange={setShowFindFriendsDialog}
          friends={friends}
          onFriendAdded={fetchFriends}
        />

        {/* Add Friend Dialog */}
        <Dialog open={showCollaboratorModal} onOpenChange={setShowCollaboratorModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Friend</DialogTitle>
              <DialogDescription>
                Invite a friend to join your network.
              </DialogDescription>
            </DialogHeader>
            <CollaboratorModal onClose={() => setShowCollaboratorModal(false)} onSuccess={fetchFriends} />
          </DialogContent>
        </Dialog>
      </div>
      
      <FloatingActionButton />
    </div>
  );
}

function CollaboratorModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [email, setEmail] = useState('');

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friends/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setEmail('');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        console.error('Error inviting friend:', error.error);
      }
    } catch (error) {
      console.error('Error inviting friend:', error);
    }
  };

  return (
    <form onSubmit={handleAddCollaborator} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Add Friend by Email</label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Invite Friend
        </Button>
      </div>
    </form>
  );
}