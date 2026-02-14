import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Tooltip } from '../../ui/composites/tooltip';
export interface NotificationEntryProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  linkTo: string;
  onLinkClick?: () => void;
  onHide: () => void;
  isUnread: boolean;
  onToggleRead: () => void;
  /** Additional actions on the right (e.g. Accept/Reject) */
  actions?: ReactNode;
  /** Badge number (e.g. unread count) */
  badge?: number;
}

export default function NotificationEntry({
  icon,
  title,
  subtitle,
  linkTo,
  onLinkClick,
  onHide,
  isUnread,
  onToggleRead,
  actions,
  badge
}: NotificationEntryProps) {
  return (
    <div
      className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isUnread ? 'bg-highlight/10' : ''
      } hover:bg-muted/60`}
    >
      <Link
        to={linkTo}
        onClick={onLinkClick}
        className="flex-1 min-w-0 flex items-start gap-3 no-underline text-foreground"
      >
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm break-words leading-snug">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
          {/* {badge !== undefined && badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 mt-1 text-xs font-medium rounded-full bg-highlight text-primary-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          )} */}
        </div>
      </Link>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {actions}
        <Tooltip content={isUnread ? 'Mark as read' : 'Mark as unread'} side="bottom">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleRead();
            }}
            className={`h-2.5 w-2.5 rounded-full border-0 p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors flex-shrink-0 ${
              isUnread ? 'bg-highlight' : 'bg-muted-foreground/50 hover:bg-muted-foreground'
            }`}
            aria-label={isUnread ? 'Mark as read' : 'Mark as unread'}
          />
        </Tooltip>
        <Tooltip content="Hide notification" side="bottom">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onHide();
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Hide"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
