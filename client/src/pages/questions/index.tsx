import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent } from '../../components/ui/composites/card';
import { Input } from '../../components/ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { MessageCircleQuestion, Plus, Edit, Trash2, Save, X, Users, ArrowLeft, Eye, FileText, AlertCircle } from 'lucide-react';
import { QuestionList, type Question, type QuestionStats } from '../../components/features/questions/question-list';

// Question and QuestionStats interfaces are now imported from question-list.tsx

interface Answer {
  id: string; // UUID
  user_id: number;
  question_id: string; // UUID
  answer_text: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
}

export default function QuestionsList() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [bookName, setBookName] = useState('');
  const [userRole, setUserRole] = useState<'owner' | 'publisher' | 'author' | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Answer[]>([]);
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerText, setEditAnswerText] = useState('');
  const [newAnswerText, setNewAnswerText] = useState('');
  const [showAddAnswer, setShowAddAnswer] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    if (bookId) {
      fetchBookData();
      fetchUserRole();
      fetchQuestions();
      fetchQuestionStats();
      fetchUserAnswers();
    }
  }, [bookId]);

  const fetchBookData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const book = await response.json();
        setBookName(book.name);
      }
    } catch (error) {
      console.error('Error fetching book:', error);
    }
  };

  const fetchUserRole = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/questions/book/${bookId}/with-pages`, {
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

  const fetchQuestionStats = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/answers/book/${bookId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuestionStats(data);
      } else {
        console.error('Failed to fetch question stats:', response.status);
        // Fallback to showing questions without stats
        setQuestionStats([]);
      }
    } catch (error) {
      console.error('Error fetching question stats:', error);
      // Fallback to showing questions without stats
      setQuestionStats([]);
    }
  };

  const fetchUserAnswers = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/answers/book/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserAnswers(data);
      }
    } catch (error) {
      console.error('Error fetching user answers:', error);
    }
  };

  const fetchQuestionAnswers = async (questionId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/answers/question/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuestionAnswers(data);
      }
    } catch (error) {
      console.error('Error fetching question answers:', error);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          bookId: bookId,
          questionText: newQuestion 
        })
      });
      if (response.ok) {
        setNewQuestion('');
        fetchQuestions();
        fetchQuestionStats();
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
        setEditingId(null);
        setEditText('');
        fetchQuestions();
        fetchQuestionStats();
      }
    } catch (error) {
      console.error('Error updating question:', error);
    }
  };

  const handleStartEdit = (question: Question) => {
    setEditingId(question.id);
    setEditText(question.question_text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
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
        fetchQuestions();
        fetchQuestionStats();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
    setShowDeleteConfirm(null);
  };

  const handleEditAnswer = async (answerId: string) => {
    if (!editAnswerText.trim()) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/answers/${answerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answerText: editAnswerText })
      });
      if (response.ok) {
        setEditingAnswerId(null);
        setEditAnswerText('');
        if (selectedQuestion) {
          fetchQuestionAnswers(selectedQuestion);
        }
        fetchUserAnswers();
      }
    } catch (error) {
      console.error('Error updating answer:', error);
    }
  };

  const handleAddAnswer = async () => {
    if (!newAnswerText.trim() || !selectedQuestion) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          questionId: selectedQuestion, 
          answerText: newAnswerText,
          userId: user?.id
        })
      });
      if (response.ok) {
        setNewAnswerText('');
        setShowAddAnswer(false);
        fetchQuestionAnswers(selectedQuestion);
        fetchQuestionStats();
        fetchUserAnswers();
      }
    } catch (error) {
      console.error('Error adding answer:', error);
    }
  };

  const handleViewAnswers = (questionId: string) => {
    setSelectedQuestion(questionId);
    setShowAddAnswer(false);
    setNewAnswerText('');
    fetchQuestionAnswers(questionId);
  };

  const hasUserAnswered = (questionId: string) => {
    return questionAnswers.some(answer => answer.user_email === user?.email && answer.question_id === questionId);
  };

  const getUserAnswer = (questionId: string) => {
    return userAnswers.find(answer => answer.question_id === questionId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!bookId) {
    return <div>Invalid book ID</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading questions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageCircleQuestion className="h-8 w-8" />
              Questions & Answers
            </h1>
            <p className="text-muted-foreground">
              Manage questions and view responses for "{bookName}"
            </p>
          </div>
          <Button onClick={() => navigate('/books')} variant="outline" className="space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Books</span>
          </Button>
        </div>

        {/* Add New Question - Only for owners and publishers */}
        {(userRole === 'owner' || userRole === 'publisher') && (
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleAddQuestion} className="space-y-4">
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
                    <span>Add Question</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Questions Overview */}
        <QuestionList
          mode="view"
          questions={questions}
          loading={loading}
          onQuestionEdit={handleEditQuestion}
          onQuestionDelete={(id) => setShowDeleteConfirm(id)}
          editingQuestionId={editingId}
          editText={editText}
          onEditTextChange={setEditText}
          onSaveEdit={handleEditQuestion}
          onCancelEdit={handleCancelEdit}
          showEditDelete={userRole === 'owner' || userRole === 'publisher'}
          showStats={true}
          showDates={true}
          questionStats={questionStats}
          getUserAnswer={getUserAnswer}
          userRole={userRole || undefined}
          renderCustomActions={(question) => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewAnswers(question.id)}
              className="space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>View Answers</span>
            </Button>
          )}
          emptyMessage="Add your first question above to start collecting responses."
        />

        {/* Answers Dialog */}
        <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Answers</DialogTitle>
              <DialogDescription>
                {questionStats.find(q => q.question_id === selectedQuestion)?.question_text}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Add Answer Section - Show for all users who haven't answered */}
              {selectedQuestion && !hasUserAnswered(selectedQuestion) && (
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    {showAddAnswer ? (
                      <div className="space-y-3">
                        <textarea
                          value={newAnswerText}
                          onChange={(e) => setNewAnswerText(e.target.value)}
                          placeholder="Write your answer here..."
                          className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowAddAnswer(false);
                              setNewAnswerText('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddAnswer}
                            disabled={!newAnswerText.trim()}
                          >
                            Save Answer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground mb-3">You haven't answered this question yet.</p>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddAnswer(true)}
                          className="space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Your Answer</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Existing Answers */}
              {questionAnswers.length === 0 ? (
                !showAddAnswer && selectedQuestion && !hasUserAnswered(selectedQuestion) ? null : (
                  <p className="text-center text-muted-foreground py-8">
                    {userRole === 'author' ? 'You have not answered this question yet.' : 'No answers yet for this question.'}
                  </p>
                )
              ) : (
                <>
                  {userRole === 'author' && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Answer:</h4>
                    </div>
                  )}
                  {questionAnswers.map(answer => (
                    <Card key={answer.id}>
                      <CardContent className="p-4">
                        {editingAnswerId === answer.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editAnswerText}
                              onChange={(e) => setEditAnswerText(e.target.value)}
                              className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingAnswerId(null);
                                  setEditAnswerText('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditAnswer(answer.id)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-foreground mb-2 whitespace-pre-wrap">{answer.answer_text}</p>
                              <div className="text-sm text-muted-foreground">
                                {userRole === 'author' ? (
                                  <span>Your answer • {formatDate(answer.created_at)}</span>
                                ) : (
                                  <span>By {answer.user_name} • {formatDate(answer.created_at)}</span>
                                )}
                                {answer.updated_at && answer.updated_at !== answer.created_at && (
                                  <span> • Updated {formatDate(answer.updated_at)}</span>
                                )}
                              </div>
                            </div>
                            {answer.user_email === user?.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingAnswerId(answer.id);
                                  setEditAnswerText(answer.answer_text);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Question</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this question? This will also delete all associated answers and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteQuestion} className="flex-1">
                Delete Question
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}