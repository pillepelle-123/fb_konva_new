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
} from '../../../components/ui'
import { CreatableCombobox } from '../../../components/ui/primitives/creatable-combobox'
import { useAuth } from '../../../context/auth-context'
import {
  fetchAdminBackgroundImages,
  fetchAdminBackgroundImageCategories,
  createAdminBackgroundImageCategory,
} from '../../services/background-images'
import {
  fetchAdminThemePageBackground,
  updateAdminThemePageBackground,
  deleteAdminThemePageBackground,
  type ThemePageBackgroundInput,
} from '../../services/themes-palettes-layouts'
import type { AdminTheme } from '../../services/themes-palettes-layouts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const DEFAULT_SIZES = ['cover', 'contain', 'contain-repeat', 'stretch'] as const
const DEFAULT_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const

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

  if (!slug?.trim())
    return (
      <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
        No image
      </div>
    )
  if (error)
    return (
      <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
        Preview unavailable
      </div>
    )
  if (!objectUrl)
    return (
      <div className="flex aspect-square animate-pulse items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-2">
      <img src={objectUrl} alt="Background image preview" className="max-h-full max-w-full object-contain" />
    </div>
  )
}

interface ThemeBackgroundImageDialogProps {
  open: boolean
  theme: AdminTheme | null
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ThemeBackgroundImageDialog({
  open,
  theme,
  onOpenChange,
  onSuccess,
}: ThemeBackgroundImageDialogProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [size, setSize] = useState<string>('cover')
  const [position, setPosition] = useState<string>('top-left')
  const [repeat, setRepeat] = useState(false)
  const [width, setWidth] = useState<number | ''>(100)
  const [opacity, setOpacity] = useState(1)
  const [applyPalette, setApplyPalette] = useState(true)
  const [paletteMode, setPaletteMode] = useState<string>('monochrome')

  const listParams = useMemo(
    () => ({
      page: 1,
      pageSize: 100,
      search: search.trim() || undefined,
      category: selectedCategory,
    }),
    [search, selectedCategory],
  )

  const pageBackgroundQuery = useQuery({
    queryKey: ['admin', 'theme-page-background', theme?.id],
    queryFn: () => fetchAdminThemePageBackground(token, theme!.id),
    enabled: Boolean(open && theme && token),
  })

  const imagesQuery = useQuery({
    queryKey: ['admin', 'background-images', listParams],
    queryFn: () => fetchAdminBackgroundImages(token, listParams),
    enabled: Boolean(open && token),
    staleTime: 5_000,
  })

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'background-image-categories'],
    queryFn: () => fetchAdminBackgroundImageCategories(token),
    enabled: Boolean(open && token),
    staleTime: 30_000,
  })

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createAdminBackgroundImageCategory(token, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'background-image-categories'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ThemePageBackgroundInput) =>
      updateAdminThemePageBackground(token, theme!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'theme-page-background', theme?.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'themes'] })
      onSuccess?.()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminThemePageBackground(token, theme!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'theme-page-background', theme?.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'themes'] })
      onSuccess?.()
    },
  })

  const pageBackground = pageBackgroundQuery.data ?? null
  const images = imagesQuery.data?.items ?? []
  const categories = categoriesQuery.data ?? []

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: String(category.id),
        label: category.name,
        description: category.slug,
        slug: category.slug,
      })),
    [categories],
  )

  const selectedCategoryOption = categoryOptions.find((option) => option.slug === selectedCategory)

  useEffect(() => {
    if (!open) return
    if (pageBackground) {
      setSelectedImageId(pageBackground.background_image_id)
      setSize(pageBackground.size || 'cover')
      setPosition(pageBackground.position || 'top-left')
      setRepeat(pageBackground.repeat ?? false)
      setWidth(pageBackground.width ?? 100)
      setOpacity(pageBackground.opacity ?? 1)
      setApplyPalette(pageBackground.apply_palette ?? true)
      setPaletteMode(pageBackground.palette_mode || 'monochrome')
    } else {
      setSelectedImageId(null)
      setSize('cover')
      setPosition('top-left')
      setRepeat(false)
      setWidth(100)
      setOpacity(1)
      setApplyPalette(true)
      setPaletteMode('monochrome')
    }
  }, [open, pageBackground])

  const selectedImage = useMemo(
    () => images.find((img) => Number(img.id) === selectedImageId),
    [images, selectedImageId],
  )

  const canSave = Boolean(selectedImageId && !updateMutation.isPending)

  const handleSave = async () => {
    if (!selectedImageId || !theme) return
    await updateMutation.mutateAsync({
      background_image_id: selectedImageId,
      size,
      position,
      repeat,
      width: width === '' ? 100 : Number(width),
      opacity,
      apply_palette: applyPalette,
      palette_mode: paletteMode,
    })
    onOpenChange(false)
  }

  const handleRemove = async () => {
    if (!theme) return
    if (!confirm('Remove background image from this theme?')) return
    await deleteMutation.mutateAsync()
    onOpenChange(false)
  }

  const handleCreateCategory = async (label: string) => {
    const category = await createCategoryMutation.mutateAsync(label)
    setSelectedCategory(category.slug)
    return String(category.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[120vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Background Image: {theme?.name ?? theme?.id}</DialogTitle>
          <DialogDescription>
            Choose a background image for this theme and configure size, position, and palette options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-4">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="theme-bg-search">Search</Label>
              <Input
                id="theme-bg-search"
                placeholder="Search by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <CreatableCombobox
                options={categoryOptions.map(({ value, label, description }) => ({ value, label, description }))}
                value={selectedCategoryOption ? selectedCategoryOption.value : undefined}
                onChange={(value) => {
                  const option = categoryOptions.find((item) => item.value === value)
                  setSelectedCategory(option?.slug)
                }}
                onCreateOption={handleCreateCategory}
                placeholder="Filter by category"
                inputPlaceholder="Search or create category"
                allowClear
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2 block">Select image</Label>
              <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-4">
                {imagesQuery.isLoading ? (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    Loading images…
                  </div>
                ) : images.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    No images found. Adjust search or category.
                  </div>
                ) : (
                  images.map((img) => {
                    const imgId = Number(img.id)
                    const isSelected = imgId === selectedImageId
                    return (
                      <button
                        key={img.slug}
                        type="button"
                        onClick={() => setSelectedImageId(imgId)}
                        className={`flex flex-col items-center gap-1 rounded-md border-2 p-1 transition-colors ${
                          isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="aspect-square w-full overflow-hidden rounded">
                          <BackgroundImagePreview slug={img.slug} token={token} />
                        </div>
                        <span className="truncate text-xs text-muted-foreground" title={img.name}>
                          {img.name}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Settings</Label>
              {selectedImage && (
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded border">
                    <BackgroundImagePreview slug={selectedImage.slug} token={token} />
                  </div>
                  <span className="text-sm font-medium">{selectedImage.name}</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Repeat</Label>
                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <Switch checked={repeat} onCheckedChange={setRepeat} />
                    <span className="text-sm">{repeat ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="theme-bg-width">Width (%)</Label>
                  <Input
                    id="theme-bg-width"
                    type="number"
                    min={0}
                    max={100}
                    value={width === '' ? '' : String(width)}
                    onChange={(e) => {
                      const v = e.target.value
                      setWidth(v === '' ? '' : Number(v))
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="theme-bg-opacity">Opacity</Label>
                  <Input
                    id="theme-bg-opacity"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Apply palette</Label>
                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <Switch checked={applyPalette} onCheckedChange={setApplyPalette} />
                    <span className="text-sm">{applyPalette ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label>Palette mode</Label>
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">monochrome</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          {pageBackground ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={deleteMutation.isPending}
              className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : (
            <div className="mr-auto" />
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
