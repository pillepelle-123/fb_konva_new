import { ToolButton } from './tool-button';
import { ToolPopover } from './tool-popover';
import { ToolSettingsPopover } from './tool-settings-popover';
import { ZoomPopover } from './zoom-popover';
import { Info, Hand, Brush, Pipette, Square, Sticker, MessageCircle, MessageCirclePlus, Search, SquareMousePointer, Magnet, Paintbrush, Image, QrCode } from 'lucide-react';
import { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../../../ui/primitives/button';
import { ShortcutsDialog } from './shortcuts-dialog';
import { Separator } from '../../../ui/primitives/separator';
import { Tooltip } from '../../../ui/composites/tooltip';
import { useEditor } from '../../../../context/editor-context';

interface ToolbarContentProps {
  activeTool: string;
  isExpanded: boolean;
  onToolSelect: (toolId: string) => void;
}

export const ToolbarContent = forwardRef<{ closeSubmenus: () => void }, ToolbarContentProps>(function ToolbarContent({ activeTool, isExpanded, onToolSelect }, ref) {
  const { state, dispatch, canUseTools, canUseTool } = useEditor();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useImperativeHandle(ref, () => ({
    closeSubmenus: () => {}
  }));

  const toolAccessAllowed = canUseTools();
  const canUseQnaTool = canUseTool('qna');

  // Hide content if the user cannot access tools (except answer-only mode)
  if (!toolAccessAllowed && state.editorInteractionLevel !== 'answer_only') {
    return null;
  }

  // For answer_only users, only show Select, Pan, and Zoom tools
  // console.log('Toolbar content - editorInteractionLevel:', state.editorInteractionLevel);
  if (state.editorInteractionLevel === 'answer_only') {
    return (
      <>
        <div className={`p-2 overflow-y-auto scrollbar-hide flex-1 min-h-0 relative`}>
          <div className="space-y-1">
            <ToolButton
              id="select"
              label="Select"
              icon={SquareMousePointer}
              isActive={activeTool === 'select'}
              isExpanded={false}
              onClick={() => onToolSelect('select')}
            />
            <ToolButton
              id="pan"
              label="Pan"
              icon={Hand}
              isActive={activeTool === 'pan'}
              isExpanded={false}
              onClick={() => onToolSelect('pan')}
            />
            <ZoomPopover
              activeTool={activeTool}
              onToolSelect={onToolSelect}
            >
              <ToolButton
                id="zoom"
                label="Zoom"
                icon={Search}
                isActive={activeTool === 'zoom'}
                isExpanded={false}
                hasPopover={true}
                onClick={() => {}}
              />
            </ZoomPopover>
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
            icon={SquareMousePointer}
            isActive={activeTool === 'select'}
            isExpanded={false}
            onClick={() => onToolSelect('select')}
          />
          <ToolButton
            id="pan"
            label="Pan"
            icon={Hand}
            isActive={activeTool === 'pan'}
            isExpanded={false}
            onClick={() => onToolSelect('pan')}
          />
        </div>

        {/* Row 2: Brush + Pipette */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-1`}>
          <ToolSettingsPopover activeTool={activeTool}>
            <ToolButton
              id="brush"
              label="Brush"
              icon={Brush}
              isActive={activeTool === 'brush'}
              isExpanded={false}
              onClick={() => onToolSelect('brush')}
            />
          </ToolSettingsPopover>
          <ToolButton
            id="pipette"
            label="Pipette"
            icon={Pipette}
            isActive={activeTool === 'pipette'}
            isExpanded={false}
            onClick={() => onToolSelect('pipette')}
          />
        </div>

        {/* Row 3: Rectangle + Sticker */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-1`}>
          <ToolPopover
            activeTool={activeTool}
            onToolSelect={onToolSelect}
          >
            <ToolButton
              id="rect"
              label="Rectangle"
              icon={Square}
              isActive={activeTool === 'rect'}
              isExpanded={false}
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
            onClick={() => onToolSelect('sticker')}
          />
        </div>

        {/* Row 3.5: Image + QR Code */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-2`}>
          <ToolButton
            id="image"
            label="Image"
            icon={Image}
            isActive={activeTool === 'image'}
            isExpanded={false}
            onClick={() => onToolSelect('image')}
          />
          <ToolButton
            id="qr_code"
            label="QR Code"
            icon={QrCode}
            isActive={activeTool === 'qr_code'}
            isExpanded={false}
            onClick={() => onToolSelect('qr_code')}
          />
        </div>

        {/* <Separator className="mb-2" /> */}

        {/* Row 4: Zoom + QnA */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-1`}>
          <ZoomPopover
            activeTool={activeTool}
            onToolSelect={onToolSelect}
          >
            <ToolButton
              id="zoom"
              label="Zoom"
              icon={Search}
              isActive={activeTool === 'zoom'}
              isExpanded={false}
              hasPopover={true}
              onClick={() => {}}
            />
          </ZoomPopover>
          {canUseQnaTool && (
            <ToolButton
              id="qna"
              label="Q&A"
              icon={MessageCirclePlus}
              isActive={activeTool === 'qna'}
              isExpanded={false}
              onClick={() => onToolSelect('qna')}
            />
          )}
        </div>
        
        {/* Row 5: Free Text */}
        <div className={`${isExpanded ? 'grid grid-cols-2 gap-1' : 'space-y-1'} mb-2`}>
          <ToolButton
            id="free_text"
            label="Free Text"
            icon={MessageCircle}
            isActive={activeTool === 'free_text'}
            isExpanded={false}
            onClick={() => onToolSelect('free_text')}
          />
        </div>
        
        <Separator/>
        <Tooltip content='Style Painter - Copy formatting from one element to another' side='right'>
          <Button
            variant={state.stylePainterActive ? "default" : "ghost"}
            size="xs"
            onClick={() => {
              console.log('Style painter clicked', { selectedCount: state.selectedElementIds.length, active: state.stylePainterActive });
              if (state.selectedElementIds.length === 1) {
                dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
              }
            }}
            disabled={state.selectedElementIds.length !== 1}
            className={`w-full flex flex-col items-center gap-1 h-auto py-2 ${state.stylePainterActive ? 'bg-highlight text-white' : ''}`}
          >
            <Paintbrush className="h-4 w-4" />
            {isExpanded && (
              <span className="text-xs">Style</span>
            )}
          </Button>
        </Tooltip>
        <Tooltip content='Magnetic snapping of elements' side='right'>
          <Button
            variant={state.magneticSnapping ? "default" : "ghost"}
            size="xs"
            onClick={() => dispatch({ type: 'TOGGLE_MAGNETIC_SNAPPING' })}
            className="w-full flex flex-col items-center gap-1 h-auto py-2"
          >
            <Magnet className="h-4 w-4" />
            {isExpanded && (
              <span className="text-xs">Snap</span>
            )}
          </Button>
        </Tooltip>
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