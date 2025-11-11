import type { Table } from '@tanstack/react-table'
import { Button } from '../../../components/ui'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  rowsPerPageOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  rowsPerPageOptions = [10, 20, 50],
}: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1
  const pageCount = table.getPageCount()

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Zeige
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={table.getState().pagination.pageSize}
          onChange={(event) => {
            table.setPageSize(Number(event.target.value))
          }}
        >
          {rowsPerPageOptions.map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize} / Seite
            </option>
          ))}
        </select>
        · Seite {currentPage} von {pageCount || 1}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          «
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Zurück
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Weiter
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          »
        </Button>
      </div>
    </div>
  )
}

