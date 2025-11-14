import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import type { Page } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';

import { ChevronUp, ChevronDown, UserPlus, UserSearch, X, Lock } from 'lucide-react';
import FindFriendsDialog from '../friends/find-friends-dialog';
import ProfilePicture from '../users/profile-picture';
import PagePreview from './page-preview';
import InviteUserDialog from './invite-user-dialog';

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

interface ApiBookResponse {
  pages: Array<{
    id: number;
    pageNumber: number;
  }>;
}

interface ApiAssignment {
  page_id: number;
  user_id: number;
  name: string;
  email: string;
  book_role: string;
}

interface PagesContentProps {
  bookId: number;
  bookFriends?: BookFriend[];
  onSave: (assignments: PageAssignment[], pageOrder: number[]) => void;
  onCancel: () => void;
}

export default function PagesContent({ bookId, bookFriends: propBookFriends, onSave, onCancel }: PagesContentProps) {
  const { token } = useAuth();
  const editorContext = useEditor();
  const editorState = editorContext?.state ?? null;
  const [pages, setPages] = useState<PageAssignment[]>([]);
  const [localBookFriends, setLocalBookFriends] = useState<BookFriend[]>([]);
  const bookFriends = propBookFriends || localBookFriends;
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showFindFriendsDialog, setShowFindFriendsDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      if (editorState?.currentBook && editorState.currentBook.id === bookId) {
        const pageAssignments: PageAssignment[] = editorState.currentBook.pages.map((page: Page) => {
          const assignment = editorState.pageAssignments[page.pageNumber];
          return {
            pageId: page.id,
            pageNumber: page.pageNumber,
            assignedUser: assignment || null
          };
        });
        setPages(pageAssignments);
        return;
      }

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
        const book = (await bookResponse.json()) as ApiBookResponse;
        const assignments = assignmentsResponse.ok ? ((await assignmentsResponse.json()) as ApiAssignment[]) : [];

        const pageAssignments: PageAssignment[] = book.pages.map((page) => {
          const assignment = assignments.find((a) => a.page_id === page.id);
          return {
            pageId: page.id,
            pageNumber: page.pageNumber,
            assignedUser: assignment
              ? {
                  id: assignment.user_id,
                  name: assignment.name,
                  email: assignment.email,
                  role: assignment.book_role
                }
              : null
          };
        });

        setPages(pageAssignments);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  }, [bookId, editorState?.currentBook, editorState?.pageAssignments, token]);

  const fetchBookFriends = useCallback(async () => {
    if (propBookFriends) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLocalBookFriends(data);
      }
    } catch (error) {
      console.error('Error fetching book friends:', error);
    }
  }, [bookId, propBookFriends, token]);

  const fetchAllFriends = useCallback(async () => {
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
  }, [token]);

  const fetchData = useCallback(async () => {
    try {
      const promises = [fetchPages(), fetchAllFriends()];
      if (!propBookFriends) {
        promises.push(fetchBookFriends());
      }
      await Promise.all(promises);
    } finally {
      setLoading(false);
    }
  }, [fetchPages, fetchAllFriends, fetchBookFriends, propBookFriends]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Additional effect to handle editor context changes
  useEffect(() => {
    if (editorState?.currentBook && editorState.currentBook.id === bookId && editorState.pageAssignments) {
      const pageAssignments: PageAssignment[] = editorState.currentBook.pages.map((page: Page) => {
        const assignment = editorState.pageAssignments[page.pageNumber];
        return {
          pageId: page.id,
          pageNumber: page.pageNumber,
          assignedUser: assignment || null
        };
      });
      setPages(pageAssignments);
    }
  }, [editorState?.pageAssignments, editorState?.currentBook, bookId]);

  const pageMetaById = useMemo(() => {
    const map = new Map<number, Page>();
    editorState?.currentBook?.pages.forEach((page: Page) => {
      if (typeof page.id === 'number') {
        map.set(page.id, page);
      }
    });
    return map;
  }, [editorState?.currentBook?.pages]);

  const getPairIdForAssignment = (assignment: PageAssignment) => {
    const meta = assignment.pageId ? pageMetaById.get(assignment.pageId) : null;
    if (meta?.pagePairId) {
      return meta.pagePairId;
    }
    if (meta?.pageNumber) {
      return `pair-${Math.floor((meta.pageNumber - 1) / 2)}`;
    }
    return `pair-${Math.floor((assignment.pageNumber - 1) / 2)}`;
  };

  const isPairLocked = (pairId: string) => {
    if (!editorState?.currentBook) return false;
    const pairPages = editorState.currentBook.pages.filter((page: Page) => page.pagePairId === pairId);
    if (!pairPages.length) return false;
    return pairPages.some((page: Page) => page.isLocked || page.isSpecialPage || page.isPrintable === false);
  };

  const getPairRangeInAssignments = (pairId: string) => {
    let start = -1;
    let length = 0;
    pages.forEach((assignment, idx) => {
      if (getPairIdForAssignment(assignment) !== pairId) return;
      if (start === -1) start = idx;
      length += 1;
    });
    return { start, length };
  };

  const canMovePair = (pairId: string, direction: 'up' | 'down') => {
    const { start, length } = getPairRangeInAssignments(pairId);
    if (start === -1 || length === 0) return false;
    if (isPairLocked(pairId)) return false;
    if (direction === 'up') {
      if (start === 0) return false;
      const neighborPairId = getPairIdForAssignment(pages[start - 1]);
      return !isPairLocked(neighborPairId);
    }
    const endIndex = start + length;
    if (endIndex >= pages.length) return false;
    const neighborPairId = getPairIdForAssignment(pages[endIndex]);
    return !isPairLocked(neighborPairId);
  };

  const movePair = (pairId: string, direction: 'up' | 'down') => {
    const { start, length } = getPairRangeInAssignments(pairId);
    if (start === -1 || length === 0) return;
    if (!canMovePair(pairId, direction)) return;

    const newPages = [...pages];
    const moving = newPages.splice(start, length);
    const targetIndex = direction === 'up' ? start - length : start + length;
    const insertIndex = Math.max(0, Math.min(newPages.length, targetIndex));
    newPages.splice(insertIndex, 0, ...moving);

    const updatedPages = newPages.map((page, idx) => ({
      ...page,
      pageNumber: idx + 1
    }));
    setPages(updatedPages);
  };

  const handleMove = (assignment: PageAssignment, direction: 'up' | 'down') => {
    const pairId = getPairIdForAssignment(assignment);
    movePair(pairId, direction);
  };

  const assignUserToPage = (pageNumber: number, user: User | null) => {
    setPages(pages.map(page => 
      page.pageNumber === pageNumber 
        ? { ...page, assignedUser: user }
        : page
    ));
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
        if (!propBookFriends) {
          await fetchBookFriends();
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
      const response = await fetch(`${apiUrl}/invitations/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, bookId })
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
          <h3 className="text-lg">Page Assignments</h3>
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
          <Card key={`${page.pageId}-${index}`} className="transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Move Controls */}
                {(() => {
                  const pairId = getPairIdForAssignment(page);
                  const locked = isPairLocked(pairId);
                  const disableUp = locked || !canMovePair(pairId, 'up');
                  const disableDown = locked || !canMovePair(pairId, 'down');
                  return (
                    <div className="flex flex-col gap-1 items-center min-w-[32px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMove(page, 'up')}
                        disabled={disableUp}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMove(page, 'down')}
                        disabled={disableDown}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      {locked && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 mt-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Page Preview */}
                <div className="flex-shrink-0">
                  <PagePreview
                    key={`${page.pageId}-${page.pageNumber}`}
                    pageId={page.pageId}
                    pageNumber={page.pageNumber}
                    assignedUser={page.assignedUser}
                    page={editorState?.currentBook?.pages.find((p: Page) => p.id === page.pageId)}
                    book={editorState?.currentBook || undefined}
                  />
                </div>

                {/* Page Info */}
                <div className="flex-1">
                  <h4 className="font-medium">Page {page.pageNumber}</h4>
                  <p className="text-sm text-muted-foreground">
                    {page.assignedUser ? `Assigned to ${page.assignedUser.name} with role ${page.assignedUser.role}` : 'No assignment'}
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
                        if (userId) {
                          const user = bookFriends.find(f => f.id === userId);
                          if (user) assignUserToPage(page.pageNumber, user);
                        }
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
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={inviteUser}
      />
    </div>
  );
}

