import { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface BookAccessGuardProps {
  children: React.ReactNode;
}

export default function BookAccessGuard({ children }: BookAccessGuardProps) {
  const { bookId } = useParams<{ bookId: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [editorInteractionLevel, setEditorInteractionLevel] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!bookId || !user) {
        setHasAccess(false);
        return;
      }

      // Handle temporary books - always allow access for creator
      if (bookId.startsWith('temp_')) {
        const tempBooks = (window as any).tempBooks;
        const tempBook = tempBooks?.get(bookId);
        if (tempBook && tempBook.owner_id === user.id) {
          setHasAccess(true);
          return;
        }
        setHasAccess(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setEditorInteractionLevel(data.editor_interaction_level);
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [bookId, user]);

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/404" replace />;
  }

  // Redirect no_access users to answer form when trying to access editor
  if (editorInteractionLevel === 'no_access' && location.pathname.includes('/editor/')) {
    return <Navigate to={`/books/${bookId}/answers`} replace />;
  }

  return <>{children}</>;
}