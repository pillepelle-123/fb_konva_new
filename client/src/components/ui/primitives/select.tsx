import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { ChevronDown, Info } from 'lucide-react';
import { Button } from './button';
import { Tooltip } from '../composites/tooltip';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  itemLabels: Map<string, string>;
  registerItem: (value: string, label: string) => void;
  showInfoIcons?: boolean;
  itemTooltips?: Map<string, string>;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
  showInfoIcons?: boolean;
  itemTooltips?: Record<string, string> | Map<string, string>;
}

export function Select({ value: controlledValue, onValueChange, defaultValue, children, showInfoIcons = false, itemTooltips }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  const [itemLabels, setItemLabels] = useState<Map<string, string>>(new Map());
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const registerItem = (itemValue: string, label: string) => {
    setItemLabels(prev => {
      const newMap = new Map(prev);
      newMap.set(itemValue, label);
      return newMap;
    });
  };

  // Convert Record to Map if needed
  const tooltipsMap = itemTooltips instanceof Map 
    ? itemTooltips 
    : itemTooltips 
      ? new Map(Object.entries(itemTooltips))
      : undefined;

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen, itemLabels, registerItem, showInfoIcons, itemTooltips: tooltipsMap }}>
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
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={() => !disabled && context.setOpen(!context.open)}
      className={cn(
        "w-full justify-between py-1 px-2",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
    </Button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  const displayValue = context.value 
    ? (context.itemLabels.get(context.value) || context.value)
    : (placeholder || '');
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

  if (!context) throw new Error('SelectContent must be used within Select');

  const { open, setOpen } = context;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open, setOpen]);

  // Always render children (hidden) so SelectItem can register labels
  // But only show the container when open
  return (
    <>
      {!open && (
        <div style={{ display: 'none' }}>
          {children}
        </div>
      )}
      {open && (
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
      )}
    </>
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
  tooltip?: string;
}

export function SelectItem({ value, className, children, disabled, tooltip }: SelectItemProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  const isSelected = context.value === value;
  const showInfoIcon = context.showInfoIcons && (tooltip || context.itemTooltips?.get(value));
  const tooltipText = tooltip || context.itemTooltips?.get(value);

  // Extract text content from children
  useEffect(() => {
    if (children) {
      // Extract text recursively if it's nested
      const extractText = (node: React.ReactNode): string => {
        if (typeof node === 'string' || typeof node === 'number') {
          return String(node);
        }
        if (React.isValidElement(node)) {
          const props = node.props as { children?: React.ReactNode };
          if (props?.children) {
            return extractText(props.children);
          }
        }
        return '';
      };
      
      const label = extractText(children);
      if (label.trim()) {
        context.registerItem(value, label.trim());
      }
    }
  }, [children, value, context]);

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
        !disabled && " hover:bg-secondary hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      data-disabled={disabled}
    >
      <span className="flex-1">{children}</span>
      {showInfoIcon && tooltipText && (
        <Tooltip content={tooltipText} side="right">
          <Info className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
        </Tooltip>
      )}
    </div>
  );
}
