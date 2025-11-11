import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui'
import { DataTable, DataTableColumnHeader } from '../../components/table'
import type { DataTableBulkAction, DataTableFilterField } from '../../components/table'
import { UserFormDialog } from '../../components/forms'
import type { AdminUser } from '../../types'
import { useAdminUsers } from '../../hooks'
import { Edit2, ShieldCheck, Trash2, UserMinus } from 'lucide-react'

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  admin: 'Admin',
  editor: 'Editor:in',
  user: 'Nutzer:in',
}

const STATUS_VARIANT: Record<AdminUser['status'], 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  invited: 'secondary',
  suspended: 'destructive',
}

const STATUS_LABELS: Record<AdminUser['status'], string> = {
  active: 'Aktiv',
  invited: 'Eingeladen',
  suspended: 'Gesperrt',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AdminUsersPage() {
  const [dialogState, setDialogState] = useState<{ open: boolean; user?: AdminUser }>({ open: false })

  const { usersQuery, updateUser, bulkAction, isLoading, createUser, isMutating } = useAdminUsers()

  const data = usersQuery.data?.items ?? []

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rolle" />,
        filterFn: (row, id, value) => {
          if (!value) return true
          if (Array.isArray(value)) {
            if (value.length === 0) return true
            return value.includes(row.getValue(id))
          }
          return row.getValue(id) === value
        },
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {ROLE_LABELS[row.original.role]}
          </Badge>
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
          <Badge variant={STATUS_VARIANT[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>
        ),
      },
      {
        accessorKey: 'lastLoginAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Letzter Login" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.lastLoginAt)}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Erstellt am" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Aktionen</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setDialogState({ open: true, user: row.original })}>
                  <Edit2 className="h-4 w-4" />
                  <span className="sr-only">Bearbeiten</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bearbeiten</TooltipContent>
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
        id: 'role',
        label: 'Rolle',
        options: [
          { value: 'admin', label: 'Admin' },
          { value: 'editor', label: 'Editor:in' },
          { value: 'user', label: 'Nutzer:in' },
        ],
      },
      {
        id: 'status',
        label: 'Status',
        type: 'multi',
        options: [
          { value: 'active', label: 'Aktiv' },
          { value: 'invited', label: 'Eingeladen' },
          { value: 'suspended', label: 'Gesperrt' },
        ],
      },
    ],
    [],
  )

  const bulkActions = useMemo<DataTableBulkAction<AdminUser>[]>(
    () => [
      {
        id: 'activate',
        label: 'Aktivieren',
        icon: ShieldCheck,
        onAction: async (rows) => {
          await bulkAction({ action: 'activate', ids: rows.map((row) => row.id) })
        },
      },
      {
        id: 'suspend',
        label: 'Sperren',
        icon: UserMinus,
        onAction: async (rows) => {
          await bulkAction({ action: 'suspend', ids: rows.map((row) => row.id) })
        },
      },
      {
        id: 'delete',
        label: 'Löschen',
        icon: Trash2,
        intent: 'destructive',
        onAction: async (rows) => {
          await bulkAction({ action: 'delete', ids: rows.map((row) => row.id) })
        },
      },
    ],
    [bulkAction],
  )

  const handleSubmitUser = async (formData: Pick<AdminUser, 'name' | 'email' | 'role' | 'status'>) => {
    if (dialogState.user) {
      await updateUser({ id: dialogState.user.id, data: formData })
    } else {
      await createUser(formData)
    }
    setDialogState({ open: false })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Benutzerverwaltung</h1>
        <p className="text-sm text-muted-foreground">
          Rollen verwalten, Einladungen steuern und Nutzungsstatus überwachen.
        </p>
      </header>
      <DataTable
        data={data}
        columns={columns}
        filterFields={filterFields}
        bulkActions={bulkActions}
        searchPlaceholder="Nach Namen oder E-Mail suchen…"
        emptyState={{
          title: 'Noch keine Benutzer:innen im System',
          description: 'Importiere bestehende Accounts oder lade Kolleg:innen ein.',
        }}
        isLoading={isLoading}
        onCreate={() => setDialogState({ open: true })}
        createLabel="Benutzer:in einladen"
      />
      <UserFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ open, user: open ? dialogState.user : undefined })}
        user={dialogState.user}
        onSubmit={handleSubmitUser}
        isSubmitting={isMutating}
      />
    </section>
  )
}

