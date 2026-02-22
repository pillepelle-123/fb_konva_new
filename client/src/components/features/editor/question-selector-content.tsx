import { useState, useEffect, useCallback, useMemo } from 'react';
import { QuestionList, type Question } from '../questions/question-list';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Card, CardContent } from '../../ui/composites/card';
import { Tooltip } from '../../ui/composites/tooltip';
import { ChevronLeft, Plus, Library, Settings, Trash2 } from 'lucide-react';
import { useEditor } from '../../../context/editor-context';
import { apiService } from '../../../services/api';
import {
  validateQuestionAssignment,
  type QuestionAssignmentContext,
} from '../../../services/question-assignment-rules';
import { v4 as uuidv4 } from 'uuid';

interface QuestionPoolItem {
  id: number;
  question_text: string;
  category: string | null;
  language: string;
}

export interface PendingQuestionSelection {
  questionId: string;
  questionText: string;
  questionPosition?: number;
}

export interface QuestionSelectorContentProps {
  elementId?: string;
  onQuestionSelect: (questionId: string, questionText: string, questionPosition?: number, elementId?: string) => void;
  onClose: () => void;
  /** When provided, parent will render these actions (for embedded use in tabs) */
  onActionsReady?: (actions: React.ReactNode) => void;
  /** When true, content is embedded in a tab and manages its own view state */
  embedded?: boolean;
  /** When embedded in tabs (z.B. Qna2-Modal): Parent verwaltet pendingSelection */
  pendingQuestionSelection?: PendingQuestionSelection | null;
  onPendingQuestionChange?: (selection: PendingQuestionSelection | null) => void;
  /** When true, keine eigenen Actions melden – Parent zeigt einheitliche Save/Discard */
  hideActions?: boolean;
  /** When provided (standalone Modal), use parent's view/navigate instead of internal state */
  view?: 'main' | 'manage' | 'pool';
  navigate?: (v: string) => void;
  /** Override für highlightedQuestionId (z.B. null bei pendingRemoval) */
  highlightedQuestionIdOverride?: string | null;
  /** Zusätzliche Aktionen pro Frage (z.B. Remove-Button bei "Assigned to textbox") */
  renderCustomActions?: (question: Question) => React.ReactNode;
}

export function QuestionSelectorContent({
  elementId,
  onQuestionSelect,
  onClose,
  onActionsReady,
  embedded = false,
  pendingQuestionSelection: externalPendingSelection,
  onPendingQuestionChange,
  hideActions = false,
  view: externalView,
  navigate: externalNavigate,
  highlightedQuestionIdOverride,
  renderCustomActions,
}: QuestionSelectorContentProps) {
  const { state, dispatch } = useEditor();

  const [internalView, setInternalView] = useState<'main' | 'manage' | 'pool'>('main');
  const view = externalView ?? internalView;
  const navigate = externalNavigate ?? ((v: string) => setInternalView(v as 'main' | 'manage' | 'pool'));

  const [internalPendingSelection, setInternalPendingSelection] = useState<PendingQuestionSelection | null>(null);
  const isControlled = onPendingQuestionChange !== undefined;
  const pendingSelection = isControlled ? (externalPendingSelection ?? null) : internalPendingSelection;
  const setPendingSelection = useCallback(
    (value: PendingQuestionSelection | null) => {
      if (isControlled) {
        onPendingQuestionChange?.(value);
      } else {
        setInternalPendingSelection(value);
      }
    },
    [isControlled, onPendingQuestionChange]
  );

  const highlightedQuestionIdFromElement = useMemo(() => {
    if (!elementId || !state.currentBook) return undefined;
    // Element auf allen Seiten suchen (kann auf Partner-Seite bei Spread sein)
    for (const page of state.currentBook.pages) {
      const element = page.elements?.find(el => el.id === elementId);
      if (element) return element.questionId;
    }
    return undefined;
  }, [elementId, state.currentBook]);

  const highlightedQuestionId = highlightedQuestionIdOverride !== undefined
    ? highlightedQuestionIdOverride ?? undefined
    : highlightedQuestionIdFromElement;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [userAnswers, setUserAnswers] = useState<Set<string>>(new Set());
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
          // ignore
        }
        return {
          id,
          question_text: questionText,
          question_pool_id: questionPoolId,
          display_order: null,
          created_at: new Date().toISOString(),
          updated_at: null,
          answers: [],
        };
      });
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

  const fetchUserAnswers = async () => {
    if (!bookId || typeof bookId !== 'number') {
      setUserAnswers(new Set());
      return;
    }
    try {
      const answers = await apiService.getUserAnswers(bookId);
      setUserAnswers(new Set(answers.map((a: { question_id: string }) => a.question_id)));
    } catch (error) {
      console.error('Error fetching user answers:', error);
    }
  };

  const loadPoolQuestions = useCallback(async () => {
    try {
      setPoolLoading(true);
      const data = await apiService.getQuestionPool();
      const converted: Question[] = data.map((q: QuestionPoolItem) => ({
        id: q.id.toString(),
        question_text: q.question_text,
        created_at: new Date().toISOString(),
        updated_at: null,
        question_pool_id: q.id,
        category: q.category,
      }));
      setPoolQuestions(converted);
      setFilteredPoolQuestions(converted);
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
    if (bookId && typeof bookId === 'number') {
      fetchQuestions();
      fetchUserAnswers();
    }
  }, [bookId, fetchQuestions]);

  useEffect(() => {
    loadPoolQuestions();
    loadCategories();
  }, [loadPoolQuestions, loadCategories]);

  useEffect(() => {
    let filtered = poolQuestions;
    if (selectedCategory) filtered = filtered.filter(q => q.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => q.question_text.toLowerCase().includes(term));
    }
    setFilteredPoolQuestions(filtered);
  }, [poolQuestions, selectedCategory, searchTerm]);

  useEffect(() => {
    setPendingSelection(null);
  }, [elementId]);

  const elementPage = useMemo(() => {
    if (!elementId || !state.currentBook) return state.currentBook?.pages[state.activePageIndex];
    return state.currentBook.pages.find(p => p.elements?.some(el => el.id === elementId))
      ?? state.currentBook.pages[state.activePageIndex];
  }, [elementId, state.currentBook, state.activePageIndex]);
  const elementPageNumber = elementPage?.pageNumber ?? state.activePageIndex + 1;

  const assignmentContext: QuestionAssignmentContext = useMemo(
    () => ({
      book: state.currentBook ?? null,
      pageAssignments: state.pageAssignments ?? {},
      elementId: elementId ?? '',
      elementPage: elementPage ?? null,
      elementPageNumber,
    }),
    [state.currentBook, state.pageAssignments, elementId, elementPage, elementPageNumber]
  );

  const isQuestionAvailable = useCallback(
    (questionId: string) => validateQuestionAssignment(assignmentContext, questionId).valid,
    [assignmentContext]
  );

  const validateQuestionSelection = useCallback(
    (questionId: string) => {
      const result = validateQuestionAssignment(assignmentContext, questionId);
      return {
        valid: result.valid,
        reason: result.valid ? undefined : (result.reason ?? 'This question cannot be selected.'),
      };
    },
    [assignmentContext]
  );

  const handleAddQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const newQuestionObj: Question = {
      id: uuidv4(),
      question_text: newQuestion,
      created_at: new Date().toISOString(),
      updated_at: null,
      answers: [],
    };
    setQuestions(prev => [newQuestionObj, ...prev]);
    setNewQuestion('');
    dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: newQuestionObj.id, text: newQuestionObj.question_text } });
  };

  const handleEditQuestion = async (questionId: string) => {
    if (!editText.trim()) return;
    try {
      await apiService.updateQuestion(questionId, editText);
      setQuestions(prev => prev.map(q =>
        q.id === questionId ? { ...q, question_text: editText, updated_at: new Date().toISOString() } : q
      ));
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
        answers: [],
      };
      setQuestions(prev => [newQuestionObj, ...prev]);
      dispatch({
        type: 'UPDATE_TEMP_QUESTION',
        payload: {
          questionId,
          text: poolQuestion.question_text,
          questionPoolId: typeof selectedId === 'number' ? selectedId : parseInt(selectedId.toString()),
        },
      });
      onQuestionSelect(questionId, poolQuestion.question_text, undefined, elementId);
      onClose();
    } catch (error) {
      console.error('Error adding question from pool:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleQuestionClick = (questionId: string, questionText: string, questionPosition?: number) => {
    const currentDisplay = pendingSelection?.questionId ?? highlightedQuestionId;
    if (questionId === currentDisplay) {
      setPendingSelection(null);
      return;
    }
    const question = questions.find(q => q.id === questionId);
    const selection: PendingQuestionSelection = {
      questionId,
      questionText,
      questionPosition: questionPosition ?? question?.display_order ?? undefined,
    };
    setPendingSelection(selection);
  };

  const effectiveHighlightedId = pendingSelection?.questionId ?? highlightedQuestionId;

  const handleSaveAndClose = () => {
    if (pendingSelection) {
      onQuestionSelect(pendingSelection.questionId, pendingSelection.questionText, pendingSelection.questionPosition, elementId);
    }
    setPendingSelection(null);
    onClose();
  };

  const handleDiscard = () => {
    setPendingSelection(null);
    onClose();
  };

  const handleRemove = () => {
    onQuestionSelect('', '', undefined, elementId);
    setPendingSelection(null);
    onClose();
  };

  // Report actions to parent (both embedded and standalone) – nicht bei hideActions
  useEffect(() => {
    if (!onActionsReady || hideActions) return;
    if (view === 'manage' || view === 'pool') {
      onActionsReady(
        <Button variant="outline" onClick={() => navigate('main')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      );
    } else {
      onActionsReady(
        <div className="flex flex-wrap gap-2 justify-end">
          {highlightedQuestionId && (
            <Tooltip content="Remove question from this textbox">
              <Button variant="outline" onClick={handleRemove} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </Tooltip>
          )}
          <Button variant="outline" onClick={handleDiscard}>
            Discard
          </Button>
          <Button onClick={handleSaveAndClose}>
            Save and Close
          </Button>
        </div>
      );
    }
  }, [onActionsReady, hideActions, embedded, view, highlightedQuestionId]);

  if (!bookId || typeof bookId !== 'number') {
    return null;
  }

  const renderMain = () => (
    <>
      <div className="p-1 pb-6">
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
            <Button type="button" variant="outline" onClick={() => navigate('manage')} className="space-x-2">
              <Settings className="h-4 w-4" />
              <span>Manage Questions</span>
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('pool')} className="space-x-2">
              <Library className="h-4 w-4" />
              <span>Browse Pool</span>
            </Button>
          </div>
        </form>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <QuestionList
          mode="select"
          questions={questions.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())}
          loading={questionsLoading}
          onQuestionSelect={handleQuestionClick}
          showDates={true}
          disabledQuestionIds={new Set(questions.filter(q => !isQuestionAvailable(q.id) && q.id !== highlightedQuestionId).map(q => q.id))}
          validateQuestionSelection={validateQuestionSelection}
          getUserAnswer={(questionId) => (userAnswers.has(questionId) ? { answer_text: 'Answered' } : null)}
          highlightedQuestionId={highlightedQuestionId}
          selectedQuestionId={effectiveHighlightedId}
          allowHighlightedClick={true}
          renderCustomActions={renderCustomActions}
        />
      </div>
    </>
  );

  const renderManage = () => (
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

  const renderPool = () => (
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

  if (embedded) {
    if (view === 'main') return renderMain();
    if (view === 'manage') return renderManage();
    if (view === 'pool') return renderPool();
    return null;
  }

  // Standalone: use view state for Modal children
  if (view === 'main') return renderMain();
  if (view === 'manage') return renderManage();
  if (view === 'pool') return renderPool();
  return null;
}
