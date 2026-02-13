import { useMemo, useState } from 'react'
import type { ColumnDef, ColumnFiltersState, RowSelectionState, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Checkbox } from '../../../components/ui'
import { cn } from '../../../lib/utils'
import { DataTableToolbar } from './data-table-toolbar'
import type { DataTableFilterField, DataTableBulkAction } from './data-table-toolbar'
import { DataTablePagination } from './data-table-pagination'

export interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  isLoading?: boolean
  filterFields?: DataTableFilterField[]
  bulkActions?: DataTableBulkAction<TData>[]
  searchPlaceholder?: string
  emptyState?: { title: string; description?: string; actionLabel?: string; onAction?: () => void }
  onCreate?: () => void
  createLabel?: string
  enableRowSelection?: boolean
}

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  filterFields,
  bulkActions,
  searchPlaceholder,
  emptyState,
  onCreate,
  createLabel,
  enableRowSelection = true,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState('')

  const selectionColumn: ColumnDef<TData, unknown> | null = enableRowSelection
    ? {
        id: '__select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 32,
      }
    : null

  const columnsWithSelection = useMemo(
    () => (selectionColumn ? [selectionColumn, ...columns] : columns),
    [columns, selectionColumn],
  )

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
    enableRowSelection,
    globalFilterFn: 'includesString',
  })

  const hasRows = table.getRowModel().rows.length > 0

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="border-b p-4">
        <DataTableToolbar
          table={table}
          filterFields={filterFields}
          searchPlaceholder={searchPlaceholder}
          onCreate={onCreate}
          createLabel={createLabel}
          bulkActions={bulkActions}
        />
      </div>
      <div className="relative overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {isLoading ? (
              <tr>
                <td colSpan={columnsWithSelection.length} className="px-4 py-8 text-center text-muted-foreground">
                  Loading data…
                </td>
              </tr>
            ) : hasRows ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn('hover:bg-muted/40', row.getIsSelected() && 'bg-muted/50')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnsWithSelection.length} className="px-4 py-16 text-center text-muted-foreground">
                  {emptyState ? (
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <div className="text-lg font-semibold text-foreground">{emptyState.title}</div>
                      {emptyState.description ? (
                        <p className="text-sm text-muted-foreground">{emptyState.description}</p>
                      ) : null}
                      {emptyState.onAction && emptyState.actionLabel ? (
                        <button
                          type="button"
                          onClick={emptyState.onAction}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
                        >
                          {emptyState.actionLabel}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    'No data available.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t p-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}

