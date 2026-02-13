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
  Switch,
  Textarea,
} from '../../../components/ui'
import { CreatableCombobox } from '../../../components/ui/primitives/creatable-combobox'
import { useAuth } from '../../../context/auth-context'
import type {
  AdminBackgroundImage,
  AdminBackgroundImageCategory,
  AdminBackgroundImageInput,
} from '../../types'
import { cn } from '../../../lib/utils'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function BackgroundImagePreview({ slug, token }: { slug: string; token: string | null }) {
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
    fetch(`${API_BASE_URL}/background-images/${encodeURIComponent(slug)}/file`, {
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

  if (!slug?.trim()) return <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">Kein Bild</div>
  if (error) return <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">Vorschau nicht verfügbar</div>
  if (!objectUrl) return <div className="flex aspect-square animate-pulse items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">Lade…</div>
  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-2">
      <img src={objectUrl} alt="Hintergrundbild-Vorschau" className="max-h-full max-w-full object-contain" />
    </div>
  )
}

const DEFAULT_SIZES = ['cover', 'contain', 'contain-repeat', 'stretch'] as const
const DEFAULT_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const

interface AdminBackgroundImageEditDialogProps {
  open: boolean
  image: AdminBackgroundImage | null
  categories: AdminBackgroundImageCategory[]
  onOpenChange: (open: boolean) => void
  onSubmit: (identifier: string, data: Partial<AdminBackgroundImageInput> & { slug?: string }) => Promise<void>
  onCreateCategory: (label: string) => Promise<AdminBackgroundImageCategory>
}

export function AdminBackgroundImageEditDialog({
  open,
  image,
  categories,
  onOpenChange,
  onSubmit,
  onCreateCategory,
}: AdminBackgroundImageEditDialogProps) {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState('vector')
  const [filePath, setFilePath] = useState('')
  const [thumbnailPath, setThumbnailPath] = useState('')
  const [defaultSize, setDefaultSize] = useState<string | null>(null)
  const [defaultPosition, setDefaultPosition] = useState<string | null>(null)
  const [defaultRepeat, setDefaultRepeat] = useState<string | null>(null)
  const [defaultWidth, setDefaultWidth] = useState<number | ''>('')
  const [defaultOpacity, setDefaultOpacity] = useState<number>(1)
  const [backgroundColorEnabled, setBackgroundColorEnabled] = useState(false)
  const [backgroundColorValue, setBackgroundColorValue] = useState('#ffffff')
  const [paletteSlots, setPaletteSlots] = useState<string | null>(null)
  const [tagsInput, setTagsInput] = useState('')
  const [metadata, setMetadata] = useState<Record<string, unknown>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && image) {
      setName(image.name)
      setSlug(image.slug)
      setCategoryId(image.category?.id ?? null)
      setDescription(image.description ?? '')
      setFormat(image.format ?? 'vector')
      setFilePath(image.storage.filePath ?? '')
      setThumbnailPath(image.storage.thumbnailPath ?? '')
      setDefaultSize(image.defaults.size)
      setDefaultPosition(image.defaults.position)
      setDefaultRepeat(image.defaults.repeat)
      setDefaultWidth(image.defaults.width ?? '')
      setDefaultOpacity(typeof image.defaults.opacity === 'number' ? image.defaults.opacity : 1)
      const bgColor = image.defaults.backgroundColor as { enabled?: boolean; defaultValue?: string } | null
      setBackgroundColorEnabled(Boolean(bgColor?.enabled))
      setBackgroundColorValue(
        typeof bgColor?.defaultValue === 'string' && bgColor.defaultValue ? bgColor.defaultValue : '#ffffff',
      )
      setPaletteSlots(image.paletteSlots ?? null)
      setTagsInput(image.tags?.join(', ') ?? '')
      setMetadata(image.metadata ?? {})
    } else if (!open) {
      setIsSubmitting(false)
    }
  }, [image, open])

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
    if (!image || !categoryId) return

    setIsSubmitting(true)
    try {
      const input: Partial<AdminBackgroundImageInput> & { slug?: string } = {
        name,
        slug,
        categoryId,
        description: description || null,
        format,
        filePath: filePath || null,
        thumbnailPath: thumbnailPath || null,
        defaults: {
          size: defaultSize,
          position: defaultPosition,
          repeat: defaultRepeat,
          width: defaultWidth === '' ? null : Number(defaultWidth),
          opacity: defaultOpacity,
          backgroundColor: backgroundColorEnabled
            ? {
                enabled: true,
                defaultValue: backgroundColorValue,
              }
            : { enabled: false },
        },
        paletteSlots,
        tags: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        metadata,
      }

      await onSubmit(image.slug, input)
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
      <DialogContent className="max-h-[90vh] w-full max-w-[120vh]  overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hintergrundbild bearbeiten</DialogTitle>
          <DialogDescription>
            Passe Meta-Informationen an. Dateien bleiben unverändert – Uploads erfolgen über den separaten Dialog.
          </DialogDescription>
        </DialogHeader>

        {image ? (
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
                <Label htmlFor="bg-edit-name">Name</Label>
                <Input id="bg-edit-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-slug">Slug</Label>
                <Input id="bg-edit-slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
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
                <Label htmlFor="bg-edit-format">Format</Label>
                <Select value={format} onValueChange={(value) => setFormat(value)}>
                  <SelectTrigger id="bg-edit-format">
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
                <Label htmlFor="bg-edit-description">Beschreibung</Label>
                <Textarea
                  id="bg-edit-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="min-h-0"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Vorschau</Label>
                <BackgroundImagePreview slug={slug} token={token} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-file-path">Dateipfad (relativ)</Label>
                <Input
                  id="bg-edit-file-path"
                  value={filePath}
                  onChange={(event) => setFilePath(event.target.value)}
                  placeholder="z. B. floral/abstract.svg oder https://..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-thumbnail">Thumbnail-Pfad</Label>
                <Input
                  id="bg-edit-thumbnail"
                  value={thumbnailPath}
                  onChange={(event) => setThumbnailPath(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-size">Default Size</Label>
                <Select value={defaultSize ?? ''} onValueChange={(value) => setDefaultSize(value || null)}>
                  <SelectTrigger id="bg-edit-size">
                    <SelectValue placeholder="nicht gesetzt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nicht gesetzt</SelectItem>
                    {DEFAULT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-position">Position</Label>
                <Select value={defaultPosition ?? ''} onValueChange={(value) => setDefaultPosition(value || null)}>
                  <SelectTrigger id="bg-edit-position">
                    <SelectValue placeholder="nicht gesetzt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nicht gesetzt</SelectItem>
                    {DEFAULT_POSITIONS.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-repeat">Repeat</Label>
                <Select value={defaultRepeat ?? ''} onValueChange={(value) => setDefaultRepeat(value || null)}>
                  <SelectTrigger id="bg-edit-repeat">
                    <SelectValue placeholder="nicht gesetzt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nicht gesetzt</SelectItem>
                    <SelectItem value="repeat">Repeat</SelectItem>
                    <SelectItem value="no-repeat">No Repeat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-width">Breite (%)</Label>
                <Input
                  id="bg-edit-width"
                  type="number"
                  min={0}
                  max={100}
                  value={defaultWidth === '' ? '' : String(defaultWidth)}
                  onChange={(event) => {
                    const value = event.target.value
                    setDefaultWidth(value === '' ? '' : Number(value))
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-opacity">Opacity</Label>
                <Input
                  id="bg-edit-opacity"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={defaultOpacity}
                  onChange={(event) => setDefaultOpacity(Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Background Color</Label>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch
                    checked={backgroundColorEnabled}
                    onCheckedChange={(checked) => setBackgroundColorEnabled(checked)}
                  />
                  <Input
                    type="color"
                    value={backgroundColorValue}
                    onChange={(event) => setBackgroundColorValue(event.target.value)}
                    disabled={!backgroundColorEnabled}
                    className={cn('h-10 w-16 p-1', !backgroundColorEnabled && 'cursor-not-allowed opacity-60')}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-palettes">Palette Slots</Label>
                <Input
                  id="bg-edit-palettes"
                  value={paletteSlots ?? ''}
                  onChange={(event) => setPaletteSlots(event.target.value || null)}
                  placeholder="z. B. auto, standard..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bg-edit-tags">Tags (kommagetrennt)</Label>
                <Input
                  id="bg-edit-tags"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="floral, abstract..."
                />
              </div>
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

