import { Button } from './button';
import { type Icon } from 'lucide-react';

interface ToolButtonProps {
  id: string;
  label: string;
  icon: Icon;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

export function ToolButton({ id, label, icon: Icon, isActive, isExpanded, onClick }: ToolButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className={`w-full justify-start space-x-2 ${
        isExpanded ? 'px-3' : 'px-2'
      }`}
      title={!isExpanded ? label : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {isExpanded && (
        <span className="text-sm">{label}</span>
      )}
    </Button>
  );
}