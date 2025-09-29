import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Question {
  id: number;
  question_text: string;
  created_at: string;
}

interface QuestionsManagerProps {
  bookId: number;
  bookName: string;
  onClose: () => void;
}

export default function QuestionsManager({ bookId, bookName, onClose }: QuestionsManagerProps) {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [bookId]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/books/${bookId}/questions`, {
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
      const response = await fetch(`http://localhost:5000/api/books/${bookId}/questions`, {
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
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}`, {
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

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchQuestions();
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

  if (loading) return <div className="home"><p>Loading questions...</p></div>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title">Manage Questions - {bookName}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {/* Add New Question */}
        <form onSubmit={handleAddQuestion} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter new question..."
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Add
            </button>
          </div>
        </form>

        {/* Questions List */}
        {questions.length === 0 ? (
          <p className="card-text">No questions yet. Add your first question above.</p>
        ) : (
          <div>
            {questions.map(question => (
              <div key={question.id} style={{ 
                padding: '1rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '4px', 
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                {editingId === question.id ? (
                  <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <button 
                      onClick={() => handleEditQuestion(question.id)}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEdit}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0', fontSize: '1rem' }}>{question.question_text}</p>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.8rem' }}>
                        Created: {new Date(question.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => startEdit(question)}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteQuestion(question.id)}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}