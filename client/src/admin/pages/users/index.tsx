import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button} from '../../../components/ui'
import { DataTable, DataTableColumnHeader } from '../../components/table'
import type { DataTableBulkAction, DataTableFilterField } from '../../components/table'
import { UserFormDialog } from '../../components/forms'
import type { AdminUser } from '../../types'
import { useAdminUsers } from '../../hooks'
import { Edit2, ShieldCheck, Trash2, UserMinus } from 'lucide-react'

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  admin: 'Admin',
  editor: 'Editor',
  user: 'User',
}

const STATUS_VARIANT: Record<AdminUser['status'], 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  invited: 'secondary',
  suspended: 'destructive',
}

const STATUS_LABELS: Record<AdminUser['status'], string> = {
  active: 'Active',
  invited: 'Invited',
  suspended: 'Suspended',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="name" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataTableColumnHeader column={column} title="role" />,
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
          <Badge variant={STATUS_VARIANT[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>
        ),
      },
      {
        accessorKey: 'lastLoginAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="lastLoginAt" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.lastLoginAt)}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="createdAt" />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            
            <Button variant="ghost" size="icon" onClick={() => setDialogState({ open: true, user: row.original })}>
              <Edit2 className="h-4 w-4" />
              {/* <span className="sr-only">Bearbeiten</span> */}
            </Button>
          
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
        label: 'role',
        options: [
          { value: 'admin', label: 'Admin' },
          { value: 'editor', label: 'Editor' },
          { value: 'user', label: 'User' },
        ],
      },
      {
        id: 'status',
        label: 'status',
        type: 'multi',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'invited', label: 'Invited' },
          { value: 'suspended', label: 'Suspended' },
        ],
      },
    ],
    [],
  )

  const bulkActions = useMemo<DataTableBulkAction<AdminUser>[]>(
    () => [
      {
        id: 'activate',
        label: 'Activate',
        icon: ShieldCheck,
        onAction: async (rows) => {
          await bulkAction({ action: 'activate', ids: rows.map((row) => row.id) })
        },
      },
      {
        id: 'suspend',
        label: 'Suspend',
        icon: UserMinus,
        onAction: async (rows) => {
          await bulkAction({ action: 'suspend', ids: rows.map((row) => row.id) })
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage roles, invitations, and user status.
        </p>
      </header>
      <DataTable
        data={data}
        columns={columns}
        filterFields={filterFields}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name or email…"
        emptyState={{
          title: 'No users in the system yet',
          description: 'Import existing accounts or invite colleagues.',
        }}
        isLoading={isLoading}
        onCreate={() => setDialogState({ open: true })}
        createLabel="Invite user"
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

