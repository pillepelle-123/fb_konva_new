import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui'
import { DataTable, DataTableColumnHeader } from '../../components/table'
import { JsonEditor } from '../../components/JsonEditor'
import { useAdminLayouts } from '../../hooks'
import type { AdminLayout } from '../../services/themes-palettes-layouts'
import { Edit2, LayoutPanelLeft, LayoutTemplate } from 'lucide-react'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export default function AdminLayoutsPage() {
  const [editingLayout, setEditingLayout] = useState<AdminLayout | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})

  const { layoutsQuery, layouts, updateLayout, isUpdating } = useAdminLayouts()

  const columns = useMemo<ColumnDef<AdminLayout>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-mono text-xs truncate max-w-[180px] block" title={String(row.original.id)}>{row.original.id}</span>,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium text-sm truncate max-w-[220px] block" title={row.original.name}>{row.original.name}</span>,
      },
      {
        accessorKey: 'category',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) => <span className="text-sm">{row.original.category || '—'}</span>,
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.updated_at)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => { setEditingLayout(row.original); setEditData(row.original as unknown as Record<string, unknown>); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  )

  const handleSave = async () => {
    if (!editingLayout) return
    try {
      await updateLayout({ id: editingLayout.id, data: editData as Partial<AdminLayout> })
      setEditingLayout(null)
    } catch (err) {
      console.error('Failed to update layout:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <LayoutPanelLeft className="h-6 w-6" />
          Layouts
        </h1>
        <p className="text-muted-foreground mt-1">View and edit layout template definitions (textboxes, elements, meta).</p>
      </div>

      <DataTable
        columns={columns}
        data={layouts}
        isLoading={layoutsQuery.isLoading}
        enableRowSelection={false}
      />

      <Dialog open={!!editingLayout} onOpenChange={(open) => !open && setEditingLayout(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Layout: {editingLayout?.name ?? editingLayout?.id}</DialogTitle>
          </DialogHeader>
          {editingLayout && (
            <JsonEditor
              value={editData}
              onChange={(v) => setEditData(v as Record<string, unknown>)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLayout(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isUpdating}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
