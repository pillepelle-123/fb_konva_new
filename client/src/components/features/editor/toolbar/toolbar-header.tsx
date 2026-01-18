import { Button } from '../../../ui/primitives/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface ToolbarToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ToolbarToggle({ isExpanded, onToggle, disabled }: ToolbarToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      disabled={disabled}
      className="h-8 w-8 p-0 flex items-left justify-left"
    >
      {isExpanded ? (
        <PanelLeftClose className="h-5 w-5" />
      ) : (
        <PanelLeftOpen className="h-5 w-5" />
      )}
    </Button>
  );
}

interface ToolbarHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
  activeTool?: string;
  hideToggle?: boolean;
}

export function ToolbarHeader({ isExpanded, onToggle, hideToggle }: ToolbarHeaderProps) {
  return (
    <div className='flex items-start justify-start border-b border-gray-200 h-8'>
      {!hideToggle && <ToolbarToggle isExpanded={isExpanded} onToggle={onToggle} />}
    </div>
  );
}