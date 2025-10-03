import { useAuth } from '../context/auth-context';
import { Dialog, DialogContent } from './ui/overlays/dialog';
import QuestionsManagerContent from './questions-manager-content';

interface QuestionsManagerProps {
  bookId: number;
  bookName: string;
  onClose: () => void;
  onQuestionSelect?: (questionId: number, questionText: string) => void;
  mode?: 'manage' | 'select';
  token?: string;
  showAsContent?: boolean;
}

export default function QuestionsManager({ bookId, bookName, onClose, onQuestionSelect, mode = 'manage', token: propToken, showAsContent = false }: QuestionsManagerProps) {
  const { token: contextToken } = mode === 'manage' ? useAuth() : { token: null };
  const token = propToken || contextToken;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <QuestionsManagerContent
          bookId={bookId}
          bookName={bookName}
          onClose={onClose}
          onQuestionSelect={onQuestionSelect}
          mode={mode}
          token={token || ''}
          showAsContent={showAsContent}
        />
      </DialogContent>
    </Dialog>
  );
}