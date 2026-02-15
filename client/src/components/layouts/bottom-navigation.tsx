import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { LayoutDashboard, Book, Plus, Image, Users, Home, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import UnsavedChangesDialog from '../ui/overlays/unsaved-changes-dialog';
import { useState } from 'react';

export default function BottomNavigation() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const isInEditor = location.pathname.startsWith('/editor/');

  const isActive = (path: string) => {
    if (path === '/books') {
      return (
        location.pathname.startsWith('/books') && location.pathname !== '/books/create'
      );
    }
    if (path === '/books/create') {
      return location.pathname === '/books/create';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }

    if (isInEditor) {
      setPendingNavigation(path);
      setShowUnsavedDialog(true);
      return;
    }

    navigate(path);
  };

  const handleSaveAndNavigate = async () => {
    if (pendingNavigation) {
      window.dispatchEvent(
        new CustomEvent('saveBookFromNavigation', {
          detail: { callback: () => navigate(pendingNavigation) },
        })
      );
    }
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleNavigateWithoutSaving = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const navItems = user
    ? [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/books', label: 'Books', icon: Book },
        { path: '/books/create', label: 'New Book', icon: Plus },
        { path: '/images', label: 'Images', icon: Image },
        { path: '/friends', label: 'Friends', icon: Users },
      ]
    : [
        { path: '/', label: 'Home', icon: Home },
        { path: '/login', label: 'Login', icon: User },
        { path: '/register', label: 'Register', icon: User },
      ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden border-t"
        style={{
          backgroundColor: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
        }}
      >
        <div className="flex items-stretch w-full h-16 safe-area-pb">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const isNewBook = item.path === '/books/create';
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavigation(item.path, e)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 min-w-0 py-2 transition-colors text-foreground',
                  active && !isNewBook && 'border-t-4 border-primary pt-1',
                  active && isNewBook && '',
                  !active && 'hover:bg-muted/50'
                )}
                style={
                  active && isNewBook
                    ? {
                        borderTopColor: 'hsl(var(--highlight))',
                        backgroundColor: 'hsl(var(--highlight))',
                        color: 'hsl(var(--primary-foreground))',
                      }
                    : undefined
                }
              >
                {isNewBook ? (
                  <span
                    className="flex items-center justify-center h-8 w-8 rounded-full shrink-0"
                    style={{
                      backgroundColor: 'hsl(var(--highlight))',
                      color: 'hsl(var(--primary-foreground))',
                    }}
                  >
                    <Plus className="h-5 w-5" />
                  </span>
                ) : (
                  <span
                    className="flex items-center justify-center h-8 w-8 rounded-full shrink-0"
                    
                  >
                  <item.icon className="h-5 w-5 shrink-0" />
                  </span>
                )}
                <span className="text-xs truncate max-w-full mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSaveAndExit={handleSaveAndNavigate}
        onExitWithoutSaving={handleNavigateWithoutSaving}
        onCancel={handleCancelNavigation}
      />
    </>
  );
}
