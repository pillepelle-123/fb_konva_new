import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Input } from '../../ui/primitives/input';
import { DialogDescription, DialogHeader, DialogTitle, Dialog, DialogContent, DialogFooter } from '../../ui/overlays/dialog';
import { useEditor } from '../../../context/editor-context';
import { Plus, Calendar, MessageCircleQuestionMark, Library, Settings } from 'lucide-react';
import { apiService } from '../../../services/api';
import QuestionPoolModal from '../questions/question-pool-modal';

interface Question {
  id: string; // UUID
  question_text: string;
  created_at: string;
  updated_at: string | null;
  question_pool_id?: number | null;
  answered_by_user?: boolean;
  isNew?: boolean; // Flag for newly added questions not yet saved to DB
}

interface QuestionsManagerDialogProps {
  bookId: number | string;
  bookName: string;
  onQuestionSelect?: (questionId: string, questionText: string) => void;
  token: string;
  onClose: () => void;
}

export default function QuestionsManagerDialog({ 
  bookId, 
  bookName, 
  onQuestionSelect, 
  token,
  onClose
}: QuestionsManagerDialogProps) {
  const { state, dispatch, validateQuestionSelection } = useEditor();
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Set<string>>(new Set());
  const [newQuestion, setNewQuestion] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showQuestionPool, setShowQuestionPool] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
        setUserRole('owner');
        return;
      }
      
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        } else {
          // If unauthorized, assume owner role for now
          setUserRole('owner');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('owner');
      }
    };
    
    fetchUserRole();
  }, [bookId, token]);
  
  useEffect(() => {
    if (userRole === 'author') {
      onClose();
    }
  }, [userRole, onClose]);
  
  if (userRole === 'author') {
    return null;
  }

  // Serialize tempQuestions to detect changes
  const tempQuestionsString = JSON.stringify(state.tempQuestions || {});
  
  useEffect(() => {
    fetchQuestions();
    fetchUserAnswers();
  }, [bookId, tempQuestionsString]);

  useEffect(() => {
    // Re-render when page assignments change
  }, [state.pageAssignments, state.currentBook]);

  const fetchQuestions = async () => {
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    
    try {
      const data = await apiService.getQuestions(bookId as number);
      
      // Add questions from React state that aren't in database yet
      const tempQuestions = Object.entries(state.tempQuestions || {}).map(([id, questionData]: [string, unknown]) => {
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
    
    // Create new question with UUID
    const newQuestionObj: Question = {
      id: uuidv4(),
      question_text: newQuestion,
      created_at: new Date().toISOString(),
      updated_at: null,
      isNew: true
    };
    
    setQuestions(prev => [newQuestionObj, ...prev]);
    setNewQuestion('');
  };

  const handleManageQuestions = () => {
    // Close all open QuillEditor modals by multiple methods
    // Method 1: Find modals by backdrop-filter style
    const quillModalsByStyle = document.querySelectorAll('div[style*="backdrop-filter:blur(2px)"]');
    quillModalsByStyle.forEach((modal) => {
      if (modal.parentNode === document.body) {
        document.body.removeChild(modal);
      }
    });
    
    // Method 2: Find modals by z-index:10000
    const quillModalsByZIndex = document.querySelectorAll('div[style*="z-index:10000"]');
    quillModalsByZIndex.forEach((modal) => {
      if (modal.parentNode === document.body && modal.querySelector('h2')) {
        const header = modal.querySelector('h2');
        if (header && (header.textContent === 'Frage Antwort' || header.textContent === 'Free Text')) {
          document.body.removeChild(modal);
        }
      }
    });
    
    // Method 3: Dispatch event to close QuillEditor modals
    window.dispatchEvent(new CustomEvent('closeQuillEditor'));
    
    // Close the questions dialog
    onClose();
    // Dispatch event to open book manager modal with questions tab
    window.dispatchEvent(new CustomEvent('openBookManager', {
      detail: { tab: 'questions-answers' }
    }));
  };

  const handleQuestionFromPool = (poolQuestion: any) => {
    // Create new question from pool
    const questionId = uuidv4();
    const newQuestionObj: Question = {
      id: questionId,
      question_text: poolQuestion.question_text,
      created_at: new Date().toISOString(),
      updated_at: null,
      question_pool_id: poolQuestion.id,
      isNew: true
    };
    
    // Add to questions list
    setQuestions(prev => [newQuestionObj, ...prev]);
    
    // Add to temp questions in state with pool id
    dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: questionId, text: poolQuestion.question_text, questionPoolId: poolQuestion.id } });
    
    // Select the question immediately
    onQuestionSelect?.(questionId, poolQuestion.question_text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isQuestionAvailable = (questionId: string): boolean => {
    if (!state.currentBook) return false;
    
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
      .filter(([_, user]) => user?.id === assignedUser.id)
      .map(([pageNum, _]) => parseInt(pageNum));
    
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
    const currentPageNumber = state.activePageIndex + 1;
    const assignedUser = state.pageAssignments[currentPageNumber];
    
    if (!isQuestionAvailable(questionId)) {
      if (!assignedUser) {
        return 'Already on this page';
      }
      return `Already used by ${assignedUser.name}`;
    }
    return null;
  };
  
  const hasCurrentQuestion = (): boolean => {
    if (!state.currentBook) return false;
    
    const currentPage = state.currentBook.pages[state.activePageIndex];
    return currentPage?.elements.some(el => 
      (el.textType === 'question' || el.textType === 'qna') && el.questionId
    ) || false;
  };

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

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <span>Select Question - {bookName}</span>
        </DialogTitle>
        <DialogDescription>
          Choose a question from the list for book "{bookName}"
        </DialogDescription>
      </DialogHeader>

      <div className="flex justify-end gap-2 mb-4">
        {hasCurrentQuestion() && (
          <Button variant="outline" onClick={() => setShowResetConfirm(true)}>
            Reset Question
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col space-y-4">
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
                />
                <Button type="submit" className="space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleManageQuestions}
                  className="space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Manage Questions</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowQuestionPool(true)}
                  className="space-x-2"
                >
                  <Library className="h-4 w-4" />
                  <span>Browse Pool</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm flex-1 overflow-hidden">
          <CardContent className="p-0">
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircleQuestionMark className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
                <p className="text-muted-foreground">
                  Add your first question above to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {questions
                  .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()).map(question => {
                    const isAvailable = isQuestionAvailable(question.id);
                    const unavailableReason = getUnavailableReason(question.id);
                    
                    if (!isAvailable) {
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
                        <div className="flex items-start justify-between">
                          <div 
                            className="space-y-1 flex-1 cursor-pointer hover:bg-muted/30 p-2 rounded"
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button')) return;
                              
                              if (!isAvailable) return;
                              
                              // Validate question selection
                              const currentPageNumber = state.activePageIndex + 1;
                              const validation = validateQuestionSelection(question.id, currentPageNumber);
                              
                              if (!validation.valid) {
                                // Show validation error
                                alert((validation as { valid: boolean; reason?: string }).reason || 'This question cannot be selected.');
                                return;
                              }
                              
                              onQuestionSelect?.(question.id, question.question_text);
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-foreground leading-relaxed flex-1">
                                {question.question_text}
                                {question.isNew && (
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    New
                                  </span>
                                )}
                                {question.question_pool_id && (
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                    From Pool
                                  </span>
                                )}
                              </p>
                              {userAnswers.has(question.id) && (
                                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-ring/10 text-ring border border-ring/20">
                                  Answered by you
                                </span>
                              )}
                            </div>
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Question</DialogTitle>
            <DialogDescription>
              Removing the question will also clear any answer text from the answer box. However, your saved answers will remain in the system and will reappear if you select this question again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Trigger question reset with clearAnswer flag
              window.dispatchEvent(new CustomEvent('resetQuestion', {
                detail: { clearAnswer: true }
              }));
              onQuestionSelect?.('', '');
              setShowResetConfirm(false);
            }}>
              Reset Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuestionPool} onOpenChange={setShowQuestionPool}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden z-[10003]">
          {typeof bookId === 'number' && (
            <QuestionPoolModal
              bookId={bookId}
              onClose={() => setShowQuestionPool(false)}
              onQuestionsAdded={(questions) => {
                if (questions.length > 0) {
                  handleQuestionFromPool(questions[0]);
                }
                setShowQuestionPool(false);
              }}
              singleSelect
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}