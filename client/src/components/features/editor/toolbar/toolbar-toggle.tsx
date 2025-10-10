import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ToolbarToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ToolbarToggle({ isExpanded, onToggle, disabled }: ToolbarToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      disabled={disabled}
      className="h-8 w-8 p-0 flex items-center justify-center"
    >
      {isExpanded ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </Button>
  );
}