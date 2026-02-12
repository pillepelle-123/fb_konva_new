import { useState, useCallback } from 'react';
import { Modal } from '../../ui/overlays/modal';
import BookManagerContent from './book-manager-content';

interface BookManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: number;
  initialTab?: string;
}

export default function BookManagerModal({ isOpen, onClose, bookId, initialTab }: BookManagerModalProps) {
  const [actions, setActions] = useState<React.ReactNode>(null);

  const handleActionsReady = useCallback((newActions: React.ReactNode) => {
    setActions(newActions);
  }, []);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Manager"
      size="lg"
      closeOnBackdrop={false}
      actions={actions}
    >
      <div className="overflow-hidden flex-1 pr-2">
        <BookManagerContent
          bookId={bookId}
          onClose={onClose}
          hideActions={true}
          onActionsReady={handleActionsReady}
          initialTab={initialTab}
        />
      </div>
    </Modal>
  );
}
