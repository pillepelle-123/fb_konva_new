import { z } from 'zod'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export class AdminApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface AdminListParams {
  page?: number
  pageSize?: number
  search?: string
  filters?: Record<string, string | string[] | undefined>
  sort?: string
}

function buildQueryString(params?: AdminListParams) {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.search) searchParams.set('search', params.search)
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(`filters[${key}][]`, v))
      } else if (value !== undefined) {
        searchParams.set(`filters[${key}]`, value)
      }
    })
  }
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export { buildQueryString }

export async function apiFetch<T>(
  token: string | null,
  path: string,
  init: RequestInit = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new AdminApiError(errorText || response.statusText, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = (await response.json()) as unknown
  return schema ? schema.parse(data) : (data as T)
}

