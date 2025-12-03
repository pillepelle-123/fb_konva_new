import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

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

// Use the same context name as auth-context.tsx to ensure compatibility
// CanvasItemComponent imports useAuth from auth-context, so we need to match the interface
// Since PDFExportAuthProvider is used in isolation (not simultaneously with AuthProvider),
// using the same context name is safe
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a PDFExportAuthProvider');
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

  const value: PDFExportAuthContextType = {
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

