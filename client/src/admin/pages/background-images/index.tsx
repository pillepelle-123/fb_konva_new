import { useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, Edit, FileDown, Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import {
  Badge,
  Button,
  Input,
  Label,
} from '../../../components/ui'
import { DataTable } from '../../components/table'
import type { DataTableBulkAction } from '../../components/table'
import { CreatableCombobox } from '../../../components/ui/primitives/creatable-combobox'
import {
  useAdminBackgroundImages,
  type AdminBackgroundImage,
} from '../../hooks'
import { AdminBackgroundImageEditDialog } from '../../components/forms/background-image-edit-dialog'
import { ImportConflictDialog } from '../../components/forms/import-conflict-dialog'
import { UploadBackgroundImagesDialog } from '../../components/forms/upload-background-images-dialog'

const DEFAULT_PAGE_SIZE = 100

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function AdminBackgroundImagesPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<AdminBackgroundImage | null>(null)
  const [importConflict, setImportConflict] = useState<{
    file: File
    conflicts: { slug: string; name: string; existingName: string | null }[]
    totalItems: number
  } | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const listParams = useMemo(
    () => ({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      search: search.trim() || undefined,
      category: selectedCategory,
    }),
    [search, selectedCategory],
  )

  const {
    imagesQuery,
    categoriesQuery,
    createImages,
    updateImage,
    deleteImage,
    bulkDelete,
    createCategory,
    uploadFiles,
    exportImages,
    importImages,
    isImporting,
  } = useAdminBackgroundImages(listParams)

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])

  const tableData = imagesQuery.data?.items ?? []

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: String(category.id),
        label: category.name,
        description: category.slug,
        slug: category.slug,
      })),
    [categories],
  )

  const columns = useMemo<ColumnDef<AdminBackgroundImage>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</span>,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">/{row.original.slug}</span>
          </div>
        ),
      },
      {
        id: 'category',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">category</span>,
        accessorFn: (row) => row.category.name,
        cell: ({ row }) => <Badge variant="secondary">{row.original.category.name}</Badge>,
      },
      {
        accessorKey: 'format',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">format</span>,
        cell: ({ row }) => <span className="text-sm capitalize text-muted-foreground">{row.original.format}</span>,
      },
      {
        id: 'defaults',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Defaults</span>,
        cell: ({ row }) => {
          const defaults = row.original.defaults
          return (
            <div className="text-xs text-muted-foreground">
              <div>Size: {defaults.size ?? '–'}</div>
              <div>Opacity: {defaults.opacity?.toFixed(2)}</div>
            </div>
          )
        },
      },
      {
        accessorKey: 'updatedAt',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">updatedAt</span>,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.updatedAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
        
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingImage(row.original)
                setIsEditOpen(true)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
        
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (confirm(`Delete background image "${row.original.name}"?`)) {
                  await deleteImage(row.original.slug)
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          
          </div>
        ),
      },
    ],
    [deleteImage],
  )

  const bulkActions = useMemo<DataTableBulkAction<AdminBackgroundImage>[]>(
    () => [
      {
        id: 'bulk-export',
        label: 'Export',
        icon: Download,
        onAction: async (rows) => {
          if (rows.length === 0) return
          await exportImages(rows.map((row) => row.slug))
        },
      },
      {
        id: 'bulk-delete',
        label: 'Delete',
        intent: 'destructive',
        onAction: async (rows) => {
          if (rows.length === 0) return
          if (!confirm(`Delete ${rows.length} background image(s)? This action cannot be undone.`)) {
            return
          }
          await bulkDelete(rows.map((row) => row.slug))
        },
      },
    ],
    [bulkDelete, exportImages],
  )

  const selectedCategoryOption = categoryOptions.find((option) => option.slug === selectedCategory)

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <ImageIcon className="h-5 w-5 text-primary" />
            Background Images
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage existing backgrounds, update metadata or upload new illustrations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => importInputRef.current?.click()} className="gap-2">
            <FileDown className="h-4 w-4" />
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const result = await importImages({ file })
                if ('conflicts' in result && result.conflicts.length > 0) {
                  setImportConflict({
                    file,
                    conflicts: result.conflicts,
                    totalItems: result.totalItems,
                  })
                }
              } catch (err) {
                console.error('Import failed:', err)
              }
            }}
          />
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            New background images
          </Button>
        </div>
      </header>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-4">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="background-search">Search</Label>
          <Input
            id="background-search"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>category</Label>
          <CreatableCombobox
            options={categoryOptions.map(({ value, label, description }) => ({ value, label, description }))}
            value={selectedCategoryOption ? selectedCategoryOption.value : undefined}
            onChange={(value) => {
              const option = categoryOptions.find((item) => item.value === value)
              setSelectedCategory(option?.slug)
            }}
            onCreateOption={async (label) => {
              const category = await createCategory(label)
              setSelectedCategory(category.slug)
              return String(category.id)
            }}
            placeholder="Filter by category"
            inputPlaceholder="Search or create category"
            allowClear
          />
        </div>
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        isLoading={imagesQuery.isLoading}
        bulkActions={bulkActions}
        searchPlaceholder="Filter results using the search field above..."
        emptyState={{
          title: imagesQuery.isLoading ? 'Loading background images...' : 'No background images found',
          description: 'Upload new files or adjust your filters.',
          actionLabel: 'Open upload dialog',
          onAction: () => setIsUploadOpen(true),
        }}
        onCreate={() => setIsUploadOpen(true)}
        createLabel="New background images"
      />

      <AdminBackgroundImageEditDialog
        open={isEditOpen}
        image={editingImage}
        categories={categories}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) setEditingImage(null)
        }}
        onCreateCategory={async (label) => createCategory(label)}
        onSubmit={async (identifier, data) => {
          await updateImage({ identifier, data })
          setIsEditOpen(false)
          setEditingImage(null)
        }}
      />

      <UploadBackgroundImagesDialog
        open={isUploadOpen}
        categories={categories}
        onOpenChange={setIsUploadOpen}
        onCreateCategory={async (label) => createCategory(label)}
        onUploadFiles={(payload) => uploadFiles(payload)}
        onSubmit={async (images) => {
          await createImages(images)
          setIsUploadOpen(false)
        }}
      />

      <ImportConflictDialog
        open={!!importConflict}
        onOpenChange={(open) => {
          if (!open) setImportConflict(null)
        }}
        conflicts={importConflict?.conflicts ?? []}
        totalItems={importConflict?.totalItems ?? 0}
        resourceLabel="Background images"
        isLoading={isImporting}
        onConfirm={async (resolution) => {
          if (!importConflict) return
          await importImages({ file: importConflict.file, resolution })
          setImportConflict(null)
        }}
      />
    </section>
  )
}

