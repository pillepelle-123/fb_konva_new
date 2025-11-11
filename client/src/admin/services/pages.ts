import { z } from 'zod'
import { apiFetch, buildQueryString } from './http'
import type { AdminListParams } from './http'
import type { AdminPageRecord } from '../types'

const adminPageRecordSchema = z.object({
  id: z.number(),
  bookId: z.number(),
  bookName: z.string(),
  pageNumber: z.number(),
  assignedTo: z.string().nullable(),
  assigneeId: z.number().nullable(),
  status: z.enum(['draft', 'in_review', 'published']),
  updatedAt: z.string(),
})

const pageRecordListSchema = z.object({
  items: z.array(adminPageRecordSchema),
  total: z.number(),
})

export async function fetchAdminPageRecords(token: string | null, params?: AdminListParams) {
  const query = buildQueryString(params)
  return apiFetch(token, `/admin/pages${query}`, undefined, pageRecordListSchema)
}

export async function performAdminPageBulkAction(
  token: string | null,
  payload: { action: 'assign' | 'publish' | 'unassign'; ids: number[]; assigneeId?: number },
) {
  return apiFetch(
    token,
    '/admin/pages/bulk',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    z.object({
      updated: z.array(adminPageRecordSchema).optional(),
    }),
  )
}

