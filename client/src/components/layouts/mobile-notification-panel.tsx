import DropdownPanel from '../ui/overlays/dropdown-panel';
import NotificationPopover from '../features/messenger/notification-popover';

interface MobileNotificationPanelProps {
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function MobileNotificationPanel({
  open,
  onClose,
  onUpdate,
  triggerRef,
}: MobileNotificationPanelProps) {
  return (
    <DropdownPanel
      open={open}
      onClose={onClose}
      triggerRef={triggerRef}
      className="rounded-lg bg-popover border shadow-md p-4 text-popover-foreground sm:min-w-[280px]"
    >
      <NotificationPopover onUpdate={onUpdate} onClose={onClose} />
    </DropdownPanel>
  );
}
