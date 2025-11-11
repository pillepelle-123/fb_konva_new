import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui'
import type { AdminUser } from '../../types'

interface PageAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: AdminUser[]
  initialAssigneeId?: number | null
  onSubmit: (assigneeId: number | null) => Promise<void>
  mode: 'assign' | 'publish'
  isSubmitting?: boolean
}

export function PageAssignmentDialog({
  open,
  onOpenChange,
  users,
  initialAssigneeId = null,
  onSubmit,
  mode,
  isSubmitting,
}: PageAssignmentDialogProps) {
  const [assigneeId, setAssigneeId] = useState<number | null>(initialAssigneeId)

  useEffect(() => {
    setAssigneeId(initialAssigneeId ?? null)
  }, [initialAssigneeId, open])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(assigneeId)
  }

  const title = mode === 'assign' ? 'Seite zuweisen' : 'Seite veröffentlichen'
  const description =
    mode === 'assign'
      ? 'Wähle eine Person aus, die Verantwortung für die ausgewählten Seiten übernimmt.'
      : 'Bestätige die Veröffentlichung der Seiten.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {mode === 'assign' ? (
            <div className="space-y-1">
              <Label>Verantwortliche Person</Label>
              <Select
                value={assigneeId ? String(assigneeId) : ''}
                onValueChange={(value) => setAssigneeId(value ? Number(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Person auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Zuweisung</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} · {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Die markierten Seiten werden veröffentlicht und für Leser:innen sichtbar.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Bestätigen…' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

