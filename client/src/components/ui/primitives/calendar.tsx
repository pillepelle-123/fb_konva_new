import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'relative space-y-2',
        month_caption: 'flex justify-center items-center h-9',
        caption_label: 'text-sm font-medium',
        nav: 'absolute top-3 inset-x-2 z-10 flex h-9 items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-7 w-7 p-0 opacity-70 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-7 w-7 p-0 opacity-70 hover:opacity-100'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-xs font-normal text-muted-foreground',
        weeks: '',
        week: 'flex w-full mt-1',
        day: cn(
          'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
          '[&:has(button[aria-selected])]:bg-muted',
          'first:[&:has(button[aria-selected])]:rounded-l-md',
          'last:[&:has(button[aria-selected])]:rounded-r-md'
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'h-9 w-9 p-0 font-normal text-sm'
        ),
        selected:
          '[&>button]:rounded-md',
        range_start: 'dp-range-start [&>button]:!bg-primary [&>button]:!text-primary-foreground [&>button:hover]:!bg-primary [&:not(.dp-range-end)>button]:rounded-r-none [&.dp-range-end>button]:rounded-md',
        range_end: 'dp-range-end [&>button]:!bg-primary [&>button]:!text-primary-foreground [&>button:hover]:!bg-primary [&:not(.dp-range-start)>button]:rounded-l-none [&.dp-range-start>button]:rounded-md',
        range_middle: '[&>button]:!bg-accent [&>button]:!text-accent-foreground [&>button]:!rounded-none [&>button:hover]:!bg-accent',
        today: '[&>button]:!bg-accent [&>button]:!text-accent-foreground',
        outside: 'opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
