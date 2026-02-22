import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { TriangleRight, type Icon } from 'lucide-react';
import { useEditor } from '../../../../context/editor-context';
import { getElementDisplayTitle } from '../tool-settings/tool-settings-utils';

interface ToolButtonProps {
  id: string;
  label: string;
  icon: Icon;
  isActive: boolean;
  isExpanded: boolean;
  hasPopover?: boolean;
  onClick: (e?: React.MouseEvent) => void;
}

export function ToolButton({ id, label: _label, icon: Icon, isActive, isExpanded: _isExpanded, hasPopover, onClick }: ToolButtonProps) {
  const { state, canUseTool } = useEditor();

  const toolAccessAllowed = canUseTool(id);
  
  // Block tools that add elements if elements are locked (except select, pan, zoom, pipette)
  const lockElements = state.editorSettings?.editor?.lockElements;
  const isLockedRestricted = lockElements && !['select', 'pan', 'zoom', 'pipette'].includes(id);
  
  const isDisabled = !toolAccessAllowed || isLockedRestricted;
  
  const displayName = getElementDisplayTitle(id);
  
  return (
    <Tooltip content={displayName} side="right">
      <Button
        variant={isActive ? "default" : "ghost_hover"}
        size="sm"
        onClick={isDisabled ? undefined : (e) => onClick(e)}
        disabled={isDisabled}
        className={`w-full justify-center p-2 relative ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon className="h-5 w-5" />
        {hasPopover && (
          <TriangleRight className='absolute bottom-0 right-0 w-2 h-3 stroke-foreground fill-foreground'/>
        )}
      </Button>
    </Tooltip>
  );
}