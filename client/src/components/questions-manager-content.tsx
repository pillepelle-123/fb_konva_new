import { useState, useEffect } from 'react';
import { Button } from './ui/primitives/button';
import { Card, CardContent, CardDescription } from './ui/card';
import { Input } from './ui/primitives/input';
import { DialogDescription, DialogHeader, DialogTitle } from './ui/overlays/dialog';
import { HelpCircle, Plus, Edit, Trash2, Save, Calendar, X, CircleQuestionMark, CircleQuestionMarkIcon, MessageCircleQuestionMark } from 'lucide-react';

interface Question {
  id: number;
  question_text: string;
  created_at: string;
  updated_at: string | null;
}

interface QuestionsManagerContentProps {
  bookId: number;
  bookName: string;
  onQuestionSelect?: (questionId: number, questionText: string) => void;
  mode?: 'manage' | 'select';
  token: string;
  onClose: () => void;
  showAsContent?: boolean;
}

export default function QuestionsManagerContent({ 
  bookId, 
  bookName, 
  onQuestionSelect, 
  mode = 'manage', 
  token,
  onClose,
  showAsContent = false
}: QuestionsManagerContentProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [bookId]);

  const fetchQuestions = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/${bookId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/${bookId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionText: newQuestion })
      });
      if (response.ok) {
        setNewQuestion('');
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleEditQuestion = async (questionId: number) => {
    if (!editText.trim()) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionText: editText })
      });
      if (response.ok) {
        setEditingId(null);
        setEditText('');
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error updating question:', error);
    }
  };

  const handleDeleteQuestion = (questionId: number) => {
    setShowDeleteConfirm(questionId);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/questions/${showDeleteConfirm}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
    setShowDeleteConfirm(null);
  };

  const startEdit = (question: Question) => {
    setEditingId(question.id);
    setEditText(question.question_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      {!showAsContent && (
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            
            <span>{mode === 'select' ? 'Select Question' : 'Manage Questions'} - {bookName}</span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'select' ? 'Choose a question from the list for book "' + bookName + '"'  : 'Add, edit, and organize questions for book "' + bookName  + '"' }
          </DialogDescription>
        </DialogHeader>
      )}

      {showAsContent && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              {/* <MessageCircleQuestionMark className="h-6 w-6" /> */}
              <span>{mode === 'select' ? 'Select Question' : 'Manage Questions'}</span>
            </h1>
            <Button variant="outline" onClick={onClose}>
              Back
            </Button>
          </div>
          <p className="text-muted-foreground">
            {mode === 'select' ? 'Choose a question from the list for book "' + bookName + '"' : 'Add, edit, and organize questions for book "' + bookName  + '"' }
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col space-y-4">
        {/* Add New Question */}
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
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Questions List */}
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
                {questions.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()).map(question => (
                  <div key={question.id} className="p-4 hover:bg-muted/50 transition-colors">
                    {editingId === question.id ? (
                      <div className="space-y-3">
                        <Input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEditQuestion(question.id)}
                            className="space-x-2"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div 
                          className={`space-y-1 flex-1 ${mode === 'select' ? 'cursor-pointer hover:bg-muted/30 p-2 rounded' : ''}`}
                          onClick={mode === 'select' ? (e) => {
                            // Prevent click if clicking on Edit or Delete buttons
                            const target = e.target as HTMLElement;
                            if (target.closest('button')) return;
                            onQuestionSelect?.(question.id, question.question_text);
                          } : undefined}
                        >
                          <p className="text-foreground leading-relaxed">
                            {question.question_text}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Created {formatDate(question.created_at)}</span>
                            {question.updated_at && (
                            <span>|</span>
                            )}
                            <span>
                              {question.updated_at && (
                                <span>Updated {formatDate(question.updated_at)}</span>
                              )}
                            </span>

                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(question)}
                            className="space-x-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="space-x-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {mode === 'select' && !showAsContent && (
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Question</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1">
                Delete Question
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}