import { ToolbarToggle } from './toolbar-toggle';

interface ToolbarHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
  activeTool?: string;
  hideToggle?: boolean;
}

export function ToolbarHeader({ isExpanded, onToggle, hideToggle }: ToolbarHeaderProps) {
  return (
    <div className="flex items-center justify-end border-b border-gray-200 h-8">
      {!hideToggle && <ToolbarToggle isExpanded={isExpanded} onToggle={onToggle} />}
    </div>
  );
}