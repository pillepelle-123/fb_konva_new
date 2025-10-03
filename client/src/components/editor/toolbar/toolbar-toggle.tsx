import { Button } from '../../ui/primitives/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ToolbarToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function ToolbarToggle({ isExpanded, onToggle }: ToolbarToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="h-8 w-8 p-0"
    >
      {isExpanded ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </Button>
  );
}