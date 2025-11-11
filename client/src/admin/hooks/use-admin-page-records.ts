import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import { fetchAdminPageRecords, performAdminPageBulkAction } from '../services'
import type { AdminListParams } from '../services'

const DEFAULT_PAGE_SIZE = 500

export function useAdminPageRecords(params?: AdminListParams) {
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

  const pageRecordsQuery = useQuery({
    queryKey: ['admin', 'page-records', effectiveParams],
    queryFn: () => fetchAdminPageRecords(token, effectiveParams),
    enabled: Boolean(token),
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: { action: 'assign' | 'publish' | 'unassign'; ids: number[]; assigneeId?: number }) =>
      performAdminPageBulkAction(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'page-records'] })
    },
  })

  return useMemo(
    () => ({
      pageRecordsQuery,
      bulkAction: bulkMutation.mutateAsync,
      isLoading: pageRecordsQuery.isLoading || pageRecordsQuery.isFetching,
      isMutating: bulkMutation.isPending,
    }),
    [pageRecordsQuery, bulkMutation.mutateAsync, bulkMutation.isPending],
  )
}

