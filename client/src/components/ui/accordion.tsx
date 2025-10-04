import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface AccordionProps {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

const AccordionContext = React.createContext<{
  value: string | string[];
  onValueChange: (value: string) => void;
  type: "single" | "multiple";
} | null>(null);

const AccordionItemContext = React.createContext<{
  value: string;
  isOpen: boolean;
} | null>(null);

export function Accordion({ 
  type = "single", 
  collapsible = false, 
  defaultValue = type === "single" ? "" : [], 
  value, 
  onValueChange, 
  children, 
  className 
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  const handleValueChange = React.useCallback((itemValue: string) => {
    if (type === "single") {
      const newValue = currentValue === itemValue && collapsible ? "" : itemValue;
      const changeHandler = onValueChange ?? setInternalValue;
      changeHandler(newValue);
    } else {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      const newValue = currentArray.includes(itemValue)
        ? currentArray.filter(v => v !== itemValue)
        : [...currentArray, itemValue];
      const changeHandler = onValueChange ?? setInternalValue;
      changeHandler(newValue);
    }
  }, [currentValue, type, collapsible, onValueChange]);

  return (
    <AccordionContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, type }}>
      <div className={cn("", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionItem must be used within Accordion");

  const isOpen = context.type === "single" 
    ? context.value === value 
    : Array.isArray(context.value) && context.value.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const accordionContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);
  
  if (!accordionContext || !itemContext) {
    throw new Error("AccordionTrigger must be used within AccordionItem");
  }

  return (
    <button
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      onClick={() => accordionContext.onValueChange(itemContext.value)}
      data-state={itemContext.isOpen ? "open" : "closed"}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </button>
  );
}

export function AccordionContent({ children, className }: AccordionContentProps) {
  const itemContext = React.useContext(AccordionItemContext);
  
  if (!itemContext) {
    throw new Error("AccordionContent must be used within AccordionItem");
  }

  return (
    <div
      className={cn(
        "overflow-hidden text-sm transition-all duration-200 ease-out",
        itemContext.isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        className
      )}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
}