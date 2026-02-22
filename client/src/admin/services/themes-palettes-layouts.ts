import { apiFetch } from './http'

export interface AdminTheme {
  id: string | number
  name: string
  description?: string
  palette_id?: string
  palette?: string
  pageSettings?: Record<string, unknown>
  elementDefaults?: Record<string, unknown>
  config?: Record<string, unknown>
  updated_at?: string
}

export interface AdminColorPalette {
  id: string | number
  name: string
  colors: Record<string, string>
  parts: Record<string, string>
  contrast?: string
  updated_at?: string
}

export interface AdminLayout {
  id: string | number
  name: string
  category?: string
  thumbnail?: string
  textboxes?: unknown[]
  elements?: unknown[]
  meta?: Record<string, unknown>
  updated_at?: string
}

export async function fetchAdminThemes(token: string | null) {
  const res = await apiFetch<{ items: AdminTheme[] }>(token, '/admin/themes')
  return res.items
}

export async function fetchAdminTheme(token: string | null, id: string | number) {
  const res = await apiFetch<{ theme: AdminTheme }>(token, `/admin/themes/${encodeURIComponent(id)}`)
  return res.theme
}

export async function createAdminTheme(token: string | null, data: Omit<AdminTheme, 'updated_at'> & { config?: { pageSettings?: unknown; elementDefaults?: unknown } }) {
  const res = await apiFetch<{ theme: AdminTheme }>(token, '/admin/themes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.theme
}

export async function updateAdminTheme(token: string | null, id: string | number, data: Partial<AdminTheme>) {
  const res = await apiFetch<{ theme: AdminTheme }>(token, `/admin/themes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.theme
}

export async function fetchAdminColorPalettes(token: string | null) {
  const res = await apiFetch<{ items: AdminColorPalette[] }>(token, '/admin/color-palettes')
  return res.items
}

export async function fetchAdminColorPalette(token: string | null, id: string | number) {
  const res = await apiFetch<{ palette: AdminColorPalette }>(token, `/admin/color-palettes/${encodeURIComponent(id)}`)
  return res.palette
}

export async function createAdminColorPalette(token: string | null, data: Omit<AdminColorPalette, 'updated_at'>) {
  const res = await apiFetch<{ palette: AdminColorPalette }>(token, '/admin/color-palettes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.palette
}

export async function updateAdminColorPalette(token: string | null, id: string | number, data: Partial<AdminColorPalette>) {
  const res = await apiFetch<{ palette: AdminColorPalette }>(token, `/admin/color-palettes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.palette
}

export async function fetchAdminLayouts(token: string | null, category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  const res = await apiFetch<{ items: AdminLayout[] }>(token, `/admin/layouts${query}`)
  return res.items
}

export async function fetchAdminLayout(token: string | null, id: string | number) {
  const res = await apiFetch<{ template: AdminLayout }>(token, `/admin/layouts/${encodeURIComponent(String(id))}`)
  return res.template
}

export async function updateAdminLayout(token: string | null, id: string | number, data: Partial<AdminLayout>) {
  const res = await apiFetch<{ template: AdminLayout }>(token, `/admin/layouts/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.template
}
