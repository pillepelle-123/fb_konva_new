import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import {
  fetchAdminStickers,
  fetchAdminSticker,
  createAdminStickers,
  updateAdminSticker,
  deleteAdminSticker,
  bulkDeleteAdminStickers,
  fetchAdminStickerCategories,
  createAdminStickerCategory,
  updateAdminStickerCategory,
  uploadAdminStickerFiles,
} from '../services/stickers'
import type {
  AdminSticker,
  AdminStickerCategory,
  AdminStickerInput,
} from '../types'
import type { AdminStickerListParams } from '../services/stickers'

const DEFAULT_PAGE_SIZE = 100

export function useAdminStickers(params?: AdminStickerListParams) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const effectiveParams = useMemo<AdminStickerListParams | undefined>(() => {
    if (!params) {
      return { pageSize: DEFAULT_PAGE_SIZE }
    }
    return {
      ...params,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    }
  }, [params])

  const stickersQuery = useQuery({
    queryKey: ['admin', 'stickers', effectiveParams],
    queryFn: () => fetchAdminStickers(token, effectiveParams),
    enabled: Boolean(token),
    staleTime: 5_000,
  })

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'sticker-categories'],
    queryFn: () => fetchAdminStickerCategories(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  })

  const createStickersMutation = useMutation({
    mutationFn: (input: AdminStickerInput | AdminStickerInput[]) =>
      createAdminStickers(token, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stickers'] })
    },
  })

  const updateStickerMutation = useMutation({
    mutationFn: ({ identifier, data }: { identifier: string; data: Partial<AdminStickerInput> }) =>
      updateAdminSticker(token, identifier, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stickers'] })
      if (updated) {
        queryClient.setQueryData(['admin', 'sticker', updated.slug], { sticker: updated })
      }
    },
  })

  const deleteStickerMutation = useMutation({
    mutationFn: (identifier: string) => deleteAdminSticker(token, identifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stickers'] })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (identifiers: string[]) => bulkDeleteAdminStickers(token, identifiers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'stickers'] })
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createAdminStickerCategory(token, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sticker-categories'] })
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateAdminStickerCategory(token, id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sticker-categories'] })
    },
  })

  const uploadFilesMutation = useMutation({
    mutationFn: (payload: { category: string; files: File[] }) =>
      uploadAdminStickerFiles(token, payload),
  })

  return {
    stickersQuery,
    categoriesQuery,
    createStickers: createStickersMutation.mutateAsync,
    updateSticker: updateStickerMutation.mutateAsync,
    deleteSticker: deleteStickerMutation.mutateAsync,
    bulkDelete: bulkDeleteMutation.mutateAsync,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    uploadFiles: uploadFilesMutation.mutateAsync,
    isLoading: stickersQuery.isLoading,
    isMutating:
      createStickersMutation.isPending ||
      updateStickerMutation.isPending ||
      deleteStickerMutation.isPending ||
      bulkDeleteMutation.isPending ||
      uploadFilesMutation.isPending,
    refetchSticker: (identifier: string) => fetchAdminSticker(token, identifier),
  }
}

export type { AdminSticker, AdminStickerCategory, AdminStickerInput }



