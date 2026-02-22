import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui'
import { DataTable, DataTableColumnHeader } from '../../components/table'
import { JsonEditor } from '../../components/JsonEditor'
import { useAdminThemes } from '../../hooks'
import type { AdminTheme } from '../../services/themes-palettes-layouts'
import { Edit2, Palette } from 'lucide-react'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export default function AdminThemesPage() {
  const [editingTheme, setEditingTheme] = useState<AdminTheme | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})

  const { themesQuery, themes, updateTheme, isUpdating } = useAdminThemes()

  const columns = useMemo<ColumnDef<AdminTheme>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.id}</span>,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{row.original.description || '—'}</span>,
      },
      {
        accessorKey: 'palette_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Palette" />,
        cell: ({ row }) => <span className="text-sm">{row.original.palette_id || row.original.palette || '—'}</span>,
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
          <Button variant="ghost" size="icon" onClick={() => { setEditingTheme(row.original); setEditData(row.original as unknown as Record<string, unknown>); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  )

  const handleSave = async () => {
    if (!editingTheme) return
    try {
      await updateTheme({ id: editingTheme.id, data: editData as Partial<AdminTheme> })
      setEditingTheme(null)
    } catch (err) {
      console.error('Failed to update theme:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Palette className="h-6 w-6" />
          Themes
        </h1>
        <p className="text-muted-foreground mt-1">View and edit theme definitions (page settings, element defaults).</p>
      </div>

      <DataTable
        columns={columns}
        data={themes}
        isLoading={themesQuery.isLoading}
        enableRowSelection={false}
      />

      <Dialog open={!!editingTheme} onOpenChange={(open) => !open && setEditingTheme(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Theme: {editingTheme?.name ?? editingTheme?.id}</DialogTitle>
          </DialogHeader>
          {editingTheme && (
            <JsonEditor
              value={editData}
              onChange={(v) => setEditData(v as Record<string, unknown>)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTheme(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isUpdating}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
