import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Column } from '@tanstack/react-table'
import { Button } from '../../../components/ui'
import { cn } from '../../../lib/utils'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  align?: 'left' | 'right'
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  align = 'left',
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={cn('text-xs font-medium uppercase tracking-wide text-muted-foreground', align === 'right' && 'justify-end flex')}>{title}</span>
  }

  const sortDirection = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'flex h-8 items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground',
        align === 'right' && 'ml-auto',
      )}
      onClick={() => column.toggleSorting(sortDirection === 'asc')}
    >
      <span>{title}</span>
      {sortDirection === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : sortDirection === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  )
}

