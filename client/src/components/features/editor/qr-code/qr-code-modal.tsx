import { useEffect, useState } from 'react';
import { Button } from '../../../ui/primitives/button';
import { Input } from '../../../ui/primitives/input';
import { Modal } from '../../../ui/overlays/modal';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (value: string) => void;
  initialValue?: string;
}

export function QrCodeModal({ isOpen, onClose, onCreate, initialValue }: QrCodeModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(initialValue ?? '');
    setError(null);
  }, [isOpen, initialValue]);

  const handleCreate = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Bitte eine URL eingeben.');
      return;
    }
    onCreate(trimmed);
    setValue('');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QR Code erstellen"
      actions={(
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleCreate}>
            Erstellen
          </Button>
        </div>
      )}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">URL</label>
        <Input
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleCreate();
            }
          }}
        />
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
        <span className="text-xs text-muted-foreground">
          Die URL wird im QR Code gespeichert und kann spaeter angepasst werden.
        </span>
      </div>
    </Modal>
  );
}
