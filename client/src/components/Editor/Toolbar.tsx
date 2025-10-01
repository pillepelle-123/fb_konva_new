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

  const toolGroups = [
    {
      name: 'Selection',
      tools: [
        { id: 'select', label: 'Select', icon: MousePointer },
        { id: 'pan', label: 'Pan', icon: Hand },
      ]
    },
    {
      name: 'Text',
      tools: [
        { id: 'text', label: 'Text', icon: Type },
        { id: 'question', label: 'Question', icon: HelpCircle },
        { id: 'answer', label: 'Answer', icon: MessageSquare },
      ]
    },
    {
      name: 'Photos',
      tools: [
        { id: 'photo', label: 'Photo', icon: Image },
      ]
    },
    {
      name: 'Shapes',
      tools: [
        { id: 'line', label: 'Line', icon: Minus },
        { id: 'circle', label: 'Circle', icon: Circle },
        { id: 'rect', label: 'Rectangle', icon: Square },
      ]
    },
    {
      name: 'Drawing',
      tools: [
        { id: 'brush', label: 'Brush', icon: Paintbrush },
      ]
    },
  ];

  return (
    <Card className={`h-full rounded-none border-r-0 border-t-0 border-b-0 shadow-sm transition-all duration-200 flex flex-col ${
      isExpanded ? 'w-48' : 'w-16'
    } ${!state.toolbarVisible ? 'hidden md:block' : ''}`}>
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

      {/* Tool groups */}
      <CardContent className="p-2 overflow-y-auto scrollbar-hide flex-1 min-h-0">
        {toolGroups.map((group, groupIndex) => (
          <div key={group.name}>
            {groupIndex > 0 && <div className="h-px bg-gray-200 my-2" />}
            {isExpanded && (
              <div className="px-2 py-1 text-xs text-gray-500 font-medium">
                {group.name}
              </div>
            )}
            <div className="space-y-1">
              {group.tools.map(tool => {
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
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}