import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import BookManagerContent from '../../components/features/books/book-manager-content';

export default function BookManagerPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!bookId) {
        navigate('/books');
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.role === 'publisher' || data.role === 'owner') {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
            navigate('/books');
          }
        } else {
          setIsAuthorized(false);
          navigate('/books');
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setIsAuthorized(false);
        navigate('/books');
      }
    };

    checkAccess();
  }, [bookId, token, navigate]);

  if (isAuthorized === null) {
    return (
      <div className="container mx-auto px-4 py-2 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="space-y-6 min-h-[calc(100vh-6rem)]">
        <BookManagerContent 
          bookId={bookId} 
          onClose={() => navigate(-1)}
          isStandalone={true}
        />
      </div>
    </div>
  );
}