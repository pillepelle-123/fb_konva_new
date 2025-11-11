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
import type { AdminUser } from '../../types'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: AdminUser
  onSubmit: (data: Pick<AdminUser, 'name' | 'email' | 'role' | 'status'>) => Promise<void>
  isSubmitting?: boolean
}

const ROLE_OPTIONS: Array<{ value: AdminUser['role']; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor:in' },
  { value: 'user', label: 'Nutzer:in' },
]

const STATUS_OPTIONS: Array<{ value: AdminUser['status']; label: string }> = [
  { value: 'active', label: 'Aktiv' },
  { value: 'invited', label: 'Eingeladen' },
  { value: 'suspended', label: 'Gesperrt' },
]

export function UserFormDialog({ open, onOpenChange, user, onSubmit, isSubmitting }: UserFormDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminUser['role']>('user')
  const [status, setStatus] = useState<AdminUser['status']>('active')

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setRole(user.role)
      setStatus(user.status)
    } else {
      setName('')
      setEmail('')
      setRole('user')
      setStatus('active')
    }
  }, [user, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await onSubmit({ name, email, role, status })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{user ? 'Benutzer:in bearbeiten' : 'Neue:r Benutzer:in'}</DialogTitle>
            <DialogDescription>Verwalte Stammdaten und Rollen.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="admin-user-name">Name</Label>
              <Input
                id="admin-user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Vor- und Nachname"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-user-email">E-Mail</Label>
              <Input
                id="admin-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Rolle</Label>
                <Select value={role} onValueChange={(value) => setRole(value as AdminUser['role'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rolle auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as AdminUser['status'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status auswählen" />
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

