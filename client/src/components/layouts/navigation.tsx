import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/primitives/button';
import { Book, BookUser, Home, Archive, LogOut, User, Menu, Image, IdCard, Settings, ChevronDown, Bell, MessagesSquare, Users, LayoutDashboard, LibraryBig, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import ProfilePicture from '../features/users/profile-picture';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/overlays/popover';
import NotificationPopover from '../features/messenger/notification-popover';
import { useSocket } from '../../context/socket-context';
import NavigationSubMenu from './navigation-sub-menu';
import UnsavedChangesDialog from '../ui/overlays/unsaved-changes-dialog';
import { toast } from 'sonner';

export default function Navigation() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [booksMenuOpen, setBooksMenuOpen] = useState(false);
  const [mobileBooksMenuOpen, setMobileBooksMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileUpdateKey, setProfileUpdateKey] = useState(0);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
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
    setIsMobileMenuOpen(false);
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
            // Show toast notification
            toast.success(`PDF export for "${data.bookName}" is ready!`, {
              action: {
                label: 'View',
                onClick: () => navigate(`/books/${data.bookId}/export`)
              }
            });
            // Refresh notifications
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
      const response = await fetch(`${apiUrl}/messenger/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setUnreadCount(data.count);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  const navItems = user ? [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/images', label: 'Images', icon: Image },
  ] : [
    { path: '/', label: 'Home', icon: Home },
    { path: '/login', label: 'Login', icon: User },
    { path: '/register', label: 'Register', icon: User },
  ];

  return (
    <nav className="relative bg-primary sticky top-0 z-50 pb-4 shadow-lg" style={{ clipPath: 'ellipse(70% 100% at 50% 0%)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
              <LibraryBig className="h-7 w-7 text-primary"/>
            </div>
            <span className="text-2xl text-primary-foreground pt-2" style={{ fontFamily: '"Gochi Hand", cursive' }}>dein-freundebuch.de</span>
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
                <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative text-white hover:bg-white/10 p-2"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-highlight text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <NotificationPopover onUpdate={fetchUnreadCount} onClose={() => setNotificationOpen(false)} />
                  </PopoverContent>
                </Popover>
                
                <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-sm text-white/80 hover:bg-white/10 hover:text-white p-1"
                >
                  <ProfilePicture name={user.name} size="sm" userId={user.id} key={`desktop-${profileUpdateKey}`} />
                  {/* <User className="h-4 w-4" />
                  <span>{user.name}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} /> */}
                </Button>
                {userMenuOpen && (
                  <NavigationSubMenu onClose={() => setUserMenuOpen(false)} />
                )}
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10 ml-auto"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setUserMenuOpen(false);
              setBooksMenuOpen(false);
              setMobileBooksMenuOpen(false);
            }}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4 space-y-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/dashboard') ? "default" : "ghost"}
                    className={`w-full justify-start space-x-2 ${
                      isActive('/dashboard') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                
                {/* Books Dropdown - Mobile */}
                <Button
                  variant="ghost"
                  onClick={() => setMobileBooksMenuOpen(!mobileBooksMenuOpen)}
                  className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                >
                  <Book className="h-4 w-4" />
                  <span>Books</span>
                  <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${
                    mobileBooksMenuOpen ? 'rotate-180' : ''
                  }`} />
                </Button>
                {mobileBooksMenuOpen && (
                  <div className="pl-4 space-y-1">
                    <Link to="/books" onClick={() => {
                      setIsMobileMenuOpen(false);
                      setMobileBooksMenuOpen(false);
                    }}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                      >
                        <Book className="h-4 w-4" />
                        <span>My Books</span>
                      </Button>
                    </Link>
                    <Link to="/books/create" onClick={() => {
                      setIsMobileMenuOpen(false);
                      setMobileBooksMenuOpen(false);
                    }}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                        <span>New Book</span>
                      </Button>
                    </Link>
                    <Link to="/books/archive" onClick={() => {
                      setIsMobileMenuOpen(false);
                      setMobileBooksMenuOpen(false);
                    }}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                      >
                        <Archive className="h-4 w-4" />
                        <span>Archive</span>
                      </Button>
                    </Link>
                  </div>
                )}
                
                <Link to="/images" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/images') ? "default" : "ghost"}
                    className={`w-full justify-start space-x-2 ${
                      isActive('/images') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Image className="h-4 w-4" />
                    <span>Images</span>
                  </Button>
                </Link>
                
                <Link to="/friends" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/friends') ? "default" : "ghost"}
                    className={`w-full justify-start space-x-2 ${
                      isActive('/friends') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Friends</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/') ? "default" : "ghost"}
                    className={`w-full justify-start space-x-2 ${
                      isActive('/') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/login') ? "default" : "ghost"}
                    className={`w-full justify-start space-x-2 ${
                      isActive('/login') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/register') ? "default" : "ghost"}
                    className={`w-full justify-start space-x-2 ${
                      isActive('/register') 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>Register</span>
                  </Button>
                </Link>
              </>
            )}
            {user && (
              <div className="pt-4 border-t space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                >
                  <ProfilePicture name={user.name} size="sm" userId={user.id} key={`mobile-${profileUpdateKey}`} />
                  <span>{user.name}</span>
                  <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} />
                  {/* <User className="h-4 w-4" />
                  <span>{user.name}</span>
                  <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} /> */}
                </Button>
                {userMenuOpen && (
                  <div className="pl-4 space-y-1">
                    <Link to="/messenger" onClick={() => {
                      setIsMobileMenuOpen(false);
                      setUserMenuOpen(false);
                    }}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                      >
                        <MessagesSquare className="h-4 w-4" />
                        <span>Messenger</span>
                      </Button>
                    </Link>
                    <Link to="/my-profile" onClick={() => {
                      setIsMobileMenuOpen(false);
                      setUserMenuOpen(false);
                    }}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                      >
                        <IdCard className="h-4 w-4" />
                        <span>Profile</span>
                      </Button>
                    </Link>
                    <Link to="/settings" onClick={() => {
                      setIsMobileMenuOpen(false);
                      setUserMenuOpen(false);
                    }}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                        setUserMenuOpen(false);
                      }}
                      className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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