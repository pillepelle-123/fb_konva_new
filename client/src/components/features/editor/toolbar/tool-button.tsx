import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Triangle, TriangleRight, type Icon } from 'lucide-react';

interface ToolButtonProps {
  id: string;
  label: string;
  icon: Icon;
  isActive: boolean;
  isExpanded: boolean;
  userRole?: 'author' | 'publisher' | null;
  isOnAssignedPage?: boolean;
  hasPopover?: boolean;
  onClick: (e?: React.MouseEvent) => void;
}

const getToolInstruction = (toolId: string): { title: string; description: string } => {
  const instructions: Record<string, { title: string; description: string }> = {
    select: { title: 'Select Tool', description: 'Click to select elements, drag to select multiple.'  },
    pan: { title: 'Pan Tool', description: 'Drag to pan around the canvas' },
    text: { title: 'Text Tool', description: 'Click and drag to define the size of the text box' },
    question: { title: 'Question Tool', description: 'Click and drag to define the size of the question textbox' },
    answer: { title: 'Answer Tool', description: 'Click and drag to define the size of the answer textbox' },
    image: { title: 'Image Tool', description: 'Click to place an image from your library' },
    line: { title: 'Line Tool', description: 'Click and drag to draw a line' },
    circle: { title: 'Circle Tool', description: 'Click and drag to draw a circle' },
    rect: { title: 'Rectangle Tool', description: 'Click and drag to draw a rectangle' },
    brush: { title: 'Brush Tool', description: 'Click and drag to draw with the brush' }
  };
  return instructions[toolId] || { title: `${toolId} Tool`, description: `Use ${toolId} tool` };
};

export function ToolButton({ id, label, icon: Icon, isActive, isExpanded, userRole, isOnAssignedPage, hasPopover, onClick }: ToolButtonProps) {
  const instruction = getToolInstruction(id);
  const isAuthor = userRole === 'author';
  const isDisabled = (isAuthor && id !== 'pan' && !isOnAssignedPage) || (isAuthor && id === 'question');
  

  
  return (
      <Button
        variant={isActive ? "default" : "ghost_hover"}
        size="sm"
        onClick={isDisabled ? undefined : (e) => onClick(e)}
        disabled={isDisabled}
        className={`w-full justify-center p-2 relative ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon className="h-5 w-5" />
        {hasPopover && (
          // <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-foreground border-r-[4px] border-r-transparent rotate-100" />
          <TriangleRight className='absolute bottom-0 right-0 w-2 h-3 stroke-foreground fill-foreground'/>
          // <Triangle className='absolute bottom-0 right-0 w-2 h-2 stroke-foreground fill-foreground rotate-[2.342rad]' />
        )}
      </Button>
  );
}