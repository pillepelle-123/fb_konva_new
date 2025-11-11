import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui'
import { DataTable, DataTableColumnHeader } from '../../components/table'
import type { DataTableBulkAction, DataTableFilterField } from '../../components/table'
import { PageAssignmentDialog } from '../../components/forms'
import type { AdminPageRecord, AdminUser } from '../../types'
import { useAdminPageRecords, useAdminUsers } from '../../hooks'
import { CheckCircle2, PenSquare, UserPlus, UserX } from 'lucide-react'

const STATUS_LABELS: Record<AdminPageRecord['status'], string> = {
  draft: 'Entwurf',
  in_review: 'In Review',
  published: 'Veröffentlicht',
}

const STATUS_VARIANT: Record<AdminPageRecord['status'], 'secondary' | 'default' | 'highlight'> = {
  draft: 'secondary',
  in_review: 'default',
  published: 'highlight',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

interface AssignmentState {
  open: boolean
  rows: AdminPageRecord[]
  mode: 'assign' | 'publish'
}

export default function AdminPageRecordsPage() {
  const pageRecords = useAdminPageRecords()
  const users = useAdminUsers()

  const [assignmentState, setAssignmentState] = useState<AssignmentState>({ open: false, rows: [], mode: 'assign' })

  const data = pageRecords.pageRecordsQuery.data?.items ?? []
  const userOptions: AdminUser[] = users.usersQuery.data?.items ?? []

  const columns = useMemo<ColumnDef<AdminPageRecord>[]>(
    () => [
      {
        accessorKey: 'bookName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Buch" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.bookName}</span>
            <span className="text-xs text-muted-foreground"># {row.original.bookId}</span>
          </div>
        ),
      },
      {
        accessorKey: 'pageNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Seite" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">#{row.original.pageNumber}</Badge>
          </div>
        ),
      },
      {
        accessorKey: 'assignedTo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zugewiesen" />,
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">{row.original.assignedTo ?? 'Nicht zugewiesen'}</div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        filterFn: (row, id, value) => {
          if (!value) return true
          if (Array.isArray(value)) {
            if (value.length === 0) return true
            return value.includes(row.getValue(id))
          }
          return row.getValue(id) === value
        },
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Aktualisiert" />,
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
                  onClick={() => setAssignmentState({ open: true, rows: [row.original], mode: 'assign' })}
                >
                  <PenSquare className="h-4 w-4" />
                  <span className="sr-only">Seite zuweisen</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zuweisen</TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
    [],
  )

  const filterFields = useMemo<DataTableFilterField[]>(
    () => [
      {
        id: 'status',
        label: 'Status',
        options: [
          { value: 'draft', label: 'Entwurf' },
          { value: 'in_review', label: 'In Review' },
          { value: 'published', label: 'Veröffentlicht' },
        ],
      },
    ],
    [],
  )

  const bulkActions = useMemo<DataTableBulkAction<AdminPageRecord>[]>(
    () => [
      {
        id: 'assign',
        label: 'Zuweisen',
        icon: UserPlus,
        onAction: (rows) => {
          setAssignmentState({ open: true, rows, mode: 'assign' })
        },
      },
      {
        id: 'publish',
        label: 'Veröffentlichen',
        icon: CheckCircle2,
        onAction: (rows) => {
          setAssignmentState({ open: true, rows, mode: 'publish' })
        },
      },
      {
        id: 'unassign',
        label: 'Zuweisung entfernen',
        icon: UserX,
        onAction: async (rows) => {
          await pageRecords.bulkAction({ action: 'unassign', ids: rows.map((row) => row.id) })
        },
      },
    ],
    [pageRecords],
  )

  const handleAssignmentSubmit = async (assigneeId: number | null) => {
    const ids = assignmentState.rows.map((row) => row.id)
    if (assignmentState.mode === 'assign') {
      await pageRecords.bulkAction({ action: 'assign', ids, assigneeId: assigneeId ?? undefined })
    } else {
      await pageRecords.bulkAction({ action: 'publish', ids })
    }
    setAssignmentState({ open: false, rows: [], mode: 'assign' })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Seitenstatus</h1>
        <p className="text-sm text-muted-foreground">
          Produktionsfortschritt über alle Bücher hinweg überwachen und Aufgaben verteilen.
        </p>
      </header>
      <DataTable
        data={data}
        columns={columns}
        filterFields={filterFields}
        bulkActions={bulkActions}
        searchPlaceholder="Nach Buch, Seite oder Mitarbeitenden suchen…"
        emptyState={{
          title: 'Noch keine Seiten im Tracking',
          description: 'Sobald Seiten erstellt werden, erscheinen sie hier zur Steuerung.',
        }}
        isLoading={pageRecords.isLoading}
      />
      <PageAssignmentDialog
        open={assignmentState.open}
        onOpenChange={(open) => setAssignmentState((prev) => ({ ...prev, open }))}
        users={userOptions}
        initialAssigneeId={assignmentState.rows[0]?.assigneeId ?? null}
        onSubmit={handleAssignmentSubmit}
        mode={assignmentState.mode}
        isSubmitting={pageRecords.isMutating}
      />
    </section>
  )
}

