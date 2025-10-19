import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';

// Store for temporary books
const tempBooks = new Map();

interface CreateBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateBookDialog({ open, onOpenChange, onSuccess }: CreateBookDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Book</DialogTitle>
          <DialogDescription>
            Set up your new book project with the preferred format.
          </DialogDescription>
        </DialogHeader>
        <AddBookForm onClose={() => onOpenChange(false)} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}

function AddBookForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create temporary book ID
    const tempId = `temp_${Date.now()}`;
    
    // Create book in temporary storage
    const newBook = {
      id: tempId,
      name,
      pageSize,
      orientation,
      owner_id: user?.id,
      pages: [{
        id: Date.now(),
        pageNumber: 1,
        elements: [],
        database_id: undefined
      }],
      isTemporary: true
    };
    
    // Store temporarily
    tempBooks.set(tempId, newBook);
    
    onSuccess();
    onClose();
    navigate(`/editor/${tempId}`);
  };

  // Export tempBooks for use in editor
  (window as any).tempBooks = tempBooks;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Book Name</label>
        <Input
          id="name"
          type="text"
          placeholder="Enter book name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="pageSize" className="text-sm font-medium">Page Size</label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="A3">A3</option>
          <option value="Letter">Letter</option>
          <option value="Square">Square</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Orientation</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="portrait"
              checked={orientation === 'portrait'}
              onChange={(e) => setOrientation(e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span>Portrait</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="landscape"
              checked={orientation === 'landscape'}
              onChange={(e) => setOrientation(e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span>Landscape</span>
          </label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Create Book
        </Button>
      </div>
    </form>
  );
}