import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import QuestionsManagerContent from '../../components/features/questions/questions-manager-content';

export default function QuestionsList() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [bookName, setBookName] = useState('');

  useEffect(() => {
    // Fetch book name for display
    const fetchBookName = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('token');
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

    if (bookId) {
      fetchBookName();
    }
  }, [bookId]);

  const handleBack = () => {
    navigate('/books');
  };

  if (!bookId) {
    return <div>Invalid book ID</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <QuestionsManagerContent
        bookId={parseInt(bookId)}
        bookName={bookName}
        onClose={handleBack}
        mode="manage"
        token={localStorage.getItem('token') || ''}
        showAsContent={true}
      />
    </div>
  );
}