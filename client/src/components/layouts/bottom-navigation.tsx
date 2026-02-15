import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { LayoutDashboard, Book, Plus, Image, Users, Home, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import UnsavedChangesDialog from '../ui/overlays/unsaved-changes-dialog';
import { useState, useRef, useEffect } from 'react';

const NEW_BOOK_ANIMATION_DURATION_MS = 700;
const NEW_BOOK_ANIMATION_HOLD_MS = 350;

export default function BottomNavigation() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isNewBookAnimating, setIsNewBookAnimating] = useState(false);
  const newBookAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newBookAnimationHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInEditor = location.pathname.startsWith('/editor/');

  useEffect(() => {
    return () => {
      if (newBookAnimationTimeoutRef.current) {
        clearTimeout(newBookAnimationTimeoutRef.current);
      }
      if (newBookAnimationHoldRef.current) {
        clearTimeout(newBookAnimationHoldRef.current);
      }
    };
  }, []);

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

  const handleNewBookClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const active = isActive('/books/create');
    if (active) return;
    if (isInEditor) {
      setPendingNavigation('/books/create');
      setShowUnsavedDialog(true);
      return;
    }
    setIsNewBookAnimating(true);
    newBookAnimationTimeoutRef.current = setTimeout(() => {
      navigate('/books/create');
      newBookAnimationTimeoutRef.current = null;
      newBookAnimationHoldRef.current = setTimeout(() => {
        setIsNewBookAnimating(false);
        newBookAnimationHoldRef.current = null;
      }, NEW_BOOK_ANIMATION_HOLD_MS);
    }, NEW_BOOK_ANIMATION_DURATION_MS);
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
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden' as const,
        }}
      >
        <div className="flex items-stretch w-full h-16 safe-area-pb">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const isNewBook = item.path === '/books/create';
            const showAnimation = isNewBook && isNewBookAnimating;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={isNewBook ? handleNewBookClick : (e) => handleNavigation(item.path, e)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 min-w-0 transition-colors text-foreground',
                  active && !isNewBook && 'border-t-4 border-primary',
                  active && isNewBook && 'border-t-1.5',
                  !active && 'hover:bg-muted/50',
                  isNewBook && 'overflow-hidden'
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
                  <div className="relative flex items-center justify-center h-8 w-8 shrink-0">
                    <span
                      className={cn(
                        'absolute inset-0 rounded-full origin-center z-0 transition-transform',
                        (active || showAnimation)
                          ? 'scale-[5] duration-500 ease-out'
                          : 'scale-100 duration-700 ease-in'
                      )}
                      style={{
                        backgroundColor: 'hsl(var(--highlight))',
                      }}
                    />
                    <Plus
                      className="h-5 w-5 shrink-0 relative z-10"
                      style={{ color: 'hsl(var(--primary-foreground))' }}
                    />
                  </div>
                ) : (
                  <item.icon className="h-5 w-5 shrink-0" />
                )}
                <span
                  className={cn(
                    'relative z-10 text-xs truncate max-w-full mt-0.5',
                    (active || showAnimation) && isNewBook
                      ? 'text-primary-foreground'
                      : 'text-foreground'
                  )}
                  style={{
                    transition: (active || showAnimation) && isNewBook
                      ? 'color 300ms'
                      : 'color 300ms 250ms',
                  }}
                >
                  {item.label}
                </span>
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
