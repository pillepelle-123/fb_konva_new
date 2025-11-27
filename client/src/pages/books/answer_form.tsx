import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Textarea } from '../../components/ui/primitives/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/composites/card';
import { toast } from 'sonner';

interface Question {
  id: string; // UUID
  text: string;
}

interface Answer {
  questionId: string; // UUID
  text: string;
  answerId?: string; // UUID
}

export default function AnswerForm() {
  const { bookId } = useParams<{ bookId: string }>();
  const { token, user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookTitle, setBookTitle] = useState('');

  useEffect(() => {
    if (!token || !bookId) return;

    const fetchQuestionsAndAnswers = async () => {
      try {
        // Fetch book data
        const bookResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBookTitle(bookData.name || 'Book');
          
          // Fetch questions assigned to current user
          const questionsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/questions/book/${bookId}/user`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json();
            setQuestions(questionsData.map(q => ({ id: q.id, text: q.question_text })));
          }
          
          // Fetch answers for current user
          const answersResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/answers/book/${bookId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (answersResponse.ok) {
            const answersData = await answersResponse.json();
            setAnswers(answersData.map(a => ({ 
              questionId: a.question_id, 
              text: a.answer_text || '',
              answerId: a.id
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionsAndAnswers();
  }, [token, bookId]);

  const handleAnswerChange = (questionId: string, text: string) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, text } : a);
      } else {
        return [...prev, { questionId, text }];
      }
    });
  };

  const handleSave = async () => {
    if (!token || !bookId) return;
    
    setSaving(true);
    try {
      // Save answers to database (including empty ones to maintain placeholders)
      for (const answer of answers) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            id: answer.answerId,
            questionId: answer.questionId, 
            answerText: answer.text || '',
            userId: user?.id
          })
        });
      }

      toast.success('Answers saved successfully');
    } catch (error) {
      console.error('Error saving answers:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{bookTitle} - Answer Form</h1>
        <p className="text-muted-foreground">Please answer the questions below.</p>
      </div>

      <div className="space-y-6">
        {questions.map((question) => {
          const answer = answers.find(a => a.questionId === question.id);
          return (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">{question.text}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={answer?.text || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {questions.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Answers'}
          </Button>
        </div>
      )}

      {questions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No questions available for this book.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}