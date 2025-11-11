import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import { fetchAdminBooks, performAdminBookBulkAction, updateAdminBook, createAdminBook } from '../services'
import type { AdminBook } from '../types'
import type { AdminListParams } from '../services'

const DEFAULT_PAGE_SIZE = 500

export function useAdminBooks(params?: AdminListParams) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const effectiveParams = useMemo<AdminListParams | undefined>(() => {
    if (!params) {
      return { pageSize: DEFAULT_PAGE_SIZE }
    }
    return {
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      page: params.page,
      search: params.search,
      filters: params.filters,
      sort: params.sort,
    }
  }, [params])

  const booksQuery = useQuery({
    queryKey: ['admin', 'books', effectiveParams],
    queryFn: () => fetchAdminBooks(token, effectiveParams),
    enabled: Boolean(token),
  })

  const createMutation = useMutation({
    mutationFn: (payload: Pick<AdminBook, 'name' | 'status'>) => createAdminBook(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; name?: string; status?: 'active' | 'archived' | 'draft' }) =>
      updateAdminBook(token, payload.id, { name: payload.name, status: payload.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: { action: 'archive' | 'restore' | 'delete'; ids: number[] }) =>
      performAdminBookBulkAction(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
    },
  })

  return useMemo(
    () => ({
      booksQuery,
      updateBook: updateMutation.mutateAsync,
      bulkAction: bulkMutation.mutateAsync,
      isLoading: booksQuery.isLoading || booksQuery.isFetching,
      createBook: createMutation.mutateAsync,
      isMutating: createMutation.isPending || updateMutation.isPending || bulkMutation.isPending,
    }),
    [
      booksQuery,
      updateMutation.mutateAsync,
      bulkMutation.mutateAsync,
      createMutation.mutateAsync,
      createMutation.isPending,
      updateMutation.isPending,
      bulkMutation.isPending,
    ],
  )
}

