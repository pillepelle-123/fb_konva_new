import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import {
  fetchAdminColorPalettes,
  fetchAdminColorPalette,
  updateAdminColorPalette,
  type AdminColorPalette,
} from '../services/themes-palettes-layouts'

export function useAdminColorPalettes() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const palettesQuery = useQuery({
    queryKey: ['admin', 'color-palettes'],
    queryFn: () => fetchAdminColorPalettes(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  })

  const updatePaletteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<AdminColorPalette> }) =>
      updateAdminColorPalette(token, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'color-palettes'] })
    },
  })

  return {
    palettesQuery,
    palettes: palettesQuery.data ?? [],
    updatePalette: updatePaletteMutation.mutateAsync,
    isUpdating: updatePaletteMutation.isPending,
  }
}

export function useAdminColorPalette(id: string | null) {
  const { token } = useAuth()

  const paletteQuery = useQuery({
    queryKey: ['admin', 'color-palette', id],
    queryFn: () => fetchAdminColorPalette(token, id!),
    enabled: Boolean(token && id),
    staleTime: 30_000,
  })

  return {
    paletteQuery,
    palette: paletteQuery.data ?? null,
  }
}
