import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui'
import { DataTable, DataTableColumnHeader } from '../../components/table'
import { JsonEditor } from '../../components/JsonEditor'
import { useAdminColorPalettes } from '../../hooks'
import type { AdminColorPalette } from '../../services/themes-palettes-layouts'
import { Droplets, Edit2, Palette } from 'lucide-react'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export default function AdminColorPalettesPage() {
  const [editingPalette, setEditingPalette] = useState<AdminColorPalette | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})

  const { palettesQuery, palettes, updatePalette, isUpdating } = useAdminColorPalettes()

  const columns = useMemo<ColumnDef<AdminColorPalette>[]>(
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
        accessorKey: 'contrast',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Contrast" />,
        cell: ({ row }) => <span className="text-sm">{row.original.contrast || '—'}</span>,
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
          <Button variant="ghost" size="icon" onClick={() => { setEditingPalette(row.original); setEditData(row.original as unknown as Record<string, unknown>); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  )

  const handleSave = async () => {
    if (!editingPalette) return
    try {
      await updatePalette({ id: editingPalette.id, data: editData as Partial<AdminColorPalette> })
      setEditingPalette(null)
    } catch (err) {
      console.error('Failed to update palette:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Palette className="h-6 w-6" />
          Color Palettes
        </h1>
        <p className="text-muted-foreground mt-1">View and edit color palette definitions (colors, parts mapping).</p>
      </div>

      <DataTable
        columns={columns}
        data={palettes}
        isLoading={palettesQuery.isLoading}
        enableRowSelection={false}
      />

      <Dialog open={!!editingPalette} onOpenChange={(open) => !open && setEditingPalette(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Palette: {editingPalette?.name ?? editingPalette?.id}</DialogTitle>
          </DialogHeader>
          {editingPalette && (
            <JsonEditor
              value={editData}
              onChange={(v) => setEditData(v as Record<string, unknown>)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPalette(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isUpdating}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
