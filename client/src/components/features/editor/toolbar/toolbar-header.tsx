import { CardHeader, CardTitle } from '../../../ui/composites/card';
import { ToolbarToggle } from './toolbar-toggle';

interface ToolbarHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function ToolbarHeader({ isExpanded, onToggle }: ToolbarHeaderProps) {
  return (
    <CardHeader className="p-3 pr-3 border-b">
      <div className="flex items-center justify-between">
        {isExpanded && (
          <CardTitle className="text-sm font-medium">Tools</CardTitle>
        )}
        <ToolbarToggle isExpanded={isExpanded} onToggle={onToggle} />
      </div>
    </CardHeader>
  );
}