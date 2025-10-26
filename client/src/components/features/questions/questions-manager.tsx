import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import List from '../../shared/list';
import { Card, CardContent } from '../../ui/composites/card';

interface Question {
  id: string;
  question_text: string;
  created_at: string;
  updated_at: string | null;
}

interface Answer {
  id: string;
  user_id: number;
  question_id: string;
  answer_text: string;
  user_name: string;
  user_email: string;
}

interface QuestionsManagerProps {
  bookId: number | string;
  onClose?: () => void;
}

export default function QuestionsManager({ bookId, onClose }: QuestionsManagerProps) {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookId && token) {
      fetchQuestions();
      fetchAnswers();
    }
  }, [bookId, token]);

  const fetchQuestions = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      console.log('Fetching questions for book:', bookId);
      const response = await fetch(`${apiUrl}/questions/book/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Questions response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Questions data:', data);
        setQuestions(data);
      } else {
        console.error('Failed to fetch questions:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchAnswers = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/answers/book/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnswers(data);
      }
    } catch (error) {
      console.error('Error fetching answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnswersForQuestion = (questionId: string) => {
    return answers.filter(answer => answer.question_id === questionId);
  };

  const renderQuestion = (question: Question) => {
    const questionAnswers = getAnswersForQuestion(question.id);
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">{question.question_text}</h3>
            
            {questionAnswers.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Answers ({questionAnswers.length}):
                </h4>
                <div className="space-y-1">
                  {questionAnswers.map(answer => (
                    <div key={answer.id} className="text-sm">
                      <span className="font-medium">{answer.user_name}:</span>{' '}
                      <span className="text-muted-foreground">
                        {answer.answer_text.length > 100 
                          ? `${answer.answer_text.substring(0, 100)}...` 
                          : answer.answer_text
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No answers yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onClose && (
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
        >
          Back to Canvas
        </button>
      )}
      <h2 className="text-xl font-semibold">Questions & Answers (Book ID: {bookId})</h2>
      {questions.length === 0 ? (
        <p className="text-muted-foreground">No questions found for this book.</p>
      ) : (
        <List
          items={questions}
          renderItem={renderQuestion}
          keyExtractor={(question) => question.id}
          itemsPerPage={5}
        />
      )}
    </div>
  );
}