import { Link } from 'react-router-dom';
import { Button } from '../ui/primitives/button';
import { MessagesSquare, IdCard, Settings, UserStar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import DropdownPanel from '../ui/overlays/dropdown-panel';

interface NavigationSubMenuProps {
  open: boolean;
  onClose: () => void;
  /** Ref zum Trigger-Button – Klicks darauf werden nicht als "außerhalb" gewertet (für Toggle-Verhalten) */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function NavigationSubMenu({ open, onClose, triggerRef }: NavigationSubMenuProps) {
  const { logout, user } = useAuth();

  return (
    <DropdownPanel
      open={open}
      onClose={onClose}
      triggerRef={triggerRef}
      className="rounded-lg bg-white border-b sm:border shadow-lg py-1 sm:min-w-[160px]"
    >
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
    </DropdownPanel>
  );
}