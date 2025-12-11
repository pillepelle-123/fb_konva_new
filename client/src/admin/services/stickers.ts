import { z } from 'zod'
import { apiFetch, apiFetchFormData } from './http'
import type { AdminStickerInput } from '../types'

const storageSchema = z.object({
  type: z.enum(['local', 's3']),
  filePath: z.string().nullable(),
  thumbnailPath: z.string().nullable(),
  bucket: z.string().nullable(),
  objectKey: z.string().nullable(),
  publicUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
})

const adminStickerCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminStickerSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: adminStickerCategorySchema,
  format: z.string(),
  storage: storageSchema,
  tags: z.array(z.string()),
  metadata: z.record(z.any()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminStickerListResponseSchema = z.object({
  items: z.array(adminStickerSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

const adminStickerCategoriesResponseSchema = z.object({
  items: z.array(adminStickerCategorySchema),
})

const adminStickerResponseSchema = z.object({
  sticker: adminStickerSchema,
})

const adminStickerCreateResponseSchema = z.object({
  items: z.array(adminStickerSchema),
})

const adminCategoryResponseSchema = z.object({
  category: adminStickerCategorySchema,
})

const adminBulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  slugs: z.array(z.string()).optional(),
})

const adminStickerUploadResponseSchema = z.object({
  items: z.array(
    z.object({
      originalName: z.string(),
      storage: storageSchema.extend({
        type: z.enum(['local', 's3']).optional(),
      }),
    }),
  ),
})

export interface AdminStickerListParams {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  storageType?: string
  format?: string
  sort?: string
  order?: 'asc' | 'desc'
}

function buildQuery(params?: AdminStickerListParams) {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.search) searchParams.set('search', params.search)
  if (params.category) searchParams.set('category', params.category)
  if (params.storageType) searchParams.set('storageType', params.storageType)
  if (params.format) searchParams.set('format', params.format)
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.order) searchParams.set('order', params.order)
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export async function fetchAdminStickers(token: string | null, params?: AdminStickerListParams) {
  const query = buildQuery(params)
  const response = await apiFetch(token, `/admin/stickers${query}`, undefined, adminStickerListResponseSchema)
  return response
}

export async function fetchAdminSticker(token: string | null, identifier: string) {
  const response = await apiFetch(token, `/admin/stickers/${identifier}`, undefined, adminStickerResponseSchema)
  return response.sticker
}

export async function fetchAdminStickerCategories(token: string | null) {
  const response = await apiFetch(token, '/admin/stickers/categories', undefined, adminStickerCategoriesResponseSchema)
  return response.items
}

export async function createAdminStickerCategory(token: string | null, name: string) {
  const response = await apiFetch(
    token,
    '/admin/stickers/categories',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
    adminCategoryResponseSchema,
  )
  return response.category
}

export async function updateAdminStickerCategory(token: string | null, id: number, name: string) {
  const response = await apiFetch(
    token,
    `/admin/stickers/categories/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    },
    adminCategoryResponseSchema,
  )
  return response.category
}

export async function createAdminStickers(token: string | null, payload: AdminStickerInput | AdminStickerInput[]) {
  const body = Array.isArray(payload) ? { stickers: payload } : payload
  const response = await apiFetch(
    token,
    '/admin/stickers',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    adminStickerCreateResponseSchema,
  )
  return response.items
}

export async function updateAdminSticker(
  token: string | null,
  identifier: string,
  payload: Partial<AdminStickerInput> & {
    slug?: string
    tags?: string[]
    metadata?: Record<string, unknown>
  },
) {
  const response = await apiFetch(
    token,
    `/admin/stickers/${identifier}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    adminStickerResponseSchema,
  )
  return response.sticker
}

export async function deleteAdminSticker(token: string | null, identifier: string) {
  await apiFetch(token, `/admin/stickers/${identifier}`, { method: 'DELETE' })
}

export async function bulkDeleteAdminStickers(token: string | null, identifiers: string[]) {
  const response = await apiFetch(
    token,
    '/admin/stickers/bulk-delete',
    {
      method: 'POST',
      body: JSON.stringify({ ids: identifiers }),
    },
    adminBulkDeleteResponseSchema,
  )
  return response
}

export type { AdminSticker, AdminStickerCategory } from '../types'

export async function uploadAdminStickerFiles(
  token: string | null,
  params: { category: string; files: File[] },
) {
  const formData = new FormData()
  formData.append('category', params.category)
  params.files.forEach((file) => {
    formData.append('files', file, file.name)
  })

  const response = await apiFetchFormData(
    token,
    '/admin/stickers/upload',
    formData,
    adminStickerUploadResponseSchema,
  )
  return response.items
}






