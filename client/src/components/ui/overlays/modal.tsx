import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  closeOnBackdrop?: boolean;
}

export function Modal({ isOpen, onClose, title, children, actions, closeOnBackdrop = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div 
        className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="leading-none tracking-tight">
            {title}
          </h2>
        </div>
        
        <div className="space-y-4 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
        
        {actions && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}