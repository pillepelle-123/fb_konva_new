import { useState } from 'react';
import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Input } from '../../ui/primitives/input';
import { Button } from '../../ui/primitives/button';
import { Alert, AlertDescription } from '../../ui/composites/alert';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (name: string, email: string) => void;
  errorMessage?: string;
  initialEmail?: string;
  initialName?: string;
}

// Helper function to generate name from email
const generateNameFromEmail = (email: string): string => {
  const emailPart = email.split('@')[0];
  // Remove special characters and keep only alphanumeric characters
  const cleanedName = emailPart.replace(/[^a-zA-Z0-9]/g, '');
  // Capitalize first letter
  return cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1).toLowerCase();
};

export default function InviteUserDialog({ open, onOpenChange, onInvite, errorMessage, initialEmail, initialName }: InviteUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Update email and name when initial values change and dialog opens
  React.useEffect(() => {
    if (open) {
      if (initialEmail) {
        setEmail(initialEmail);
      }
      if (initialName) {
        setName(initialName);
      }
    } else {
      // Reset when dialog closes
      setName('');
      setEmail('');
    }
  }, [open, initialEmail, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // Use provided name or generate from email
      const finalName = name.trim() || generateNameFromEmail(email.trim());
      onInvite(finalName, email.trim());
      setName('');
      setEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Friend</DialogTitle>
          <DialogDescription>
            Invite a friend to join your network.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <Alert>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name of Friend <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Name of Friend"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Invite Friend
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}