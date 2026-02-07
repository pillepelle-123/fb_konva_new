import { Button } from '../../../ui/primitives/button';
import { Check, X } from 'lucide-react';

interface SettingsFormFooterProps {
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SettingsFormFooter({ hasChanges, onSave, onDiscard }: SettingsFormFooterProps) {
  return (
    <div className="sticky bottom-0 bg-background border-t p-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={onDiscard}
          disabled={!hasChanges}
          className="flex-1"
        >
          <X className="h-3 w-3 mr-1" />
          Discard
        </Button>
        <Button
          variant="default"
          size="xs"
          onClick={onSave}
          disabled={!hasChanges}
          className="flex-1"
        >
          <Check className="h-3 w-3 mr-1" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
