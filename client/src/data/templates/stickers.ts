import { z } from 'zod'
import type { Sticker, StickerWithUrl } from '../../types/template-types.ts'
import { OPENMOJI_STICKERS, getOpenMojiUrl, type OpenMojiSticker } from './openmoji-stickers'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

let apiBaseOrigin: string | null = null
try {
  const parsed = new URL(API_BASE_URL)
  apiBaseOrigin = parsed.origin
} catch (error) {
  console.warn('Invalid VITE_API_URL, falling back to relative paths:', error)
}

const PUBLIC_UPLOAD_PREFIX = 'uploads/stickers'

const svgRawCache: Record<string, string> = {}
export const svgRawImports: Record<string, string | undefined> = svgRawCache

let registry: StickerWithUrl[] = []
let registryMap = new Map<string, StickerWithUrl>()
let registryCategories: Sticker['category'][] = []

const apiCategorySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  slug: z.string().nullable().optional(),
})

const apiStorageSchema = z.object({
  type: z.enum(['local', 's3']).nullable().optional(),
  filePath: z.string().nullable().optional(),
  thumbnailPath: z.string().nullable().optional(),
  bucket: z.string().nullable().optional(),
  objectKey: z.string().nullable().optional(),
  publicUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
})

const apiRecordSchema = z.object({
  id: z.string().optional(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: apiCategorySchema,
  format: z.enum(['vector', 'pixel']),
  storage: apiStorageSchema,
  tags: z.array(z.string()).nullable().optional(),
})

const apiListResponseSchema = z.object({
  items: z.array(apiRecordSchema),
})

function resolveLocalUrl(relativePath?: string | null) {
  if (!relativePath) return ''
  // Normalize backslashes to forward slashes
  let normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')

  if (!normalized.startsWith('uploads/')) {
    normalized = normalized.startsWith('stickers/')
      ? normalized.replace(/^stickers\//, '')
      : normalized
    normalized = `${PUBLIC_UPLOAD_PREFIX}/${normalized}`
  }

  const pathWithPrefix = normalized.replace(/^\/+/, '')

  if (apiBaseOrigin) {
    return `${apiBaseOrigin}/${pathWithPrefix}`
  }

  return `/${pathWithPrefix}`
}

function transformApiRecord(record: z.infer<typeof apiRecordSchema>): StickerWithUrl {
  const storage = record.storage ?? {}
  const storagePublicUrl =
    (storage as { publicUrl?: string | null }).publicUrl ?? null
  const storageThumbnailUrl =
    (storage as { thumbnailUrl?: string | null }).thumbnailUrl ?? null

  const filePath = storage.filePath ?? undefined
  const thumbnailPath = storage.thumbnailPath ?? storage.filePath ?? undefined
  const storageType = (storage.type as 'local' | 's3' | undefined) ?? 'local'

  const sticker: Sticker = {
    id: record.slug ?? record.id ?? record.name,
    name: record.name,
    category: record.category.slug ?? record.category.name,
    format: record.format,
    filePath: filePath ?? '',
    thumbnail: thumbnailPath ?? filePath ?? '',
    description: record.description ?? undefined,
    tags: record.tags ?? undefined,
    storageType,
  }

  const resolveUrl = (u: string | null) => (u && apiBaseOrigin && u.startsWith('/') ? apiBaseOrigin + u : u)

  const url =
    resolveUrl(storagePublicUrl) ??
    (storageType === 'local'
      ? resolveLocalUrl(filePath)
      : storage.bucket && storage.objectKey
        ? `https://${storage.bucket}.s3.amazonaws.com/${storage.objectKey}`
        : filePath ?? '')

  const thumbnailUrl =
    resolveUrl(storageThumbnailUrl) ??
    (storageType === 'local'
      ? resolveLocalUrl(thumbnailPath)
      : storage.bucket && storage.objectKey
        ? `https://${storage.bucket}.s3.amazonaws.com/${storage.objectKey}`
        : thumbnailPath ?? url)

  return {
    ...sticker,
    url,
    thumbnailUrl: thumbnailUrl || url,
  }
}

function rebuildDerivedState(stickers: StickerWithUrl[]) {
  registry = stickers
  registryMap = new Map(stickers.map((sticker) => [sticker.id, sticker]))
  const categorySet = new Set<Sticker['category']>()
  stickers.forEach((sticker) => {
    if (sticker.category) categorySet.add(sticker.category)
  })
  registryCategories = Array.from(categorySet)
}

export async function loadStickerRegistry(force = false) {
  if (registry.length > 0 && !force) return

  try {
    const response = await fetch(`${API_BASE_URL}/stickers?page=1&pageSize=500`)
    if (!response.ok) {
      throw new Error(`Failed to load stickers (${response.status})`)
    }
    const payload = apiListResponseSchema.parse(await response.json())
    const transformed = payload.items.map(transformApiRecord)
    // OpenMoji-Sticker hinzufügen
    const openMojiStickers: StickerWithUrl[] = OPENMOJI_STICKERS.map(sticker => ({
      id: `openmoji-${sticker.hexcode}`,
      name: sticker.name,
      category: sticker.category as Sticker['category'],
      format: 'vector' as const,
      filePath: getOpenMojiUrl(sticker.hexcode),
      thumbnail: getOpenMojiUrl(sticker.hexcode),
      description: `${sticker.emoji} ${sticker.name}`,
      tags: sticker.tags,
      storageType: 'external' as const,
      url: getOpenMojiUrl(sticker.hexcode),
    }));

    // Kombiniere API-Sticker und OpenMoji-Sticker
    const allStickers = [...transformed, ...openMojiStickers];
    rebuildDerivedState(allStickers)

    await Promise.all(
      transformed
        .filter((sticker) => sticker.format === 'vector' && sticker.url)
        .map(async (sticker) => {
          try {
            const response = await fetch(sticker.url, { credentials: 'include' })
            if (!response.ok) return
            const raw = await response.text()
            svgRawCache[sticker.filePath] = raw
          } catch (error) {
            console.warn(`SVG konnte nicht geladen werden (${sticker.filePath}):`, error)
          }
        }),
    )
  } catch (error) {
    console.error('Sticker konnten nicht geladen werden:', error)
    rebuildDerivedState([])
  }
}

export function getStickers(): Sticker[] {
  return registry
}

export function getStickerById(id: string): StickerWithUrl | undefined {
  return registryMap.get(id)
}

export function getStickersByCategory(category: Sticker['category']): StickerWithUrl[] {
  return registry.filter((sticker) => sticker.category === category)
}

export function getStickersByFormat(format: 'vector' | 'pixel'): StickerWithUrl[] {
  return registry.filter((sticker) => sticker.format === format)
}

export function searchStickers(query: string): StickerWithUrl[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return registry

  return registry.filter((sticker) => {
    const nameMatch = sticker.name.toLowerCase().includes(normalized)
    const descMatch = sticker.description?.toLowerCase().includes(normalized)
    const tagMatch = sticker.tags?.some((tag) => tag.toLowerCase().includes(normalized))
    return Boolean(nameMatch || descMatch || tagMatch)
  })
}

export function getStickerWithUrl(id: string): StickerWithUrl | undefined {
  return registryMap.get(id)
}

export function getStickersWithUrl(): StickerWithUrl[] {
  return registry
}

export function getStickerCategories(): Sticker['category'][] {
  return registryCategories
}