import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/composites/card';
import { Input } from '../../components/ui/primitives/input';
import { Textarea } from '../../components/ui/primitives/textarea';
import { UserPlus, Save } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  book_id: number;
  user_id: number;
  answer_text?: string;
}

interface QuestionsByBook {
  [bookName: string]: Question[];
}

export default function InvitationResponse() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; registered: boolean } | null>(null);
  const [questionsByBook, setQuestionsByBook] = useState<QuestionsByBook>({});
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUserInfo();
      fetchQuestions();
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/invitations/user/${token}`);
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/invitations/questions/${token}`);
      if (response.ok) {
        const data = await response.json();
        setQuestionsByBook(data);
        
        // Pre-fill existing answers
        const existingAnswers: { [questionId: string]: string } = {};
        Object.values(data).flat().forEach((question: any) => {
          if (question.answer_text) {
            existingAnswers[question.id] = question.answer_text;
          }
        });
        setAnswers(existingAnswers);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSaveAnswers = async () => {
    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const answersArray = Object.entries(answers).map(([questionId, answerText]) => ({
        questionId,
        answerText
      }));

      const response = await fetch(`${apiUrl}/invitations/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers: answersArray })
      });

      if (response.ok) {
        alert('Answers saved successfully!');
      }
    } catch (error) {
      console.error('Error saving answers:', error);
      alert('Failed to save answers');
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">Invalid invitation link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">You've been invited to collaborate!</CardTitle>
            <CardDescription>
              {userInfo && `Hi ${userInfo.name}, you can register for an account or answer questions directly below`}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {userInfo?.registered ? (
              <p className="text-sm text-muted-foreground">
                Welcome back! You can update your answers below.
              </p>
            ) : (
              <>
                <Link to={`/register?email=${encodeURIComponent(userInfo?.email || '')}&token=${token}`}>
                  <Button size="lg" className="mb-4">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register for Account
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Or answer questions below without registering
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Questions by Book */}
        {Object.keys(questionsByBook).length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No questions assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(questionsByBook).map(([bookName, questions]) => (
            <Card key={bookName}>
              <CardHeader>
                <CardTitle className="text-xl">{bookName}</CardTitle>
                <CardDescription>
                  {questions.length} question{questions.length !== 1 ? 's' : ''} to answer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <label className="text-sm font-medium">{question.question_text}</label>
                    <Textarea
                      placeholder="Your answer..."
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}

        {/* Save Button */}
        {Object.keys(questionsByBook).length > 0 && (
          <div className="flex justify-center">
            <Button 
              onClick={handleSaveAnswers} 
              disabled={saving || Object.keys(answers).length === 0}
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Answers'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}