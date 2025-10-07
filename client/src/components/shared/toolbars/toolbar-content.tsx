import { CardContent } from '../../ui/composites/card';
import { ToolGroup } from '../../features/editor/toolbar/tool-group';
import { type Icon } from 'lucide-react';

interface Tool {
  id: string;
  label: string;
  icon: Icon;
}

interface ToolGroupData {
  name: string;
  tools: Tool[];
}

interface ToolbarContentProps {
  toolGroups: ToolGroupData[];
  activeTool: string;
  isExpanded: boolean;
  userRole?: 'author' | 'publisher' | null;
  isOnAssignedPage?: boolean;
  onToolSelect: (toolId: string) => void;
}

export function ToolbarContent({ toolGroups, activeTool, isExpanded, userRole, isOnAssignedPage, onToolSelect }: ToolbarContentProps) {
  return (
    <CardContent className="p-1 overflow-y-auto scrollbar-hide flex-1 min-h-0">
      {toolGroups.map((group, groupIndex) => (
        <ToolGroup
          key={group.name}
          name={group.name}
          tools={group.tools}
          activeTool={activeTool}
          isExpanded={isExpanded}
          showSeparator={groupIndex > 0}
          userRole={userRole}
          isOnAssignedPage={isOnAssignedPage}
          onToolSelect={onToolSelect}
        />
      ))}
    </CardContent>
  );
}