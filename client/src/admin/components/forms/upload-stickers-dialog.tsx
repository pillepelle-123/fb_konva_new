import { ChangeEvent, useEffect, useMemo, useState } from 'react'
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
  Textarea,
} from '../../../components/ui'
import { CreatableCombobox } from '../../../components/ui/primitives/creatable-combobox'
import type {
  AdminStickerCategory,
  AdminStickerInput,
} from '../../types'

interface UploadStickersDialogProps {
  open: boolean
  categories: AdminStickerCategory[]
  onOpenChange: (open: boolean) => void
  onCreateCategory: (label: string) => Promise<AdminStickerCategory>
  onUploadFiles: (params: { category: string; files: File[] }) => Promise<
    {
      originalName: string
      storage: {
        type?: string
        filePath?: string | null
        thumbnailPath?: string | null
        bucket?: string | null
        objectKey?: string | null
      }
    }[]
  >
  onSubmit: (payload: AdminStickerInput[]) => Promise<void>
}

interface UploadItemState {
  id: string
  file: File | null
  extension: string
  name: string
  slug: string
  tags: string
  description: string
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function padNumber(value: number) {
  return value.toString().padStart(2, '0')
}

export function UploadStickersDialog({
  open,
  categories,
  onOpenChange,
  onCreateCategory,
  onUploadFiles,
  onSubmit,
}: UploadStickersDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null)
  const [baseName, setBaseName] = useState('')
  const [items, setItems] = useState<UploadItemState[]>([])
  const [globalDescription, setGlobalDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedCategoryId(null)
      setSelectedCategorySlug(null)
      setBaseName('')
      setItems([])
      setGlobalDescription('')
      setIsSubmitting(false)
    }
  }, [open])

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: String(category.id),
        label: category.name,
        description: category.slug,
      })),
    [categories],
  )

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  useEffect(() => {
    if (selectedCategory) {
      setSelectedCategorySlug(selectedCategory.slug || selectedCategory.name || null)
    }
  }, [selectedCategory])

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList)
    const nextItems = files.map((file, index) => {
      const originalName = file.name.replace(/\.[^.]+$/, '')
      const extensionMatch = /\.([0-9a-z]+)$/i.exec(file.name)
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'svg'
      const base = baseName ? `${baseName.trim()} ${padNumber(index + 1)}` : originalName

      return {
        id: `${file.name}-${Date.now()}-${index}`,
        file,
        extension,
        name: base,
        slug: slugify(base),
        tags: '',
        description: globalDescription,
      }
    })

    setItems(nextItems)
  }

  const handleBaseNameChange = (value: string) => {
    setBaseName(value)
    if (!value || value.trim().length === 0) return

    setItems((prev) =>
      prev.map((item, index) => {
        const name = `${value.trim()} ${padNumber(index + 1)}`
        return {
          ...item,
          name,
          slug: slugify(name),
        }
      }),
    )
  }

  const handleCreateCategory = async (label: string) => {
    const category = await onCreateCategory(label)
    setSelectedCategoryId(category.id)
    setSelectedCategorySlug(category.slug || label)
    return {
      value: String(category.id),
      label: category.name,
      description: category.slug,
    }
  }

  const canSubmit = Boolean(selectedCategoryId && items.length > 0 && !isSubmitting)

  const handleSubmit = async () => {
    if (!selectedCategory || !canSubmit) return

    const files = items.map((item) => item.file).filter((file): file is File => Boolean(file))
    if (files.length !== items.length) {
      alert('Bitte wähle für jeden Eintrag eine Datei aus.')
      return
    }

    const categorySlug =
      selectedCategorySlug ||
      selectedCategory.slug ||
      slugify(selectedCategory.name)

    setIsSubmitting(true)
    try {
      const uploadResults = await onUploadFiles({ category: categorySlug, files })
      if (!uploadResults || uploadResults.length !== items.length) {
        throw new Error('Upload response mismatch')
      }

      const payload: AdminStickerInput[] = items.map((item, index) => {
        const uploadInfo = uploadResults[index]?.storage ?? {}
        const isVector = item.extension === 'svg'
        return {
          name: item.name,
          slug: item.slug,
          categoryId: selectedCategory.id,
          description: item.description || null,
          format: isVector ? 'vector' : 'pixel',
          storageType: (uploadInfo.type as 'local' | 's3' | undefined) ?? 'local',
          filePath: uploadInfo.filePath ?? null,
          thumbnailPath: uploadInfo.thumbnailPath ?? uploadInfo.filePath ?? null,
          bucket: uploadInfo.bucket ?? null,
          objectKey: uploadInfo.objectKey ?? null,
          tags: item.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          metadata: {
            originalFilename: item.file?.name ?? null,
            uploadCategorySlug: categorySlug,
          },
        }
      })

      await onSubmit(payload)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sticker hinzufügen</DialogTitle>
          <DialogDescription>
            Lade neue Sticker hoch, lege Kategorie und Metadaten fest. Die Dateien werden lokal gespeichert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Sticker-Dateien (SVG/PNG)</Label>
              <Input type="file" accept=".svg,.png,.jpg,.jpeg,.webp" multiple onChange={handleFileSelection} />
              <p className="text-xs text-muted-foreground">
                Unterstützt werden SVG- und Pixel-Dateien.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Kategorie</Label>
              <CreatableCombobox
                options={categoryOptions}
                value={selectedCategoryId ? String(selectedCategoryId) : undefined}
                onChange={(value) => {
                  if (value) {
                    const option = categoryOptions.find((item) => item.value === value)
                    setSelectedCategoryId(Number(value))
                    setSelectedCategorySlug(option?.description ?? option?.label ?? null)
                  } else {
                    setSelectedCategoryId(null)
                    setSelectedCategorySlug(null)
                  }
                }}
                onCreateOption={handleCreateCategory}
                placeholder="Kategorie wählen oder erstellen"
                inputPlaceholder="Kategorie..."
                allowClear={false}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-base-name">Basisname (Multi-Upload)</Label>
              <Input
                id="upload-base-name"
                placeholder="z. B. Emoji Happy"
                value={baseName}
                onChange={(event) => handleBaseNameChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Bei mehreren Dateien wird automatisch eine fortlaufende Nummer ergänzt (01, 02, 03, ...).
              </p>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <Label htmlFor="upload-description">Beschreibung (optional)</Label>
              <Textarea
                id="upload-description"
                value={globalDescription}
                onChange={(event) => setGlobalDescription(event.target.value)}
                rows={2}
              />
            </div>
          </div>

          {items.length > 0 ? (
            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={item.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {index + 1}. {item.file?.name ?? item.name}
                      </p>
                      <p className="text-xs text-muted-foreground break-all">Slug: {item.slug}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setItems((prev) => prev.filter((candidate) => candidate.id !== item.id))}
                    >
                      Entfernen
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Name</Label>
                      <Input
                        value={item.name}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id
                                ? {
                                    ...candidate,
                                    name: event.target.value,
                                    slug: slugify(event.target.value),
                                  }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Slug</Label>
                      <Input
                        value={item.slug}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id ? { ...candidate, slug: slugify(event.target.value) } : candidate,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Tags (kommagetrennt)</Label>
                      <Input
                        value={item.tags}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) => (candidate.id === item.id ? { ...candidate, tags: event.target.value } : candidate)),
                          )
                        }
                        placeholder="emoji, happy, smile..."
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={item.description}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id ? { ...candidate, description: event.target.value } : candidate,
                            ),
                          )
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="min-w-[120px]">
              {isSubmitting ? 'Lade hoch...' : `${items.length} Sticker hochladen`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}







