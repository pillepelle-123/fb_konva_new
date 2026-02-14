import { Button } from '../../../ui/primitives/button';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Check, X, BookCheck } from 'lucide-react';

interface SettingsFormFooterProps {
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** When true, show "Apply to entire book" checkbox left of Cancel button */
  showApplyToEntireBook?: boolean;
  applyToEntireBook?: boolean;
  onApplyToEntireBookChange?: (checked: boolean) => void;
}

export function SettingsFormFooter({
  hasChanges,
  onSave,
  onDiscard,
  showApplyToEntireBook = false,
  applyToEntireBook = false,
  onApplyToEntireBookChange
}: SettingsFormFooterProps) {
  return (
    <div className="sticky bottom-0 bg-background border-t p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {showApplyToEntireBook && onApplyToEntireBookChange && (
            <div className="flex items-center gap-1">
              <Tooltip content="Apply to entire book" side="left">
                <Checkbox
                  id="apply-to-entire-book"
                  checked={applyToEntireBook}
                  onCheckedChange={(checked) => onApplyToEntireBookChange(checked === true)}
                />
              </Tooltip>
              <BookCheck className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-1">
          <Button
            variant="outline"
            size="xs"
            onClick={onDiscard}
            disabled={!hasChanges}
            className="flex-1"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            variant="default"
            size="xs"
            onClick={onSave}
            disabled={!hasChanges && !applyToEntireBook}
            className="flex-1"
          >
            <Check className="h-3 w-3 mr-1" />
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
