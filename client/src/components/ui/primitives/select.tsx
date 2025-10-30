import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectTrigger({ className, children }: SelectTriggerProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <svg
        className="h-4 w-4 opacity-50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  return <span>{context.value || placeholder}</span>;
}

interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectContent({ className, children }: SelectContentProps) {
  const context = useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context?.setOpen(false);
      }
    }

    if (context?.open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [context?.open]);

  if (!context) throw new Error('SelectContent must be used within Select');
  if (!context.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function SelectItem({ value, className, children }: SelectItemProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  return (
    <div
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}