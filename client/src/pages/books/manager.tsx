import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { useEditor } from '../../context/editor-context';
import { Button } from '../../components/ui/primitives/button';
import { Plus, Trash2, Info, ArrowLeft, Settings } from 'lucide-react';
import List from '../../components/shared/list';
import CompactList from '../../components/shared/list';
import ProfilePicture from '../../components/features/users/profile-picture';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/composites/tabs';
import { SelectInput } from '../../components/ui/primitives/select-input';
import { Tooltip } from '../../components/ui/composites/tooltip';
import { Switch } from '../../components/ui/primitives/switch';
import { Card, CardContent } from '../../components/ui/composites/card';

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
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

export default function BookManagerPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // Try to use editor context if available, otherwise work standalone
  let editorState = null;
  let editorDispatch = null;
  let checkUserQuestionConflicts = null;
  try {
    const editor = useEditor();
    editorState = editor?.state;
    editorDispatch = editor?.dispatch;
    checkUserQuestionConflicts = editor?.checkUserQuestionConflicts;
  } catch {
    // Editor context not available, work standalone
  }

  const [bookFriends, setBookFriends] = useState<BookFriend[]>([]);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conflictAlert, setConflictAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [activeTab, setActiveTab] = useState('pages-assignments');
  const [pendingPermissions, setPendingPermissions] = useState<Record<number, { pageAccessLevel: string; editorInteractionLevel: string; book_role: string }>>({});
  const [pendingAssignment, setPendingAssignment] = useState<User | null>(null);
  const [hasRemovedAssignment, setHasRemovedAssignment] = useState(false);
  const [bookName, setBookName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const assignedUser = hasRemovedAssignment ? null : (pendingAssignment !== null ? pendingAssignment : editorState?.pageAssignments[currentPage]);
  
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
    // Save page assignment changes
    if (editorDispatch && (pendingAssignment !== null || hasRemovedAssignment)) {
      const updatedAssignments = { ...editorState?.pageAssignments };
      if (hasRemovedAssignment) {
        delete updatedAssignments[currentPage];
      } else {
        updatedAssignments[currentPage] = pendingAssignment;
      }
      editorDispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
    }
    
    // Update book friends with all local changes and pending permissions
    if (editorDispatch) {
      const currentBookFriends = editorState?.bookFriends || [];
      
      // Merge local bookFriends with current state, applying pending permissions
      const allFriends = new Map();
      
      // Add existing friends from state
      currentBookFriends.forEach(friend => {
        allFriends.set(friend.id, friend);
      });
      
      // Add/update with local bookFriends (includes newly added users)
      bookFriends.forEach(friend => {
        const existing = allFriends.get(friend.id);
        allFriends.set(friend.id, {
          ...existing,
          ...friend,
          // Apply pending permissions if any
          book_role: pendingPermissions[friend.id]?.book_role || friend.book_role || existing?.book_role || 'author',
          pageAccessLevel: pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || existing?.pageAccessLevel || 'own_page',
          editorInteractionLevel: pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || existing?.editorInteractionLevel || 'full_edit'
        });
      });
      
      const updatedBookFriends = Array.from(allFriends.values());
      editorDispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedBookFriends });
    }
    
    // Clear pending states and navigate back
    setPendingAssignment(null);
    setHasRemovedAssignment(false);
    setPendingPermissions({});
    navigate(-1);
  };
  
  const handleCancel = () => {
    setPendingAssignment(null);
    setHasRemovedAssignment(false);
    setPendingPermissions({});
    navigate(-1);
  };

  useEffect(() => {
    if (bookId) {
      fetchBookData();
      fetchAllFriends();
      // Use editor state first, fallback to API if empty
      if (editorState?.bookFriends && editorState.bookFriends.length > 0) {
        setBookFriends(editorState.bookFriends);
      } else {
        fetchBookFriends();
      }
      // Set current page from editor state if available
      if (editorState?.activePageIndex !== undefined) {
        setCurrentPage(editorState.activePageIndex + 1);
      }
    }
  }, [bookId, editorState?.bookFriends]);

  const fetchBookData = async () => {
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
      console.error('Error fetching book data:', error);
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
        if (editorDispatch) {
          editorDispatch({ type: 'SET_BOOK_FRIENDS', payload: data });
        }
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
    if (checkUserQuestionConflicts) {
      const conflicts = checkUserQuestionConflicts(user.id, currentPage);
      
      if (conflicts.length > 0) {
        const conflictMessage = `${user.name} already has the following questions on other pages:\n\n` +
          conflicts.map(c => `• "${c.questionText}" on page ${c.pageNumber}`).join('\n') +
          '\n\nThis page assignment cannot be made because a question can be assigned to each user only once.';
        
        setConflictAlert({ show: true, message: conflictMessage });
        return;
      }
    }
    
    // Only set pending assignment - don't update global state yet
    setPendingAssignment(user);
    setHasRemovedAssignment(false);
  };

  const handleRemoveAssignment = () => {
    setPendingAssignment(null);
    setHasRemovedAssignment(true);
  };

  const handleAddFriend = async (friend: User) => {
    setLoading(true);
    try {
      // Add to local book friends with default permissions
      const newFriend = {
        ...friend,
        role: 'author',
        book_role: 'author' as const,
        pageAccessLevel: 'own_page' as const,
        editorInteractionLevel: 'full_edit' as const
      };
      const updatedBookFriends = [...bookFriends, newFriend];
      setBookFriends(updatedBookFriends);

      // Assign to current page (pending)
      setPendingAssignment({ ...friend, role: 'author' });
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading book manager...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showAddUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddUser(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Book Manager
            </Button>
          </div>
          
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Add Friend to Book</h2>
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
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Book Manager
              </h1>
              <p className="text-muted-foreground">{bookName}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pages-assignments">Pages & Assignments</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="questions-answers">Questions & Answers</TabsTrigger>
            <TabsTrigger value="book-settings">Book Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pages-assignments" className="space-y-4">
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
                  <p className="text-sm font-medium">Book Friends:</p>
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
                  No friends in this book
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="friends" className="space-y-4">
            <div className="space-y-4">
              {allBookCollaborators.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Book Friends:</p>
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
                  No friends in this book
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="questions-answers" className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Questions & Answers management coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="book-settings" className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Book Settings (page size, orientation) coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setShowAddUser(true)}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>

      {/* Conflict Alert */}
      {conflictAlert.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Question Assignment Conflict</h3>
            <p className="text-sm whitespace-pre-line mb-4">{conflictAlert.message}</p>
            <Button 
              onClick={() => setConflictAlert({ show: false, message: '' })}
              className="w-full"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}