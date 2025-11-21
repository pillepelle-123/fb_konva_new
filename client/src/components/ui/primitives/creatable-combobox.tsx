import { useCallback, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react'
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '../index'
import { cn } from '../../../lib/utils'
import ProfilePicture from '../../features/users/profile-picture'

export interface CreatableComboboxOption {
  value: string
  label: string
  description?: string
  userId?: number
}

export interface CreatableComboboxProps {
  options: CreatableComboboxOption[]
  value?: string
  onChange: (value: string | undefined) => void
  onCreateOption?: (label: string) => Promise<string | CreatableComboboxOption | void> | string | CreatableComboboxOption | void
  placeholder?: string
  inputPlaceholder?: string
  emptyLabel?: string
  createLabel?: (label: string) => string
  disabled?: boolean
  allowClear?: boolean
}

/**
 * CreatableCombobox
 *
 * Radix/Popover basierte Combobox mit Suchfeld und "Create"-Funktion.
 * Nutzt synchronen oder asynchronen `onCreateOption`-Callback, um neue Optionen zu erzeugen.
 * Der Parent ist verantwortlich, die `options`-Liste nach erfolgreichem Create zu aktualisieren.
 * Die "Create"-Option erscheint als Listeneintrag, sobald Text eingegeben wurde.
 */
export function CreatableCombobox({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = 'Kategorie wählen...',
  inputPlaceholder = 'Suchen oder erstellen...',
  emptyLabel = 'Keine Einträge gefunden',
  createLabel = (label) => `Erstelle "${label}"`,
  disabled = false,
  allowClear = true,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const normalizedOptions = useMemo(() => {
    return options.map((option) => ({
      ...option,
      label: option.label.trim(),
      searchLabel: option.label.toLowerCase(),
    }))
  }, [options])

  const filteredOptions = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase()
    if (!trimmedSearch) return normalizedOptions
    return normalizedOptions.filter((option) => option.searchLabel.includes(trimmedSearch))
  }, [normalizedOptions, search])

  const selectedOption = useMemo(
    () => normalizedOptions.find((option) => option.value === value) || null,
    [normalizedOptions, value],
  )

  const showCreateOption = useMemo(() => {
    if (!onCreateOption) return false
    const trimmedSearch = search.trim()
    return trimmedSearch.length > 0
  }, [onCreateOption, search])

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      setOpen(false)
      setSearch('')
    },
    [onChange],
  )

  const handleCreate = useCallback(async () => {
    if (!onCreateOption) return
    const label = search.trim()
    if (!label) return
    try {
      setIsCreating(true)
      const createResult = await onCreateOption(label)
      setIsCreating(false)
      setSearch('')
      setOpen(false)

      if (typeof createResult === 'string') {
        onChange(createResult)
      } else if (createResult && typeof createResult === 'object') {
        onChange(createResult.value)
      }
    } catch (error) {
      console.error('CreatableCombobox: onCreateOption failed', error)
      setIsCreating(false)
    }
  }, [onCreateOption, onChange, search])

  const handleClear = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      onChange(undefined)
      setSearch('')
    },
    [onChange],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            !selectedOption && 'text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-70',
          )}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <div className="flex items-center gap-1">
            {allowClear && selectedOption ? (
              <X
                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
                role="presentation"
              />
            ) : null}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-2" align="start">
        <div className="space-y-2">
          <Input
            placeholder={inputPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-auto rounded-md border bg-background">
            {filteredOptions.length > 0 || showCreateOption ? (
              <ul className="py-1">
                {filteredOptions.map((option) => {
                  const isSelected = option.value === selectedOption?.value
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                          isSelected && 'bg-muted font-medium',
                        )}
                        onClick={() => handleSelect(option.value)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ProfilePicture
                            name={option.label}
                            size="sm"
                            userId={option.userId}
                            variant="withColoredBorder"
                            className="flex-shrink-0"
                          />
                          <span className="flex flex-col min-w-0">
                            <span className="truncate">{option.label}</span>
                            {option.description ? (
                              <span className="text-xs text-muted-foreground truncate">{option.description}</span>
                            ) : null}
                          </span>
                        </div>
                        {isSelected ? <Check className="h-4 w-4 flex-shrink-0" /> : null}
                      </button>
                    </li>
                  )
                })}
                {showCreateOption && (
                  <li>
                    <button
                      type="button"
                      disabled={isCreating}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                        isCreating && 'opacity-50 cursor-not-allowed',
                      )}
                      onClick={handleCreate}
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span>{createLabel(search.trim())}</span>
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

