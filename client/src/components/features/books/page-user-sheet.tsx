import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../ui/overlays/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/composites/tabs';
import { Button } from '../../ui/primitives/button';
import { Plus, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Input } from '../../ui/primitives/input';
import PageUserContent from './page-user-content';
import FriendsCard from '../friends/friend-card';

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

interface PagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: number;
  onSaved?: () => void;
}

export default function PagesSheet({ open, onOpenChange, bookId, onSaved }: PagesSheetProps) {
  const { token, user } = useAuth();
  const { state, dispatch } = useEditor();
  const [saving, setSaving] = useState(false);
  const bookFriends = state.bookFriends || [];
  const [bookOwner, setBookOwner] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<BookFriend | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<BookFriend | null>(null);
  const [allFriends, setAllFriends] = useState<any[]>([]);

  useEffect(() => {
    if (open && bookId) {
      fetchBookData();
    }
  }, [open, bookId]);

  const fetchBookData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const [roleResponse, friendsResponse, allFriendsResponse] = await Promise.all([
        fetch(`${apiUrl}/books/${bookId}/user-role`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/books/${bookId}/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/friendships/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setUserRole(roleData.role);
      }
      
      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        if (!state.bookFriends) {
          dispatch({ type: 'SET_BOOK_FRIENDS', payload: friendsData });
        }
      }
      
      if (allFriendsResponse.ok) {
        const allFriendsData = await allFriendsResponse.json();
        setAllFriends(allFriendsData);
      }
      
      if (state.currentBook) {
        setBookOwner(state.currentBook.owner_id);
      }
    } catch (error) {
      console.error('Error fetching book data:', error);
    }
  };

  const handleSave = async (assignments: PageAssignment[], pageOrder: number[]) => {
    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Store page assignments in editor context (not database)
      const pageAssignments = assignments.reduce((acc, assignment) => {
        if (assignment.assignedUser) {
          acc[assignment.pageNumber] = assignment.assignedUser;
        } else {
          acc[assignment.pageNumber] = null; // Explicitly store null for removals
        }
        return acc;
      }, {} as Record<number, any>);
      
      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: pageAssignments });

      // Track current page ID and reorder pages in context immediately
      const currentPageId = state.currentBook?.pages[state.activePageIndex]?.id;
      
      if (state.currentBook) {
        // Create reordered pages array based on assignments
        const reorderedPages = assignments.map(assignment => {
          const originalPage = state.currentBook!.pages.find(p => p.id === assignment.pageId);
          return originalPage ? { ...originalPage, pageNumber: assignment.pageNumber } : null;
        }).filter(Boolean);
        
        // Update book with new page order in context
        const updatedBook = {
          ...state.currentBook,
          pages: reorderedPages
        };
        dispatch({ type: 'SET_BOOK', payload: updatedBook });
        
        // Find new position of current page and update active page index
        if (currentPageId) {
          const newPageIndex = reorderedPages.findIndex((page: any) => page.id === currentPageId);
          if (newPageIndex !== -1) {
            dispatch({ type: 'SET_ACTIVE_PAGE', payload: newPageIndex });
          }
        }
      }

      // Trigger page assignment update event
      window.dispatchEvent(new CustomEvent('pageAssignmentUpdated'));
      
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving page assignments:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const addUserToBook = (userId: number) => {
    const addedUser = allFriends.find(f => f.id === userId);
    if (addedUser) {
      const updatedFriends = [...bookFriends, { ...addedUser, role: 'author' }];
      dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedFriends });
    }
    setShowAddUserDialog(false);
  };

  const inviteUser = (email: string) => {
    // For now, just close the dialog - invitation would be handled on save
    setShowInviteDialog(false);
  };

  const handleRoleChange = (friendId: number, newRole: string) => {
    const updatedFriends = bookFriends.map(friend => 
      friend.id === friendId ? { ...friend, role: newRole } : friend
    );
    dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedFriends });
    setShowRoleModal(null);
  };

  const handleRemoveFriend = (friendId: number) => {
    // Remove from friends list
    const updatedFriends = bookFriends.filter(friend => friend.id !== friendId);
    dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedFriends });
    
    // Remove from page assignments in editor state
    const updatedAssignments = { ...state.pageAssignments };
    Object.keys(updatedAssignments).forEach(pageNumber => {
      if (updatedAssignments[pageNumber]?.id === friendId) {
        updatedAssignments[pageNumber] = null;
      }
    });
    dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
    
    setShowRemoveConfirm(null);
  };

  const isOwner = user?.id === bookOwner;
  const canChangeRole = isOwner;
  const canRemove = isOwner || userRole === 'publisher';
  const availableFriends = allFriends.filter(friend => 
    !bookFriends.some(bookFriend => bookFriend.id === friend.id)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Page User Manager</SheetTitle>
          <SheetDescription>
            Manage page assignments and reorder pages for this book
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 flex flex-col h-[calc(100vh-200px)]">
          {/* Action Buttons */}
          <div className="flex gap-2 mb-4 flex-shrink-0">
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
          <Tabs defaultValue="assignments" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="assignments">Page Assignments</TabsTrigger>
              <TabsTrigger value="friends">Friends</TabsTrigger>
            </TabsList>
            
            <TabsContent value="assignments" className="flex-1 min-h-0">
              <PageUserContent
                bookId={bookId}
                bookFriends={bookFriends}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </TabsContent>
            
            <TabsContent value="friends" className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

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
              <DialogDescription>Select a new role for {showRoleModal?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-4">
              <Button variant="outline" className="w-full justify-start" onClick={() => showRoleModal && handleRoleChange(showRoleModal.id, 'author')}>Author - Can edit assigned pages</Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => showRoleModal && handleRoleChange(showRoleModal.id, 'publisher')}>Publisher - Full access including managing friends</Button>
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setShowRoleModal(null)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!showRemoveConfirm} onOpenChange={() => setShowRemoveConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Friend</DialogTitle>
              <DialogDescription>Are you sure you want to remove {showRemoveConfirm?.name} from this book?</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowRemoveConfirm(null)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={() => showRemoveConfirm && handleRemoveFriend(showRemoveConfirm.id)} className="flex-1">Remove Friend</Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function InviteForm({ onInvite, onCancel }: { onInvite: (email: string) => void; onCancel: () => void }) {
  const [email, setEmail] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onInvite(email); }} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Invite Friend by Email</label>
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
          Invite Friend
        </Button>
      </div>
    </form>
  );
}