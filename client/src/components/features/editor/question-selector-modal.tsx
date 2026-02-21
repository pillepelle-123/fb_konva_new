import { useState } from 'react';
import { Modal } from '../../ui/overlays/modal';
import { useEditor } from '../../../context/editor-context';
import { QuestionSelectorContent } from './question-selector-content';

interface QuestionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionSelect: (questionId: string, questionText: string, questionPosition?: number, elementId?: string) => void;
  elementId?: string;
}

export function QuestionSelectorModal({
  isOpen,
  onClose,
  onQuestionSelect,
  elementId,
}: QuestionSelectorModalProps) {
  const { state } = useEditor();
  const [actions, setActions] = useState<React.ReactNode>(null);
  const bookName = state.currentBook?.name || '';

  const getTitle = (view: string) => {
    switch (view) {
      case 'main': return `Select Question - ${bookName}`;
      case 'manage': return 'Manage Questions';
      case 'pool': return 'Browse Question Pool';
      default: return `Select Question - ${bookName}`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle}
      initialView="main"
      size="lg"
      actions={actions}
    >
      {(view, navigate) => (
        <QuestionSelectorContent
          elementId={elementId}
          onQuestionSelect={onQuestionSelect}
          onClose={onClose}
          onActionsReady={setActions}
          view={view as 'main' | 'manage' | 'pool'}
          navigate={navigate}
        />
      )}
    </Modal>
  );
}
