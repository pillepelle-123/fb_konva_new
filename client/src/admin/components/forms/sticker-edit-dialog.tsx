import { useEffect, useMemo, useState } from 'react'
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
import type {
  AdminSticker,
  AdminStickerCategory,
  AdminStickerInput,
} from '../../types'

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
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState('vector')
  const [storageType, setStorageType] = useState<'local' | 's3'>('local')
  const [filePath, setFilePath] = useState('')
  const [thumbnailPath, setThumbnailPath] = useState('')
  const [bucket, setBucket] = useState('')
  const [objectKey, setObjectKey] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && sticker) {
      setName(sticker.name)
      setSlug(sticker.slug)
      setCategoryId(sticker.category?.id ?? null)
      setDescription(sticker.description ?? '')
      setFormat(sticker.format ?? 'vector')
      setStorageType(sticker.storage.type)
      setFilePath(sticker.storage.filePath ?? '')
      setThumbnailPath(sticker.storage.thumbnailPath ?? '')
      setBucket(sticker.storage.bucket ?? '')
      setObjectKey(sticker.storage.objectKey ?? '')
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
        storageType,
        filePath: filePath || null,
        thumbnailPath: thumbnailPath || null,
        bucket: bucket || null,
        objectKey: objectKey || null,
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
      <DialogContent className="max-h-[90vh] w-[720px] overflow-y-auto">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="sticker-edit-description">Beschreibung</Label>
              <Textarea
                id="sticker-edit-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sticker-storage-type">Storage Typ</Label>
                <Select value={storageType} onValueChange={(value: 'local' | 's3') => setStorageType(value)}>
                  <SelectTrigger id="sticker-storage-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="s3">S3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sticker-edit-file-path">Dateipfad (relativ oder URL)</Label>
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
              {storageType === 's3' ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="sticker-edit-bucket">S3 Bucket</Label>
                    <Input id="sticker-edit-bucket" value={bucket} onChange={(event) => setBucket(event.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="sticker-edit-object-key">Object Key</Label>
                    <Input id="sticker-edit-object-key" value={objectKey} onChange={(event) => setObjectKey(event.target.value)} />
                  </div>
                </>
              ) : null}
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




