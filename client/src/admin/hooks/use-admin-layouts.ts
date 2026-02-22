import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import {
  fetchAdminLayoutTemplates,
  fetchAdminLayoutTemplate,
  updateAdminLayoutTemplate,
  type AdminLayoutTemplate,
} from '../services/themes-palettes-layouts'

export function useAdminLayouts(category?: string) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const layoutsQuery = useQuery({
    queryKey: ['admin', 'layout-templates', category],
    queryFn: () => fetchAdminLayoutTemplates(token, category),
    enabled: Boolean(token),
    staleTime: 30_000,
  })

  const updateLayoutMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminLayoutTemplate> }) =>
      updateAdminLayoutTemplate(token, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'layout-templates'] })
    },
  })

  return {
    layoutsQuery,
    layouts: layoutsQuery.data ?? [],
    updateLayout: updateLayoutMutation.mutateAsync,
    isUpdating: updateLayoutMutation.isPending,
  }
}

export function useAdminLayout(id: string | null) {
  const { token } = useAuth()

  const layoutQuery = useQuery({
    queryKey: ['admin', 'layout-template', id],
    queryFn: () => fetchAdminLayoutTemplate(token, id!),
    enabled: Boolean(token && id),
    staleTime: 30_000,
  })

  return {
    layoutQuery,
    layout: layoutQuery.data ?? null,
  }
}
