import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import {
  fetchAdminThemes,
  fetchAdminTheme,
  updateAdminTheme,
  type AdminTheme,
} from '../services/themes-palettes-layouts'

export function useAdminThemes() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const themesQuery = useQuery({
    queryKey: ['admin', 'themes'],
    queryFn: () => fetchAdminThemes(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  })

  const updateThemeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminTheme> }) =>
      updateAdminTheme(token, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'themes'] })
    },
  })

  return {
    themesQuery,
    themes: themesQuery.data ?? [],
    updateTheme: updateThemeMutation.mutateAsync,
    isUpdating: updateThemeMutation.isPending,
  }
}

export function useAdminTheme(id: string | null) {
  const { token } = useAuth()

  const themeQuery = useQuery({
    queryKey: ['admin', 'theme', id],
    queryFn: () => fetchAdminTheme(token, id!),
    enabled: Boolean(token && id),
    staleTime: 30_000,
  })

  return {
    themeQuery,
    theme: themeQuery.data ?? null,
  }
}
