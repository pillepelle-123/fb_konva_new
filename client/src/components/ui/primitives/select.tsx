import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}

export function Select({ value: controlledValue, onValueChange, defaultValue, children }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SelectTrigger({ className, children, disabled }: SelectTriggerProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && context.setOpen(!context.open)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  const displayValue = context.value || placeholder || '';
  return <span className="block truncate">{displayValue}</span>;
}

interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
  position?: 'popper' | 'item-aligned';
}

export function SelectContent({ className, children, position = 'popper' }: SelectContentProps) {
  const context = useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context?.setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        context?.setOpen(false);
      }
    }

    if (context?.open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [context?.open]);

  if (!context) throw new Error('SelectContent must be used within Select');
  if (!context.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        position === 'popper' && "absolute top-full mt-1 w-full",
        className
      )}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  );
}

interface SelectGroupProps {
  children: React.ReactNode;
}

export function SelectGroup({ children }: SelectGroupProps) {
  return <div className="space-y-0.5">{children}</div>;
}

interface SelectLabelProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectLabel({ className, children }: SelectLabelProps) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-sm font-semibold",
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
  disabled?: boolean;
}

export function SelectItem({ value, className, children, disabled }: SelectItemProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  const isSelected = context.value === value;

  return (
    <div
      onClick={() => {
        if (!disabled) {
          context.onValueChange(value);
          context.setOpen(false);
        }
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        !disabled && "hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      data-disabled={disabled}
    >
      {children}
    </div>
  );
}
