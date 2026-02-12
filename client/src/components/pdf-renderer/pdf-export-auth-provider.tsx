import { useContext, type ReactNode } from 'react';
import { AuthContext } from '../../context/auth-context';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider or PDFExportAuthProvider');
  }
  return context;
};

interface PDFExportAuthProviderProps {
  children: ReactNode;
  user: User | null;
  token: string | null;
}

export function PDFExportAuthProvider({ 
  children, 
  user, 
  token 
}: PDFExportAuthProviderProps) {
  // No-op implementations for login/register/logout
  const login = async (_email: string, _password: string) => {
    throw new Error('Login is not available in PDF export context');
  };

  const register = async (_name: string, _email: string, _password: string) => {
    throw new Error('Register is not available in PDF export context');
  };

  const logout = () => {
    // No-op in PDF export context
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading: false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

