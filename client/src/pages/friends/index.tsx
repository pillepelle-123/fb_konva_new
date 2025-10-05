import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Input } from '../../components/ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { Users, MessageCircle, UserCog, UserMinus, ArrowLeft, Plus } from 'lucide-react';

interface Friend {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function FriendsList() {
  const { bookId } = useParams<{ bookId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [bookName, setBookName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState<Friend | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<Friend | null>(null);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);

  useEffect(() => {
    if (bookId) {
      fetchFriends();
      fetchBookName();
    }
  }, [bookId]);

  const fetchFriends = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends`, {
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

  const fetchBookName = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBookName(data.name);
      }
    } catch (error) {
      console.error('Error fetching book name:', error);
    }
  };

  const handleRoleChange = async (friendId: number, newRole: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends/${friendId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        fetchFriends();
        setShowRoleModal(null);
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchFriends();
        setShowRemoveConfirm(null);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/books')}
                className="space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Books</span>
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Friends</h1>
            <p className="text-muted-foreground">
              Manage friends working on "{bookName}"
            </p>
          </div>
          <Button onClick={() => setShowCollaboratorModal(true)} className="space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Friend</span>
          </Button>
        </div>

        {/* Friends Grid */}
        {friends.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No friends yet</h3>
              <p className="text-muted-foreground mb-6">
                Add collaborators to start working together on this book.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {friends.map(friend => (
              <Card key={friend.id} className="border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full space-x-2"
                      onClick={() => setShowRoleModal(friend)}
                    >
                      <UserCog className="h-4 w-4" />
                      <span>Change Role</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full space-x-2 text-destructive hover:text-destructive"
                      onClick={() => setShowRemoveConfirm(friend)}
                    >
                      <UserMinus className="h-4 w-4" />
                      <span>Remove Access</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                Author - Can edit and contribute to the book
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
                Are you sure you want to remove {showRemoveConfirm?.name} from this book? They will lose access immediately.
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

        {/* Add Friend Dialog */}
        <Dialog open={showCollaboratorModal} onOpenChange={setShowCollaboratorModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
              <DialogDescription>
                Add a collaborator to work on this book with you.
              </DialogDescription>
            </DialogHeader>
            <CollaboratorModal bookId={bookId!} onClose={() => setShowCollaboratorModal(false)} onSuccess={fetchFriends} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CollaboratorModal({ bookId, onClose, onSuccess }: { bookId: string; onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [email, setEmail] = useState('');

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/collaborators`, {
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
        console.error('Error adding collaborator:', error.error);
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
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
          Add Friend
        </Button>
      </div>
    </form>
  );
}