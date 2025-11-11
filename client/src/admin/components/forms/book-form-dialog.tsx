import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui'
import type { AdminBook } from '../../types'

interface BookFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book?: AdminBook
  onSubmit: (data: Pick<AdminBook, 'name' | 'status'>) => Promise<void>
  isSubmitting?: boolean
}

const STATUS_OPTIONS: Array<{ value: AdminBook['status']; label: string }> = [
  { value: 'active', label: 'Aktiv' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'archived', label: 'Archiviert' },
]

export function BookFormDialog({ open, onOpenChange, book, onSubmit, isSubmitting }: BookFormDialogProps) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<AdminBook['status']>('active')

  useEffect(() => {
    if (book) {
      setName(book.name)
      setStatus(book.status)
    } else {
      setName('')
      setStatus('draft')
    }
  }, [book, open])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({ name, status })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{book ? 'Buch bearbeiten' : 'Neues Buch'}</DialogTitle>
            <DialogDescription>Metadaten des Buchs pflegen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="admin-book-name">Titel</Label>
              <Input
                id="admin-book-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Freundebuch 2025"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AdminBook['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

