import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  const shortcuts = [
    { key: 'Delete', description: 'Delete selected elements' },
    { key: '↑ ↓ ← →', description: 'Move selected elements by 1px' },
    { key: 'Ctrl + C', description: 'Copy selected elements' },
    { key: 'Ctrl + V', description: 'Paste elements or text' },
    { key: 'Ctrl + X', description: 'Cut selected elements' },
    { key: 'Ctrl + D', description: 'Duplicate selected elements' },
    { key: 'Ctrl + Z', description: 'Undo last action' },
    { key: 'Ctrl + Y', description: 'Redo last action' },
    { key: 'Ctrl + S', description: 'Save book' },
    { key: 'Ctrl + W', description: 'Close book' },
    { key: 'Ctrl + P', description: 'Export to PDF' },
    { key: 'Ctrl + Click', description: 'Multi-select elements' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded border">{shortcut.key}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}