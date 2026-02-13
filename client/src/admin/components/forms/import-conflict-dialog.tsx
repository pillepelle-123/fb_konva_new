import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  RadioGroup,
} from '../../../components/ui'

export interface ImportConflict {
  slug: string
  name: string
  existingName: string | null
}

type ResolutionChoice = 'skip' | 'overwrite' | 'newSlug'

interface ImportConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: ImportConflict[]
  totalItems: number
  resourceLabel: string
  onConfirm: (resolution: Record<string, string>) => void
  isLoading?: boolean
}

export function ImportConflictDialog({
  open,
  onOpenChange,
  conflicts,
  totalItems,
  resourceLabel,
  onConfirm,
  isLoading = false,
}: ImportConflictDialogProps) {
  const [choices, setChoices] = useState<Record<string, { type: ResolutionChoice; newSlug?: string }>>({})

  const defaultChoices = useMemo(() => {
    const map: Record<string, { type: ResolutionChoice; newSlug?: string }> = {}
    for (const c of conflicts) {
      map[c.slug] = { type: 'skip' }
    }
    return map
  }, [conflicts])

  const effectiveChoices = Object.keys(defaultChoices).length > 0 ? { ...defaultChoices, ...choices } : choices

  const handleApplyAll = (type: 'skip' | 'overwrite') => {
    const next: Record<string, { type: ResolutionChoice; newSlug?: string }> = {}
    for (const c of conflicts) {
      next[c.slug] = { type }
    }
    setChoices(next)
  }

  const handleChoiceChange = (slug: string, type: ResolutionChoice, newSlug?: string) => {
    setChoices((prev) => ({
      ...prev,
      [slug]: { type, newSlug },
    }))
  }

  const buildResolution = (): Record<string, string> => {
    const resolution: Record<string, string> = {}
    for (const c of conflicts) {
      const choice = effectiveChoices[c.slug] || { type: 'skip' as ResolutionChoice }
      if (choice.type === 'skip') {
        resolution[c.slug] = 'skip'
      } else if (choice.type === 'overwrite') {
        resolution[c.slug] = 'overwrite'
      } else if (choice.type === 'newSlug' && choice.newSlug?.trim()) {
        resolution[c.slug] = choice.newSlug.trim()
      } else {
        resolution[c.slug] = 'skip'
      }
    }
    return resolution
  }

  const handleConfirm = () => {
    onConfirm(buildResolution())
    onOpenChange(false)
    setChoices({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" title={`Import-Konflikte: ${resourceLabel}`}>
        <DialogHeader>
          <DialogTitle>Import-Konflikte</DialogTitle>
          <DialogDescription>
            {conflicts.length} von {totalItems} {resourceLabel} existieren bereits. Wähle für jeden Konflikt eine
            Aktion.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleApplyAll('skip')}>
              Alle überspringen
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleApplyAll('overwrite')}>
              Alle überschreiben
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-4 rounded-md border p-4">
            {conflicts.map((c) => {
              const choice = effectiveChoices[c.slug] || { type: 'skip' as ResolutionChoice }
              return (
                <div key={c.slug} className="flex flex-col gap-2 rounded border p-3">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Slug: /{c.slug}
                    {c.existingName ? ` · Vorhanden: "${c.existingName}"` : ''}
                  </div>
                  <div className="flex flex-col gap-2">
                    <RadioGroup
                      value={choice.type}
                      onValueChange={(v) => handleChoiceChange(c.slug, v as ResolutionChoice)}
                      options={[
                        { value: 'skip', label: 'Überspringen' },
                        { value: 'overwrite', label: 'Überschreiben' },
                        { value: 'newSlug', label: 'Mit neuem Slug (siehe Feld unten)' },
                      ]}
                    />
                    {choice.type === 'newSlug' && (
                      <Input
                        placeholder={`z.B. ${c.slug}-import`}
                        value={choice.newSlug ?? ''}
                        onChange={(e) => handleChoiceChange(c.slug, 'newSlug', e.target.value)}
                        className="h-8 w-48"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Importiere…' : 'Import bestätigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
