import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { type Icon } from 'lucide-react';

interface ToolButtonProps {
  id: string;
  label: string;
  icon: Icon;
  isActive: boolean;
  isExpanded: boolean;
  userRole?: 'author' | 'publisher' | null;
  isOnAssignedPage?: boolean;
  onClick: () => void;
}

const getToolInstruction = (toolId: string): { title: string; description: string } => {
  const instructions: Record<string, { title: string; description: string }> = {
    select: { title: 'Select Tool', description: 'Click to select elements, drag to select multiple.'  },
    pan: { title: 'Pan Tool', description: 'Drag to pan around the canvas' },
    text: { title: 'Text Tool', description: 'Click and drag to define the size of the text box' },
    question: { title: 'Question Tool', description: 'Click and drag to define the size of the question textbox' },
    answer: { title: 'Answer Tool', description: 'Click and drag to define the size of the answer textbox' },
    photo: { title: 'Photo Tool', description: 'Click to place a photo from your library' },
    line: { title: 'Line Tool', description: 'Click and drag to draw a line' },
    circle: { title: 'Circle Tool', description: 'Click and drag to draw a circle' },
    rect: { title: 'Rectangle Tool', description: 'Click and drag to draw a rectangle' },
    brush: { title: 'Brush Tool', description: 'Click and drag to draw with the brush' }
  };
  return instructions[toolId] || { title: `${toolId} Tool`, description: `Use ${toolId} tool` };
};

export function ToolButton({ id, label, icon: Icon, isActive, isExpanded, userRole, isOnAssignedPage, onClick }: ToolButtonProps) {
  const instruction = getToolInstruction(id);
  const isAuthor = userRole === 'author';
  const isDisabled = (isAuthor && id !== 'pan' && !isOnAssignedPage) || (isAuthor && id === 'question');
  
  return (
    <Tooltip title={instruction.title} description={instruction.description} side="right">
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={isDisabled ? undefined : onClick}
        disabled={isDisabled}
        className={`w-full justify-center p-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon className="h-5 w-5" />
      </Button>
    </Tooltip>
  );
}