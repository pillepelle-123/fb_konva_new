import { z } from 'zod'
import type { AdminUser } from '../types'
import { apiFetch, buildQueryString } from './http'
import type { AdminListParams } from './http'

const adminUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'user']),
  status: z.enum(['active', 'invited', 'suspended']),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
})

const adminUserListSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number(),
})

const adminUserDetailSchema = z.object({
  user: adminUserSchema,
})

export type AdminUserListResponse = z.infer<typeof adminUserListSchema>

export async function createAdminUser(
  token: string | null,
  payload: Pick<AdminUser, 'name' | 'email' | 'role' | 'status'>,
) {
  const data = await apiFetch(
    token,
    '/admin/users',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    adminUserDetailSchema,
  )
  return data.user
}

export async function fetchAdminUsers(token: string | null, params?: AdminListParams) {
  const query = buildQueryString(params)
  const data = await apiFetch(token, `/admin/users${query}`, undefined, adminUserListSchema)
  return data
}

export async function updateAdminUser(
  token: string | null,
  userId: number,
  payload: Partial<Pick<AdminUser, 'name' | 'email' | 'role' | 'status'>>,
) {
  const data = await apiFetch(
    token,
    `/admin/users/${userId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    adminUserDetailSchema,
  )
  return data.user
}

const bulkActionSchema = z.object({
  updated: z.array(adminUserSchema).optional(),
  deletedIds: z.array(z.number()).optional(),
})

export async function performAdminUserBulkAction(
  token: string | null,
  payload: { action: 'activate' | 'suspend' | 'delete'; ids: number[] },
) {
  const data = await apiFetch(
    token,
    '/admin/users/bulk',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    bulkActionSchema,
  )
  return data
}

