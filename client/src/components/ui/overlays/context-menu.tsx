import * as React from "react"
import { cn } from "../../../lib/utils"

interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onDuplicate?: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste?: () => void;
  onMoveToFront: () => void;
  onMoveToBack: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
}

const ContextMenu = React.forwardRef<
  HTMLDivElement,
  ContextMenuProps
>(({ x, y, visible, onDuplicate, onDelete, onCopy, onPaste, onMoveToFront, onMoveToBack, onMoveUp, onMoveDown, hasSelection, hasClipboard }, ref) => {
  if (!visible) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      )}
      style={{
        top: y,
        left: x,
      }}
    >
      <ContextMenuItem
        disabled={!hasSelection}
        onClick={hasSelection ? onCopy : undefined}
      >
        Copy
      </ContextMenuItem>
      {onPaste && (
        <ContextMenuItem
          disabled={!hasClipboard}
          onClick={hasClipboard ? onPaste : undefined}
        >
          Paste
        </ContextMenuItem>
      )}
      {onDuplicate && (
        <ContextMenuItem
          disabled={!hasSelection}
          onClick={hasSelection ? onDuplicate : undefined}
        >
          Duplicate
        </ContextMenuItem>
      )}
      <ContextMenuItem
        disabled={!hasSelection}
        onClick={hasSelection ? onMoveToFront : undefined}
      >
        Bring to Front
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!hasSelection}
        onClick={hasSelection ? onMoveUp : undefined}
      >
        Bring Forward
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!hasSelection}
        onClick={hasSelection ? onMoveDown : undefined}
      >
        Send Backward
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!hasSelection}
        onClick={hasSelection ? onMoveToBack : undefined}
      >
        Send to Back
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!hasSelection}
        onClick={hasSelection ? onDelete : undefined}
        className="text-destructive focus:text-destructive"
      >
        Delete
      </ContextMenuItem>
    </div>
  );
})
ContextMenu.displayName = "ContextMenu"

interface ContextMenuItemProps {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const ContextMenuItem = React.forwardRef<
  HTMLButtonElement,
  ContextMenuItemProps
>(({ children, disabled, onClick, className }, ref) => (
  <button
    ref={ref}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
      className
    )}
  >
    {children}
  </button>
))
ContextMenuItem.displayName = "ContextMenuItem"

export default ContextMenu