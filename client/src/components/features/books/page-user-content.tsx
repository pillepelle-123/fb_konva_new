import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Input } from '../../ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Avatar } from '../../ui/composites/avatar';
import { Badge } from '../../ui/composites/badge';

import { ChevronUp, ChevronDown, UserPlus, UserSearch, X, FileText } from 'lucide-react';
import FindFriendsDialog from '../friends/find-friends-dialog';
import ProfilePicture from '../users/profile-picture';
import PagePreview from './page-preview';

interface PageAssignment {
  pageId: number;
  pageNumber: number;
  assignedUser: User | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface BookFriend {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface PagesContentProps {
  bookId: number;
  bookFriends?: BookFriend[];
  onSave: (assignments: PageAssignment[], pageOrder: number[]) => void;
  onCancel: () => void;
}

export default function PagesContent({ bookId, bookFriends: propBookFriends, onSave, onCancel }: PagesContentProps) {
  const { token } = useAuth();
  
  // Try to use editor context if available, otherwise work standalone
  let editorState = null;
  try {
    editorState = useEditor()?.state;
  } catch {
    // Editor context not available, work standalone
  }
  const [pages, setPages] = useState<PageAssignment[]>([]);
  const [bookFriends, setBookFriends] = useState<BookFriend[]>(propBookFriends || []);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showFindFriendsDialog, setShowFindFriendsDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [bookId, editorState?.currentBook?.pages?.length, editorState?.pageAssignments]);

  useEffect(() => {
    if (propBookFriends) {
      setBookFriends(propBookFriends);
    }
  }, [propBookFriends]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchPages(),
        fetchBookFriends(),
        fetchAllFriends()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPages = async () => {
    try {
      // Use editor context if available
      if (editorState?.currentBook && editorState.currentBook.id === bookId) {
        const pageAssignments: PageAssignment[] = editorState.currentBook.pages.map((page: any) => {
          const assignment = editorState.pageAssignments[page.pageNumber];
          return {
            pageId: page.id,
            pageNumber: page.pageNumber,
            assignedUser: assignment || null
          };
        });
        setPages(pageAssignments);
      } else {
        // Fallback to API
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const [bookResponse, assignmentsResponse] = await Promise.all([
          fetch(`${apiUrl}/books/${bookId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${apiUrl}/page-assignments/book/${bookId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (bookResponse.ok) {
          const book = await bookResponse.json();
          const assignments = assignmentsResponse.ok ? await assignmentsResponse.json() : [];
          
          const pageAssignments: PageAssignment[] = book.pages.map((page: any) => {
            const assignment = assignments.find((a: any) => a.page_id === page.pageNumber);
            return {
              pageId: page.id,
              pageNumber: page.pageNumber,
              assignedUser: assignment ? {
                id: assignment.user_id,
                name: assignment.name,
                email: assignment.email,
                role: assignment.role
              } : null
            };
          });

          setPages(pageAssignments);
        }
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
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

  const movePageUp = (index: number) => {
    if (index === 0) return;
    const newPages = [...pages];
    [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    const updatedPages = newPages.map((page, idx) => ({
      ...page,
      pageNumber: idx + 1
    }));
    setPages(updatedPages);
  };

  const movePageDown = (index: number) => {
    if (index === pages.length - 1) return;
    const newPages = [...pages];
    [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
    const updatedPages = newPages.map((page, idx) => ({
      ...page,
      pageNumber: idx + 1
    }));
    setPages(updatedPages);
  };

  const assignUserToPage = (pageNumber: number, user: User | null) => {
    setPages(pages.map(page => 
      page.pageNumber === pageNumber 
        ? { ...page, assignedUser: user }
        : page
    ));
  };

  const removeUserFromBook = (userId: number) => {
    // Remove user from all page assignments
    setPages(pages.map(page => 
      page.assignedUser?.id === userId 
        ? { ...page, assignedUser: null }
        : page
    ));
    
    // Remove from book friends list
    setBookFriends(bookFriends.filter(friend => friend.id !== userId));
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
        body: JSON.stringify({ userId, role: 'author' })
      });
      
      if (response.ok) {
        await fetchBookFriends();
        setShowAddUserDialog(false);
      }
    } catch (error) {
      console.error('Error adding user to book:', error);
    }
  };

  const inviteUser = async (email: string) => {
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
        await fetchAllFriends();
        setShowInviteDialog(false);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };

  const handleSave = () => {
    const pageOrder = pages.map(page => page.pageNumber);
    onSave(pages, pageOrder);
  };

  const availableFriends = allFriends.filter(friend => 
    !bookFriends.some(bookFriend => bookFriend.id === friend.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Page Assignments</h3>
          <p className="text-sm text-muted-foreground">Manage page assignments and order</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddUserDialog(true)}>
            <UserSearch className="h-4 w-4 mr-2" />
            Add User
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <div className="grid gap-4">
        {pages.map((page, index) => (
          <Card key={page.pageId} className="transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Move Controls */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePageUp(index)}
                    disabled={index === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePageDown(index)}
                    disabled={index === pages.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Page Preview */}
                <div className="flex-shrink-0">
                  <PagePreview key={page.pageId} bookId={bookId} pageId={page.pageId} pageNumber={page.pageNumber} />
                </div>

                {/* Page Info */}
                <div className="flex-1">
                  <h4 className="font-medium">Page {page.pageNumber}</h4>
                  <p className="text-sm text-muted-foreground">
                    {page.assignedUser ? `Assigned to ${page.assignedUser.name}` : 'No assignment'}
                  </p>
                </div>

                {/* Assignment Controls */}
                <div className="flex items-center gap-2">
                  {page.assignedUser && (
                    <div className="flex items-center gap-2">
                      <ProfilePicture 
                        name={page.assignedUser.name} 
                        size="sm" 
                        userId={page.assignedUser.id}
                      />
                      <span className="text-sm font-medium">{page.assignedUser.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => assignUserToPage(page.pageNumber, null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {!page.assignedUser && (
                    <select
                      className="px-3 py-1 border rounded-md text-sm"
                      onChange={(e) => {
                        const userId = parseInt(e.target.value);
                        const user = bookFriends.find(f => f.id === userId);
                        if (user) assignUserToPage(page.pageNumber, user);
                      }}
                      value=""
                    >
                      <option value="">Select user...</option>
                      {bookFriends.map(friend => (
                        <option key={friend.id} value={friend.id}>
                          {friend.name} ({friend.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t bg-background mt-4 flex-shrink-0">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save
        </Button>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Book</DialogTitle>
            <DialogDescription>
              Select a friend to add to this book
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {availableFriends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-sm text-muted-foreground">{friend.email}</p>
                </div>
                <Button size="sm" onClick={() => addUserToBook(friend.id)}>
                  Add
                </Button>
              </div>
            ))}
            {availableFriends.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No available friends to add
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Find Friends Dialog */}
      <FindFriendsDialog
        open={showFindFriendsDialog}
        onOpenChange={setShowFindFriendsDialog}
        friends={allFriends}
        onFriendAdded={fetchAllFriends}
      />

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Invite a new user by email
            </DialogDescription>
          </DialogHeader>
          <InviteForm onInvite={inviteUser} onCancel={() => setShowInviteDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteForm({ onInvite, onCancel }: { onInvite: (email: string) => void; onCancel: () => void }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onInvite(email.trim());
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="user@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="flex justify-end gap-2">
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