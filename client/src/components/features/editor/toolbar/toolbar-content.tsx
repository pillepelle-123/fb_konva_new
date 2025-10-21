import { ToolButton } from './tool-button';
import { ToolPopover } from './tool-popover';
import { type Icon, Info, MousePointer, Hand, Brush, Pipette, Square, Sticker, Type, HelpCircle, Search } from 'lucide-react';
import { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../../../ui/primitives/button';
import { ShortcutsDialog } from './shortcuts-dialog';
import { Separator } from '../../../ui/primitives/separator';
import { Tooltip } from '../../../ui/composites/tooltip';
import { useEditor } from '../../../../context/editor-context';

interface ToolbarContentProps {
  activeTool: string;
  isExpanded: boolean;
  userRole?: 'author' | 'publisher' | null;
  isOnAssignedPage?: boolean;
  onToolSelect: (toolId: string) => void;
}

export const ToolbarContent = forwardRef<{ closeSubmenus: () => void }, ToolbarContentProps>(function ToolbarContent({ activeTool, isExpanded, userRole, isOnAssignedPage, onToolSelect }, ref) {
  const { state } = useEditor();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useImperativeHandle(ref, () => ({
    closeSubmenus: () => {}
  }));

  // Hide content for authors on non-assigned pages
  if (userRole === 'author' && !isOnAssignedPage) {
    return null;
  }

  // For answer_only users, only show Select and Pan tools
  if (state.editorInteractionLevel === 'answer_only') {
    return (
      <>
        <div className={`p-2 overflow-y-auto scrollbar-hide flex-1 min-h-0 relative`}>
          <div className="space-y-1">
            <ToolButton
              id="select"
              label="Select"
              icon={MousePointer}
              isActive={activeTool === 'select'}
              isExpanded={false}
              userRole={userRole}
              isOnAssignedPage={isOnAssignedPage}
              onClick={() => onToolSelect('select')}
            />
            <ToolButton
              id="pan"
              label="Pan"
              icon={Hand}
              isActive={activeTool === 'pan'}
              isExpanded={false}
              userRole={userRole}
              isOnAssignedPage={isOnAssignedPage}
              onClick={() => onToolSelect('pan')}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`p-2 overflow-y-auto scrollbar-hide flex-1 min-h-0 relative`}>
        {/* Row 1: Select + Pan */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-1`}>
          <ToolButton
            id="select"
            label="Select"
            icon={MousePointer}
            isActive={activeTool === 'select'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('select')}
          />
          <ToolButton
            id="pan"
            label="Pan"
            icon={Hand}
            isActive={activeTool === 'pan'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('pan')}
          />
        </div>

        {/* Row 2: Brush + Pipette */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-1`}>
          <ToolButton
            id="brush"
            label="Brush"
            icon={Brush}
            isActive={activeTool === 'brush'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('brush')}
          />
          <ToolButton
            id="pipette"
            label="Pipette"
            icon={Pipette}
            isActive={activeTool === 'pipette'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('pipette')}
          />
        </div>

        {/* Row 3: Rectangle + Sticker */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-2`}>
          <ToolPopover
            activeTool={activeTool}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onToolSelect={onToolSelect}
          >
            <ToolButton
              id="rect"
              label="Rectangle"
              icon={Square}
              isActive={activeTool === 'rect'}
              isExpanded={false}
              userRole={userRole}
              isOnAssignedPage={isOnAssignedPage}
              hasPopover={true}
              onClick={() => {}}
            />
          </ToolPopover>
          <ToolButton
            id="sticker"
            label="Sticker"
            icon={Sticker}
            isActive={activeTool === 'sticker'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('sticker')}
          />
        </div>

        {/* <Separator className="mb-2" /> */}

        {/* Row 4: Text + Question */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-2`}>
          <ToolButton
            id="text"
            label="Text"
            icon={Type}
            isActive={activeTool === 'text'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('text')}
          />
          <ToolButton
            id="question"
            label="Question"
            icon={HelpCircle}
            isActive={activeTool === 'question'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('question')}
          />
        </div>

        {/* <Separator className="mb-2" /> */}

        {/* Row 5: Zoom */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-2`}>
          <ToolButton
            id="zoom"
            label="Zoom"
            icon={Search}
            isActive={activeTool === 'zoom'}
            isExpanded={false}
            userRole={userRole}
            isOnAssignedPage={isOnAssignedPage}
            onClick={() => onToolSelect('zoom')}
          />
        </div>
        
        <Separator/>
        <Tooltip content='Show Keyboard Shortcuts' side='right'>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowShortcuts(true)}
            className="w-full flex flex-col items-center gap-1 h-auto py-2"
          >
            <Info className="h-4 w-4" />
            {isExpanded && (
              <span className="text-xs">Shortcuts</span>
            )}
          </Button>
        </Tooltip>
      </div>
      
      <ShortcutsDialog 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </>
  );
});