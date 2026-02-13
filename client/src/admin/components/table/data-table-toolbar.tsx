import { ReactNode, useMemo } from 'react'
import type { Table } from '@tanstack/react-table'
import { Filter, Plus, Search, Trash2 } from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui'
import { cn } from '../../../lib/utils'

export interface DataTableFilterOption {
  label: string
  value: string
}

export type DataTableFilterFieldType = 'single' | 'multi'

export interface DataTableFilterField {
  id: string
  label: string
  type?: DataTableFilterFieldType
  options: DataTableFilterOption[]
  placeholder?: string
  icon?: ReactNode
}

export type DataTableBulkAction<TData> = {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  intent?: 'default' | 'destructive'
  onAction: (rows: TData[]) => void | Promise<void>
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  filterFields?: DataTableFilterField[]
  searchPlaceholder?: string
  onCreate?: () => void
  createLabel?: string
  bulkActions?: DataTableBulkAction<TData>[]
}

export function DataTableToolbar<TData>({
  table,
  filterFields = [],
  searchPlaceholder = 'Search…',
  onCreate,
  createLabel = 'Create new',
  bulkActions = [],
}: DataTableToolbarProps<TData>) {
  const selectedRows = table.getSelectedRowModel().flatRows
  const isFiltered =
    table.getState().columnFilters.length > 0 || (table.getState().globalFilter?.length ?? 0) > 0

  const filterComponents = useMemo(() => filterFields, [filterFields])

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="pl-8"
          />
        </div>
        {filterComponents.map((filter) => {
          const column = table.getColumn(filter.id)
          if (!column) return null
          const filterValue = column.getFilterValue()
          if (filter.type === 'multi') {
            const activeValues = Array.isArray(filterValue) ? (filterValue as string[]) : []
            return (
              <Popover key={filter.id}>
                <PopoverTrigger asChild>
                  <Button variant={activeValues.length > 0 ? 'default' : 'outline'} size="sm" className="gap-2">
                    {filter.icon ?? <Filter className="h-4 w-4" />}
                    {filter.label}
                    {activeValues.length > 0 ? ` (${activeValues.length})` : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-3" align="start">
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium uppercase text-muted-foreground">{filter.label}</div>
                    {filter.options.map((option) => {
                      const checked = activeValues.includes(option.value)
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const next = new Set(activeValues)
                              if (value) {
                                next.add(option.value)
                              } else {
                                next.delete(option.value)
                              }
                              column.setFilterValue(Array.from(next))
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      )
                    })}
                    {activeValues.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 justify-start px-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => column.setFilterValue(undefined)}
                      >
                        Reset filter
                      </Button>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            )
          }

          return (
            <Select
              key={filter.id}
              value={(filterValue as string) ?? ''}
              onValueChange={(value) => column.setFilterValue(value || undefined)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={filter.placeholder ?? filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        })}
        {isFiltered ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {selectedRows.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {selectedRows.length} selected
            </div>
            {bulkActions.map((action) => {
              const Icon = action.icon ?? (action.intent === 'destructive' ? Trash2 : undefined)
              return (
                <Button
                  key={action.id}
                  variant={action.intent === 'destructive' ? 'destructive' : 'secondary'}
                  size="sm"
                  className="gap-1"
                  onClick={() => action.onAction(selectedRows.map((row) => row.original))}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {action.label}
                </Button>
              )
            })}
          </div>
        ) : null}
        {onCreate ? (
          <Button onClick={onCreate} className={cn('flex items-center gap-2')}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

