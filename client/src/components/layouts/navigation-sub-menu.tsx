import { Link } from 'react-router-dom';
import { Button } from '../ui/primitives/button';
import { MessagesSquare, IdCard, Settings, UserStar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface NavigationSubMenuProps {
  onClose: () => void;
}

export default function NavigationSubMenu({ onClose }: NavigationSubMenuProps) {
  const { logout, user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div ref={menuRef} className="fixed top-16 right-4 bg-white border rounded-md shadow-lg py-1 min-w-[160px] z-[9999]">
      <Link to="/messenger" onClick={onClose}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start space-x-2 py-6 rounded-none text-foreground hover:bg-muted"
        >
          <MessagesSquare className="h-5 w-5" />
          <span>Messenger</span>
        </Button>
      </Link>
      <Link to="/my-profile" onClick={onClose}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start space-x-2 py-6 rounded-none text-foreground hover:bg-muted"
        >
          <IdCard className="h-5 w-5" />
          <span>Profile</span>
        </Button>
      </Link>
      <Link to="/settings" onClick={onClose}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start space-x-2 py-6 rounded-none text-foreground hover:bg-muted"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Button>
      </Link>
      {user?.role === 'admin' && (
        <Link to="/admin" onClick={onClose}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start space-x-2 py-6 rounded-none text-foreground hover:bg-muted"
          >
            <UserStar className="h-5 w-5" />
            <span>Admin</span>
          </Button>
        </Link>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          logout();
          onClose();
        }}
        className="w-full justify-start space-x-2 py-6 rounded-none text-foreground hover:bg-muted"
      >
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </Button>
    </div>,
    document.body
  );
}