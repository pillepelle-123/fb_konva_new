interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function ContextMenu({ x, y, visible, onDuplicate, onDelete }: ContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed bg-popover border border-border rounded-md shadow-md z-[1000] min-w-[120px] p-1"
      style={{
        top: y,
        left: x,
      }}
    >
      <button
        onClick={onDuplicate}
        className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-default"
      >
        Duplicate
      </button>
      <button
        onClick={onDelete}
        className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-default text-destructive"
      >
        Delete
      </button>
    </div>
  );
}