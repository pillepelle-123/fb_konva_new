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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '../../../components/ui'
import { CreatableCombobox } from '../../../components/ui/primitives/creatable-combobox'
import type {
  AdminBackgroundImageCategory,
  AdminBackgroundImageInput,
} from '../../types'
import { cn } from '../../../lib/utils'

interface UploadBackgroundImagesDialogProps {
  open: boolean
  categories: AdminBackgroundImageCategory[]
  onOpenChange: (open: boolean) => void
  onCreateCategory: (label: string) => Promise<AdminBackgroundImageCategory>
  onUploadFiles: (params: { category: string; files: File[] }) => Promise<
    {
      originalName: string
      storage: {
        filePath?: string | null
        thumbnailPath?: string | null
      }
    }[]
  >
  onSubmit: (payload: AdminBackgroundImageInput[]) => Promise<void>
}

interface UploadItemState {
  id: string
  file: File | null
  extension: string
  name: string
  slug: string
  defaults: {
    size: string
    position: string | null
    repeat: string | null
    width: number | ''
    opacity: number
    backgroundColorEnabled: boolean
    backgroundColorValue: string
  }
  paletteSlots: string | null
  tags: string
  description: string
}

const DEFAULT_SIZE = 'cover'
const POSITION_OPTIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']
const SIZE_OPTIONS = ['cover', 'contain', 'contain-repeat', 'stretch']

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

export function UploadBackgroundImagesDialog({
  open,
  categories,
  onOpenChange,
  onCreateCategory,
  onUploadFiles,
  onSubmit,
}: UploadBackgroundImagesDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null)
  const [baseName, setBaseName] = useState('')
  const [items, setItems] = useState<UploadItemState[]>([])
  const [globalPaletteSlots, setGlobalPaletteSlots] = useState('auto')
  const [globalDescription, setGlobalDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedCategoryId(null)
      setSelectedCategorySlug(null)
      setBaseName('')
      setItems([])
      setGlobalPaletteSlots('auto')
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
        defaults: {
          size: DEFAULT_SIZE,
          position: 'center',
          repeat: null,
          width: '',
          opacity: 1,
          backgroundColorEnabled: false,
          backgroundColorValue: '#ffffff',
        },
        paletteSlots: globalPaletteSlots,
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
      alert('Please select a file for each entry.')
      return
    }

    const categorySlug =
      selectedCategorySlug ||
      selectedCategory.slug ||
      slugify(selectedCategory.name || 'uncategorized')

    setIsSubmitting(true)
    try {
      const uploadResults = await onUploadFiles({ category: categorySlug, files })
      if (!uploadResults || uploadResults.length !== items.length) {
        throw new Error('Upload response mismatch')
      }

      const payload: AdminBackgroundImageInput[] = items.map((item, index) => {
        const uploadInfo = uploadResults[index]?.storage ?? {}
        const isVector = item.extension === 'svg'
        return {
          name: item.name,
          slug: item.slug,
          categoryId: selectedCategory.id,
          description: item.description || null,
          format: isVector ? 'vector' : 'pixel',
          filePath: uploadInfo.filePath ?? null,
          thumbnailPath: uploadInfo.thumbnailPath ?? uploadInfo.filePath ?? null,
          defaults: {
            size: item.defaults.size,
            position: item.defaults.position,
            repeat: item.defaults.repeat,
            width: item.defaults.width === '' ? null : Number(item.defaults.width),
            opacity: item.defaults.opacity,
            backgroundColor: item.defaults.backgroundColorEnabled
              ? { enabled: true, defaultValue: item.defaults.backgroundColorValue }
              : { enabled: false },
          },
          paletteSlots: item.paletteSlots,
          tags: item.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          metadata: {
            originalFilename: item.file?.name ?? null,
            uploadCategorySlug: categorySlug,
            legacyUpload: false,
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
          <DialogTitle>Add background images</DialogTitle>
          <DialogDescription>
            Upload new SVGs, set category and default values. Files are stored locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Image files (SVG/PNG)</Label>
              <Input type="file" accept=".svg,.png,.jpg,.jpeg,.webp" multiple onChange={handleFileSelection} />
              <p className="text-xs text-muted-foreground">
                SVG and pixel files are supported. Processing is done server-side.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
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
                placeholder="Select or create category"
                inputPlaceholder="Category..."
                allowClear={false}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-base-name">Base name (multi-upload)</Label>
              <Input
                id="upload-base-name"
                placeholder="e.g. Abstract Floral Aesthetic"
                value={baseName}
                onChange={(event) => handleBaseNameChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                For multiple files, a sequential number is added automatically (01, 02, 03, ...).
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-palette">Palette slots</Label>
              <Input
                id="upload-palette"
                value={globalPaletteSlots}
                onChange={(event) => setGlobalPaletteSlots(event.target.value)}
                placeholder="e.g. auto, standard"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <Label htmlFor="upload-description">Description (optional)</Label>
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
                      Remove
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
                      <Label>Default Size</Label>
                      <Select
                        value={item.defaults.size}
                        onValueChange={(value) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id
                                ? {
                                    ...candidate,
                                    defaults: { ...candidate.defaults, size: value },
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Position</Label>
                      <Select
                        value={item.defaults.position ?? ''}
                        onValueChange={(value) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id
                                ? {
                                    ...candidate,
                                    defaults: { ...candidate.defaults, position: value || null },
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Default</SelectItem>
                          {POSITION_OPTIONS.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Repeat</Label>
                      <Select
                        value={item.defaults.repeat ?? ''}
                        onValueChange={(value) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id
                                ? {
                                    ...candidate,
                                    defaults: { ...candidate.defaults, repeat: value || null },
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Default</SelectItem>
                          <SelectItem value="repeat">Repeat</SelectItem>
                          <SelectItem value="no-repeat">No Repeat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Width (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.defaults.width === '' ? '' : String(item.defaults.width)}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id
                                ? {
                                    ...candidate,
                                    defaults: {
                                      ...candidate.defaults,
                                      width: event.target.value === '' ? '' : Number(event.target.value),
                                    },
                                  }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Opacity</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={item.defaults.opacity}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id
                                ? {
                                    ...candidate,
                                    defaults: {
                                      ...candidate.defaults,
                                      opacity: Number(event.target.value),
                                    },
                                  }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Background Color</Label>
                      <div className="flex items-center gap-3 rounded-md border p-3">
                        <Switch
                          checked={item.defaults.backgroundColorEnabled}
                          onCheckedChange={(checked) =>
                            setItems((prev) =>
                              prev.map((candidate) =>
                                candidate.id === item.id
                                  ? {
                                      ...candidate,
                                      defaults: {
                                        ...candidate.defaults,
                                        backgroundColorEnabled: checked,
                                      },
                                    }
                                  : candidate,
                              ),
                            )
                          }
                        />
                        <Input
                          type="color"
                          value={item.defaults.backgroundColorValue}
                          disabled={!item.defaults.backgroundColorEnabled}
                          onChange={(event) =>
                            setItems((prev) =>
                              prev.map((candidate) =>
                                candidate.id === item.id
                                  ? {
                                      ...candidate,
                                      defaults: {
                                        ...candidate.defaults,
                                        backgroundColorValue: event.target.value,
                                      },
                                    }
                                  : candidate,
                              ),
                            )
                          }
                          className={cn(
                            'h-10 w-16 p-1',
                            !item.defaults.backgroundColorEnabled && 'cursor-not-allowed opacity-60',
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        value={item.tags}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id ? { ...candidate, tags: event.target.value } : candidate,
                            ),
                          )
                        }
                        placeholder="abstract, floral..."
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={item.description}
                        rows={2}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((candidate) =>
                              candidate.id === item.id ? { ...candidate, description: event.target.value } : candidate,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Select one or more files to configure settings.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {isSubmitting ? 'Creating...' : 'Create background images'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

