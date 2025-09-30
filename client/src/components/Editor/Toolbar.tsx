import { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  MousePointer, 
  Hand, 
  Type, 
  HelpCircle, 
  MessageSquare, 
  Image, 
  Minus, 
  Circle, 
  Square, 
  Paintbrush,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Toolbar() {
  const { state, dispatch } = useEditor();
  const [isExpanded, setIsExpanded] = useState(true);

  const tools = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'pan', label: 'Pan', icon: Hand },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'question', label: 'Question', icon: HelpCircle },
    { id: 'answer', label: 'Answer', icon: MessageSquare },
    { id: 'photo', label: 'Photo', icon: Image },
    { id: 'line', label: 'Line', icon: Minus },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'rect', label: 'Rectangle', icon: Square },
    { id: 'brush', label: 'Brush', icon: Paintbrush },
  ];

  return (
    <Card className={`h-full rounded-none border-r-0 border-t-0 border-b-0 shadow-sm transition-all duration-200 ${
      isExpanded ? 'w-48' : 'w-16'
    }`}>
      {/* Header */}
      <CardHeader className="p-3 border-b">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <CardTitle className="text-sm font-medium">Tools</CardTitle>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Tool buttons */}
      <CardContent className="p-2 space-y-1">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={state.activeTool === tool.id ? "default" : "ghost"}
              size="sm"
              onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool.id as any })}
              className={`w-full justify-start space-x-2 ${
                isExpanded ? 'px-3' : 'px-2'
              }`}
              title={!isExpanded ? tool.label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {isExpanded && (
                <span className="text-sm">{tool.label}</span>
              )}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}