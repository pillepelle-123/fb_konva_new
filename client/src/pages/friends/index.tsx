import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Input } from '../../components/ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import ConfirmationDialog from '../../components/ui/overlays/confirmation-dialog';
import FriendGrid from '../../components/features/friends/friend-grid';
import FindFriendsDialog from '../../components/features/friends/find-friends-dialog';
import InviteUserDialog from '../../components/features/books/invite-user-dialog';
import { Contact, UserSearch, UserPlus, Users, Funnel, RotateCcw } from 'lucide-react';
import { PageLoadingState, EmptyStateCard, ResourcePageLayout } from '../../components/shared';
import MultipleSelector, { type Option } from '../../components/ui/multi-select';

interface Friend {
  id: number;
  name: string;
  email?: string;
  role: string;
  bookIds?: number[];
}

interface BookOption {
  id: number;
  name: string;
}

export default function FriendsList() {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState<Friend | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<Friend | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState<Friend | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showFindFriendsDialog, setShowFindFriendsDialog] = useState(false);
  const [inviteError, setInviteError] = useState<string | undefined>();

  const [filterBarOpen, setFilterBarOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterBooks, setFilterBooks] = useState<Option[]>([]);

  const [appliedFilterName, setAppliedFilterName] = useState('');
  const [appliedFilterEmail, setAppliedFilterEmail] = useState('');
  const [appliedFilterBooks, setAppliedFilterBooks] = useState<Option[]>([]);

  const appliedBookIds = useMemo(
    () => new Set(appliedFilterBooks.map((o) => parseInt(o.value, 10))),
    [appliedFilterBooks]
  );

  const filteredFriends = useMemo(() => {
    return friends.filter((friend) => {
      if (appliedFilterName.trim()) {
        const nameLower = (friend.name || '').toLowerCase();
        const searchLower = appliedFilterName.toLowerCase();
        if (!nameLower.includes(searchLower)) return false;
      }
      if (appliedFilterEmail.trim()) {
        const emailLower = (friend.email || '').toLowerCase();
        const searchLower = appliedFilterEmail.toLowerCase();
        if (!emailLower.includes(searchLower)) return false;
      }
      if (appliedBookIds.size > 0) {
        const friendBookIds = friend.bookIds || [];
        const hasMatch = [...appliedBookIds].some((bid) => friendBookIds.includes(bid));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [friends, appliedFilterName, appliedFilterEmail, appliedBookIds]);

  const hasActiveFilters =
    appliedFilterName.trim() !== '' ||
    appliedFilterEmail.trim() !== '' ||
    appliedFilterBooks.length > 0;

  const bookOptions: Option[] = useMemo(
    () => books.map((b) => ({ value: String(b.id), label: b.name })),
    [books]
  );

  const applyFilters = () => {
    setAppliedFilterName(filterName);
    setAppliedFilterEmail(filterEmail);
    setAppliedFilterBooks(filterBooks);
  };

  const resetFilters = () => {
    setFilterName('');
    setFilterEmail('');
    setFilterBooks([]);
    setAppliedFilterName('');
    setAppliedFilterEmail('');
    setAppliedFilterBooks([]);
  };

  useEffect(() => {
    fetchFriends();
    fetchBooks();
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

  const fetchBooks = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBooks(data.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name })));
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const handleRoleChange = async (_friendId: number, _newRole: string) => {
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

  const handleBlockFriend = async (friend: Friend) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/user-blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ blockedId: friend.id })
      });
      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Error blocking friend:', error);
    }
    setShowBlockConfirm(null);
  };

  const handleInviteFriend = async (name: string, email: string) => {
    setInviteError(undefined);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const requestBody: { email: string; name?: string } = { email };
      if (name.trim()) {
        requestBody.name = name.trim();
      }

      const response = await fetch(`${apiUrl}/friends/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        fetchFriends();
        setShowInviteDialog(false);
        setInviteError(undefined);
      } else {
        const error = await response.json();
        setInviteError(error.error || 'Failed to invite friend. Please try again.');
      }
    } catch (error) {
      console.error('Error inviting friend:', error);
      setInviteError('Failed to invite friend. Please try again.');
    }
  };

  if (loading) {
    return <PageLoadingState message="Loading friends..." />;
  }

  const filterBarContent = filterBarOpen ? (
    <div className="mt-4 flex flex-row items-start gap-4">
      <div className="flex flex-row flex-wrap items-start gap-4 flex-1 min-w-0">
        <div className="flex flex-col shrink-0">
          <span className="text-xs text-muted-foreground mb-1">Name</span>
          <Input
            placeholder="Contains..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="h-8 text-sm w-[140px]"
          />
        </div>
        <div className="flex flex-col shrink-0">
          <span className="text-xs text-muted-foreground mb-1">Email</span>
          <Input
            placeholder="Contains..."
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="h-8 text-sm w-[180px]"
          />
        </div>
        <div className="flex flex-col shrink-0 w-[200px]">
          <span className="text-xs text-muted-foreground mb-1">Books (collaboration)</span>
          <MultipleSelector
            value={filterBooks}
            onChange={setFilterBooks}
            options={bookOptions}
            placeholder="All"
            hidePlaceholderWhenSelected
            className="min-h-8"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end">
        <Button variant="ghost" size="sm" onClick={resetFilters} className="space-x-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Filter</span>
        </Button>
        <Button variant="primary" size="sm" onClick={applyFilters}>
          Apply Filter
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <ResourcePageLayout
      title="My Friends"
      icon={<Users className="h-6 w-6 text-foreground" />}
      actions={
        <>
          <Button
            variant={filterBarOpen ? 'default' : 'ghost'}
            onClick={() => setFilterBarOpen((v) => !v)}
            className="space-x-2"
          >
            <Funnel className="h-4 w-4" />
            <span>Filter Friends</span>
            {hasActiveFilters && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary-foreground/80" aria-hidden />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFindFriendsDialog(true)}
            className="space-x-2"
          >
            <UserSearch className="h-4 w-4" />
            <span>Find Friends</span>
          </Button>
          <Button
            variant="highlight"
            onClick={() => setShowInviteDialog(true)}
            className="space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite new Friends</span>
          </Button>
        </>
      }
      headerAdditionalContent={filterBarContent}
      description="Manage your friends and collaborators"
    >
      {filteredFriends.length === 0 ? (
        <EmptyStateCard
          icon={<Contact className="h-12 w-12" />}
          title={friends.length === 0 ? 'No friends yet' : 'No friends match your filters'}
          description={
            friends.length === 0
              ? 'Start building your network by searching for friends or inviting new users to collaborate.'
              : 'Try adjusting or resetting your filter criteria.'
          }
          primaryAction={
            friends.length === 0
              ? {
                  label: (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Invite Your First Friend</span>
                    </>
                  ),
                  onClick: () => setShowInviteDialog(true),
                  variant: 'highlight'
                }
              : undefined
          }
          secondaryAction={
            friends.length > 0
              ? {
                  label: (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset Filter</span>
                    </>
                  ),
                  onClick: resetFilters,
                  variant: 'outline'
                }
              : undefined
          }
        />
      ) : (
        <FriendGrid
          friends={filteredFriends}
          onRoleChange={setShowRoleModal}
          onRemove={setShowRemoveConfirm}
          onBlock={setShowBlockConfirm}
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

      {/* Remove Friend Confirmation */}
      <ConfirmationDialog
        open={!!showRemoveConfirm}
        onOpenChange={(open) => !open && setShowRemoveConfirm(null)}
        title="Freund entfernen"
        description={
          showRemoveConfirm
            ? `Möchtest du ${showRemoveConfirm.name} wirklich aus deiner Freundesliste entfernen?`
            : ''
        }
        onConfirm={() => showRemoveConfirm && handleRemoveFriend(showRemoveConfirm.id)}
        onCancel={() => setShowRemoveConfirm(null)}
        confirmText="Entfernen"
        cancelText="Abbrechen"
        confirmVariant="destructive"
      />

      {/* Block Friend Confirmation */}
      <ConfirmationDialog
        open={!!showBlockConfirm}
        onOpenChange={(open) => !open && setShowBlockConfirm(null)}
        title="Nutzer blockieren"
        description={
          showBlockConfirm
            ? `Möchtest du ${showBlockConfirm.name} wirklich blockieren? Der Nutzer wird aus deiner Freundesliste ausgeblendet und kann dir keine Nachrichten mehr senden.`
            : ''
        }
        onConfirm={() => showBlockConfirm && handleBlockFriend(showBlockConfirm)}
        onCancel={() => setShowBlockConfirm(null)}
        confirmText="Blockieren"
        cancelText="Abbrechen"
        confirmVariant="destructive"
      />

      {/* Find Friends Dialog */}
      <FindFriendsDialog
        open={showFindFriendsDialog}
        onOpenChange={setShowFindFriendsDialog}
        friends={friends.map((f) => ({ id: f.id, name: f.name, email: f.email ?? '' }))}
        onFriendAdded={fetchFriends}
      />

      {/* Add Friend Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={(open) => {
          setShowInviteDialog(open);
          if (!open) setInviteError(undefined);
        }}
        onInvite={handleInviteFriend}
        errorMessage={inviteError}
      />
    </ResourcePageLayout>
  );
}
