import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/utils';

interface DropdownPanelProps {
  open: boolean;
  onClose: () => void;
  /** Ref zum Trigger-Button – Klicks darauf werden nicht als "außerhalb" gewertet (für Toggle-Verhalten) */
  triggerRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  /** Zusätzliche Klassen für das Panel (Farben, Rahmen, Padding, min-width für Desktop) */
  className?: string;
}

/**
 * Einheitliches Dropdown-Panel für Navigation und Notifications.
 * - Mobile: 96% Breite, mittig ausgerichtet
 * - Desktop: rechts am Trigger ausgerichtet
 */
export default function DropdownPanel({
  open,
  onClose,
  triggerRef,
  children,
  className,
}: DropdownPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = triggerRef?.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);
      if (!clickedPanel && !clickedTrigger) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        'fixed top-16 left-1/2 -translate-x-1/2 w-[96%] sm:left-auto sm:right-4 sm:translate-x-0 sm:w-auto sm:max-w-none z-[9999]',
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
