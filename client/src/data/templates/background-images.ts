import { z } from 'zod'
import type { BackgroundImage, BackgroundImageWithUrl } from '../../types/template-types.ts'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

let apiBaseOrigin: string | null = null
try {
  const parsed = new URL(API_BASE_URL)
  apiBaseOrigin = parsed.origin
} catch (error) {
  console.warn('Invalid VITE_API_URL, falling back to relative paths:', error)
}

const PUBLIC_UPLOAD_PREFIX = 'uploads/background-images'

const svgRawCache: Record<string, string> = {}
export const svgRawImports: Record<string, string | undefined> = svgRawCache

let registry: BackgroundImageWithUrl[] = []
let registryMap = new Map<string, BackgroundImageWithUrl>()
let registryCategories: BackgroundImage['category'][] = []

const apiCategorySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  slug: z.string().nullable().optional(),
})

const apiStorageSchema = z.object({
  filePath: z.string().nullable().optional(),
  thumbnailPath: z.string().nullable().optional(),
  publicUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
})

const apiDefaultsSchema = z.object({
  size: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  repeat: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  opacity: z.number().nullable().optional(),
  backgroundColor: z
    .object({
      enabled: z.boolean().optional(),
      defaultValue: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

const apiRecordSchema = z.object({
  id: z.string().optional(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: apiCategorySchema,
  format: z.enum(['vector', 'pixel']),
  storage: apiStorageSchema,
  defaults: apiDefaultsSchema,
  paletteSlots: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
})

const apiListResponseSchema = z.object({
  items: z.array(apiRecordSchema),
})

function resolveLocalUrl(relativePath?: string | null) {
  if (!relativePath) return ''
  let normalized = relativePath.replace(/^\/+/, '')

  if (!normalized.startsWith('uploads/')) {
    normalized = normalized.startsWith('background-images/')
      ? normalized.replace(/^background-images\//, '')
      : normalized
    normalized = `${PUBLIC_UPLOAD_PREFIX}/${normalized}`
  }

  const pathWithPrefix = normalized.replace(/^\/+/, '')

  if (apiBaseOrigin) {
    return `${apiBaseOrigin}/${pathWithPrefix}`
  }

  return `/${pathWithPrefix}`
}

function transformApiRecord(record: z.infer<typeof apiRecordSchema>): BackgroundImageWithUrl {
  const storage = record.storage ?? {}
  const storagePublicUrl =
    (storage as { publicUrl?: string | null }).publicUrl ?? null
  const storageThumbnailUrl =
    (storage as { thumbnailUrl?: string | null }).thumbnailUrl ?? null
  const defaults = record.defaults ?? {}
  const backgroundColor = defaults.backgroundColor
    ? {
        enabled: Boolean(defaults.backgroundColor.enabled),
        defaultValue: defaults.backgroundColor.defaultValue ?? undefined,
      }
    : undefined
  const paletteSlots =
    record.paletteSlots === 'standard' || record.paletteSlots === 'auto' ? record.paletteSlots : undefined

  const filePath = storage.filePath ?? undefined
  const thumbnailPath = storage.thumbnailPath ?? storage.filePath ?? undefined

  const backgroundImage: BackgroundImage = {
    id: record.slug ?? record.id ?? record.name,
    name: record.name,
    category: record.category.slug ?? record.category.name,
    format: record.format,
    filePath: filePath ?? '',
    thumbnail: thumbnailPath ?? filePath ?? '',
    defaultSize: (defaults.size as BackgroundImage['defaultSize'] | undefined) ?? 'cover',
    defaultOpacity: defaults.opacity ?? 1,
    defaultWidth: defaults.width ?? undefined,
    defaultPosition: (defaults.position as BackgroundImage['defaultPosition'] | undefined) ?? undefined,
    backgroundColor,
    paletteSlots,
    description: record.description ?? undefined,
    tags: record.tags ?? undefined,
  }

  const resolveUrl = (u: string | null) => (u && apiBaseOrigin && u.startsWith('/') ? apiBaseOrigin + u : u)

  const url = resolveUrl(storagePublicUrl) ?? resolveLocalUrl(filePath) ?? filePath ?? ''
  const thumbnailUrl = resolveUrl(storageThumbnailUrl) ?? resolveLocalUrl(thumbnailPath) ?? thumbnailPath ?? url

  return {
    ...backgroundImage,
    url,
    thumbnailUrl: thumbnailUrl || url,
  }
}

function rebuildDerivedState(images: BackgroundImageWithUrl[]) {
  registry = images
  registryMap = new Map(images.map((image) => [image.id, image]))
  const categorySet = new Set<BackgroundImage['category']>()
  images.forEach((image) => {
    if (image.category) categorySet.add(image.category)
  })
  registryCategories = Array.from(categorySet)
}

export async function loadBackgroundImageRegistry(force = false) {
  if (registry.length > 0 && !force) return

  try {
    const response = await fetch(`${API_BASE_URL}/background-images?page=1&pageSize=500`)
    if (!response.ok) {
      throw new Error(`Failed to load background images (${response.status})`)
    }
    const payload = apiListResponseSchema.parse(await response.json())
    const transformed = payload.items.map(transformApiRecord)
    rebuildDerivedState(transformed)

    await Promise.all(
      transformed
        .filter((image) => image.format === 'vector' && image.url)
        .map(async (image) => {
          try {
            const response = await fetch(image.url, { credentials: 'include' })
            if (!response.ok) return
            const raw = await response.text()
            svgRawCache[image.filePath] = raw
          } catch (error) {
            console.warn(`SVG konnte nicht geladen werden (${image.filePath}):`, error)
          }
        }),
    )
  } catch (error) {
    console.error('Hintergrundbilder konnten nicht geladen werden:', error)
    rebuildDerivedState([])
  }
}

export function getBackgroundImages(): BackgroundImage[] {
  return registry
}

export function getBackgroundImageById(id: string): BackgroundImageWithUrl | undefined {
  return registryMap.get(id)
}

export function getBackgroundImagesByCategory(category: BackgroundImage['category']): BackgroundImageWithUrl[] {
  return registry.filter((image) => image.category === category)
}

export function getBackgroundImagesByFormat(format: 'vector' | 'pixel'): BackgroundImageWithUrl[] {
  return registry.filter((image) => image.format === format)
}

export function searchBackgroundImages(query: string): BackgroundImageWithUrl[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return registry

  return registry.filter((image) => {
    const nameMatch = image.name.toLowerCase().includes(normalized)
    const descMatch = image.description?.toLowerCase().includes(normalized)
    const tagMatch = image.tags?.some((tag) => tag.toLowerCase().includes(normalized))
    return Boolean(nameMatch || descMatch || tagMatch)
  })
}

export function getBackgroundImageWithUrl(id: string): BackgroundImageWithUrl | undefined {
  return registryMap.get(id)
}

export function getBackgroundImagesWithUrl(): BackgroundImageWithUrl[] {
  return registry
}

export function getBackgroundImageCategories(): BackgroundImage['category'][] {
  return registryCategories
}