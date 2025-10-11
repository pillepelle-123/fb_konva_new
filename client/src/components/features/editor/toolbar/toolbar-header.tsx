import { CardHeader, CardTitle } from '../../../ui/composites/card';
import { ToolbarToggle } from './toolbar-toggle';
import { Button } from '../../../ui/primitives/button';
import { type Icon } from 'lucide-react';

interface ToolbarHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
  activeTool?: string;
  toolGroups?: Array<{
    name: string;
    tools: Array<{
      id: string;
      label: string;
      icon: Icon;
    }>;
  }>;
  hideToggle?: boolean;
}

export function ToolbarHeader({ isExpanded, onToggle, activeTool, toolGroups, hideToggle }: ToolbarHeaderProps) {
  const getActiveTool = () => {
    if (!activeTool || !toolGroups) return null;
    for (const group of toolGroups) {
      const tool = group.tools.find(t => t.id === activeTool);
      if (tool) return tool;
    }
    return null;
  };

  const activeToolData = getActiveTool();

  return (
    <CardHeader className="p-1 pr-1 border-b">
      <div className="flex items-center justify-center">
        {isExpanded && activeToolData && (
          <Button variant="secondary" size="xs" className=" pointer-events-none flex-1 mr-2">
            <activeToolData.icon className="h-4 w-4 mr-2" />
            {activeToolData.label}
          </Button>
        )}
        {!hideToggle && <ToolbarToggle isExpanded={isExpanded} onToggle={onToggle} />}
      </div>
    </CardHeader>
  );
}