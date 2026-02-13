import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui'
import { DataTable, DataTableColumnHeader } from '../../components/table'
import type { DataTableBulkAction, DataTableFilterField } from '../../components/table'
import { BookFormDialog } from '../../components/forms'
import type { AdminBook } from '../../types'
import { useAdminBooks } from '../../hooks'
import { Archive, Edit2, RefreshCw, Trash2 } from 'lucide-react'

const STATUS_LABELS: Record<AdminBook['status'], string> = {
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AdminBooksPage() {
  const [dialogState, setDialogState] = useState<{ open: boolean; book?: AdminBook }>({ open: false })
  const { booksQuery, updateBook, bulkAction, isLoading, createBook, isMutating } = useAdminBooks()

  const data = booksQuery.data?.items ?? []

  const columns = useMemo<ColumnDef<AdminBook>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="name" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">Owner: {row.original.ownerName}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="status" />,
        filterFn: (row, id, value) => {
          if (!value) return true
          if (Array.isArray(value)) {
            if (value.length === 0) return true
            return value.includes(row.getValue(id))
          }
          return row.getValue(id) === value
        },
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            onValueChange={(value) => updateBook({ id: row.original.id, status: value as AdminBook['status'] })}
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
              <SelectItem value="draft">{STATUS_LABELS.draft}</SelectItem>
              <SelectItem value="archived">{STATUS_LABELS.archived}</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'pageCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="pageCount" />,
        cell: ({ row }) => <span>{row.original.pageCount}</span>,
      },
      {
        accessorKey: 'collaboratorCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="collaboratorCount" />,
        cell: ({ row }) => <span>{row.original.collaboratorCount}</span>,
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="updatedAt" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.updatedAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDialogState({ open: true, book: row.original })}>
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (confirm(`Permanently delete book "${row.original.name}"? All pages, answers and related data will be deleted.`)) {
                  await bulkAction({ action: 'delete', ids: [row.original.id] })
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ),
      },
    ],
    [updateBook, bulkAction],
  )

  const filterFields = useMemo<DataTableFilterField[]>(
    () => [
      {
        id: 'status',
        label: 'status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'draft', label: 'Draft' },
          { value: 'archived', label: 'Archived' },
        ],
      },
    ],
    [],
  )

  const bulkActions = useMemo<DataTableBulkAction<AdminBook>[]>(
    () => [
      {
        id: 'archive',
        label: 'Archive',
        icon: Archive,
        onAction: async (rows) => {
          await bulkAction({ action: 'archive', ids: rows.map((row) => row.id) })
        },
      },
      {
        id: 'restore',
        label: 'Restore',
        icon: RefreshCw,
        onAction: async (rows) => {
          await bulkAction({ action: 'restore', ids: rows.map((row) => row.id) })
        },
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        intent: 'destructive',
        onAction: async (rows) => {
          await bulkAction({ action: 'delete', ids: rows.map((row) => row.id) })
        },
      },
    ],
    [bulkAction],
  )

  const handleSubmit = async (payload: Pick<AdminBook, 'name' | 'status'>) => {
    if (dialogState.book) {
      await updateBook({ id: dialogState.book.id, name: payload.name, status: payload.status })
    } else {
      await createBook({ name: payload.name, status: payload.status })
    }
    setDialogState({ open: false })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Book Management</h1>
        <p className="text-sm text-muted-foreground">
          Monitor projects, update status, and manage collaboration.
        </p>
      </header>
      <DataTable
        data={data}
        columns={columns}
        filterFields={filterFields}
        bulkActions={bulkActions}
        searchPlaceholder="Search by title or owner…"
        emptyState={{
          title: 'No books yet',
          description: 'Create the first book or import existing projects.',
        }}
        isLoading={isLoading}
        onCreate={() => setDialogState({ open: true })}
        createLabel="New book"
      />
      <BookFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ open, book: open ? dialogState.book : undefined })}
        book={dialogState.book}
        onSubmit={handleSubmit}
        isSubmitting={isMutating}
      />
    </section>
  )
}

