import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/composites/tabs';
import { ArrowLeft, UserSearch, UserPlus, Plus } from 'lucide-react';
import PageUserContent from '../../components/features/books/page-user-content';
import FriendsCard from '../../components/features/friends/friend-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { Input } from '../../components/ui/primitives/input';

interface PageAssignment {
  pageId: number;
  pageNumber: number;
  assignedUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface BookFriend {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function PageUserPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [bookFriends, setBookFriends] = useState<BookFriend[]>([]);
  const [bookOwner, setBookOwner] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<BookFriend | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<BookFriend | null>(null);
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookId) {
      checkAccess();
    }
  }, [bookId, user]);

  const checkAccess = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const roleData = await response.json();
        // console.log('User role data:', roleData);
        if (roleData.role !== 'owner' && roleData.role !== 'publisher') {
          // console.log('Access denied - user role:', roleData.role);
          navigate('/books');
          return;
        }
        setUserRole(roleData.role);
        
        // Get book owner
        const bookResponse = await fetch(`${apiUrl}/books/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBookOwner(bookData.owner_id);
        }
        
        fetchBookFriends();
        fetchAllFriends();
      } else {
        // console.log('Failed to fetch user role, status:', response.status);
        navigate('/books');
      }
    } catch (error) {
      navigate('/books');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookFriends = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBookFriends(data);
      }
    } catch (error) {
      console.error('Error fetching book friends:', error);
    }
  };

  const fetchAllFriends = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friendships/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllFriends(data);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
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
        fetchBookFriends();
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
        // Update local state to remove user from assignments and friends list
        setBookFriends(prev => prev.filter(friend => friend.id !== friendId));
        setShowRemoveConfirm(null);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const addUserToBook = async (userId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ friendId: userId, role: 'author' })
      });
      
      if (response.ok) {
        const addedUser = allFriends.find(f => f.id === userId);
        if (addedUser) {
          setBookFriends(prev => [...prev, { ...addedUser, role: 'author' }]);
        }
        setShowAddUserDialog(false);
      }
    } catch (error) {
      console.error('Error adding user to book:', error);
    }
  };

  const inviteUser = async (name: string, email: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });
      
      if (response.ok) {
        fetchBookFriends();
        setShowInviteDialog(false);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };

  const isOwner = user?.id === bookOwner;
  const canChangeRole = isOwner;
  const canRemove = isOwner || userRole === 'publisher';
  const availableFriends = allFriends.filter(friend => 
    !bookFriends.some(bookFriend => bookFriend.id === friend.id)
  );

  const handleSave = async (assignments: PageAssignment[], pageOrder: number[]) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Save page assignments
      await fetch(`${apiUrl}/page-assignments/book/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assignments: assignments.map(assignment => ({
            pageNumber: assignment.pageNumber,
            userId: assignment.assignedUser?.id || null
          }))
        })
      });

      // Save page order
      await fetch(`${apiUrl}/books/${bookId}/page-order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pageOrder })
      });

      // Navigate back to books after saving
      navigate('/books');
    } catch (error) {
      console.error('Error saving page assignments:', error);
    }
  };

  const handleCancel = () => {
    navigate('/books');
  };

  if (!bookId) {
    return <div>Invalid book ID</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/books`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Books
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Page User Manager</h1>
            <p className="text-muted-foreground">Manage page assignments and book access</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={() => setShowAddUserDialog(true)} className="space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
          <Button variant="highlight" onClick={() => setShowInviteDialog(true)} className="space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Invite User</span>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assignments">Page Assignments</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assignments">
            <PageUserContent
              bookId={parseInt(bookId)}
              bookFriends={bookFriends}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </TabsContent>
          
          <TabsContent value="friends">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookFriends.map(friend => (
                  <FriendsCard
                    key={friend.id}
                    friend={friend}
                    onRoleChange={canChangeRole ? setShowRoleModal : undefined}
                    onRemove={canRemove ? setShowRemoveConfirm : undefined}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User to Book</DialogTitle>
              <DialogDescription>Select a friend to add to this book</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {availableFriends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">{friend.email}</p>
                  </div>
                  <Button size="sm" onClick={() => addUserToBook(friend.id)}>Add</Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>Invite a new user by email</DialogDescription>
            </DialogHeader>
            <InviteForm onInvite={inviteUser} onCancel={() => setShowInviteDialog(false)} />
          </DialogContent>
        </Dialog>

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
                Author - Can edit assigned pages
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
      </div>
    </div>
  );
}

function InviteForm({ onInvite, onCancel }: { onInvite: (name: string, email: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim() && email.trim()) onInvite(name.trim(), email.trim()); }} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <Input
          id="name"
          type="text"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Email Address</label>
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Send Invite
        </Button>
      </div>
    </form>
  );
}