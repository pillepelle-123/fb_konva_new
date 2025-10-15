import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Button } from '../../ui/primitives/button';
import { Plus, Trash2 } from 'lucide-react';
import List from '../../shared/list';
import ProfilePicture from '../users/profile-picture';
import AlertDialog from '../../ui/overlays/alert-dialog';

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface PageAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
  bookId: number;
}

export default function PageAssignmentDialog({ open, onOpenChange, currentPage, bookId }: PageAssignmentDialogProps) {
  const { token } = useAuth();
  const { state, dispatch, checkUserQuestionConflicts } = useEditor();
  const [bookFriends, setBookFriends] = useState<User[]>([]);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conflictAlert, setConflictAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const assignedUser = state.pageAssignments[currentPage];

  useEffect(() => {
    if (open) {
      fetchAllFriends();
      // Use state first, fallback to API if empty
      if (state.bookFriends && state.bookFriends.length > 0) {
        setBookFriends(state.bookFriends);
      } else {
        fetchBookFriends();
      }
    }
  }, [open, bookId]);

  // Update local bookFriends when global state changes
  useEffect(() => {
    if (state.bookFriends) {
      setBookFriends(state.bookFriends);
    }
  }, [state.bookFriends]);

  const fetchBookFriends = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBookFriends(data);
        dispatch({ type: 'SET_BOOK_FRIENDS', payload: data });
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

  const handleAssignUser = (user: User) => {
    // Check for question conflicts before assigning
    const conflicts = checkUserQuestionConflicts(user.id, currentPage);
    
    if (conflicts.length > 0) {
      const conflictMessage = `User ${user.name} is already assigned to the following questions on other pages:\n\n` +
        conflicts.map(c => `• Question "${c.questionText}" on page ${c.pageNumber}`).join('\n') +
        '\n\nAssigning this user to this page would violate the "one question per user" rule.';
      
      setConflictAlert({ show: true, message: conflictMessage });
      return;
    }
    
    // Add user to book friends if not already there
    const currentBookFriends = state.bookFriends || [];
    const isAlreadyFriend = currentBookFriends.some(friend => friend.id === user.id);
    
    if (!isAlreadyFriend) {
      const updatedBookFriends = [...currentBookFriends, { ...user, role: 'author' }];
      dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedBookFriends });
    }
    
    const updatedAssignments = { ...state.pageAssignments };
    updatedAssignments[currentPage] = user;
    dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
    dispatch({ type: 'UPDATE_USER_QUESTION_ASSIGNMENTS' });
    onOpenChange(false);
  };

  const handleRemoveAssignment = () => {
    const updatedAssignments = { ...state.pageAssignments };
    updatedAssignments[currentPage] = null;
    dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
    dispatch({ type: 'UPDATE_USER_QUESTION_ASSIGNMENTS' });
    onOpenChange(false);
  };

  const handleAddFriend = async (friend: User) => {
    setLoading(true);
    try {
      // Add to book friends in state
      const updatedBookFriends = [...bookFriends, { ...friend, role: 'author' }];
      setBookFriends(updatedBookFriends);
      dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedBookFriends });

      // Assign to current page
      handleAssignUser({ ...friend, role: 'author' });
      setShowAddUser(false);
    } catch (error) {
      console.error('Error adding friend:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableFriends = allFriends.filter(friend => 
    !bookFriends.some(bookFriend => bookFriend.id === friend.id)
  );

  const renderBookFriend = (user: User) => (
    <div 
      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
      onClick={() => handleAssignUser(user)}
    >
      <ProfilePicture name={user.name} size="sm" userId={user.id} />
      <div className="flex-1">
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );

  const renderFriend = (friend: User) => (
    <div 
      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
      onClick={() => handleAddFriend(friend)}
    >
      <ProfilePicture name={friend.name} size="sm" userId={friend.id} />
      <div className="flex-1">
        <p className="font-medium">{friend.name}</p>
        <p className="text-sm text-muted-foreground">{friend.email}</p>
      </div>
    </div>
  );

  if (showAddUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User to Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAddUser(false)}
              className="w-full"
            >
              ← Back to Page Assignment
            </Button>
            {availableFriends.length > 0 ? (
              <List
                items={availableFriends}
                keyExtractor={(friend) => friend.id.toString()}
                renderItem={renderFriend}
                itemsPerPage={5}
              />
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No available friends to add
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Page Assignment - Page {currentPage}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setShowAddUser(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          
          {assignedUser && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Currently assigned:</p>
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-accent">
                <ProfilePicture name={assignedUser.name} size="sm" userId={assignedUser.id} />
                <div className="flex-1">
                  <p className="font-medium">{assignedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{assignedUser.email}</p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRemoveAssignment}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Assignment
              </Button>
            </div>
          )}

          {bookFriends.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Book collaborators:</p>
              <List
                items={bookFriends}
                keyExtractor={(user) => user.id.toString()}
                renderItem={renderBookFriend}
                itemsPerPage={5}
              />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No collaborators in this book
            </p>
          )}
        </div>
      </DialogContent>
      
      <AlertDialog
        open={conflictAlert.show}
        onOpenChange={(open) => setConflictAlert({ show: open, message: '' })}
        title="Question Assignment Conflict"
        message={conflictAlert.message}
        onClose={() => setConflictAlert({ show: false, message: '' })}
      />
    </Dialog>
  );
}