import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { UserRoundX } from 'lucide-react';
import CompactList from '../../shared/compact-list';
import ProfilePicture from '../users/profile-picture';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/composites/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/primitives/select';
import { Tooltip } from '../../ui/composites/tooltip';
import { Switch } from '../../ui/primitives/switch';
import { Card, CardContent } from '../../ui/composites/card';
import InviteUserDialog from './invite-user-dialog';
import UnsavedChangesDialog from '../../ui/overlays/unsaved-changes-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/overlays/dialog';
import { QuestionList } from '../questions/question-list';
import { AnswerList } from '../questions/answer-list';
import { PagesAssignmentsTab } from './book-manager-tabs/pages-assignments-tab';
import { FriendsTab } from './book-manager-tabs/friends-tab';
import { BookSettingsTab } from './book-manager-tabs/book-settings-tab';
import { Input } from '../../ui/primitives/input';
import { Plus, Library, MessageCircleQuestionMark, Edit, Trash2, Save, X, MessageSquare } from 'lucide-react';
import { apiService } from '../../../services/api';

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
  display_order?: number | null;
  answers?: Answer[];
  category?: string | null;
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
  questionOrders?: Array<{ questionId: string; displayOrder: number }>;
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
    questionOrders: undefined,
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
    questionOrders: undefined,
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
  
  // Pool mode state
  const [poolQuestions, setPoolQuestions] = useState<Question[]>([]);
  const [filteredPoolQuestions, setFilteredPoolQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string | number>>(new Set());
  const [poolLoading, setPoolLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Answer list view state
  const [showAnswerList, setShowAnswerList] = useState(false);
  const [selectedQuestionForAnswers, setSelectedQuestionForAnswers] = useState<{ id: string; text: string } | null>(null);

  const currentPage = (state?.activePageIndex !== undefined ? state.activePageIndex + 1 : 1);
  const currentPageMeta = state?.currentBook?.pages?.find((page) => page.pageNumber === currentPage);
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
                    <Select
                      value={tempState.pendingPermissions[friend.id]?.pageAccessLevel || friend.pageAccessLevel || 'own_page'}
                      onValueChange={(value) => handlePermissionChange(friend.id, 'pageAccessLevel', value)}
                      showInfoIcons={true}
                      itemTooltips={{
                        'form_only': 'User can answer questions only via form',
                        'own_page': 'User can access own page' ,
                        'all_pages': 'User can access all pages'
                      }}  
                    >
                      <SelectTrigger className="text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="form_only">Form Only</SelectItem>
                        <SelectItem value="own_page">Own Page</SelectItem>
                        <SelectItem value="all_pages">All Pages</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={tempState.pendingPermissions[friend.id]?.editorInteractionLevel || friend.editorInteractionLevel || 'full_edit'}
                      onValueChange={(value) => handlePermissionChange(friend.id, 'editorInteractionLevel', value)}
                      showInfoIcons={true}
                      itemTooltips={{
                        'no_access': 'User has no access to the book (in combination with "Form Only"',
                        'answer_only': 'User can only answer questions on pages',
                        'full_edit': 'User can edit his own pages',
                        'full_edit_with_settings': 'User can edit pages and book settings'
                      }}
                    >
                      <SelectTrigger className="text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_access">No Access</SelectItem>
                        <SelectItem value="answer_only">Answer Only</SelectItem>
                        <SelectItem value="full_edit">Full Edit</SelectItem>
                        <SelectItem value="full_edit_with_settings">Full + Settings</SelectItem>
                      </SelectContent>
                    </Select>
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
    
    // Update book settings in state only (not in database)
    if (state.currentBook && (currentTempState.bookSettings.pageSize !== state.currentBook.pageSize || currentTempState.bookSettings.orientation !== state.currentBook.orientation)) {
      dispatch({ type: 'UPDATE_BOOK_SETTINGS', payload: currentTempState.bookSettings });
    }
    
    // Update book friends in state only (not in database)
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
    
    // Update state with new book friends (not in database)
    dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedBookFriends });
    
    const originalAssignments = state.pageAssignments || {};
    const updatedAssignments = { ...originalAssignments };
    let assignmentsChanged = false;
    
    // Entferne sämtliche Seitenzuweisungen für gelöschte Freunde
    if (currentTempState.removedFriends.size > 0) {
      for (const [pageNumber, assignedUser] of Object.entries(updatedAssignments)) {
        if (assignedUser && currentTempState.removedFriends.has(assignedUser.id)) {
          delete updatedAssignments[pageNumber];
          assignmentsChanged = true;
        }
      }
    }
    
    // Save page assignment changes for current page
    if (currentTempState.pendingAssignment !== null || currentTempState.hasRemovedAssignment) {
      const currentPageNumber = (state.activePageIndex !== undefined ? state.activePageIndex + 1 : 1);
      assignmentsChanged = true;
      if (currentTempState.hasRemovedAssignment) {
        delete updatedAssignments[currentPageNumber];
      } else {
        updatedAssignments[currentPageNumber] = currentTempState.pendingAssignment;
      }
    }
    
    if (assignmentsChanged) {
      // Update state only (not in database)
      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
    }
    
    // Update questions in state only (not in database)
    for (const [questionId, questionText] of Object.entries(currentTempState.tempQuestions)) {
      if (questionText && questionText.trim()) {
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
        
        // Update editor state only (not in database)
        dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text: textToSave, questionPoolId } });
      }
    }
    
    // Mark questions for deletion in state only (not in database)
    for (const questionId of currentTempState.deletedQuestions) {
      // Remove from editor state
      dispatch({ type: 'DELETE_TEMP_QUESTION', payload: { questionId } });
    }
    
    // Update question order on qna_inline elements
    if (currentTempState.questionOrders && currentTempState.questionOrders.length > 0 && state.currentBook) {
      const questionOrderMap = new Map<string, number>();
      currentTempState.questionOrders.forEach(({ questionId, displayOrder }) => {
        questionOrderMap.set(questionId, displayOrder);
      });
      
      // Update questionOrder on all qna_inline elements
      state.currentBook.pages.forEach((page) => {
        page.elements.forEach((element) => {
          if (element.textType === 'qna_inline' && element.questionId) {
            const displayOrder = questionOrderMap.get(element.questionId);
            if (displayOrder !== undefined) {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: { questionOrder: displayOrder }
                }
              });
            }
          }
        });
      });
    }
  }, [tempState, state, dispatch]);
  
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
      
      // Update question order
      if (tempState.questionOrders && tempState.questionOrders.length > 0 && typeof bookId === 'number') {
        await apiService.updateQuestionOrder(bookId, tempState.questionOrders);
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
      
      // Fetch questions and answers in parallel
      const [questionsResponse, answersResponse] = await Promise.all([
        fetch(`${apiUrl}/books/${bookId}/questions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/answers/book/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      let questionsData = [];
      let answersData = [];
      
      if (questionsResponse.ok) {
        questionsData = await questionsResponse.json();
      }
      
      if (answersResponse.ok) {
        answersData = await answersResponse.json();
      }
      
      // Create a map of answers by question_id
      const answersByQuestionId = new Map<string, Answer[]>();
      answersData.forEach((answer: { question_id: string; id: string; user_id: number; answer_text?: string; user_name?: string; user_email?: string }) => {
        const questionId = answer.question_id;
        if (!answersByQuestionId.has(questionId)) {
          answersByQuestionId.set(questionId, []);
        }
        answersByQuestionId.get(questionId)!.push({
          id: answer.id,
          user_id: answer.user_id,
          answer_text: answer.answer_text || '',
          user_name: answer.user_name || 'Unknown',
          user_email: answer.user_email || ''
        });
      });
      
      // Filter out deleted questions
      const filteredQuestions = questionsData.filter((q: Question) => !tempState.deletedQuestions.has(q.id));
      
      // Create a map to avoid duplicates
      const questionsMap = new Map();
      
      // Add API questions first
      filteredQuestions.forEach((q: Question) => {
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
          question_text: questionText,
          answers: answersByQuestionId.get(q.id) || []
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
            answers: answersByQuestionId.get(id) || []
          });
        }
      });

      setQuestions(Array.from(questionsMap.values()));
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

  const handleQuestionsFromPool = async () => {
    if (selectedPoolIds.size === 0 || typeof bookId !== 'number') return;
    
    setAdding(true);
    try {
      const createdQuestions = await apiService.addQuestionsFromPool(bookId, Array.from(selectedPoolIds).map(id => typeof id === 'number' ? id : parseInt(id.toString())));
      createdQuestions.forEach((q: Question) => {
        setTempState(prev => ({
          ...prev,
          tempQuestions: { 
            ...prev.tempQuestions, 
            [q.id]: JSON.stringify({ text: q.question_text, poolId: q.question_pool_id })
          }
        }));
      });
      fetchQuestionsWithAnswers();
      setShowQuestionPool(false);
      setSelectedPoolIds(new Set());
    } catch (error) {
      console.error('Error adding questions from pool:', error);
    } finally {
      setAdding(false);
    }
  };

  // Pool mode functions
  const loadPoolQuestions = useCallback(async () => {
    try {
      setPoolLoading(true);
      const data = await apiService.getQuestionPool();
      const poolQuestionsConverted: Question[] = data.map((q: { id: number; question_text: string; category: string | null }) => ({
        id: q.id.toString(),
        question_text: q.question_text,
        created_at: new Date().toISOString(),
        updated_at: null,
        question_pool_id: q.id,
        category: q.category,
        answers: []
      }));
      setPoolQuestions(poolQuestionsConverted);
      setFilteredPoolQuestions(poolQuestionsConverted);
    } catch (error) {
      console.error('Error loading question pool:', error);
    } finally {
      setPoolLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiService.getQuestionPoolCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    if (showQuestionPool) {
      loadPoolQuestions();
      loadCategories();
    }
  }, [showQuestionPool, loadPoolQuestions, loadCategories]);

  useEffect(() => {
    let filtered = poolQuestions;

    if (selectedCategory) {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => q.question_text.toLowerCase().includes(term));
    }

    setFilteredPoolQuestions(filtered);
  }, [poolQuestions, selectedCategory, searchTerm]);

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
        removedFriends: new Set<number>(),
        tempQuestions: {},
        deletedQuestions: new Set<string>(),
        questionOrders: undefined,
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
        removedFriends: new Set<number>(),
        tempQuestions: { ...state?.tempQuestions || {} },
        deletedQuestions: new Set<string>(),
        questionOrders: undefined,
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
          <TabsTrigger value="pages-assignments" variant="bootstrap">Pages & Assignments</TabsTrigger>
          <TabsTrigger value="friends" variant="bootstrap">Friends</TabsTrigger>
          <TabsTrigger value="questions-answers" variant="bootstrap">Questions & Answers</TabsTrigger>
          <TabsTrigger value="book-settings" variant="bootstrap">Book Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pages-assignments" className="space-y-4">
          <PagesAssignmentsTab
            assignedUser={assignedUser}
            currentPage={currentPage}
            onRemoveAssignment={handleRemoveAssignment}
            collaborators={allBookCollaborators}
            renderBookFriend={renderBookFriend}
            currentPageType={currentPageMeta?.pageType}
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
          {showAnswerList && selectedQuestionForAnswers ? (
            <AnswerList
              questionId={selectedQuestionForAnswers.id}
              questionText={selectedQuestionForAnswers.text}
              answers={questions.find(q => q.id === selectedQuestionForAnswers.id)?.answers || []}
              onBack={() => {
                setShowAnswerList(false);
                setSelectedQuestionForAnswers(null);
              }}
              emptyMessage="No one has answered this question yet."
            />
          ) : (
            <div className="flex-1 overflow-auto space-y-3 p-1 pb-6">
              {/* <Card> */}
                {/* <CardContent className="p-4"> */}
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
                    <Button variant="outline" onClick={() => setShowQuestionPool(true)}>
                      <Library className="h-4 w-4 mr-2" />
                      Browse Question Pool
                    </Button>
                  </form>
                {/* </CardContent> */}
              {/* </Card> */}
              {questionsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading questions...</p>
                  </div>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircleQuestionMark className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
                  <p className="text-muted-foreground">
                    Add your first question above to get started.
                  </p>
                </div>
              ) : (
                <CompactList
                  items={questions.sort((a, b) => {
                    const orderA = a.display_order ?? Infinity;
                    const orderB = b.display_order ?? Infinity;
                    return orderA - orderB;
                  })}
                  keyExtractor={(question) => question.id}
                  itemsPerPage={10}
                  renderItem={(question) => {
                    const isEditingThis = editingId === question.id;
                    const answerCount = question.answers?.length || 0;
                    
                    return (
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          {isEditingThis ? (
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleEditQuestion(question.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-medium text-foreground flex-1 min-w-0">
                                {question.question_text}
                              </h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedQuestionForAnswers({ id: question.id, text: question.question_text });
                                      setShowAnswerList(true);
                                    }}
                                    disabled={answerCount === 0}
                                    className="h-7 text-xs"
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    <span>
                                      {answerCount > 0 
                                        ? `${answerCount} answer${answerCount > 1 ? 's' : ''}`
                                        : 'No answers'}
                                    </span>
                                  </Button>
                                {!question.question_pool_id && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEdit(question)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowDeleteConfirm(question.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }}
                />
              )}
            </div>
          )}
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
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This will also delete all answers to this question and reset any textboxes containing this question. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>
              Delete Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Pool Modal */}
      {showQuestionPool && typeof bookId === 'number' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-hidden w-full mx-4">
            <QuestionList
              mode="pool"
              questions={filteredPoolQuestions}
              loading={poolLoading}
              multiSelect={true}
              selectedIds={selectedPoolIds}
              onSelectionChange={setSelectedPoolIds}
              showCategory={true}
              compact={true}
              onAddSelected={handleQuestionsFromPool}
              adding={adding}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={categories}
              onNavigate={() => setShowQuestionPool(false)}
              emptyMessage="No questions found"
            />
          </div>
        </div>
      )}
    </div>
  );
}