import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface BookAccessGuardProps {
  children: React.ReactNode;
}

export default function BookAccessGuard({ children }: BookAccessGuardProps) {
  const { bookId } = useParams<{ bookId: string }>();
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!bookId || !user) {
        setHasAccess(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setHasAccess(response.ok);
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

  return <>{children}</>;
}