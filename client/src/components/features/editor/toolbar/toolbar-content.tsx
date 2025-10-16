import { ToolGroup } from './tool-group';
import { type Icon } from 'lucide-react';
import { useState, forwardRef, useImperativeHandle } from 'react';

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

export const ToolbarContent = forwardRef<{ closeSubmenus: () => void }, ToolbarContentProps>(function ToolbarContent({ toolGroups, activeTool, isExpanded, userRole, isOnAssignedPage, onToolSelect }, ref) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    closeSubmenus: () => setActiveSubmenu(null)
  }));

  // Hide content for authors on non-assigned pages
  if (userRole === 'author' && !isOnAssignedPage) {
    return null;
  }

  return (
    <div className={`p-2 overflow-y-auto scrollbar-hide flex-1 min-h-0 relative`}>
      {toolGroups.map((group, groupIndex) => (
        <ToolGroup
          key={group.name}
          name={group.name}
          tools={group.tools}
          activeTool={activeTool}
          isExpanded={isExpanded}
          showSeparator={false}
          userRole={userRole}
          isOnAssignedPage={isOnAssignedPage}
          onToolSelect={onToolSelect}
          activeSubmenu={activeSubmenu}
          onSubmenuChange={setActiveSubmenu}
        />
      ))}
    </div>
  );
});