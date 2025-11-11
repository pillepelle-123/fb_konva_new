import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import { performAdminUserBulkAction, fetchAdminUsers, updateAdminUser, createAdminUser } from '../services'
import type { AdminUser } from '../types'
import type { AdminListParams } from '../services'

const DEFAULT_PAGE_SIZE = 500

export function useAdminUsers(params?: AdminListParams) {
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

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', effectiveParams],
    queryFn: () => fetchAdminUsers(token, effectiveParams),
    enabled: Boolean(token),
  })

  const createMutation = useMutation({
    mutationFn: (payload: Pick<AdminUser, 'name' | 'email' | 'role' | 'status'>) => createAdminUser(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<Pick<AdminUser, 'name' | 'email' | 'role' | 'status'>> }) =>
      updateAdminUser(token, payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: { action: 'activate' | 'suspend' | 'delete'; ids: number[] }) =>
      performAdminUserBulkAction(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  return useMemo(
    () => ({
      usersQuery,
      updateUser: updateMutation.mutateAsync,
      bulkAction: bulkMutation.mutateAsync,
      isLoading: usersQuery.isLoading || usersQuery.isFetching,
      createUser: createMutation.mutateAsync,
      isMutating: createMutation.isPending || updateMutation.isPending || bulkMutation.isPending,
    }),
    [
      usersQuery,
      updateMutation.mutateAsync,
      bulkMutation.mutateAsync,
      createMutation.mutateAsync,
      createMutation.isPending,
      updateMutation.isPending,
      bulkMutation.isPending,
    ],
  )
}

