import { z } from 'zod'
import { apiFetch, apiFetchFormData } from './http'
import type { AdminBackgroundImageInput } from '../types'

const storageSchema = z.object({
  type: z.enum(['local', 's3']),
  filePath: z.string().nullable(),
  thumbnailPath: z.string().nullable(),
  bucket: z.string().nullable(),
  objectKey: z.string().nullable(),
  publicUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
})

const defaultsSchema = z.object({
  size: z.string().nullable(),
  position: z.string().nullable(),
  repeat: z.string().nullable(),
  width: z.number().nullable(),
  opacity: z.number(),
  backgroundColor: z.record(z.any()).nullable(),
})

const adminBackgroundImageCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminBackgroundImageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: adminBackgroundImageCategorySchema,
  format: z.string(),
  storage: storageSchema,
  defaults: defaultsSchema,
  paletteSlots: z.string().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.any()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminBackgroundImageListResponseSchema = z.object({
  items: z.array(adminBackgroundImageSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

const adminBackgroundCategoriesResponseSchema = z.object({
  items: z.array(adminBackgroundImageCategorySchema),
})

const adminBackgroundImageResponseSchema = z.object({
  image: adminBackgroundImageSchema,
})

const adminBackgroundImageCreateResponseSchema = z.object({
  items: z.array(adminBackgroundImageSchema),
})

const adminCategoryResponseSchema = z.object({
  category: adminBackgroundImageCategorySchema,
})

const adminBulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  slugs: z.array(z.string()).optional(),
})

const adminBackgroundImageUploadResponseSchema = z.object({
  items: z.array(
    z.object({
      originalName: z.string(),
      storage: storageSchema.extend({
        type: z.enum(['local', 's3']).optional(),
      }),
    }),
  ),
})

export interface AdminBackgroundImageListParams {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  storageType?: string
  sort?: string
  order?: 'asc' | 'desc'
}

function buildQuery(params?: AdminBackgroundImageListParams) {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.search) searchParams.set('search', params.search)
  if (params.category) searchParams.set('category', params.category)
  if (params.storageType) searchParams.set('storageType', params.storageType)
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.order) searchParams.set('order', params.order)
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export async function fetchAdminBackgroundImages(token: string | null, params?: AdminBackgroundImageListParams) {
  const query = buildQuery(params)
  const response = await apiFetch(token, `/admin/background-images${query}`, undefined, adminBackgroundImageListResponseSchema)
  return response
}

export async function fetchAdminBackgroundImage(token: string | null, identifier: string) {
  const response = await apiFetch(token, `/admin/background-images/${identifier}`, undefined, adminBackgroundImageResponseSchema)
  return response.image
}

export async function fetchAdminBackgroundImageCategories(token: string | null) {
  const response = await apiFetch(token, '/admin/background-images/categories', undefined, adminBackgroundCategoriesResponseSchema)
  return response.items
}

export async function createAdminBackgroundImageCategory(token: string | null, name: string) {
  const response = await apiFetch(
    token,
    '/admin/background-images/categories',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
    adminCategoryResponseSchema,
  )
  return response.category
}

export async function updateAdminBackgroundImageCategory(token: string | null, id: number, name: string) {
  const response = await apiFetch(
    token,
    `/admin/background-images/categories/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    },
    adminCategoryResponseSchema,
  )
  return response.category
}

export async function createAdminBackgroundImages(token: string | null, payload: AdminBackgroundImageInput | AdminBackgroundImageInput[]) {
  const body = Array.isArray(payload) ? { images: payload } : payload
  const response = await apiFetch(
    token,
    '/admin/background-images',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    adminBackgroundImageCreateResponseSchema,
  )
  return response.items
}

export async function updateAdminBackgroundImage(
  token: string | null,
  identifier: string,
  payload: Partial<AdminBackgroundImageInput> & {
    slug?: string
    tags?: string[]
    paletteSlots?: string | null
    metadata?: Record<string, unknown>
  },
) {
  const response = await apiFetch(
    token,
    `/admin/background-images/${identifier}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    adminBackgroundImageResponseSchema,
  )
  return response.image
}

export async function deleteAdminBackgroundImage(token: string | null, identifier: string) {
  await apiFetch(token, `/admin/background-images/${identifier}`, { method: 'DELETE' })
}

export async function bulkDeleteAdminBackgroundImages(token: string | null, identifiers: string[]) {
  const response = await apiFetch(
    token,
    '/admin/background-images/bulk-delete',
    {
      method: 'POST',
      body: JSON.stringify({ ids: identifiers }),
    },
    adminBulkDeleteResponseSchema,
  )
  return response
}

export type { AdminBackgroundImage, AdminBackgroundImageCategory } from '../types'

export async function uploadAdminBackgroundImageFiles(
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
    '/admin/background-images/upload',
    formData,
    adminBackgroundImageUploadResponseSchema,
  )
  return response.items
}

