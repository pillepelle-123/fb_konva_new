import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { Plus, Trash2, Info, UserRoundX, Send, SquarePen, Save, X, MessageCircleQuestion } from 'lucide-react';
import List from '../../shared/list';
import CompactList from '../../shared/list';
import ProfilePicture from '../users/profile-picture';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/composites/tabs';
import { SelectInput } from '../../ui/primitives/select-input';
import { Tooltip } from '../../ui/composites/tooltip';
import { Switch } from '../../ui/primitives/switch';
import { Card, CardContent, CardHeader } from '../../ui/composites/card';
import { Input } from '../../ui/primitives/input';
import InviteUserDialog from './invite-user-dialog';
import UnsavedChangesDialog from '../../ui/overlays/unsaved-changes-dialog';

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

interface Question {
  id: string;
  question_text: string;
  created_at: string;
  updated_at: string | null;
  answers?: Answer[];
}

interface Answer {
  id: string;
  user_id: number;
  answer_text: string;
  user_name: string;
  user_email: string;
}

interface BookManagerContentProps {
  bookId: number | string;
  onClose: () => void;
  isStandalone?: boolean;
}

interface TempState {
  bookFriends: BookFriend[];
  pendingPermissions: Record<number, { pageAccessLevel: string; editorInteractionLevel: string; book_role: string }>;
  pendingAssignment: User | null;
  hasRemovedAssignment: boolean;
  removedFriends: Set<number>;
  tempQuestions: Record<string, string>;
  deletedQuestions: Set<string>;
  bookSettings: {
    pageSize: string;
    orientation: string;
  };
}

export default function BookManagerContent({ bookId, onClose, isStandalone = false }: BookManagerContentProps) {
  const { token, user } = useAuth();
  
  // Try to use editor context if available, otherwise work standalone
  let state = null;
  let dispatch = null;
  let checkUserQuestionConflicts = null;
  
  try {
    if (!isStandalone) {
      const editor = useEditor();
      state = editor.state;
      dispatch = editor.dispatch;
      checkUserQuestionConflicts = editor.checkUserQuestionConflicts;
    }
  } catch {
    // Editor context not available in standalone mode
  }

  const [tempState, setTempState] = useState<TempState>({
    bookFriends: [],
    pendingPermissions: {},
    pendingAssignment: null,
    hasRemovedAssignment: false,
    removedFriends: new Set(),
    tempQuestions: {},
    deletedQuestions: new Set(),
    bookSettings: {
      pageSize: state?.currentBook?.pageSize || 'A4',
      orientation: state?.currentBook?.orientation || 'portrait'
    }
  });
  const [originalState, setOriginalState] = useState<TempState>({
    bookFriends: [],
    pendingPermissions: {},
    pendingAssignment: null,
    hasRemovedAssignment: false,
    removedFriends: new Set(),
    tempQuestions: {},
    deletedQuestions: new Set(),
    bookSettings: {
      pageSize: state?.currentBook?.pageSize || 'A4',
      orientation: state?.currentBook?.orientation || 'portrait'
    }
  });
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conflictAlert, setConflictAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [removeConfirm, setRemoveConfirm] = useState<{ show: boolean; user: BookFriend | null }>({ show: false, user: null });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteError, setInviteError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('pages-assignments');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentPage = state?.activePageIndex + 1 || 1;
  const assignedUser = tempState.hasRemovedAssignment ? null : (tempState.pendingAssignment !== null ? tempState.pendingAssignment : state?.pageAssignments?.[currentPage]);
  
  const hasChanges = () => {
    // Compare basic properties
    if (JSON.stringify(tempState.bookFriends) !== JSON.stringify(originalState.bookFriends)) return true;
    if (JSON.stringify(tempState.pendingPermissions) !== JSON.stringify(originalState.pendingPermissions)) return true;
    if (JSON.stringify(tempState.pendingAssignment) !== JSON.stringify(originalState.pendingAssignment)) return true;
    if (tempState.hasRemovedAssignment !== originalState.hasRemovedAssignment) return true;
    if (JSON.stringify(tempState.tempQuestions) !== JSON.stringify(originalState.tempQuestions)) return true;
    if (JSON.stringify(tempState.bookSettings) !== JSON.stringify(originalState.bookSettings)) return true;
    
    // Compare Sets
    if (tempState.removedFriends.size !== originalState.removedFriends.size) return true;
    for (const id of tempState.removedFriends) {
      if (!originalState.removedFriends.has(id)) return true;
    }
    
    if (tempState.deletedQuestions.size !== originalState.deletedQuestions.size) return true;
    for (const id of tempState.deletedQuestions) {
      if (!originalState.deletedQuestions.has(id)) return true;
    }
    
    return false;
  };
  
  const handlePermissionChange = (userId: number, field: 'pageAccessLevel' | 'editorInteractionLevel' | 'book_role', value: string) => {
    setTempState(prev => ({
      ...prev,
      pendingPermissions: {
        ...prev.pendingPermissions,
        [userId]: {
          ...prev.pendingPermissions[userId],
          [field]: value
        }
      }
    }));
  };

  const renderBookParticipant = (friend: BookFriend) => {
    const bookRole = tempState.pendingPermissions[friend.id]?.book_role || friend.book_role || friend.role;
    const isOwner = bookRole === 'owner';
    const isPublisher = bookRole === 'publisher';
    const isCurrentUser = friend.id === user?.id;
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 w-full">
            <ProfilePicture name={friend.name} size="sm" userId={friend.id} variant='withColoredBorder' />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{friend.name}</p>
              <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
              <p className="text-xs text-primary font-medium">{isOwner ? 'Owner' : isPublisher ? 'Publisher' : 'Author'}</p>
            </div>

            {!isOwner && !isCurrentUser && (
              <div className="flex items-center gap-2">
                {!isPublisher && (
                  <>
                    <SelectInput
                      value={tempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || 'own_page'}
                      onChange={(value) => handlePermissionChange(friend.id, 'pageAccessLevel', value)}
                      className="text-xs w-24"
                    >
                      <option value="form_only">Form Only</option>
                      <option value="own_page">Own Page</option>
                      <option value="all_pages">All Pages</option>
                    </SelectInput>
                    <SelectInput
                      value={tempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || 'full_edit'}
                      onChange={(value) => handlePermissionChange(friend.id, 'editorInteractionLevel', value)}
                      className="text-xs w-28"
                    >
                      <option value="no_access">No Access</option>
                      <option value="answer_only">Answer Only</option>
                      <option value="full_edit">Full Edit</option>
                      <option value="full_edit_with_settings">Full + Settings</option>
                    </SelectInput>
                  </>
                )}
                <Switch
                  checked={isPublisher}
                  onCheckedChange={(checked) => handlePermissionChange(friend.id, 'book_role', checked ? 'publisher' : 'author')}
                />
                <Tooltip content="Remove friend from book">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveConfirm({ show: true, user: friend })}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <UserRoundX className="h-5 w-5" />
                  </Button>
                </Tooltip>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const handleSave = async () => {
    if (isStandalone) {
      // Save directly to database in standalone mode
      await saveToDatabase();
    } else {
      // Save to editor context in editor mode
      await saveToEditorContext();
    }
    onClose();
  };
  
  const saveToEditorContext = async () => {
    if (!state || !dispatch) return;
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const existingFriendIds = new Set((state.bookFriends || []).map(f => f.id));
    const newFriends = tempState.bookFriends.filter(f => !existingFriendIds.has(f.id));

    for (const friend of newFriends) {
      try {
        await fetch(`${apiUrl}/books/${bookId}/friends`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            friendId: friend.id,
            book_role: 'author',
            page_access_level: 'own_page',
            editor_interaction_level: 'full_edit'
          })
        });
      } catch (error) {
        console.error('Error adding friend:', error);
      }
    }
    
    // Save page assignment changes
    if (tempState.pendingAssignment !== null || tempState.hasRemovedAssignment) {
      const updatedAssignments = { ...state.pageAssignments };
      if (tempState.hasRemovedAssignment) {
        delete updatedAssignments[currentPage];
      } else {
        updatedAssignments[currentPage] = tempState.pendingAssignment;
      }
      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
    }
    
    // Update book friends with all local changes and pending permissions
    const currentBookFriends = state.bookFriends || [];
    
    // Merge local bookFriends with current state, applying pending permissions
    const allFriends = new Map();
    
    // Add existing friends from state (excluding removed ones)
    currentBookFriends.forEach(friend => {
      if (!tempState.removedFriends.has(friend.id)) {
        allFriends.set(friend.id, friend);
      }
    });
    
    // Add/update with local bookFriends (includes newly added users)
    tempState.bookFriends.forEach(friend => {
      if (!tempState.removedFriends.has(friend.id)) {
        const existing = allFriends.get(friend.id);
        allFriends.set(friend.id, {
          ...existing,
          ...friend,
          // Apply pending permissions if any
          book_role: tempState.pendingPermissions[friend.id]?.book_role || friend.book_role || existing?.book_role || 'author',
          pageAccessLevel: tempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || existing?.pageAccessLevel || 'own_page',
          editorInteractionLevel: tempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || existing?.editorInteractionLevel || 'full_edit'
        });
      }
    });
    
    const updatedBookFriends = Array.from(allFriends.values());
    dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedBookFriends });
    
    // Update temp questions
    Object.entries(tempState.tempQuestions).forEach(([questionId, text]) => {
      dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text } });
    });
    
    // Remove deleted questions from editor state
    tempState.deletedQuestions.forEach(questionId => {
      dispatch({ type: 'DELETE_TEMP_QUESTION', payload: { questionId } });
    });
    
    // Update book settings
    if (state.currentBook && (tempState.bookSettings.pageSize !== state.currentBook.pageSize || tempState.bookSettings.orientation !== state.currentBook.orientation)) {
      dispatch({ type: 'UPDATE_BOOK_SETTINGS', payload: tempState.bookSettings });
    }
  };
  
  const saveToDatabase = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Save book settings
      if (tempState.bookSettings) {
        await fetch(`${apiUrl}/books/${bookId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pageSize: tempState.bookSettings.pageSize,
            orientation: tempState.bookSettings.orientation
          })
        });
      }
      
      // Add new friends to book first
      for (const friend of tempState.bookFriends) {
        try {
          await fetch(`${apiUrl}/books/${bookId}/friends`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              friendId: friend.id,
              book_role: tempState.pendingPermissions[friend.id]?.book_role || friend.book_role || 'author',
              page_access_level: tempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || 'own_page',
              editor_interaction_level: tempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || 'full_edit'
            })
          });
        } catch (error) {
          // Ignore 409 errors (friend already exists)
          if (!error.message?.includes('409')) {
            console.error('Error adding friend:', error);
          }
        }
      }
      
      // Update book friends permissions
      const friendsWithPermissions = tempState.bookFriends.map(friend => ({
        user_id: friend.id,
        role: friend.role,
        book_role: tempState.pendingPermissions[friend.id]?.book_role || friend.book_role || 'author',
        page_access_level: tempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || 'own_page',
        editor_interaction_level: tempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || 'full_edit'
      }));
      
      await fetch(`${apiUrl}/books/${bookId}/friends/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friends: friendsWithPermissions })
      });
      
      // Save questions
      for (const [questionId, questionText] of Object.entries(tempState.tempQuestions)) {
        if (questionText && questionText.trim()) {
          await fetch(`${apiUrl}/questions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: questionId,
              bookId: bookId,
              questionText: questionText
            })
          });
        }
      }
      
      // Delete questions
      for (const questionId of tempState.deletedQuestions) {
        await fetch(`${apiUrl}/questions/${questionId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      throw error;
    }
  };
  
  const handleCancel = () => {
    if (hasChanges()) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };
  
  const handleSaveAndExit = async () => {
    await handleSave();
    setShowUnsavedDialog(false);
  };
  
  const handleExitWithoutSaving = () => {
    setShowUnsavedDialog(false);
    onClose();
  };
  
  const handleCancelDialog = () => {
    setShowUnsavedDialog(false);
  };
  
  const handleQuestionAdd = (id: string, text: string) => {
    setTempState(prev => ({
      ...prev,
      tempQuestions: { ...prev.tempQuestions, [id]: text }
    }));
  };
  
  const handleQuestionEdit = (id: string, text: string) => {
    setTempState(prev => ({
      ...prev,
      tempQuestions: { ...prev.tempQuestions, [id]: text }
    }));
  };
  
  const handleQuestionDelete = (id: string) => {
    setTempState(prev => {
      const newTempQuestions = { ...prev.tempQuestions };
      delete newTempQuestions[id];
      return {
        ...prev,
        tempQuestions: newTempQuestions,
        deletedQuestions: new Set([...prev.deletedQuestions, id])
      };
    });
  };

  const fetchQuestionsWithAnswers = async () => {
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      setQuestions([]);
      setQuestionsLoading(false);
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const questionsData = await response.json();
        
        // Filter out deleted questions
        const filteredQuestions = questionsData.filter(q => !tempState.deletedQuestions.has(q.id));
        
        // Create a map to avoid duplicates
        const questionsMap = new Map();
        
        // Add API questions first
        filteredQuestions.forEach(q => {
          questionsMap.set(q.id, {
            ...q,
            question_text: tempState.tempQuestions[q.id] || q.question_text
          });
        });
        
        // Add temp questions (only if not already in API questions)
        Object.entries(tempState.tempQuestions).forEach(([id, text]) => {
          if (!questionsMap.has(id)) {
            questionsMap.set(id, {
              id,
              question_text: text,
              created_at: new Date().toISOString(),
              updated_at: null,
              answers: []
            });
          }
        });
        
        setQuestions(Array.from(questionsMap.values()));
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    
    const questionId = uuidv4();
    handleQuestionAdd(questionId, newQuestion);
    setNewQuestion('');
  };

  const handleEditQuestion = (questionId: string) => {
    if (!editText.trim()) return;
    
    handleQuestionEdit(questionId, editText);
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteQuestion = () => {
    if (!showDeleteConfirm) return;
    
    handleQuestionDelete(showDeleteConfirm);
    setShowDeleteConfirm(null);
    fetchQuestionsWithAnswers();
  };

  const startEdit = (question: Question) => {
    setEditingId(question.id);
    setEditText(question.question_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  useEffect(() => {
    fetchAllFriends();
    
    if (isStandalone) {
      // In standalone mode, always fetch from API
      fetchBookData();
      fetchBookFriends();
      const initialState = {
        bookFriends: [],
        pendingPermissions: {},
        pendingAssignment: null,
        hasRemovedAssignment: false,
        removedFriends: new Set(),
        tempQuestions: {},
        deletedQuestions: new Set(),
        bookSettings: { pageSize: 'A4', orientation: 'portrait' }
      };
      setTempState(initialState);
      setOriginalState(initialState);
    } else {
      // Use editor state first, fallback to API if empty
      const initialBookFriends = state?.bookFriends && state.bookFriends.length > 0 ? state.bookFriends : [];
      const initialState = {
        bookFriends: initialBookFriends,
        pendingPermissions: {},
        pendingAssignment: null,
        hasRemovedAssignment: false,
        removedFriends: new Set(),
        tempQuestions: { ...state?.tempQuestions || {} },
        deletedQuestions: new Set(),
        bookSettings: {
          pageSize: state?.currentBook?.pageSize || 'A4',
          orientation: state?.currentBook?.orientation || 'portrait'
        }
      };
      setTempState(initialState);
      setOriginalState(initialState);
      
      if (initialBookFriends.length === 0) {
        fetchBookFriends();
      }
    }
    setLoading(false);
  }, [isStandalone, state?.bookFriends]);
  
  const fetchBookData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTempState(prev => ({
          ...prev,
          bookSettings: {
            pageSize: data.pageSize || 'A4',
            orientation: data.orientation || 'portrait'
          }
        }));
        setOriginalState(prev => ({
          ...prev,
          bookSettings: {
            pageSize: data.pageSize || 'A4',
            orientation: data.orientation || 'portrait'
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching book data:', error);
    }
  };

  useEffect(() => {
    fetchQuestionsWithAnswers();
  }, [bookId, tempState.tempQuestions, tempState.deletedQuestions]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const fetchBookFriends = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTempState(prev => ({ ...prev, bookFriends: data }));
        setOriginalState(prev => ({ ...prev, bookFriends: data }));
        if (dispatch) {
          dispatch({ type: 'SET_BOOK_FRIENDS', payload: data });
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
    setTempState(prev => ({ ...prev, pendingAssignment: user, hasRemovedAssignment: false }));
  };

  const handleRemoveAssignment = () => {
    setTempState(prev => ({ ...prev, pendingAssignment: null, hasRemovedAssignment: true }));
  };

  const handleAddFriend = (friend: User) => {
    // Add to local book friends with default permissions
    const newFriend = {
      ...friend,
      role: 'author',
      book_role: 'author' as const,
      pageAccessLevel: 'own_page' as const,
      editorInteractionLevel: 'full_edit' as const
    };
    const updatedBookFriends = [...tempState.bookFriends, newFriend];
    setTempState(prev => ({ 
      ...prev, 
      bookFriends: updatedBookFriends
    }));
    setShowAddUser(false);
  };

  const handleRemoveFriend = (friendToRemove: BookFriend) => {
    // Mark friend as removed in temp state
    const updatedBookFriends = tempState.bookFriends.filter(f => f.id !== friendToRemove.id);
    setTempState(prev => ({ 
      ...prev, 
      bookFriends: updatedBookFriends,
      removedFriends: new Set([...prev.removedFriends, friendToRemove.id])
    }));
    setRemoveConfirm({ show: false, user: null });
  };

  const handleInviteUser = async (name: string, email: string) => {
    setInviteError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Send invitation via invitations endpoint
      const response = await fetch(`${apiUrl}/invitations/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, bookId })
      });
      
      if (response.ok) {
        // Refresh book friends from server to get the newly invited user
        await fetchBookFriends();
        setShowInviteDialog(false);
        setInviteError('');
      } else if (response.status === 409) {
        setInviteError('A user with this email address already exists or is already in this book.');
      } else {
        setInviteError('Failed to send invitation. Please try again.');
      }
    } catch (error) {
      setInviteError('Failed to send invitation. Please try again.');
    }
  };

  const availableFriends = allFriends.filter(friend => 
    !tempState.bookFriends.some(bookFriend => bookFriend.id === friend.id) && friend.id !== user?.id
  );

  // Use book friends list directly (current user is already included from API)
  const allBookCollaborators = tempState.bookFriends;

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
      <div className="p-6">
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setShowAddUser(false)}
            className="w-full"
          >
            ← Back to Book Manager
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
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4" variant='bootstrap'>
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
                <div className="overflow-y-auto">
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
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowAddUser(true)}
                className=""
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Friend
              </Button>
              <Button 
                onClick={() => setShowInviteDialog(true)}
                className=" bg-[hsl(var(--highlight))] hover:bg-[hsl(var(--highlight))]/90"
              >
                <Send className="h-4 w-4 mr-2" />
                Invite Friend
              </Button>
            </div>
            {allBookCollaborators.length > 0 ? (
              <div className="space-y-4">
                
                <div className="overflow-y-auto">
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

        <TabsContent value="questions-answers" className="space-y-4 flex-1 flex flex-col">
          <div className="flex-1 overflow-auto space-y-6">
            {questionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <>
                {/* Add Question Form */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Add New Question</h3>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddQuestion} className="flex gap-2">
                      <Input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Enter new question..."
                        className="flex-1"
                      />
                      <Button type="submit">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Questions List */}
                {questions.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <MessageCircleQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No questions yet</h3>
                      <p className="text-muted-foreground">Add your first question above to get started.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question) => (
                      <Card key={question.id}>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {/* Question Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {editingId === question.id ? (
                                  <div className="space-y-3">
                                    <Input
                                      ref={editInputRef}
                                      type="text"
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="text-lg font-medium"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleEditQuestion(question.id)}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={cancelEdit}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h4 className="text-lg font-medium text-foreground mb-2">
                                      {question.question_text}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      Created: {new Date(question.created_at).toLocaleDateString()}
                                      {question.updated_at && (
                                        <> • Updated: {new Date(question.updated_at).toLocaleDateString()}</>
                                      )}
                                    </p>
                                  </>
                                )}
                              </div>
                              
                              {editingId !== question.id && (
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEdit(question)}
                                  >
                                    <SquarePen className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(question.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Answers */}
                            {editingId !== question.id && (
                              <div className="border-t pt-4">
                                <h5 className="text-sm font-medium text-muted-foreground mb-3">
                                  Answers ({question.answers?.length || 0})
                                </h5>
                                {question.answers && question.answers.length > 0 ? (
                                  <div className="space-y-3">
                                    {question.answers.map((answer) => (
                                      <div key={answer.id} className="bg-muted/30 rounded-lg p-3">
                                        <div className="flex items-start justify-between mb-2">
                                          <span className="text-sm font-medium">{answer.user_name}</span>
                                          <span className="text-xs text-muted-foreground">{answer.user_email}</span>
                                        </div>
                                        <p className="text-sm">{answer.answer_text || <em className="text-muted-foreground">No answer provided</em>}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">No answers yet</p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="book-settings" className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Page Settings</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Size</label>
                <SelectInput
                  value={tempState.bookSettings.pageSize}
                  onChange={(value) => setTempState(prev => ({
                    ...prev,
                    bookSettings: { ...prev.bookSettings, pageSize: value }
                  }))}
                  className="w-full"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="Letter">Letter (8.5 × 11 in)</option>
                  <option value="Legal">Legal (8.5 × 14 in)</option>
                  <option value="A5">A5 (148 × 210 mm)</option>
                  <option value="Square">Square (210 × 210 mm)</option>
                </SelectInput>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Orientation</label>
                <SelectInput
                  value={tempState.bookSettings.orientation}
                  onChange={(value) => setTempState(prev => ({
                    ...prev,
                    bookSettings: { ...prev.bookSettings, orientation: value }
                  }))}
                  className="w-full"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </SelectInput>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex gap-2 pt-6 border-t mt-6 justify-end">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save and Close
        </Button>
      </div>
      
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
      
      {removeConfirm.show && removeConfirm.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Remove Friend from Book</h3>
            <p className="text-sm mb-4">
              Are you sure you want to remove <strong>{removeConfirm.user.name}</strong> from this book?
              <br /><br />
              This will:
              <br />• Remove their access to the book
              <br />• Remove all their page assignments
              <br />• Keep their answers but mark them as inactive
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setRemoveConfirm({ show: false, user: null })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleRemoveFriend(removeConfirm.user!)}
                className="flex-1"
              >
                Remove Friend
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={(open) => {
          setShowInviteDialog(open);
          if (!open) setInviteError('');
        }}
        onInvite={handleInviteUser}
        errorMessage={inviteError}
      />
      
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSaveAndExit={handleSaveAndExit}
        onExitWithoutSaving={handleExitWithoutSaving}
        onCancel={handleCancelDialog}
        title="Unsaved Book Manager Changes"
      />
      
      {/* Delete Question Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Question</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this question? This will also delete all answers to this question and reset any textboxes containing this question. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteQuestion} className="flex-1">
                Delete Question
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}