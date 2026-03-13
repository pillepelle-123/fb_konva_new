import { useEffect, useMemo, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '../primitives/button';
import { Calendar as CalendarPrimitive } from '../primitives/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../overlays/popover';
import { cn } from '../../../lib/utils';

interface DateRangeValue {
  from: string;
  to: string;
}

interface DatePickerRangeProps {
  variant: 'range';
  value: DateRangeValue;
  onChange: (nextValue: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

type DatePickerProps = DatePickerRangeProps;

function isSameDay(a?: Date, b?: Date) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseIsoDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDateString(value?: Date) {
  if (!value) return '';
  return format(value, 'yyyy-MM-dd');
}

export function DatePicker({
  variant,
  value,
  onChange,
  placeholder = 'Pick a date range',
  className,
  disabled,
}: DatePickerProps) {
  const date = useMemo<DateRange | undefined>(
    () => ({ from: parseIsoDate(value.from), to: parseIsoDate(value.to) }),
    [value.from, value.to]
  );

  const [nextBoundary, setNextBoundary] = useState<'start' | 'end'>('start');

  useEffect(() => {
    const currentFrom = parseIsoDate(value.from);
    const currentTo = parseIsoDate(value.to);

    if (!currentFrom || !currentTo) {
      setNextBoundary('start');
      return;
    }

    setNextBoundary(isSameDay(currentFrom, currentTo) ? 'end' : 'start');
  }, [value.from, value.to]);

  const handleSelect = (_nextRange: DateRange | undefined, clickedDay: Date) => {
    const currentFrom = parseIsoDate(value.from);

    if (nextBoundary === 'start' || !currentFrom) {
      const iso = toIsoDateString(clickedDay);
      onChange({ from: iso, to: iso });
      setNextBoundary('end');
      return;
    }

    const nextFrom = clickedDay < currentFrom ? clickedDay : currentFrom;
    const nextTo = clickedDay < currentFrom ? currentFrom : clickedDay;
    onChange({ from: toIsoDateString(nextFrom), to: toIsoDateString(nextTo) });
    setNextBoundary('start');
  };

  if (variant !== 'range') {
    return null;
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-9 w-full justify-start text-left font-normal',
              !date?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} &ndash; {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarPrimitive
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type { DateRangeValue, DatePickerProps };
