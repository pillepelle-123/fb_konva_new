import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/auth-context'
import {
  fetchAdminBackgroundImages,
  fetchAdminBackgroundImage,
  createAdminBackgroundImages,
  updateAdminBackgroundImage,
  deleteAdminBackgroundImage,
  bulkDeleteAdminBackgroundImages,
  exportAdminBackgroundImages,
  importAdminBackgroundImages,
  fetchAdminBackgroundImageCategories,
  createAdminBackgroundImageCategory,
  updateAdminBackgroundImageCategory,
  uploadAdminBackgroundImageFiles,
} from '../services/background-images'
import type {
  AdminBackgroundImage,
  AdminBackgroundImageCategory,
  AdminBackgroundImageInput,
} from '../types'
import type { AdminBackgroundImageListParams } from '../services/background-images'

const DEFAULT_PAGE_SIZE = 100

export function useAdminBackgroundImages(params?: AdminBackgroundImageListParams) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const effectiveParams = useMemo<AdminBackgroundImageListParams | undefined>(() => {
    if (!params) {
      return { pageSize: DEFAULT_PAGE_SIZE }
    }
    return {
      ...params,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    }
  }, [params])

  const imagesQuery = useQuery({
    queryKey: ['admin', 'background-images', effectiveParams],
    queryFn: () => fetchAdminBackgroundImages(token, effectiveParams),
    enabled: Boolean(token),
    staleTime: 5_000,
  })

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'background-image-categories'],
    queryFn: () => fetchAdminBackgroundImageCategories(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  })

  const createImagesMutation = useMutation({
    mutationFn: (input: AdminBackgroundImageInput | AdminBackgroundImageInput[]) =>
      createAdminBackgroundImages(token, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'background-images'] })
    },
  })

  const updateImageMutation = useMutation({
    mutationFn: ({ identifier, data }: { identifier: string; data: Partial<AdminBackgroundImageInput> }) =>
      updateAdminBackgroundImage(token, identifier, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'background-images'] })
      if (updated) {
        queryClient.setQueryData(['admin', 'background-image', updated.slug], { image: updated })
      }
    },
  })

  const deleteImageMutation = useMutation({
    mutationFn: (identifier: string) => deleteAdminBackgroundImage(token, identifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'background-images'] })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (identifiers: string[]) => bulkDeleteAdminBackgroundImages(token, identifiers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'background-images'] })
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createAdminBackgroundImageCategory(token, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'background-image-categories'] })
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateAdminBackgroundImageCategory(token, id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'background-image-categories'] })
    },
  })

  const uploadFilesMutation = useMutation({
    mutationFn: (payload: { category: string; files: File[] }) =>
      uploadAdminBackgroundImageFiles(token, payload),
  })

  const exportMutation = useMutation({
    mutationFn: (slugs: string[]) => exportAdminBackgroundImages(token, slugs),
  })

  const importMutation = useMutation({
    mutationFn: (params: { file: File; resolution?: Record<string, string> }) =>
      importAdminBackgroundImages(token, params.file, params.resolution),
    onSuccess: (result) => {
      if ('imported' in result && result.imported.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'background-images'] })
        queryClient.invalidateQueries({ queryKey: ['admin', 'background-image-categories'] })
      }
    },
  })

  return {
    imagesQuery,
    categoriesQuery,
    createImages: createImagesMutation.mutateAsync,
    updateImage: updateImageMutation.mutateAsync,
    deleteImage: deleteImageMutation.mutateAsync,
    bulkDelete: bulkDeleteMutation.mutateAsync,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    uploadFiles: uploadFilesMutation.mutateAsync,
    exportImages: exportMutation.mutateAsync,
    importImages: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    isLoading: imagesQuery.isLoading,
    isMutating:
      createImagesMutation.isPending ||
      updateImageMutation.isPending ||
      deleteImageMutation.isPending ||
      bulkDeleteMutation.isPending ||
      uploadFilesMutation.isPending,
    refetchImage: (identifier: string) => fetchAdminBackgroundImage(token, identifier),
  }
}

export type { AdminBackgroundImage, AdminBackgroundImageCategory, AdminBackgroundImageInput }

