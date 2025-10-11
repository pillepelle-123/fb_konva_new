import { CardContent } from '../../../ui/composites/card';
import { ToolGroup } from './tool-group';
import { type Icon } from 'lucide-react';
import { useState } from 'react';

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
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // Hide content for authors on non-assigned pages
  if (userRole === 'author' && !isOnAssignedPage) {
    return null;
  }

  return (
    <CardContent className="p-2 overflow-y-auto scrollbar-hide flex-1 min-h-0 relative">
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
          activeSubmenu={activeSubmenu}
          onSubmenuChange={setActiveSubmenu}
        />
      ))}
    </CardContent>
  );
}