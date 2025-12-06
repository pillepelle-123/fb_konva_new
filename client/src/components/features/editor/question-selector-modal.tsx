import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../../ui/overlays/modal';
import { QuestionList, type Question } from '../questions/question-list';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Card, CardContent } from '../../ui/composites/card';
import { ChevronLeft, Plus, Library, Settings } from 'lucide-react';
import { useEditor } from '../../../context/editor-context';
import { useAuth } from '../../../context/auth-context';
import { apiService } from '../../../services/api';
import { v4 as uuidv4 } from 'uuid';

interface QuestionPoolItem {
  id: number;
  question_text: string;
  category: string | null;
  language: string;
}

interface QuestionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionSelect: (questionId: string, questionText: string, questionPosition?: number) => void;
  elementId?: string;
}

export function QuestionSelectorModal({
  isOpen,
  onClose,
  onQuestionSelect,
  elementId
}: QuestionSelectorModalProps) {
  const { state, dispatch } = useEditor();
  const { token } = useAuth();
  
  // Find the question ID assigned to the element
  const highlightedQuestionId = useMemo(() => {
    if (!elementId || !state.currentBook) return undefined;
    const currentPage = state.currentBook.pages[state.activePageIndex];
    if (!currentPage) return undefined;
    const element = currentPage.elements.find(el => el.id === elementId);
    return element?.questionId;
  }, [elementId, state.currentBook, state.activePageIndex]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [userAnswers, setUserAnswers] = useState<Set<string>>(new Set());
  
  // Pool mode state
  const [poolQuestions, setPoolQuestions] = useState<Question[]>([]);
  const [filteredPoolQuestions, setFilteredPoolQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string | number>>(new Set());
  const [poolLoading, setPoolLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const bookId = state.currentBook?.id;
  const bookName = state.currentBook?.name || '';

  const fetchQuestions = useCallback(async () => {
    if (!bookId || typeof bookId !== 'number') {
      setQuestions([]);
      setQuestionsLoading(false);
      return;
    }

    try {
      setQuestionsLoading(true);
      const data = await apiService.getQuestions(bookId);
      
      // Add questions from React state that aren't in database yet
      const tempQuestions = Object.entries(state.tempQuestions || {}).map(([id, questionData]: [string, unknown]) => {
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
          display_order: null, // Temp questions don't have display_order yet
          created_at: new Date().toISOString(),
          updated_at: null,
          answers: []
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
      setQuestionsLoading(false);
    }
  }, [bookId, state.tempQuestions]);

  useEffect(() => {
    if (isOpen && bookId && typeof bookId === 'number') {
      fetchQuestions();
      fetchUserAnswers();
    }
  }, [isOpen, bookId, fetchQuestions]);

  const fetchUserAnswers = async () => {
    if (!bookId || typeof bookId !== 'number') {
      setUserAnswers(new Set());
      return;
    }
    
    try {
      const answers = await apiService.getUserAnswers(bookId);
      const answeredQuestionIds = new Set<string>(answers.map((answer: { question_id: string }) => answer.question_id));
      setUserAnswers(answeredQuestionIds);
    } catch (error) {
      console.error('Error fetching user answers:', error);
    }
  };

  // Pool mode functions
  const loadPoolQuestions = useCallback(async () => {
    try {
      setPoolLoading(true);
      const data = await apiService.getQuestionPool();
      const poolQuestionsConverted: Question[] = data.map((q: QuestionPoolItem) => ({
        id: q.id.toString(),
        question_text: q.question_text,
        created_at: new Date().toISOString(),
        updated_at: null,
        question_pool_id: q.id,
        category: q.category,
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
    if (isOpen) {
      loadPoolQuestions();
      loadCategories();
    }
  }, [isOpen, loadPoolQuestions, loadCategories]);

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

  const handleAddQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    
    const newQuestionObj: Question = {
      id: uuidv4(),
      question_text: newQuestion,
      created_at: new Date().toISOString(),
      updated_at: null,
      answers: []
    };
    
    setQuestions(prev => [newQuestionObj, ...prev]);
    setNewQuestion('');
    
    // Add to temp questions in state
    dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: newQuestionObj.id, text: newQuestionObj.question_text } });
  };

  const handleStartEdit = (question: Question) => {
    setEditingId(question.id);
    setEditText(question.question_text);
  };

  const handleEditQuestion = async (questionId: string) => {
    if (!editText.trim()) return;
    
    try {
      await apiService.updateQuestion(questionId, editText);
      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { ...q, question_text: editText, updated_at: new Date().toISOString() }
          : q
      ));
      
      // Update temp question in state
      dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text: editText } });
      
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating question:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteQuestionRequest = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question? This will also delete all answers to this question.')) {
      try {
        await apiService.deleteQuestion(questionId);
        setQuestions(prev => prev.filter(q => q.id !== questionId));
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  const handleQuestionFromPool = async () => {
    if (selectedPoolIds.size === 0) return;
    
    setAdding(true);
    try {
      const selectedId = Array.from(selectedPoolIds)[0];
      const poolQuestion = poolQuestions.find(q => q.id === selectedId.toString() || q.id === selectedId);
      if (!poolQuestion) return;
      
      const questionId = uuidv4();
      const newQuestionObj: Question = {
        id: questionId,
        question_text: poolQuestion.question_text,
        created_at: new Date().toISOString(),
        updated_at: null,
        question_pool_id: typeof selectedId === 'number' ? selectedId : parseInt(selectedId.toString()),
        answers: []
      };
      
      setQuestions(prev => [newQuestionObj, ...prev]);
      
      // Add to temp questions in state with pool id
      dispatch({ 
        type: 'UPDATE_TEMP_QUESTION', 
        payload: { 
          questionId: questionId, 
          text: poolQuestion.question_text, 
          questionPoolId: typeof selectedId === 'number' ? selectedId : parseInt(selectedId.toString())
        } 
      });
      
      // Select the question immediately
      onQuestionSelect(questionId, poolQuestion.question_text);
      onClose();
    } catch (error) {
      console.error('Error adding question from pool:', error);
    } finally {
      setAdding(false);
    }
  };

  const getTitle = (view: string) => {
    switch(view) {
      case 'main': return `Select Question - ${bookName}`;
      case 'manage': return 'Manage Questions';
      case 'pool': return 'Browse Question Pool';
      default: return `Select Question - ${bookName}`;
    }
  };

  const handleQuestionSelect = (questionId: string, questionText: string, questionPosition?: number) => {
    // If position is not provided, try to get it from the questions array
    let position = questionPosition;
    if (position === undefined) {
      const question = questions.find(q => q.id === questionId);
      position = question?.display_order ?? undefined;
    }
    
    onQuestionSelect(questionId, questionText, position);
    onClose();
  };
  
  const isQuestionAvailable = (questionId: string): boolean => {
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
  
  const validateQuestionSelection = (questionId: string) => {
    const available = isQuestionAvailable(questionId);
    return {
      valid: available,
      reason: available ? undefined : getUnavailableReason(questionId) || 'This question cannot be selected.'
    };
  };

  const handleResetQuestion = () => {
    onQuestionSelect('', '');
    onClose();
  };

  if (!bookId || typeof bookId !== 'number') {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle}
      initialView="main"
      size="lg"
      actions={(view, navigate) => {
        // Show back button for manage and pool views
        if (view === 'manage' || view === 'pool') {
          return (
            <Button variant="outline" onClick={() => navigate('main')}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          );
        }
        return null;
      }}
    >
      {(view, navigate) => {
        switch(view) {
          case 'main':
            return (
              <>
                <div className="p-1 pb-6">
                {/* <Card className="border-0 shadow-none flex-shrink-0 mb-4"> */}
                  {/* <CardContent className="p-4"> */}
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
                          onClick={() => navigate('manage')}
                          className="space-x-2"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Manage Questions</span>
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => navigate('pool')}
                          className="space-x-2"
                        >
                          <Library className="h-4 w-4" />
                          <span>Browse Pool</span>
                        </Button>
                      </div>
                    </form>
                  {/* </CardContent> */}
                {/* </Card> */}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <QuestionList
                    mode="select"
                    questions={questions.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())}
                    loading={questionsLoading}
                    onQuestionSelect={handleQuestionSelect}
                    showDates={true}
                    disabledQuestionIds={new Set(questions.filter(q => !isQuestionAvailable(q.id)).map(q => q.id))}
                    validateQuestionSelection={validateQuestionSelection}
                    getUserAnswer={(questionId) => {
                      if (userAnswers.has(questionId)) {
                        return { answer_text: 'Answered' };
                      }
                      return null;
                    }}
                    highlightedQuestionId={highlightedQuestionId}
                  />
                </div>
              </>
            );
          case 'manage':
            return (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
                <Card className="flex-shrink-0">
                  <CardContent className="p-6">
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
                      <Button variant="outline" onClick={() => navigate('pool')}>
                        <Library className="h-4 w-4 mr-2" />
                        Browse Question Pool
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                <QuestionList
                  mode="edit"
                  questions={questions}
                  loading={questionsLoading}
                  onQuestionEdit={handleEditQuestion}
                  onQuestionDelete={handleDeleteQuestionRequest}
                  editingQuestionId={editingId}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onSaveEdit={handleEditQuestion}
                  onCancelEdit={handleCancelEdit}
                  showEditDelete={true}
                  showAnswers={true}
                  showDates={true}
                />
              </div>
            );
          case 'pool':
            return (
              <QuestionList
                mode="pool"
                questions={filteredPoolQuestions}
                loading={poolLoading}
                multiSelect={false}
                selectedIds={selectedPoolIds}
                onSelectionChange={setSelectedPoolIds}
                showCategory={true}
                compact={true}
                onAddSelected={handleQuestionFromPool}
                adding={adding}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
                onNavigate={navigate}
                emptyMessage="No questions found"
              />
            );
          default:
            return null;
        }
      }}
    </Modal>
  );
}

