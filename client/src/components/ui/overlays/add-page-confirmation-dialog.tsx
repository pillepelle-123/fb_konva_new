import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from '../primitives/button';

interface AddPageConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  onCancel: () => void;
  onAddWithLayout: () => void;
  onAddEmpty: () => void;
  cancelText?: string;
  addWithLayoutText?: string;
  addEmptyText?: string;
}

export default function AddPageConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onCancel,
  onAddWithLayout,
  onAddEmpty,
  cancelText = 'Cancel',
  addWithLayoutText = 'Add Pages with Layout',
  addEmptyText = 'Add empty Pages'
}: AddPageConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} className="w-full">
            {cancelText}
          </Button>
          <Button variant="default" onClick={onAddWithLayout} className="w-full">
            {addWithLayoutText}
          </Button>
          <Button variant="secondary" onClick={onAddEmpty} className="w-full">
            {addEmptyText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}