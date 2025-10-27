import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent, CardHeader } from '../../ui/composites/card';
import { Input } from '../../ui/primitives/input';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Plus, SquarePen, Trash2, Save, X, MessageCircleQuestion } from 'lucide-react';
import { apiService } from '../../../services/api';

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

interface QuestionsAnswersManagerProps {
  bookId: number | string;
}

export default function QuestionsAnswersManager({ bookId }: QuestionsAnswersManagerProps) {
  const { token } = useAuth();
  const { state, dispatch } = useEditor();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchQuestionsWithAnswers();
  }, [bookId]);

  const fetchQuestionsWithAnswers = async () => {
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    
    try {
      const questionsData = await apiService.getQuestions(bookId as number);
      
      // Fetch answers for each question
      const questionsWithAnswers = await Promise.all(
        questionsData.map(async (question) => {
          try {
            const answers = await apiService.getQuestionAnswers(question.id);
            console.log(`Fetched ${answers.length} answers for question ${question.id}:`, answers);
            return { ...question, answers };
          } catch (error) {
            console.error(`Error fetching answers for question ${question.id}:`, error);
            return { ...question, answers: [] };
          }
        })
      );
      
      setQuestions(questionsWithAnswers);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    
    const questionId = uuidv4();
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: questionId,
          bookId: bookId,
          questionText: newQuestion
        })
      });
      
      if (response.ok) {
        setNewQuestion('');
        fetchQuestionsWithAnswers();
      }
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleEditQuestion = async (questionId: string) => {
    if (!editText.trim()) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionText: editText })
      });
      
      if (response.ok) {
        // Update the temp questions state to immediately update textboxes on canvas
        dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text: editText } });
        
        setEditingId(null);
        setEditText('');
        fetchQuestionsWithAnswers();
      }
    } catch (error) {
      console.error('Error updating question:', error);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/questions/${showDeleteConfirm}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Reset all textboxes with this question
        if (state.currentBook) {
          const updatedBook = { ...state.currentBook };
          updatedBook.pages.forEach(page => {
            page.elements.forEach(element => {
              if (element.questionId === showDeleteConfirm) {
                element.questionId = undefined;
                element.text = '';
                if (element.textType === 'answer') {
                  element.textType = 'text';
                }
              }
            });
          });
          dispatch({ type: 'SET_BOOK', payload: updatedBook });
        }
        
        setShowDeleteConfirm(null);
        fetchQuestionsWithAnswers();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
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
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Delete Confirmation Dialog */}
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