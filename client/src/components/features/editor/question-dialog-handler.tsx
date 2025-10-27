import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../../ui/overlays/dialog';
import QuestionsManagerDialog from './questions-manager-dialog';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';

export default function QuestionDialogHandler() {
  const { user } = useAuth();
  const { state } = useEditor();
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [currentElementId, setCurrentElementId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenQuestionDialog = (event: CustomEvent) => {
      const { elementId } = event.detail || {};
      setCurrentElementId(elementId);
      setShowQuestionDialog(true);
    };

    window.addEventListener('openQuestionDialog', handleOpenQuestionDialog as EventListener);
    return () => {
      window.removeEventListener('openQuestionDialog', handleOpenQuestionDialog as EventListener);
    };
  }, []);

  if (!showQuestionDialog || !state.currentBook || !user) {
    return null;
  }

  return (
    <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden z-[10001]">
        <QuestionsManagerDialog
          bookId={state.currentBook.id}
          bookName={state.currentBook.name}
          onQuestionSelect={(questionId, questionText) => {
            if (currentElementId) {
              // Dispatch element-specific event
              window.dispatchEvent(new CustomEvent(`questionSelected-${currentElementId}`, {
                detail: { questionId, questionText }
              }));
            }
            // Also dispatch global event for backward compatibility
            window.dispatchEvent(new CustomEvent('questionSelected', {
              detail: { questionId, questionText, elementId: currentElementId }
            }));
            setShowQuestionDialog(false);
            setCurrentElementId(null);
          }}
          token={user.token || ''}
          onClose={() => setShowQuestionDialog(false)}
        />
      </DialogContent>
    </Dialog>
  );
}