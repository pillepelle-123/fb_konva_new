import { z } from 'zod'
import { apiFetch, buildQueryString } from './http'
import type { AdminListParams } from './http'
import type { AdminBook } from '../types'

const adminBookSchema = z.object({
  id: z.number(),
  name: z.string(),
  ownerName: z.string(),
  status: z.enum(['active', 'archived', 'draft']),
  pageCount: z.number(),
  collaboratorCount: z.number(),
  updatedAt: z.string(),
})

const adminBookListSchema = z.object({
  items: z.array(adminBookSchema),
  total: z.number(),
})

const adminBookDetailSchema = z.object({
  book: adminBookSchema,
})

export async function fetchAdminBooks(token: string | null, params?: AdminListParams) {
  const query = buildQueryString(params)
  return apiFetch(token, `/admin/books${query}`, undefined, adminBookListSchema)
}

export async function createAdminBook(
  token: string | null,
  payload: Pick<AdminBook, 'name' | 'status'>,
) {
  const data = await apiFetch(
    token,
    '/admin/books',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    adminBookDetailSchema,
  )
  return data.book
}

export async function updateAdminBook(
  token: string | null,
  bookId: number,
  payload: Partial<Pick<AdminBook, 'name' | 'status'>>,
) {
  const data = await apiFetch(
    token,
    `/admin/books/${bookId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    adminBookDetailSchema,
  )
  return data.book
}

const bulkBookActionSchema = z.object({
  updated: z.array(adminBookSchema).optional(),
  archivedIds: z.array(z.number()).optional(),
})

export async function performAdminBookBulkAction(
  token: string | null,
  payload: { action: 'archive' | 'restore' | 'delete'; ids: number[] },
) {
  return apiFetch(
    token,
    '/admin/books/bulk',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    bulkBookActionSchema,
  )
}

