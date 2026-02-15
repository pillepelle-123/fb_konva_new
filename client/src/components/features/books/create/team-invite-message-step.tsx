import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Textarea } from '../../../ui/primitives/textarea';
import { StepContainer } from '../shared/step-container';
import { useAuth } from '../../../../context/auth-context';
import type { WizardState } from './types';

interface TeamInviteMessageStepProps {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['team']>) => void;
}

const DEFAULT_MESSAGE = `Hey [friend name],

I've created a new book called "[book name]" and I'd love for you to be part of it! Would you like to collaborate?

Best,
[user name]`;

const FRIEND_NAME_PLACEHOLDER = '[friend name]';

export function TeamInviteMessageStep({
  wizardState,
  onChange,
}: TeamInviteMessageStepProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState(wizardState.team.inviteMessage || '');

  useEffect(() => {
    setMessage(wizardState.team.inviteMessage || '');
  }, [wizardState.team.inviteMessage]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onChange({ inviteMessage: value.trim() || undefined });
  };

  const handleInsertFriendName = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = message;
      const newValue =
        currentValue.substring(0, start) +
        FRIEND_NAME_PLACEHOLDER +
        currentValue.substring(end);
      handleMessageChange(newValue);
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + FRIEND_NAME_PLACEHOLDER.length,
          start + FRIEND_NAME_PLACEHOLDER.length
        );
      }, 0);
    } else {
      // Fallback: append to end
      handleMessageChange(message + FRIEND_NAME_PLACEHOLDER);
    }
  };

  const placeholderMessage = DEFAULT_MESSAGE
    .replace('[book name]', wizardState.basic.name || '[book name]')
    .replace('[user name]', user?.name || '[user name]')
    .replace('[friend name]', FRIEND_NAME_PLACEHOLDER);

  return (
    <StepContainer variant="default" padding="lg" className="flex flex-col gap-4 rounded-2xl shadow-sm flex-1 min-h-0 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Invite Message</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Add a personal message that will be sent to your collaborators. Leave it empty to use the default message.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Message</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleInsertFriendName}
            className="text-xs"
          >
            Insert friend's name
          </Button>
        </div>
        <Textarea
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder={placeholderMessage}
          className="min-h-[200px]"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="px-1 py-0.5 bg-muted rounded text-xs">[friend name]</code> to personalize the message for each collaborator.
        </p>
      </div>
    </StepContainer>
  );
}


