import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | ((currentView: string) => string);
  children: ReactNode | ((currentView: string, navigate: (view: string) => void) => ReactNode);
  actions?: ReactNode | ((currentView: string, navigate: (view: string) => void) => ReactNode);
  closeOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg';
  initialView?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions,
  closeOnBackdrop = true, 
  size = 'md',
  initialView = 'main'
}: ModalProps) {
  const [currentView, setCurrentView] = useState(initialView);
  
  // Reset view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentView(initialView);
    }
  }, [isOpen, initialView]);
  
  if (!isOpen) return null;
  
  const displayTitle = typeof title === 'function' ? title(currentView) : title;
  const content = typeof children === 'function' 
    ? children(currentView, setCurrentView)
    : children;
  const displayActions = typeof actions === 'function'
    ? actions(currentView, setCurrentView)
    : actions;

  const sizeClasses = {
    sm: 'max-w-lg',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-background/80 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div 
        className={`fixed left-[50%] top-[50%] z-[10000] w-full ${sizeClasses[size]} h-[85vh] min-h-[600px] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg sm:rounded-lg overflow-hidden flex flex-col p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-shrink-0 p-1 pb-4">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className="leading-none tracking-tight">
              {displayTitle}
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
        
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {content}
        </div>
        
        {displayActions && (
          <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-2 pt-4">
            {displayActions}
          </div>
        )}
      </div>
    </div>
  );
}