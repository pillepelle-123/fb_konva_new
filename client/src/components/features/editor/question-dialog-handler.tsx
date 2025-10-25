import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../../ui/overlays/dialog';
import QuestionsManagerDialog from './questions-manager-dialog';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';

export default function QuestionDialogHandler() {
  const { user } = useAuth();
  const { state } = useEditor();
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  useEffect(() => {
    const handleOpenQuestionDialog = () => {
      setShowQuestionDialog(true);
    };

    window.addEventListener('openQuestionDialog', handleOpenQuestionDialog);
    return () => {
      window.removeEventListener('openQuestionDialog', handleOpenQuestionDialog);
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
            window.dispatchEvent(new CustomEvent('questionSelected', {
              detail: { questionId, questionText }
            }));
            setShowQuestionDialog(false);
          }}
          token={user.token || ''}
          onClose={() => setShowQuestionDialog(false)}
        />
      </DialogContent>
    </Dialog>
  );
}