import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Button } from '../../ui/primitives/button';
import { Plus, Trash2, Info } from 'lucide-react';
import List from '../../shared/list';
import CompactList from '../../shared/list';
import ProfilePicture from '../users/profile-picture';
import AlertDialog from '../../ui/overlays/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/composites/tabs';
import { SelectInput } from '../../ui/primitives/select-input';
import { Tooltip } from '../../ui/composites/tooltip';
import { Switch } from '../../ui/primitives/switch';
import { Card, CardContent } from '../../ui/composites/card';

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

interface BookFriend {
  id: number;
  name: string;
  email: string;
  role: string;
  book_role?: 'author' | 'publisher';
  pageAccessLevel?: 'form_only' | 'own_page' | 'all_pages';
  editorInteractionLevel?: 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings';
}

export default function PageAssignmentDialog({ open, onOpenChange, currentPage, bookId }: PageAssignmentDialogProps) {
  const { token } = useAuth();
  const { state, dispatch, checkUserQuestionConflicts } = useEditor();
  const [bookFriends, setBookFriends] = useState<BookFriend[]>([]);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conflictAlert, setConflictAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [activeTab, setActiveTab] = useState('assignments');
  const [pendingPermissions, setPendingPermissions] = useState<Record<number, { pageAccessLevel: string; editorInteractionLevel: string; book_role: string }>>({});
  const [pendingAssignment, setPendingAssignment] = useState<User | null>(null);

  const assignedUser = pendingAssignment !== null ? pendingAssignment : state.pageAssignments[currentPage];
  
  const handlePermissionChange = (userId: number, field: 'pageAccessLevel' | 'editorInteractionLevel' | 'book_role', value: string) => {
    setPendingPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const renderBookParticipant = (friend: BookFriend) => {
    const isOwner = friend.id === user?.id;
    const isPublisher = (pendingPermissions[friend.id]?.book_role || friend.book_role || friend.role) === 'publisher';
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ProfilePicture name={friend.name} size="sm" userId={friend.id} variant='withColoredBorder' />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{friend.name}</p>
              <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
              <p className="text-xs text-primary font-medium">{isOwner ? 'owner' : (friend.book_role || friend.role)}</p>
            </div>

            {!isOwner && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs font-medium">
                    {isOwner ? 'Owner' : isPublisher ? 'Publisher' : 'Author'}
                  </span>
                  <Switch
                    checked={isPublisher}
                    onCheckedChange={(checked) => handlePermissionChange(friend.id, 'book_role', checked ? 'publisher' : 'author')}
                  />
                </div>
                {!isPublisher && (
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium">Page Access Level</label>
                      <SelectInput
                        value={pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || 'own_page'}
                        onChange={(value) => handlePermissionChange(friend.id, 'pageAccessLevel', value)}
                        className="w-32"
                      >
                        <option value="form_only">Form Only</option>
                        <option value="own_page">Own Page</option>
                        <option value="all_pages">All Pages</option>
                      </SelectInput>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium">Editor Interaction Level</label>
                      <SelectInput
                        value={pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || 'full_edit'}
                        onChange={(value) => handlePermissionChange(friend.id, 'editorInteractionLevel', value)}
                        className="w-32"
                      >
                        <option value="no_access">No Access</option>
                        <option value="answer_only">Answer Only</option>
                        <option value="full_edit">Full Edit</option>
                        <option value="full_edit_with_settings">Full + Settings</option>
                      </SelectInput>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const handleSave = () => {
    // Save page assignment
    const updatedAssignments = { ...state.pageAssignments };
    updatedAssignments[currentPage] = pendingAssignment;
    dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
    
    // Save book permissions
    const updatedFriends = bookFriends.map(friend => ({
      ...friend,
      ...pendingPermissions[friend.id]
    }));
    setBookFriends(updatedFriends);
    dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedFriends });
    
    // Clear pending states
    setPendingAssignment(null);
    setPendingPermissions({});
    onOpenChange(false);
  };
  
  const handleCancel = () => {
    setPendingAssignment(null);
    setPendingPermissions({});
    onOpenChange(false);
  };

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
    
    setPendingAssignment(user);
  };

  const handleRemoveAssignment = () => {
    setPendingAssignment(null);
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

  const { user } = useAuth();
  
  const availableFriends = allFriends.filter(friend => 
    !bookFriends.some(bookFriend => bookFriend.id === friend.id) && friend.id !== user?.id
  );

  // Include current user in book collaborators list
  const allBookCollaborators = user ? [
    { ...user, role: 'owner', book_role: 'owner' },
    ...bookFriends.filter(friend => friend.id !== user.id)
  ] : bookFriends;

  const renderBookFriend = (user: User) => (
    <div 
      className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer"
      onClick={() => handleAssignUser(user)}
    >
      <ProfilePicture name={user.name} size="sm" userId={user.id} variant='withColoredBorder' />
      <div className="flex-1">
        <p className="font-medium text-sm">{user.name} <span className="text-muted-foreground font-normal">({user.email})</span></p>
      </div>
    </div>
  );

  const renderFriend = (friend: User) => (
    <div 
      className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent cursor-pointer"
      onClick={() => handleAddFriend(friend)}
    >
      <ProfilePicture name={friend.name} size="sm" userId={friend.id} variant='withColoredBorder'/>
      <div className="flex-1">
        <p className="font-medium text-sm">{friend.name} <span className="text-muted-foreground font-normal">({friend.email})</span></p>
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
              <CompactList
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Page Management</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assignments">Page Assignments</TabsTrigger>
            <TabsTrigger value="permissions">Book Permissions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assignments" className="space-y-4">
            <div className="space-y-4">
              {assignedUser ? (
                <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                  <p className="text-sm font-medium mb-3">Currently assigned to page {currentPage}:</p>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-background relative">
                    <ProfilePicture key={assignedUser.id} name={assignedUser.name} size="sm" userId={assignedUser.id} variant='withColoredBorder'/>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{assignedUser.name} <span className="text-muted-foreground font-normal">({assignedUser.email})</span></p>
                    </div>
                    <Tooltip content="Remove Assignment">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleRemoveAssignment}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No user assigned to page {currentPage}
                </p>
              )}

              {allBookCollaborators.filter(friend => friend.id !== assignedUser?.id).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Book Collaborators:</p>
                  <div className="max-h-80 overflow-y-auto">
                    <CompactList
                      items={allBookCollaborators.filter(friend => friend.id !== assignedUser?.id)}
                      keyExtractor={(user) => user.id.toString()}
                      renderItem={renderBookFriend}
                      itemsPerPage={15}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No collaborators in this book
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="permissions" className="space-y-4">
            <div className="space-y-4">
              {allBookCollaborators.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Book Collaborators:</p>
                    <Tooltip content="Configure access levels and publisher permissions for book participants">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Tooltip>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <List
                      items={allBookCollaborators}
                      keyExtractor={(friend) => friend.id.toString()}
                      renderItem={renderBookParticipant}
                      itemsPerPage={15}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No collaborators in this book
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2 p-6 pt-0">
          <Button 
            variant="outline" 
            onClick={() => setShowAddUser(true)}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
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