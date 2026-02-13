import { useEffect, useMemo, useRef, useState } from 'react'
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
  Textarea,
} from '../../../components/ui'
import { CreatableCombobox } from '../../../components/ui/primitives/creatable-combobox'
import { useAuth } from '../../../context/auth-context'
import type {
  AdminSticker,
  AdminStickerCategory,
  AdminStickerInput,
} from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function StickerPreview({ slug, token }: { slug: string; token: string | null }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!slug || !token || !slug.trim()) {
      setObjectUrl(null)
      setError(false)
      return
    }
    let cancelled = false
    setError(false)
    fetch(`${API_BASE_URL}/stickers/${encodeURIComponent(slug)}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.blob()
      })
      .then((blob) => {
        if (!cancelled) {
          if (urlRef.current) URL.revokeObjectURL(urlRef.current)
          urlRef.current = URL.createObjectURL(blob)
          setObjectUrl(urlRef.current)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [slug, token])

  if (!slug?.trim()) return <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">Kein Sticker</div>
  if (error) return <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">Vorschau nicht verfügbar</div>
  if (!objectUrl) return <div className="flex aspect-square animate-pulse items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">Lade…</div>
  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-2">
      <img src={objectUrl} alt="Sticker-Vorschau" className="max-h-full max-w-full object-contain" />
    </div>
  )
}

interface AdminStickerEditDialogProps {
  open: boolean
  sticker: AdminSticker | null
  categories: AdminStickerCategory[]
  onOpenChange: (open: boolean) => void
  onSubmit: (identifier: string, data: Partial<AdminStickerInput> & { slug?: string }) => Promise<void>
  onCreateCategory: (label: string) => Promise<AdminStickerCategory>
}

export function AdminStickerEditDialog({
  open,
  sticker,
  categories,
  onOpenChange,
  onSubmit,
  onCreateCategory,
}: AdminStickerEditDialogProps) {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState('vector')
  const [filePath, setFilePath] = useState('')
  const [thumbnailPath, setThumbnailPath] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && sticker) {
      setName(sticker.name)
      setSlug(sticker.slug)
      setCategoryId(sticker.category?.id ?? null)
      setDescription(sticker.description ?? '')
      setFormat(sticker.format ?? 'vector')
      setFilePath(sticker.storage.filePath ?? '')
      setThumbnailPath(sticker.storage.thumbnailPath ?? '')
      setTagsInput(sticker.tags?.join(', ') ?? '')
    } else if (!open) {
      setIsSubmitting(false)
    }
  }, [sticker, open])

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: String(category.id),
        label: category.name,
        description: category.slug,
      })),
    [categories],
  )

  const canSubmit = Boolean(name && slug && categoryId && !isSubmitting)

  const handleSubmit = async () => {
    if (!sticker || !categoryId) return

    setIsSubmitting(true)
    try {
      const input: Partial<AdminStickerInput> & { slug?: string } = {
        name,
        slug,
        categoryId,
        description: description || null,
        format,
        filePath: filePath || null,
        thumbnailPath: thumbnailPath || null,
        tags: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      }

      await onSubmit(sticker.slug, input)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCategory = async (label: string) => {
    const category = await onCreateCategory(label)
    setCategoryId(category.id)
    return {
      value: String(category.id),
      label: category.name,
      description: category.slug,
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[120vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sticker bearbeiten</DialogTitle>
          <DialogDescription>
            Passe Meta-Informationen an. Dateien bleiben unverändert – Uploads erfolgen über den separaten Dialog.
          </DialogDescription>
        </DialogHeader>

        {sticker ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault()
              if (canSubmit) {
                void handleSubmit()
              }
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sticker-edit-name">Name</Label>
                <Input id="sticker-edit-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sticker-edit-slug">Slug</Label>
                <Input id="sticker-edit-slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Kategorie</Label>
                <CreatableCombobox
                  options={categoryOptions}
                  value={categoryId ? String(categoryId) : undefined}
                  onChange={(value) => {
                    setCategoryId(value ? Number(value) : null)
                  }}
                  onCreateOption={handleCreateCategory}
                  placeholder="Kategorie wählen..."
                  inputPlaceholder="Kategorie suchen oder erstellen..."
                  allowClear={false}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sticker-edit-format">Format</Label>
                <Select value={format} onValueChange={(value) => setFormat(value)}>
                  <SelectTrigger id="sticker-edit-format">
                    <SelectValue placeholder="Format wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vector">Vector</SelectItem>
                    <SelectItem value="pixel">Pixel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="sticker-edit-description">Beschreibung</Label>
                <Textarea
                  id="sticker-edit-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="min-h-0"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Vorschau</Label>
                <StickerPreview slug={slug} token={token} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sticker-edit-file-path">Dateipfad (relativ)</Label>
                <Input
                  id="sticker-edit-file-path"
                  value={filePath}
                  onChange={(event) => setFilePath(event.target.value)}
                  placeholder="z. B. emoji/happy.svg oder https://..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sticker-edit-thumbnail">Thumbnail-Pfad</Label>
                <Input
                  id="sticker-edit-thumbnail"
                  value={thumbnailPath}
                  onChange={(event) => setThumbnailPath(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sticker-edit-tags">Tags (kommagetrennt)</Label>
              <Input
                id="sticker-edit-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="emoji, happy, smile..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={!canSubmit} className="min-w-[120px]">
                {isSubmitting ? 'Speichere...' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}












