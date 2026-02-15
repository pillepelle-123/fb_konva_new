import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/primitives/button';
import { Book, Home, User, Image, Bell, Users, LayoutDashboard, LibraryBig, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import ProfilePicture from '../features/users/profile-picture';
import { useSocket } from '../../context/socket-context';
import NavigationSubMenu from './navigation-sub-menu';
import MobileNotificationPanel from './mobile-notification-panel';
import UnsavedChangesDialog from '../ui/overlays/unsaved-changes-dialog';
import { toast } from 'sonner';

export default function Navigation() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement>(null);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement>(null);
  const desktopProfileButtonRef = useRef<HTMLButtonElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileUpdateKey, setProfileUpdateKey] = useState(0);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  const isDesktop = useIsDesktop();
  const isInEditor = location.pathname.startsWith('/editor/');

  const isActive = (path: string) => location.pathname === path;
  
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
      window.dispatchEvent(new CustomEvent('saveBookFromNavigation', {
        detail: { callback: () => navigate(pendingNavigation) }
      }));
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

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
      
      // Listen for profile picture updates
      const handleProfileUpdate = () => {
        setProfileUpdateKey(prev => prev + 1);
      };
      
      window.addEventListener('profilePictureUpdated', handleProfileUpdate);
      
      // Listen for real-time message notifications
      if (socket) {
        socket.on('message_notification', () => {
          fetchUnreadCount();
        });
        
        // Listen for PDF export completion notifications
        socket.on('pdf_export_completed', (data: { exportId: number; bookId: number; bookName: string; status: string; error?: string }) => {
          if (data.status === 'completed') {
            // Sofort Badge aktualisieren (optimistic update)
            setUnreadCount(prev => prev + 1);
            // Toast anzeigen
            toast.success(`PDF export for "${data.bookName}" is ready!`, {
              action: {
                label: 'View',
                onClick: () => navigate(`/books/${data.bookId}/export`)
              }
            });
            // Exakten Count vom Server holen
            fetchUnreadCount();
          } else if (data.status === 'failed') {
            toast.error(`PDF export for "${data.bookName}" failed: ${data.error || 'Unknown error'}`);
          }
        });
        
        return () => {
          socket.off('message_notification');
          socket.off('pdf_export_completed');
          clearInterval(interval);
          window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
        };
      }
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
      };
    }
  }, [user, socket]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const headers = { Authorization: `Bearer ${token}` };

      const [messengerRes, pdfRes] = await Promise.all([
        fetch(`${apiUrl}/messenger/unread-count`, { headers }),
        fetch(`${apiUrl}/pdf-exports/recent`, { headers })
      ]);

      let messengerCount = 0;
      let pdfCount = 0;

      if (messengerRes.ok) {
        const ct = messengerRes.headers.get('content-type');
        if (ct?.includes('application/json')) {
          const data = await messengerRes.json();
          messengerCount = data.count ?? 0;
        }
      }
      if (pdfRes.ok) {
        const ct = pdfRes.headers.get('content-type');
        if (ct?.includes('application/json')) {
          const data = await pdfRes.json();
          const pdfList = Array.isArray(data) ? data : [];
          const pdfIds = pdfList.map((p: { id: number }) => p.id);
          const { getUnreadPdfCount } = await import('../../utils/notification-read-storage');
          pdfCount = user ? getUnreadPdfCount(user.id, pdfIds) : pdfIds.length;
        }
      }

      setUnreadCount(messengerCount + pdfCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  return (
    <nav className="relative bg-primary sticky top-0 z-50 pb-2 sm:pb-4 shadow-lg" style={{ clipPath: 'ellipse(1200px 100% at 50% 12%)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex pt-2 items-center">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background md:mr-2">
              <LibraryBig className="h-7 w-7 text-primary"/>
            </div>
            <span className=" sm:inline md:hidden lg:inline text-2xl text-primary-foreground sm:pt-2" style={{ fontFamily: '"Gochi Hand", cursive' }}>dein-freundebuch.de</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 flex-1 justify-center">
            {user ? (
              <>
                <Button
                  variant={isActive('/dashboard') ? "secondary" : "ghost"}
                  size="sm"
                  onClick={(e) => handleNavigation('/dashboard', e)}
                  className={`flex items-center space-x-2 ${
                    isActive('/dashboard') 
                      ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                      : 'text-white hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Button>
                
                <Button
                  variant={isActive('/books') ? "secondary" : "ghost"}
                  size="sm"
                  onClick={(e) => handleNavigation('/books', e)}
                  className={`flex items-center space-x-2 ${
                    isActive('/books') 
                      ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                      : 'text-white hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Book className="h-5 w-5" />
                  <span>Books</span>
                </Button>

                <Button
                  variant={isActive('/books/create') ? "highlight" : "secondary"}
                  size="sm"
                  onClick={(e) => handleNavigation('/books/create', e)}
                  className={`flex items-center space-x-2 ${
                    isActive('/books/create')
                      ? 'bg-white text-primary hover:bg-white/90 hover:text-primary'
                      : 'text-primary bg-white hover:bg-white/90'
                  }`}
                >
                  <Plus className="h-5 w-5" />
                  <span>New Book</span>
                </Button>
                
                <Button
                  variant={isActive('/images') ? "secondary" : "ghost"}
                  size="sm"
                  onClick={(e) => handleNavigation('/images', e)}
                  className={`flex items-center space-x-2 ${
                    isActive('/images') 
                      ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                      : 'text-white hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Image className="h-5 w-5" />
                  <span>Images</span>
                </Button>
                
                <Button
                  variant={isActive('/friends') ? "secondary" : "ghost"}
                  size="sm"
                  onClick={(e) => handleNavigation('/friends', e)}
                  className={`flex items-center space-x-2 ${
                    isActive('/friends') 
                      ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                      : 'text-white hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>Friends</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/">
                  <Button
                    variant={isActive('/') ? "secondary" : "ghost"}
                    size="sm"
                    className={`flex items-center space-x-2 ${
                      isActive('/') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    variant={isActive('/login') ? "secondary" : "ghost"}
                    size="sm"
                    className={`flex items-center space-x-2 ${
                      isActive('/login') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span>Login</span>
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant={isActive('/register') ? "secondary" : "ghost"}
                    size="sm"
                    className={`flex items-center space-x-2 ${
                      isActive('/register') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span>Register</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center space-x-4 ml-auto">
            {user && (
              <>
                {/* Notification Bell */}
                <div className="relative shrink-0">
                  <Button
                    ref={desktopNotificationButtonRef}
                    variant="ghost"
                    size="sm"
                    className={`relative p-2 shrink-0 text-white hover:text-white ${
                      notificationOpen ? 'bg-white/10 hover:bg-white/10' : 'hover:bg-transparent'
                    }`}
                    onClick={() => setNotificationOpen(!notificationOpen)}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-highlight text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </Button>
                  {isDesktop && (
                    <MobileNotificationPanel
                      open={notificationOpen}
                      onClose={() => setNotificationOpen(false)}
                      onUpdate={fetchUnreadCount}
                      triggerRef={desktopNotificationButtonRef}
                    />
                  )}
                </div>
                
                <div className="relative shrink-0">
                <Button
                  ref={desktopProfileButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="group flex items-center justify-center p-1 shrink-0 hover:bg-transparent"
                >
                  <ProfilePicture
                    name={user.name}
                    size="sm"
                    userId={user.id}
                    key={`desktop-${profileUpdateKey}`}
                    className={`shrink-0 rounded-full transition-all duration-200 group-hover:ring-2 group-hover:ring-white/60 group-hover:ring-offset-2 group-hover:ring-offset-primary ${
                      userMenuOpen ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-primary' : ''
                    }`}
                  />
                  {/* <User className="h-4 w-4" />
                  <span>{user.name}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} /> */}
                </Button>
                {isDesktop && (
                  <NavigationSubMenu
                    open={userMenuOpen}
                    onClose={() => setUserMenuOpen(false)}
                    triggerRef={desktopProfileButtonRef}
                  />
                )}
                </div>
              </>
            )}
          </div>

          {/* Mobile: Menu Button (SubMenu) + Notifications */}
          {user && (
            <div className="flex items-center gap-1 ml-auto md:hidden">
              <div className="relative shrink-0">
                <Button
                  ref={mobileNotificationButtonRef}
                  variant="ghost"
                  size="icon"
                  className={`relative shrink-0 text-white hover:text-white ${
                    notificationOpen ? 'bg-white/10 hover:bg-white/10' : 'hover:bg-transparent'
                  }`}
                  aria-label="Notifications"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-highlight text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </Button>
                {!isDesktop && (
                  <MobileNotificationPanel
                    open={notificationOpen}
                    onClose={() => setNotificationOpen(false)}
                    onUpdate={fetchUnreadCount}
                    triggerRef={mobileNotificationButtonRef}
                  />
                )}
              </div>
              <div className="relative shrink-0">
                <Button
                  ref={mobileMenuButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="group flex items-center justify-center p-1 shrink-0 hover:bg-transparent"
                >
                  <ProfilePicture
                    name={user.name}
                    size="sm"
                    userId={user.id}
                    key={`mobile-${profileUpdateKey}`}
                    className={`shrink-0 rounded-full transition-all duration-200 ${
                      userMenuOpen ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-primary' : ''
                    }`}
                  />
                </Button>
                {!isDesktop && (
                  <NavigationSubMenu
                    open={userMenuOpen}
                    onClose={() => setUserMenuOpen(false)}
                    triggerRef={mobileMenuButtonRef}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSaveAndExit={handleSaveAndNavigate}
        onExitWithoutSaving={handleNavigateWithoutSaving}
        onCancel={handleCancelNavigation}
      />
    </nav>
  );
}