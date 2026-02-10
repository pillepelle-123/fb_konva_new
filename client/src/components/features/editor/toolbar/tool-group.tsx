import { ToolButton } from './tool-button';
import { ToolGroupLabel } from './tool-group-label';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Separator } from '../../../ui/primitives/separator';

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
  activeSubmenu?: string | null;
  onSubmenuChange?: (submenu: string | null) => void;
}

export function ToolGroup({ name, tools, activeTool, isExpanded, showSeparator, onToolSelect, activeSubmenu, onSubmenuChange }: ToolGroupProps) {
  const isSubmenuActive = activeSubmenu === name;

  if (isSubmenuActive) {
    return (
      <div className="absolute inset-0 bg-background z-10">
        <div className="p-2">
          <div className="flex flex-col items-start mb-2">

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSubmenuChange?.(null)}
            className="px-2 h-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          
          </div>
          <div className="grid grid-cols-2 gap-1">
            {tools.map(tool => (
              <ToolButton
                key={tool.id}
                id={tool.id}
                label={tool.label}
                icon={tool.icon}
                isActive={activeTool === tool.id}
                isExpanded={false}
                onClick={() => {
                  onToolSelect(tool.id);
                  onSubmenuChange?.(null);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showSeparator && <Separator />}
      {isExpanded ? (
        <Button 
          variant="ghost_hover" 
          className="w-full justify-between px-0 py-2 rlative overflow-hidden"
          onClick={() => onSubmenuChange?.(name)}
        >
          <ToolGroupLabel>{name}</ToolGroupLabel>
          <div className="flex items-center opacity-40 -space-x-1">
            {tools.slice(0, 2).map((tool) => {
              const IconComponent = tool.icon;
              return (
                <IconComponent 
                  key={tool.id}
                  className="h-5 w-5 mx-1"
                />
              );
            })}
          </div>
        </Button>
      ) : (
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
      )}
    </div>
  );
}