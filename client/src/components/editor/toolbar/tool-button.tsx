import { Button } from '../../ui/primitives/button';
import { Tooltip } from '../../ui/tooltip';
import { type Icon } from 'lucide-react';

interface ToolButtonProps {
  id: string;
  label: string;
  icon: Icon;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

const getToolInstruction = (toolId: string): { title: string; description: string } => {
  const instructions: Record<string, { title: string; description: string }> = {
    select: { title: 'Select Tool', description: 'Click to select elements, drag to select multiple.' },
    pan: { title: 'Pan Tool', description: 'Drag to pan around the canvas' },
    text: { title: 'Text Tool', description: 'Click on the canvas and drag to create a text box' },
    question: { title: 'Question Tool', description: 'Click on the canvas and drag to select or add a question' },
    answer: { title: 'Answer Tool', description: 'Click on the canvas and drag to add an answer field' },
    photo: { title: 'Photo Tool', description: 'Click to place a photo from your library' },
    line: { title: 'Line Tool', description: 'Click on the canvas and drag to draw a line' },
    circle: { title: 'Circle Tool', description: 'Click on the canvas and drag to draw a circle' },
    rect: { title: 'Rectangle Tool', description: 'Click on the canvas and drag to draw a rectangle' },
    brush: { title: 'Brush Tool', description: 'Click on the canvas and drag to draw with the brush' }
  };
  return instructions[toolId] || { title: `${toolId} Tool`, description: `Use ${toolId} tool` };
};

export function ToolButton({ id, label, icon: Icon, isActive, isExpanded, onClick }: ToolButtonProps) {
  const instruction = getToolInstruction(id);
  
  return (
    <Tooltip title={instruction.title} description={instruction.description} side="right">
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={onClick}
        className={`w-full justify-start space-x-2 ${
          isExpanded ? 'px-3' : 'px-2'
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {isExpanded && (
          <span className="text-sm">{label}</span>
        )}
      </Button>
    </Tooltip>
  );
}