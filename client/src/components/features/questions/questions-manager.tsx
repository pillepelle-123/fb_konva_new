import { useAuth } from '../context/auth-context';
import { Dialog, DialogContent } from '../../ui/overlays/dialog';
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
  alert('QuestionsManager loaded!');
  const { token: contextToken, user } = mode === 'manage' ? useAuth() : { token: null, user: null };
  const token = propToken || contextToken;

  // console.log('QuestionsManager - user role:', user?.role, 'mode:', mode);

  // Prevent authors from accessing questions manager
  if (user?.role === 'author') {
    // console.log('Blocking author access');
    onClose();
    return null;
  }

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
          showAsContent={true}
        />
      </DialogContent>
    </Dialog>
  );
}