import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/overlays/dialog';
import { Button } from '../ui/primitives/button';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndExit: () => void;
  onExitWithoutSaving: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSaveAndExit,
  onExitWithoutSaving,
  onCancel
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. What would you like to do?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={onSaveAndExit} className="w-full">
            Save and Exit
          </Button>
          <Button variant="outline" onClick={onExitWithoutSaving} className="w-full">
            Exit without Saving
          </Button>
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}