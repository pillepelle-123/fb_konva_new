import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Input } from '../../ui/primitives/input';
import { SortableList } from '../../ui/composites/sortable-list';
import { useEditor } from '../../../context/editor-context';
import { Plus, Calendar, MessageCircleQuestionMark, Library, Settings, Edit, Trash2 } from 'lucide-react';
import { apiService } from '../../../services/api';

interface Question {
  id: string; // UUID
  question_text: string;
  created_at: string;
  updated_at: string | null;
  question_pool_id?: number | null;
  display_order?: number | null;
  answered_by_user?: boolean;
  isNew?: boolean; // Flag for newly added questions not yet saved to DB
}

interface QuestionChoice {
  id: string;
  text: string;
}

interface QuestionsManagerContentProps {
  bookId: number | string;
  bookName: string;
  onQuestionSelect?: (questionId: string, questionText: string, questionPosition?: number) => void;
  token: string;
  onNavigate: (view: string) => void;
  onResetQuestion?: () => void;
  // Wizard mode props
  mode?: 'wizard' | 'editor';
  maxQuestions?: number;
  orderedQuestions?: Array<{
    id: string;
    text: string;
    type: 'curated' | 'custom';
    questionPoolId?: string | null;
    curatedQuestionId?: string;
    position?: number;
  }>;
  curatedQuestions?: QuestionChoice[];
  selectedDefaults?: string[];
  onQuestionChange?: (data: {
    orderedQuestions: Array<{
      id: string;
      text: string;
      type: 'curated' | 'custom';
      questionPoolId?: string | null;
      curatedQuestionId?: string;
      position?: number;
    }>;
    selectedDefaults?: string[];
    custom?: Array<{ id: string; text: string }>;
  }) => void;
  onQuestionEdit?: (questionId: string, newText: string) => void;
  onQuestionDelete?: (questionId: string) => void;
  openCustomQuestionModal?: () => void;
}

export function QuestionsManagerContent({ 
  bookId, 
  bookName: _bookName, // eslint-disable-line @typescript-eslint/no-unused-vars
  onQuestionSelect, 
  token: _token, // eslint-disable-line @typescript-eslint/no-unused-vars
  onNavigate,
  onResetQuestion,
  mode = 'editor',
  maxQuestions,
  orderedQuestions,
  curatedQuestions: _curatedQuestions, // eslint-disable-line @typescript-eslint/no-unused-vars
  selectedDefaults,
  onQuestionChange,
  onQuestionEdit,
  onQuestionDelete,
  openCustomQuestionModal: _openCustomQuestionModal // eslint-disable-line @typescript-eslint/no-unused-vars
}: QuestionsManagerContentProps) {
  // Always call useEditor hook, but only use it in editor mode
  const editorContext = useEditor();
  const state = mode === 'editor' ? editorContext.state : null;
  const dispatch = mode === 'editor' ? editorContext.dispatch : null; // eslint-disable-line @typescript-eslint/no-unused-vars
  const validateQuestionSelection = mode === 'editor' ? editorContext.validateQuestionSelection : null;
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(mode === 'editor');
  const [userAnswers, setUserAnswers] = useState<Set<string>>(new Set());
  const [newQuestion, setNewQuestion] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Serialize tempQuestions to detect changes (only in editor mode)
  const tempQuestionsString = mode === 'editor' ? JSON.stringify(state?.tempQuestions || {}) : '';
  
  useEffect(() => {
    if (mode === 'wizard') {
      // In wizard mode, convert orderedQuestions to Question format
      if (orderedQuestions) {
        const wizardQuestions: Question[] = orderedQuestions.map(q => ({
          id: q.id,
          question_text: q.text,
          created_at: new Date().toISOString(),
          updated_at: null,
          question_pool_id: (q.questionPoolId ? parseInt(q.questionPoolId) : null) as number | null | undefined,
          isNew: true
        }));
        setQuestions(wizardQuestions);
        setLoading(false);
      }
    } else {
      fetchQuestions();
      fetchUserAnswers();
    }
  }, [bookId, tempQuestionsString, mode, orderedQuestions]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestions = async () => {
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    
    try {
      const data = await apiService.getQuestions(bookId as number);
      
      // Add questions from React state that aren't in database yet
      const tempQuestions = Object.entries(state?.tempQuestions || {}).map(([id, questionData]: [string, unknown]) => {
        // Parse question data (might be JSON with poolId or plain text)
        let questionText = questionData as string;
        let questionPoolId = null;
        try {
          const parsed = JSON.parse(questionData as string);
          if (parsed.text) {
            questionText = parsed.text;
            questionPoolId = parsed.poolId || null;
          }
        } catch {
          // Not JSON, use as plain text
        }
        
        return {
          id,
          question_text: questionText,
          question_pool_id: questionPoolId,
          created_at: new Date().toISOString(),
          updated_at: null,
          isNew: true
        };
      });
      
      // Filter out temp questions that are already in database
      const newTempQuestions = tempQuestions.filter(tempQ => 
        !data.some((dbQ: { id: string }) => dbQ.id === tempQ.id)
      );
      
      setQuestions([...newTempQuestions, ...data]);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnswers = async () => {
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      setUserAnswers(new Set());
      return;
    }
    
    try {
      const answers = await apiService.getUserAnswers(bookId as number);
      const answeredQuestionIds = new Set<string>(answers.map((answer: { question_id: string }) => answer.question_id));
      setUserAnswers(answeredQuestionIds);
    } catch (error) {
      console.error('Error fetching user answers:', error);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    
    if (mode === 'wizard') {
      // In wizard mode, check maxQuestions limit
      const currentCount = orderedQuestions?.length || 0;
      if (maxQuestions !== undefined && currentCount >= maxQuestions) {
        return; // Don't add if limit reached
      }
      
      // Add to wizard state via callback
      const newQuestionObj = {
        id: uuidv4(),
        text: newQuestion,
        type: 'custom' as const,
        questionPoolId: null,
        position: currentCount, // Set position based on current count
      };
      
      const updatedOrderedQuestions = [...(orderedQuestions || []), newQuestionObj];
      const updatedCustom = [...(onQuestionChange ? [] : []), { id: newQuestionObj.id, text: newQuestion }];
      
      onQuestionChange?.({
        orderedQuestions: updatedOrderedQuestions,
        custom: updatedCustom
      });
      
      setNewQuestion('');
    } else {
      // Editor mode: Create new question with UUID
      const newQuestionObj: Question = {
        id: uuidv4(),
        question_text: newQuestion,
        created_at: new Date().toISOString(),
        updated_at: null,
        isNew: true
      };
      
      setQuestions(prev => [newQuestionObj, ...prev]);
      setNewQuestion('');
    }
  };
  
  const handleEditQuestion = (questionId: string) => {
    if (mode === 'wizard') {
      const question = orderedQuestions?.find(q => q.id === questionId);
      if (question) {
        setEditingQuestionId(questionId);
        setEditText(question.text);
      }
    } else {
      const question = questions.find(q => q.id === questionId);
      if (question) {
        setEditingQuestionId(questionId);
        setEditText(question.question_text);
      }
    }
  };
  
  const handleSaveEdit = (questionId: string) => {
    if (!editText.trim()) return;
    
    if (mode === 'wizard') {
      onQuestionEdit?.(questionId, editText);
      // Update local state
      if (orderedQuestions && onQuestionChange) {
        const updated = orderedQuestions.map(q => 
          q.id === questionId ? { ...q, text: editText } : q
        );
        onQuestionChange({ orderedQuestions: updated });
      }
    } else {
      // Editor mode: Update in local state
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, question_text: editText, updated_at: new Date().toISOString() } : q
      ));
    }
    
    setEditingQuestionId(null);
    setEditText('');
  };
  
  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditText('');
  };
  
  const handleDeleteQuestion = (questionId: string) => {
    if (mode === 'wizard') {
      onQuestionDelete?.(questionId);
      // Update wizard state
      if (orderedQuestions && onQuestionChange) {
        const question = orderedQuestions.find(q => q.id === questionId);
        if (question) {
          const updatedOrderedQuestions = orderedQuestions.filter(q => q.id !== questionId);
          const updatedSelectedDefaults = question.type === 'curated' && question.curatedQuestionId
            ? (selectedDefaults || []).filter((id: string) => id !== question.curatedQuestionId)
            : undefined;
          
          const changeData: {
            orderedQuestions: typeof updatedOrderedQuestions;
            selectedDefaults?: string[];
            custom?: Array<{ id: string; text: string }>;
          } = {
            orderedQuestions: updatedOrderedQuestions
          };
          
          if (updatedSelectedDefaults) {
            changeData.selectedDefaults = updatedSelectedDefaults;
          }
          
          onQuestionChange(changeData);
        }
      }
    } else {
      // Editor mode: Remove from local state
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    }
  };
  
  // Removed handleManageQuestions and handleQuestionFromPool as they're not used in wizard mode

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isQuestionAvailable = (questionId: string): boolean => {
    if (mode === 'wizard') {
      // In wizard mode, all questions are available (no validation needed)
      return true;
    }
    
    if (!state?.currentBook) return false;
    
    const currentPageNumber = state.activePageIndex + 1;
    const assignedUser = state.pageAssignments[currentPageNumber];
    
    // For pages with no assignment, only check if question already exists on current page
    if (!assignedUser) {
      const currentPage = state.currentBook.pages.find(p => p.pageNumber === currentPageNumber);
      if (currentPage) {
        return !currentPage.elements.some(el => 
          (el.textType === 'question' || el.textType === 'qna' || el.textType === 'qna_inline') && el.questionId === questionId
        );
      }
      return true;
    }
    
    // For pages with assignment, check across all user's pages
    const userPages = Object.entries(state.pageAssignments)
      .filter(([, user]) => user?.id === assignedUser.id)
      .map(([pageNum]) => parseInt(pageNum));
    
    for (const page of state.currentBook.pages) {
      if (userPages.includes(page.pageNumber)) {
        const hasQuestion = page.elements.some(el => 
          (el.textType === 'question' || el.textType === 'qna' || el.textType === 'qna_inline') && el.questionId === questionId
        );
        if (hasQuestion) {
          return false;
        }
      }
    }
    return true;
  };
  
  const getUnavailableReason = (questionId: string): string | null => {
    if (mode === 'wizard') return null;
    
    const currentPageNumber = state?.activePageIndex ? state.activePageIndex + 1 : 0;
    const assignedUser = state?.pageAssignments[currentPageNumber];
    
    if (!isQuestionAvailable(questionId)) {
      if (!assignedUser) {
        return 'Already on this page';
      }
      return `Already used by ${assignedUser.name}`;
    }
    return null;
  };
  
  const hasCurrentQuestion = (): boolean => {
    if (mode === 'wizard') return false;
    
    if (!state?.currentBook) return false;
    
    const currentPage = state.currentBook.pages[state.activePageIndex];
    return currentPage?.elements.some(el => 
      (el.textType === 'question' || el.textType === 'qna') && el.questionId
    ) || false;
  };
  
  // Get questions to display
  const displayQuestions = mode === 'wizard' 
    ? (orderedQuestions || []).map(q => ({
        id: q.id,
        question_text: q.text,
        created_at: new Date().toISOString(),
        updated_at: null,
        question_pool_id: q.questionPoolId || null,
        display_order: q.position ?? null, // Use position from orderedQuestions
        isNew: true,
        type: q.type,
        curatedQuestionId: q.curatedQuestionId
      }))
    : questions;
  
  const addedQuestionsCount = mode === 'wizard' ? (orderedQuestions?.length || 0) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  const handleDebugOrder = () => {
    if (mode === 'wizard' && orderedQuestions) {
      console.log('[QuestionsManagerContent] Current order from SortableList:', {
        orderedQuestions: orderedQuestions.map((q, index) => ({
          index,
          id: q.id,
          text: q.text?.substring(0, 50),
          position: q.position,
          type: q.type,
          questionPoolId: q.questionPoolId
        })),
        totalCount: orderedQuestions.length,
        positions: orderedQuestions.map(q => q.position),
        sortedByPosition: [...orderedQuestions].sort((a, b) => {
          const posA = a.position ?? Infinity;
          const posB = b.position ?? Infinity;
          return posA - posB;
        }).map((q, index) => ({
          index,
          id: q.id,
          text: q.text?.substring(0, 50),
          position: q.position
        })),
        // Show what would be sent to createQuestion API
        whatWillBeSentToAPI: orderedQuestions.map((q, i) => ({
          arrayIndex: i,
          questionId: q.id,
          questionText: q.text,
          questionPoolId: q.questionPoolId || null,
          display_order: q.position !== undefined ? q.position : i,
          position: q.position
        }))
      });
    } else {
      console.log('[QuestionsManagerContent] Not in wizard mode or no orderedQuestions');
    }
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        {mode === 'wizard' && (
          <Button variant="outline" size="sm" onClick={handleDebugOrder}>
            Debug Order
          </Button>
        )}
        {mode === 'editor' && hasCurrentQuestion() && (
          <Button variant="outline" onClick={() => setShowResetConfirm(true)}>
            Reset Question
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col space-y-4">
        {/* Question Counter for Wizard Mode */}
        {mode === 'wizard' && maxQuestions !== undefined && (
          <div className="text-sm text-muted-foreground mb-2">
            Added questions: {addedQuestionsCount} / {maxQuestions}
          </div>
        )}

        {/* Curated Questions removed in wizard mode */}

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <form onSubmit={handleAddQuestion} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter new question..."
                  className="flex-1"
                  disabled={mode === 'wizard' && maxQuestions !== undefined && addedQuestionsCount >= maxQuestions}
                />
                <Button 
                  type="submit" 
                  className="space-x-2"
                  disabled={mode === 'wizard' && maxQuestions !== undefined && addedQuestionsCount >= maxQuestions}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
                {mode === 'wizard' && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => onNavigate('pool')}
                    className="space-x-2"
                    disabled={maxQuestions !== undefined && addedQuestionsCount >= maxQuestions}
                  >
                    <Library className="h-4 w-4" />
                    <span>Browse Pool</span>
                  </Button>
                )}
                {mode === 'editor' && (
                  <>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => onNavigate('manage')}
                      className="space-x-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Manage Questions</span>
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => onNavigate('pool')}
                      className="space-x-2"
                    >
                      <Library className="h-4 w-4" />
                      <span>Browse Pool</span>
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm flex-1 overflow-hidden">
          <CardContent className="p-0">
            {displayQuestions.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircleQuestionMark className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
                <p className="text-muted-foreground">
                  Add your first question above to get started.
                </p>
              </div>
            ) : mode === 'wizard' ? (
              // Wizard mode: Use SortableList
              <div className="p-4">
                <p className="text-xs font-semibold mb-2">Selected questions</p>
                <SortableList
                  items={orderedQuestions || []}
                  onSortEnd={(newOrderedQuestions) => {
                    // Update position for each question based on new index
                    const questionsWithUpdatedPositions = newOrderedQuestions.map((q, index) => ({
                      ...q,
                      position: index
                    }));
                    
                    onQuestionChange?.({ orderedQuestions: questionsWithUpdatedPositions });
                  }}
                  renderItem={(question) => {
                    const isEditing = editingQuestionId === question.id;
                    return (
                      <div className="flex items-center justify-between w-full pr-2">
                        {isEditing ? (
                          <div className="flex-1 flex gap-2">
                            <Input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(question.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm flex-1">{question.text}</span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditQuestion(question.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
              </div>
            ) : (
              // Editor mode: Regular list
              <div className="divide-y max-h-96 overflow-y-auto">
                {displayQuestions
                  .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()).map(question => {
                    const isAvailable = isQuestionAvailable(question.id);
                    const unavailableReason = getUnavailableReason(question.id);
                    const isEditing = editingQuestionId === question.id;
                    const isEditorMode = mode === 'editor';
                    
                    if (!isAvailable && isEditorMode) {
                      return (
                        <div key={question.id} className="p-4 bg-muted/20">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1 opacity-50">
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-foreground leading-relaxed flex-1 line-through">
                                  {question.question_text}
                                </p>
                                {unavailableReason && (
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                                    {unavailableReason}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Created {formatDate(question.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={question.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          {isEditing ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(question.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="space-y-1 flex-1 cursor-pointer hover:bg-muted/30 p-2 rounded"
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest('button')) return;
                                
                                if (!isAvailable) return;
                                
                                // Validate question selection
                                if (validateQuestionSelection && state) {
                                  const currentPageNumber = state.activePageIndex + 1;
                                  const validation = validateQuestionSelection(question.id, currentPageNumber);
                                  
                                  if (!validation.valid) {
                                    // Show validation error
                                    alert((validation as { valid: boolean; reason?: string }).reason || 'This question cannot be selected.');
                                    return;
                                  }
                                }
                                
                                // Use display_order from question (works for both editor and wizard mode)
                                const questionPosition = 'display_order' in question 
                                  ? (question.display_order !== null && question.display_order !== undefined ? question.display_order : undefined)
                                  : undefined;
                                onQuestionSelect?.(question.id, question.question_text, questionPosition);
                              }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-foreground leading-relaxed flex-1">
                                  {question.question_text}
                                  {'isNew' in question && question.isNew && (
                                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                      New
                                    </span>
                                  )}
                                  {'question_pool_id' in question && question.question_pool_id && (
                                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                      From Pool
                                    </span>
                                  )}
                                </p>
                                {mode === 'editor' && 'id' in question && userAnswers.has(question.id) && (
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-ring/10 text-ring border border-ring/20">
                                    Answered by you
                                  </span>
                                )}
                              </div>
                              {mode === 'editor' && (
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>Created {formatDate(question.created_at)}</span>
                                  {question.updated_at && (
                                    <>
                                      <span>|</span>
                                      <span>Updated {formatDate(question.updated_at)}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Reset Question</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Removing the question will also clear any answer text from the answer box. However, your saved answers will remain in the system and will reappear if you select this question again later.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => {
                // Trigger question reset with clearAnswer flag
                window.dispatchEvent(new CustomEvent('resetQuestion', {
                  detail: { clearAnswer: true }
                }));
                onQuestionSelect?.('', '');
                onResetQuestion?.();
                setShowResetConfirm(false);
              }} className="flex-1">
                Reset Question
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

