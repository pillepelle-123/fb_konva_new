import type { ReactNode } from 'react';
import { useAuth } from '../../context/auth-context';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="home"><p>Loading...</p></div>;
  }

  if (!user) {
    // Speichere die aktuelle URL als redirect Parameter
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <div className="home"><p>Access denied. Required role: {requiredRole}</p></div>;
  }

  return <>{children}</>;
}