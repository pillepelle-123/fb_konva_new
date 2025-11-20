import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { UserRoundX } from 'lucide-react';
import CompactList from '../../shared/compact-list';
import ProfilePicture from '../users/profile-picture';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/composites/tabs';
import { SelectInput } from '../../ui/primitives/select-input';
import { Tooltip } from '../../ui/composites/tooltip';
import { Switch } from '../../ui/primitives/switch';
import { Card, CardContent } from '../../ui/composites/card';
import InviteUserDialog from './invite-user-dialog';
import UnsavedChangesDialog from '../../ui/overlays/unsaved-changes-dialog';
import QuestionPoolModal from '../questions/question-pool-modal';
import { PagesAssignmentsTab } from './book-manager-tabs/pages-assignments-tab';
import { FriendsTab } from './book-manager-tabs/friends-tab';
import { QuestionsAnswersTab } from './book-manager-tabs/questions-answers-tab';
import { BookSettingsTab } from './book-manager-tabs/book-settings-tab';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface BookFriend {
  id: number;
  name: string;
  email: string;
  role: string;
  book_role?: 'author' | 'publisher';
  pageAccessLevel?: 'form_only' | 'own_page' | 'all_pages';
  editorInteractionLevel?: 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings';
}

export interface Question {
  id: string;
  question_text: string;
  created_at: string;
  updated_at: string | null;
  question_pool_id?: number | null;
  answers?: Answer[];
}

export interface Answer {
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
  hideActions?: boolean;
  onActionsReady?: (actions: React.ReactNode) => void;
  initialTab?: string;
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

export default function BookManagerContent({ bookId, onClose, isStandalone = false, hideActions = false, onActionsReady, initialTab }: BookManagerContentProps) {
  const { token, user } = useAuth();
  
  // Always call useEditor hook (React hooks must be called unconditionally)
  // But only use it if not in standalone mode
  let editorContext: ReturnType<typeof useEditor> | null = null;
  try {
    editorContext = useEditor();
  } catch {
    // Editor context not available in standalone mode
    editorContext = null;
  }
  
  const state = !isStandalone && editorContext ? editorContext.state : null;
  const dispatch = !isStandalone && editorContext ? editorContext.dispatch : null;
  const checkUserQuestionConflicts = !isStandalone && editorContext ? editorContext.checkUserQuestionConflicts : null;

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
  const [activeTab, setActiveTab] = useState(initialTab || 'pages-assignments');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showQuestionPool, setShowQuestionPool] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentPage = (state?.activePageIndex !== undefined ? state.activePageIndex + 1 : 1);
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
  
  const saveToEditorContext = useCallback(async () => {
    if (!state || !dispatch) {
      console.error('saveToEditorContext: state or dispatch is missing');
      return;
    }
    
    // CRITICAL: Use the latest tempState value by accessing it directly
    // This ensures we always have the current state, not a stale closure
    const currentTempState = tempState;
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    // Update book settings first (if changed)
    if (state.currentBook && (currentTempState.bookSettings.pageSize !== state.currentBook.pageSize || currentTempState.bookSettings.orientation !== state.currentBook.orientation)) {
      try {
        await fetch(`${apiUrl}/books/${bookId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pageSize: currentTempState.bookSettings.pageSize,
            orientation: currentTempState.bookSettings.orientation
          })
        });
        dispatch({ type: 'UPDATE_BOOK_SETTINGS', payload: currentTempState.bookSettings });
      } catch (error) {
        console.error('Error updating book settings:', error);
      }
    }
    
    // Update book friends and permissions
    const existingFriendIds = new Set((state.bookFriends || []).map(f => f.id));
    const newFriends = currentTempState.bookFriends.filter(f => !existingFriendIds.has(f.id));

    // Add new friends to book
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
            book_role: currentTempState.pendingPermissions[friend.id]?.book_role || friend.book_role || 'author',
            page_access_level: currentTempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || 'own_page',
            editor_interaction_level: currentTempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || 'full_edit'
          })
        });
      } catch (error) {
        console.error('Error adding friend:', error);
      }
    }
    
    // Remove friends from book
    for (const friendId of currentTempState.removedFriends) {
      try {
        await fetch(`${apiUrl}/books/${bookId}/friends/${friendId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error removing friend:', error);
      }
    }
    
    // Update book friends with all local changes and pending permissions
    const currentBookFriends = state.bookFriends || [];
    
    // Merge local bookFriends with current state, applying pending permissions
    const allFriends = new Map();
    
    // Add existing friends from state (excluding removed ones)
    currentBookFriends.forEach(friend => {
      if (!currentTempState.removedFriends.has(friend.id)) {
        allFriends.set(friend.id, friend);
      }
    });
    
    // Add/update with local bookFriends (includes newly added users)
    currentTempState.bookFriends.forEach(friend => {
      if (!currentTempState.removedFriends.has(friend.id)) {
        const existing = allFriends.get(friend.id);
        allFriends.set(friend.id, {
          ...existing,
          ...friend,
          // Apply pending permissions if any
          book_role: currentTempState.pendingPermissions[friend.id]?.book_role || friend.book_role || existing?.book_role || 'author',
          pageAccessLevel: currentTempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || existing?.pageAccessLevel || 'own_page',
          editorInteractionLevel: currentTempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || existing?.editorInteractionLevel || 'full_edit'
        });
      }
    });
    
    const updatedBookFriends = Array.from(allFriends.values());
    
    // Update permissions for all friends via bulk-update
    if (updatedBookFriends.length > 0) {
      try {
        const friendsWithPermissions = updatedBookFriends.map(friend => ({
          user_id: friend.id,
          role: friend.role,
          book_role: currentTempState.pendingPermissions[friend.id]?.book_role || friend.book_role || 'author',
          page_access_level: currentTempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || 'own_page',
          editor_interaction_level: currentTempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || 'full_edit'
        }));
        
        await fetch(`${apiUrl}/books/${bookId}/friends/bulk-update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ friends: friendsWithPermissions })
        });
      } catch (error) {
        console.error('Error updating friend permissions:', error);
      }
    }
    
    // Update state with new book friends
    dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedBookFriends });
    
    // Save page assignment changes
    if (currentTempState.pendingAssignment !== null || currentTempState.hasRemovedAssignment) {
      const currentPageNumber = (state.activePageIndex !== undefined ? state.activePageIndex + 1 : 1);
      const updatedAssignments = { ...state.pageAssignments };
      if (currentTempState.hasRemovedAssignment) {
        delete updatedAssignments[currentPageNumber];
      } else {
        updatedAssignments[currentPageNumber] = currentTempState.pendingAssignment;
      }
      
      // Update state first
      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
      
      // Save to database
      try {
        const assignments = Object.entries(updatedAssignments)
          .filter(([_, assignedUser]) => assignedUser !== null)
          .map(([pageNumber, assignedUser]) => ({
            pageNumber: parseInt(pageNumber),
            userId: assignedUser?.id || null
          }));
        
        await fetch(`${apiUrl}/page-assignments/book/${bookId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ assignments })
        });
      } catch (error) {
        console.error('Error saving page assignments:', error);
      }
    }
    
    // Save questions to database
    for (const [questionId, questionText] of Object.entries(currentTempState.tempQuestions)) {
      if (questionText && questionText.trim()) {
        try {
          // Parse question data (might be JSON with poolId or plain text)
          let textToSave = questionText;
          let questionPoolId = null;
          try {
            const parsed = JSON.parse(questionText);
            if (parsed.text) {
              textToSave = parsed.text;
              questionPoolId = parsed.poolId || null;
            }
          } catch {
            // Not JSON, use as plain text
          }
          
          // Update editor state FIRST (before DB save)
          // This ensures UI updates immediately
          dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text: textToSave, questionPoolId } });
          
          await fetch(`${apiUrl}/questions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: questionId,
              bookId: bookId,
              questionText: textToSave,
              questionPoolId: questionPoolId
            })
          });
        } catch (error) {
          console.error('Error saving question:', error);
        }
      }
    }
    
    // Delete questions from database
    for (const questionId of currentTempState.deletedQuestions) {
      try {
        await fetch(`${apiUrl}/questions/${questionId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Remove from editor state
        dispatch({ type: 'DELETE_TEMP_QUESTION', payload: { questionId } });
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
    
    // CRITICAL: Reload all questions from database and sync with editor state
    // This ensures that questions-manager-dialog shows all questions correctly
    // and that textboxes display updated question text
    try {
      const questionsResponse = await fetch(`${apiUrl}/books/${bookId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        
        // Update editor state with ALL questions from database
        // This ensures consistency between DB and editor state
        questionsData.forEach((q: { id: string; question_text: string; question_pool_id?: number | null }) => {
          const questionText = q.question_text;
          const questionPoolId = q.question_pool_id || undefined;
          
          // Always update to ensure editor state matches database
          dispatch({ 
            type: 'UPDATE_TEMP_QUESTION', 
            payload: { 
              questionId: q.id, 
              text: questionText, 
              questionPoolId 
            } 
          });
        });
      }
    } catch (error) {
      console.error('Error reloading questions:', error);
      // Don't throw - this is not critical for saving
    }
  }, [tempState, state, dispatch, bookId, token]);
  
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
          if (!(error instanceof Error && error.message?.includes('409'))) {
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
          try {
            // Parse question data (might be JSON with poolId or plain text)
            let textToSave = questionText;
            let questionPoolId = null;
            try {
              const parsed = JSON.parse(questionText);
              if (parsed.text) {
                textToSave = parsed.text;
                questionPoolId = parsed.poolId || null;
              }
            } catch {
              // Not JSON, use as plain text
            }
            
            await fetch(`${apiUrl}/questions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                id: questionId,
                bookId: bookId,
                questionText: textToSave,
                questionPoolId: questionPoolId
              })
            });
          } catch (error) {
            console.error('Error saving question:', error);
          }
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
  
  const handleCancel = useCallback(() => {
    if (hasChanges()) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);
  
  const handleSave = useCallback(async () => {
    try {
      if (isStandalone) {
        // Save directly to database in standalone mode
        await saveToDatabase();
      } else {
        // Save to editor context in editor mode
        await saveToEditorContext();
      }
      // Only close after all saves are complete
      onClose();
    } catch (error) {
      console.error('Error saving book manager changes:', error);
      // Don't close on error - let user see the error
    }
  }, [isStandalone, onClose, saveToDatabase, saveToEditorContext]);
  
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
          const tempQuestionData = tempState.tempQuestions[q.id];
          let questionText = q.question_text;
          
          // Check if there's an updated text in temp state
          if (tempQuestionData) {
            try {
              const parsed = JSON.parse(tempQuestionData);
              questionText = parsed.text || tempQuestionData;
            } catch {
              questionText = tempQuestionData;
            }
          }
          
          questionsMap.set(q.id, {
            ...q,
            question_text: questionText
          });
        });
        
        // Add temp questions (only if not already in API questions)
        Object.entries(tempState.tempQuestions).forEach(([id, questionData]) => {
          if (!questionsMap.has(id)) {
            // Parse question data (might be JSON with poolId or plain text)
            let questionText = questionData;
            let questionPoolId = null;
            try {
              const parsed = JSON.parse(questionData);
              if (parsed.text) {
                questionText = parsed.text;
                questionPoolId = parsed.poolId || null;
              }
            } catch {
              // Not JSON, use as plain text
            }
            
            questionsMap.set(id, {
              id,
              question_text: questionText,
              question_pool_id: questionPoolId,
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

  const handleQuestionsFromPool = (addedQuestions: any[]) => {
    addedQuestions.forEach(q => {
      const questionId = require('uuid').v4 ? require('uuid').v4() : crypto.randomUUID();
      setTempState(prev => ({
        ...prev,
        tempQuestions: { 
          ...prev.tempQuestions, 
          [questionId]: JSON.stringify({ text: q.question_text, poolId: q.id })
        }
      }));
    });
    fetchQuestionsWithAnswers();
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

  // Use refs to store the latest functions to avoid dependency issues
  const handleCancelRef = useRef(handleCancel);
  const handleSaveRef = useRef(handleSave);
  
  // Update refs when functions change
  useEffect(() => {
    handleCancelRef.current = handleCancel;
    handleSaveRef.current = handleSave;
  }, [handleCancel, handleSave]);

  // Expose actions to parent component
  // Use useLayoutEffect to avoid infinite loops and ensure actions are set before render
  useLayoutEffect(() => {
    if (onActionsReady) {
      const actions = (
        <>
          <Button variant="outline" onClick={() => handleCancelRef.current()}>
            Cancel
          </Button>
          <Button onClick={() => handleSaveRef.current()}>
            Save and Close
          </Button>
        </>
      );
      onActionsReady(actions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onActionsReady]);

  // Set initial tab when component mounts or initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
  }, [isStandalone]);
  
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
    
    setTempState(prev => ({
      ...prev, 
      bookFriends: [...prev.bookFriends, newFriend]
    }));
    setShowAddUser(false);
    setActiveTab('friends');
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
  const allBookCollaborators = useMemo(() => {
    // console.log('Recalculating allBookCollaborators:', tempState.bookFriends);
    return tempState.bookFriends;
  }, [tempState.bookFriends]);

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
    <div className="h-full flex flex-col min-h-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-4" variant='bootstrap'>
          <TabsTrigger value="pages-assignments">Pages & Assignments</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="questions-answers">Questions & Answers</TabsTrigger>
          <TabsTrigger value="book-settings">Book Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pages-assignments" className="space-y-4">
          <PagesAssignmentsTab
            assignedUser={assignedUser}
            currentPage={currentPage}
            onRemoveAssignment={handleRemoveAssignment}
            collaborators={allBookCollaborators}
            renderBookFriend={renderBookFriend}
          />
        </TabsContent>
        
        <TabsContent value="friends" className="space-y-4">
          <FriendsTab
            friends={allBookCollaborators}
            onAddFriend={() => setShowAddUser(true)}
            onInviteFriend={() => setShowInviteDialog(true)}
            renderBookParticipant={renderBookParticipant}
          />
        </TabsContent>

        <TabsContent value="questions-answers" className="space-y-4 flex-1 flex flex-col">
          <QuestionsAnswersTab
            questionsLoading={questionsLoading}
            questions={questions}
            editingId={editingId}
            editText={editText}
            editInputRef={editInputRef}
            newQuestion={newQuestion}
            onNewQuestionChange={setNewQuestion}
            onAddQuestion={handleAddQuestion}
            onBrowseQuestionPool={() => setShowQuestionPool(true)}
            onStartEdit={startEdit}
            onEditQuestion={handleEditQuestion}
            onCancelEdit={cancelEdit}
            onDeleteQuestionRequest={(id) => setShowDeleteConfirm(id)}
            onEditTextChange={setEditText}
          />
        </TabsContent>

        <TabsContent value="book-settings" className="space-y-4">
          <BookSettingsTab
            pageSize={tempState.bookSettings.pageSize}
            orientation={tempState.bookSettings.orientation}
            onPageSizeChange={(value) =>
              setTempState((prev) => ({
                ...prev,
                bookSettings: { ...prev.bookSettings, pageSize: value },
              }))
            }
            onOrientationChange={(value) =>
              setTempState((prev) => ({
                ...prev,
                bookSettings: { ...prev.bookSettings, orientation: value },
              }))
            }
          />
        </TabsContent>
      </Tabs>
      
      {!hideActions && (
        <div className="flex gap-2 pt-6 border-t mt-6 justify-end flex-shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save and Close
          </Button>
        </div>
      )}
      
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

      {/* Question Pool Modal */}
      {showQuestionPool && typeof bookId === 'number' && (
        <QuestionPoolModal
          bookId={bookId}
          onClose={() => setShowQuestionPool(false)}
          onQuestionsAdded={handleQuestionsFromPool}
        />
      )}
    </div>
  );
}