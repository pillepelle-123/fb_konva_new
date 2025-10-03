import { type Icon } from 'lucide-react';
import { ToolButton } from '../ui/tool-button';
import { ToolGroupLabel } from '../ui/tool-group-label';
import { ToolGroupSeparator } from '../ui/tool-group-separator';

interface Tool {
  id: string;
  label: string;
  icon: Icon;
}

interface ToolGroupProps {
  name: string;
  tools: Tool[];
  activeTool: string;
  isExpanded: boolean;
  showSeparator: boolean;
  onToolSelect: (toolId: string) => void;
}

export function ToolGroup({ name, tools, activeTool, isExpanded, showSeparator, onToolSelect }: ToolGroupProps) {
  return (
    <div>
      {showSeparator && <ToolGroupSeparator />}
      {isExpanded && (
        <ToolGroupLabel>{name}</ToolGroupLabel>
      )}
      <div className="space-y-1">
        {tools.map(tool => (
          <ToolButton
            key={tool.id}
            id={tool.id}
            label={tool.label}
            icon={tool.icon}
            isActive={activeTool === tool.id}
            isExpanded={isExpanded}
            onClick={() => onToolSelect(tool.id)}
          />
        ))}
      </div>
    </div>
  );
}