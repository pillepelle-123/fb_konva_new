import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/composites/card';
import BooksGrid from '../../components/features/books/book-grid';
import ProfilePicture from '../../components/features/users/profile-picture';
import { MessageCircle, UserPlus, Ban } from 'lucide-react';
import ConfirmationDialog from '../../components/ui/overlays/confirmation-dialog';

interface User {
  id: number;
  name: string;
  role: string;
  created_at: string;
}

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
  userRole: 'owner' | 'publisher' | 'author';
  created_at: string;
  updated_at: string;
}

interface FriendshipStatus {
  isFriend: boolean;
  pendingInvitation: boolean;
  canInvite: boolean;
  blockedByThem: boolean;
}

function ProfileActions({
  targetUser,
  currentUserId,
  token,
  onUpdate
}: {
  targetUser: User;
  currentUserId?: number;
  token?: string;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState<FriendshipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


  const fetchStatus = useCallback(async () => {
    try {
      const [friendsRes, receivedRes, sentRes, blocksRes] = await Promise.all([
        fetch(`${apiUrl}/friendships/friends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/friend-invitations/received/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/friend-invitations/sent`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/user-blocks`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const friends = friendsRes.ok ? await friendsRes.json() : [];
      const received = receivedRes.ok ? await receivedRes.json() : [];
      const sent = sentRes.ok ? await sentRes.json() : [];
      const blockedIds = blocksRes.ok ? await blocksRes.json() : [];

      const isFriend = friends.some((f: { id: number }) => f.id === targetUser.id);
      const pendingFromMe = sent.find((i: { receiver_id: number; status: string }) => i.receiver_id === targetUser.id && i.status === 'pending');
      const pendingFromThem = received.find((i: { sender_id: number; status: string }) => i.sender_id === targetUser.id && i.status === 'pending');
      const lastRejected = sent.find((i: { receiver_id: number; status: string; responded_at: string }) => i.receiver_id === targetUser.id && i.status === 'rejected');
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const canInvite = !isFriend && !pendingFromMe && (!lastRejected || new Date(lastRejected.responded_at).getTime() < twentyFourHoursAgo) && !blockedIds.includes(targetUser.id);

      setStatus({
        isFriend,
        pendingInvitation: !!pendingFromMe || !!pendingFromThem,
        canInvite,
        blockedByThem: false
      });
    } catch {
      setStatus({ isFriend: false, pendingInvitation: false, canInvite: false, blockedByThem: false });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, token, targetUser.id, apiUrl]);

  useEffect(() => {
    if (currentUserId && token && targetUser.id !== currentUserId) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [currentUserId, token, targetUser.id, fetchStatus]);

  const handleInvite = async () => {
    if (!token || !status?.canInvite) return;
    try {
      const res = await fetch(`${apiUrl}/friend-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: targetUser.id })
      });
      if (res.ok) {
        onUpdate();
        fetchStatus();
      }
    } catch {
      // ignore
    }
  };

  const handleBlock = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/user-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blockedId: targetUser.id })
      });
      if (res.ok) {
        onUpdate();
      }
    } catch {
      // ignore
    }
    setShowBlockConfirm(false);
  };

  const handleMessage = () => {
    window.location.href = `/messenger?friendId=${targetUser.id}`;
  };

  if (loading || !status) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {status.canInvite && (
        <Button variant="outline" size="sm" className="space-x-2" onClick={handleInvite}>
          <UserPlus className="h-4 w-4" />
          <span>Invite Friend</span>
        </Button>
      )}
      {status.isFriend && (
        <Button variant="outline" size="sm" className="space-x-2" onClick={handleMessage}>
          <MessageCircle className="h-4 w-4" />
          <span>Message</span>
        </Button>
      )}
      <Button variant="outline" size="sm" className="space-x-2 text-destructive hover:text-destructive" onClick={() => setShowBlockConfirm(true)}>
        <Ban className="h-4 w-4" />
        <span>Block User</span>
      </Button>

      <ConfirmationDialog
        open={showBlockConfirm}
        onOpenChange={setShowBlockConfirm}
        title="Nutzer blockieren"
        description={`Möchtest du ${targetUser.name} wirklich blockieren? Der Nutzer kann dir keine Nachrichten mehr senden und wird aus deiner Freundesliste ausgeblendet.`}
        onConfirm={handleBlock}
        onCancel={() => setShowBlockConfirm(false)}
        confirmText="Blockieren"
        cancelText="Abbrechen"
        confirmVariant="destructive"
      />
    </div>
  );
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const { token, user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [sharedBooks, setSharedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const isMyProfile = location.pathname === '/my-profile';
  const targetUserId = isMyProfile ? currentUser?.id?.toString() : userId;

  useEffect(() => {
    if (targetUserId) {
      fetchUserProfile();
      fetchSharedBooks();
    }
  }, [targetUserId]);

  const fetchUserProfile = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchSharedBooks = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${targetUserId}/shared-books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSharedBooks(data);
      }
    } catch (error) {
      console.error('Error fetching shared books:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;
  const hasSharedBooks = sharedBooks.length > 0;

  return (
    <div className="container mx-auto px-4 py-4 space-y-8">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start space-x-4 sm:space-x-6">
            <div className="hidden sm:block">
              <ProfilePicture name={user.name} size="lg" userId={user.id} editable={isOwnProfile} variant='withColoredBorder' />
            </div>
            <div className="block sm:hidden">
              <ProfilePicture name={user.name} size="md" userId={user.id} editable={isOwnProfile} />
            </div>
            <div className="flex-1 space-y-4 pl-5">
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <CardContent className='flex flex-col gap-4 pt-5 pl-0'>
                  <p className="text-sm text-muted-foreground capitalize">
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </div>
              
              {!isOwnProfile && (
                <ProfileActions targetUser={user} currentUserId={currentUser?.id} token={token ?? undefined} onUpdate={() => { fetchUserProfile(); fetchSharedBooks(); }} />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Shared Books */}
      {hasSharedBooks && (
        <div className="space-y-4">
          <h2>
            {isOwnProfile ? 'Your Books' : `Books shared with ${user.name}`}
          </h2>
          <BooksGrid books={sharedBooks} hideActions={true} />
        </div>
      )}

      {!hasSharedBooks && !isOwnProfile && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              You don't have any shared books with {user.name}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}