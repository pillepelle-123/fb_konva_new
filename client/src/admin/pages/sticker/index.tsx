import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit, Sticker as StickerIcon, Trash2, Upload } from 'lucide-react'
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../components/ui'
import { DataTable } from '../../components/table'
import type { DataTableBulkAction } from '../../components/table'
import { CreatableCombobox } from '../../../components/ui/primitives/creatable-combobox'
import {
  useAdminStickers,
  type AdminSticker,
} from '../../hooks'
import { AdminStickerEditDialog } from '../../components/forms/sticker-edit-dialog'
import { UploadStickersDialog } from '../../components/forms/upload-stickers-dialog'

const STORAGE_OPTIONS = [
  { value: 'local', label: 'Local' },
  { value: 's3', label: 'S3' },
]

const FORMAT_OPTIONS = [
  { value: 'vector', label: 'Vector' },
  { value: 'pixel', label: 'Pixel' },
]

const DEFAULT_PAGE_SIZE = 100

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function AdminStickersPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [selectedStorage, setSelectedStorage] = useState<string | undefined>()
  const [selectedFormat, setSelectedFormat] = useState<string | undefined>()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingSticker, setEditingSticker] = useState<AdminSticker | null>(null)

  const listParams = useMemo(
    () => ({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      search: search.trim() || undefined,
      category: selectedCategory,
      storageType: selectedStorage,
      format: selectedFormat,
    }),
    [search, selectedCategory, selectedStorage, selectedFormat],
  )

  const {
    stickersQuery,
    categoriesQuery,
    createStickers,
    updateSticker,
    deleteSticker,
    bulkDelete,
    createCategory,
    uploadFiles,
  } = useAdminStickers(listParams)

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])

  const tableData = stickersQuery.data?.items ?? []

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

  const storageFilterOptions = useMemo(
    () => STORAGE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    [],
  )

  const formatFilterOptions = useMemo(
    () => FORMAT_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    [],
  )

  const columns = useMemo<ColumnDef<AdminSticker>[]>(
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
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kategorie</span>,
        accessorFn: (row) => row.category.name,
        cell: ({ row }) => <Badge variant="secondary">{row.original.category.name}</Badge>,
      },
      {
        accessorKey: 'format',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</span>,
        cell: ({ row }) => <span className="text-sm capitalize text-muted-foreground">{row.original.format}</span>,
      },
      {
        id: 'storage',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage</span>,
        accessorFn: (row) => row.storage.type,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.storage.type === 's3' ? 'S3' : 'Local'}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zuletzt geändert</span>,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.updatedAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Aktionen</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingSticker(row.original)
                    setIsEditOpen(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bearbeiten</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (confirm(`Sticker "${row.original.name}" löschen?`)) {
                      await deleteSticker(row.original.slug)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Löschen</TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
    [deleteSticker],
  )

  const bulkActions = useMemo<DataTableBulkAction<AdminSticker>[]>(
    () => [
      {
        id: 'bulk-delete',
        label: 'Löschen',
        intent: 'destructive',
        onAction: async (rows) => {
          if (rows.length === 0) return
          if (!confirm(`${rows.length} Sticker löschen? Vorgang kann nicht rückgängig gemacht werden.`)) {
            return
          }
          await bulkDelete(rows.map((row) => row.slug))
        },
      },
    ],
    [bulkDelete],
  )

  const selectedCategoryOption = categoryOptions.find((option) => option.slug === selectedCategory)

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <StickerIcon className="h-5 w-5 text-primary" />
            Sticker
          </h1>
          <p className="text-sm text-muted-foreground">
            Verwalte bestehende Sticker, aktualisiere Metadaten oder lade neue Sticker hoch.
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Neue Sticker
        </Button>
      </header>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-4">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="sticker-search">Suche</Label>
          <Input
            id="sticker-search"
            placeholder="Nach Namen oder Slug suchen..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Kategorie</Label>
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
            placeholder="Kategorie filtern"
            inputPlaceholder="Kategorie suchen oder erstellen"
            allowClear
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Format</Label>
          <Select
            value={selectedFormat ?? ''}
            onValueChange={(value) => {
              setSelectedFormat(value === '' ? undefined : value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Format wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle Formate</SelectItem>
              {formatFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Storage</Label>
          <Select
            value={selectedStorage ?? ''}
            onValueChange={(value) => {
              setSelectedStorage(value === '' ? undefined : value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Storage wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle Storage-Typen</SelectItem>
              {storageFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        isLoading={stickersQuery.isLoading}
        bulkActions={bulkActions}
        searchPlaceholder="Filtere Ergebnisse über das Suchfeld oben..."
        emptyState={{
          title: stickersQuery.isLoading ? 'Lade Sticker...' : 'Keine Sticker gefunden',
          description: 'Lade neue Dateien hoch oder passe deine Filter an.',
          actionLabel: 'Upload-Dialog öffnen',
          onAction: () => setIsUploadOpen(true),
        }}
        onCreate={() => setIsUploadOpen(true)}
        createLabel="Neue Sticker"
      />

      <AdminStickerEditDialog
        open={isEditOpen}
        sticker={editingSticker}
        categories={categories}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) setEditingSticker(null)
        }}
        onCreateCategory={async (label) => createCategory(label)}
        onSubmit={async (identifier, data) => {
          await updateSticker({ identifier, data })
          setIsEditOpen(false)
          setEditingSticker(null)
        }}
      />

      <UploadStickersDialog
        open={isUploadOpen}
        categories={categories}
        onOpenChange={setIsUploadOpen}
        onCreateCategory={async (label) => createCategory(label)}
        onUploadFiles={(payload) => uploadFiles(payload)}
        onSubmit={async (stickers) => {
          await createStickers(stickers)
          setIsUploadOpen(false)
        }}
      />
    </section>
  )
}
