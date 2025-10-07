import { type Icon } from 'lucide-react';
import { ToolButton } from './tool-button';
import { ToolGroupLabel } from './tool-group-label';
import { ToolGroupSeparator } from './tool-group-separator';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../ui/composites/accordion';

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
  userRole?: 'author' | 'publisher' | null;
  isOnAssignedPage?: boolean;
  onToolSelect: (toolId: string) => void;
}

export function ToolGroup({ name, tools, activeTool, isExpanded, showSeparator, userRole, isOnAssignedPage, onToolSelect }: ToolGroupProps) {
  return (
    <div>
      {showSeparator && <ToolGroupSeparator />}
      {isExpanded ? (
        <Accordion type="single" collapsible>
          <AccordionItem value={name}>
            <AccordionTrigger className="py-2">
              <ToolGroupLabel>{name}</ToolGroupLabel>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 border-b-0">
                {tools.map(tool => (
                  <ToolButton
                    key={tool.id}
                    id={tool.id}
                    label={tool.label}
                    icon={tool.icon}
                    isActive={activeTool === tool.id}
                    isExpanded={isExpanded}
                    userRole={userRole}
                    isOnAssignedPage={isOnAssignedPage}
                    onClick={() => onToolSelect(tool.id)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
              userRole={userRole}
              isOnAssignedPage={isOnAssignedPage}
              onClick={() => onToolSelect(tool.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}