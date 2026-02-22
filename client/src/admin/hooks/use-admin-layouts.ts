import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import {
  fetchAdminLayouts,
  fetchAdminLayout,
  updateAdminLayout,
  type AdminLayout,
} from '../services/themes-palettes-layouts'

export function useAdminLayouts(category?: string) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const layoutsQuery = useQuery({
    queryKey: ['admin', 'layouts', category],
    queryFn: () => fetchAdminLayouts(token, category),
    enabled: Boolean(token),
    staleTime: 30_000,
  })

  const updateLayoutMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<AdminLayout> }) =>
      updateAdminLayout(token, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'layouts'] })
    },
  })

  return {
    layoutsQuery,
    layouts: layoutsQuery.data ?? [],
    updateLayout: updateLayoutMutation.mutateAsync,
    isUpdating: updateLayoutMutation.isPending,
  }
}

export function useAdminLayout(id: string | number | null) {
  const { token } = useAuth()

  const layoutQuery = useQuery({
    queryKey: ['admin', 'layout', id],
    queryFn: () => fetchAdminLayout(token, id!),
    enabled: Boolean(token && id != null),
    staleTime: 30_000,
  })

  return {
    layoutQuery,
    layout: layoutQuery.data ?? null,
  }
}
