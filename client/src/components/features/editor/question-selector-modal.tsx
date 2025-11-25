import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../ui/overlays/modal';
import { QuestionsManagerContent } from './questions-manager-content';
import { QuestionsAnswersTab } from '../books/book-manager-tabs/questions-answers-tab';
import { QuestionPoolContent } from '../questions/question-pool-content';
import { Button } from '../../ui/primitives/button';
import { ChevronLeft } from 'lucide-react';
import { useEditor } from '../../../context/editor-context';
import { useAuth } from '../../../context/auth-context';
import { apiService } from '../../../services/api';
import { v4 as uuidv4 } from 'uuid';
import type { Question } from '../books/book-manager-content';

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
  onQuestionSelect
}: QuestionSelectorModalProps) {
  const { state, dispatch } = useEditor();
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

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
    }
  }, [isOpen, bookId, fetchQuestions]);

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

  const handleQuestionFromPool = (poolQuestions: QuestionPoolItem[]) => {
    if (poolQuestions.length === 0) return;
    
    const poolQuestion = poolQuestions[0];
    const questionId = uuidv4();
    const newQuestionObj: Question = {
      id: questionId,
      question_text: poolQuestion.question_text,
      created_at: new Date().toISOString(),
      updated_at: null,
      question_pool_id: poolQuestion.id,
      answers: []
    };
    
    setQuestions(prev => [newQuestionObj, ...prev]);
    
    // Add to temp questions in state with pool id
    dispatch({ 
      type: 'UPDATE_TEMP_QUESTION', 
      payload: { 
        questionId: questionId, 
        text: poolQuestion.question_text, 
        questionPoolId: poolQuestion.id 
      } 
    });
    
    // Select the question immediately
    onQuestionSelect(questionId, poolQuestion.question_text);
    onClose();
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
    
    console.log('[QuestionSelectorModal] Selecting question:', {
      questionId,
      questionText: questionText?.substring(0, 50),
      questionPosition,
      foundPosition: position,
      allQuestions: questions.map(q => ({ id: q.id, display_order: q.display_order }))
    });
    
    onQuestionSelect(questionId, questionText, position);
    onClose();
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
              <QuestionsManagerContent
                bookId={bookId}
                bookName={bookName}
                onQuestionSelect={handleQuestionSelect}
                token={token || ''}
                onNavigate={navigate}
                onResetQuestion={handleResetQuestion}
              />
            );
          case 'manage':
            return (
              <QuestionsAnswersTab
                questionsLoading={questionsLoading}
                questions={questions}
                editingId={editingId}
                editText={editText}
                editInputRef={{ current: null }}
                newQuestion={newQuestion}
                onNewQuestionChange={setNewQuestion}
                onAddQuestion={handleAddQuestion}
                onBrowseQuestionPool={() => navigate('pool')}
                onStartEdit={handleStartEdit}
                onEditQuestion={handleEditQuestion}
                onCancelEdit={handleCancelEdit}
                onDeleteQuestionRequest={handleDeleteQuestionRequest}
                onEditTextChange={setEditText}
              />
            );
          case 'pool':
            return (
              <QuestionPoolContent
                bookId={bookId}
                onQuestionsAdded={handleQuestionFromPool}
                onNavigate={navigate}
                singleSelect
              />
            );
          default:
            return null;
        }
      }}
    </Modal>
  );
}

