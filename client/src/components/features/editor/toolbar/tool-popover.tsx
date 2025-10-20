import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../ui/primitives/button';
import { ToolButton } from './tool-button';
import { X, Square, Minus, Circle, Heart, Star, MessageCircle, Dog, Cat, Smile } from 'lucide-react';

interface ShapeTool {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ToolPopoverProps {
  activeTool: string;
  userRole?: 'author' | 'publisher' | null;
  isOnAssignedPage?: boolean;
  onToolSelect: (toolId: string) => void;
  children: React.ReactNode;
}

const shapeTools: ShapeTool[] = [
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'speech-bubble', label: 'Speech Bubble', icon: MessageCircle },
  { id: 'dog', label: 'Dog', icon: Dog },
  { id: 'cat', label: 'Cat', icon: Cat },
  { id: 'smiley', label: 'Smiley', icon: Smile }
];

export function ToolPopover({ activeTool, userRole, isOnAssignedPage, onToolSelect, children }: ToolPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleToolSelect = (toolId: string) => {
    onToolSelect(toolId);
    setIsOpen(false);
  };

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ x: rect.right + 8, y: rect.top });
    }
  };

  const handleClick = () => {
    updatePosition();
    setIsOpen(!isOpen);
  };

  return (
    <div ref={triggerRef}>
      <div onClick={handleClick}>
        {children}
      </div>
      {isOpen && createPortal(
        <div 
          className="fixed w-30 p-3 bg-background border rounded-md shadow-lg z-[9999]"
          style={{ left: position.x, top: position.y }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Shapes</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {shapeTools.map(tool => (
              <ToolButton
                key={tool.id}
                id={tool.id}
                label={tool.label}
                icon={tool.icon}
                isActive={activeTool === tool.id}
                isExpanded={false}
                userRole={userRole}
                isOnAssignedPage={isOnAssignedPage}
                onClick={() => handleToolSelect(tool.id)}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}