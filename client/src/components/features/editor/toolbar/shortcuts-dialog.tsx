import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  description: string;
  keys?: string[];
  mouseAction?: 'left-click' | 'right-click' | 'mouse-wheel';
  modifier?: string;
}

// Mouse icon component
function MouseIcon({ type }: { type: 'left-click' | 'right-click' | 'mouse-wheel' }) {
  const getIcon = () => {
    switch (type) {
      case 'left-click':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v12" />
            <circle cx="9" cy="6" r="3" fill="hsl(var(--muted-foreground))" />
          </svg>
        );
      case 'right-click':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v12" />
            <circle cx="14" cy="6" r="3" fill="hsl(var(--muted-foreground))" />
          </svg>
        );
      case 'mouse-wheel':
        return (
          <svg width="24" height="20" viewBox="0 0 29 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v12" />
            <line x1="24" y1="6" x2="24" y2="18" />
            <path d="M22 7 L24 5 L26 7" />
            <path d="M22 17 L24 19 L26 17" />
          </svg>
        );
    }
  };

  return (
    <span className="inline-flex items-center justify-center w-6 h-6 text-foreground">
      {getIcon()}
    </span>
  );
}

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  const shortcuts: Shortcut[] = [
    { description: 'Delete selected elements', keys: ['Delete'] },
    { description: 'Move selected elements by 1px', keys: ['↑', '↓', '←', '→'] },
    { description: 'Copy selected elements', keys: ['Ctrl', 'C'] },
    { description: 'Paste elements or text', keys: ['Ctrl', 'V'] },
    { description: 'Cut selected elements', keys: ['Ctrl', 'X'] },
    { description: 'Duplicate selected elements', keys: ['Ctrl', 'D'] },
    { description: 'Undo last action', keys: ['Ctrl', 'Z'] },
    { description: 'Redo last action', keys: ['Ctrl', 'Y'] },
    { description: 'Save book', keys: ['Ctrl', 'S'] },
    { description: 'Export to PDF', keys: ['Ctrl', 'P'] },
    { description: 'Multi-select elements', keys: ['Ctrl'], mouseAction: 'left-click' },
    { description: 'Scroll vertically', mouseAction: 'mouse-wheel' },
    { description: 'Zoom in and out', keys: ['Ctrl'], mouseAction: 'mouse-wheel' },
    { description: 'Scroll horizontally', keys: ['Shift'], mouseAction: 'mouse-wheel' },
  ];

  const renderKeys = (shortcut: Shortcut) => {
    const elements: React.ReactNode[] = [];
    
    if (shortcut.modifier) {
      elements.push(
        <kbd key="modifier" className="px-2 py-1 text-xs bg-muted rounded border">
          {shortcut.modifier}
        </kbd>
      );
    }
    
    if (shortcut.keys) {
      shortcut.keys.forEach((key, index) => {
        elements.push(
          <kbd key={`key-${index}`} className="px-2 py-1 text-xs bg-muted rounded border">
            {key}
          </kbd>
        );
        if (index < shortcut.keys!.length - 1) {
          elements.push(
            <span key={`plus-${index}`} className="mx-1 text-xs text-muted-foreground">
              +
            </span>
          );
        }
      });
    }
    
    if (shortcut.mouseAction) {
      if (elements.length > 0) {
        elements.push(
          <span key="mouse-plus" className="mx-1 text-xs text-muted-foreground">
            +
          </span>
        );
      }
      elements.push(
        <span key="mouse-icon" className="inline-flex items-center">
          <MouseIcon type={shortcut.mouseAction} />
        </span>
      );
    }
    
    return <div className="flex items-center gap-1">{elements}</div>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center gap-4">
              <span className="text-sm text-muted-foreground flex-1">{shortcut.description}</span>
              {renderKeys(shortcut)}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}