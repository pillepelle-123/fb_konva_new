import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  closeOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, actions, closeOnBackdrop = true, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-lg',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div 
        className={`fixed left-[50%] top-[50%] z-50 w-full ${sizeClasses[size]} h-[85vh] min-h-[600px] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg sm:rounded-lg overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-shrink-0 p-6 pb-4">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className="leading-none tracking-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-4">
            {children}
          </div>
        </div>
        
        {actions && (
          <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}