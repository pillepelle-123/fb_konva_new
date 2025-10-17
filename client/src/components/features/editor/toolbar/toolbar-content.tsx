import { ToolGroup } from './tool-group';
import { type Icon, Info } from 'lucide-react';
import { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../../../ui/primitives/button';
import { ShortcutsDialog } from './shortcuts-dialog';

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
  const [showShortcuts, setShowShortcuts] = useState(false);

  useImperativeHandle(ref, () => ({
    closeSubmenus: () => setActiveSubmenu(null)
  }));

  // Hide content for authors on non-assigned pages
  if (userRole === 'author' && !isOnAssignedPage) {
    return null;
  }

  return (
    <>
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
        
        <div className="mt-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowShortcuts(true)}
            className="w-full flex flex-col items-center gap-1 h-auto py-2"
          >
            <Info className="h-4 w-4" />
            <span className="text-xs">Shortcuts</span>
          </Button>
        </div>
      </div>
      
      <ShortcutsDialog 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </>
  );
});