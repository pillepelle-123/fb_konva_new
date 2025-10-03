import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/feedback/dialog';
import { Button } from '../ui/primitives/button';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onClose: () => void;
}

export default function AlertDialog({
  open,
  onOpenChange,
  title,
  message,
  onClose
}: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}