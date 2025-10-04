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
      // Only change if clicking on a different (closed) section
      const newValue = currentValue === itemValue ? currentValue : itemValue;
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
      <div className={cn("flex flex-row", className)}>
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
      <div className={cn(
        "flex flex-row items-center transition-all duration-300 ease-in-out overflow-hidden ",
        isOpen ? "flex-1 border-border " : "flex-none bg-background border-muted ",
        className
      )}>
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
    <div
      className={cn(
        "flex flex-col items-center justify-center py-2 px-2 cursor-pointer transform -rotate-90 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      onClick={() => accordionContext.onValueChange(itemContext.value)}
      data-state={itemContext.isOpen ? "open" : "closed"}
    >
      <div className="flex items-center space-x-1">

        <span className="whitespace-nowrap">{children}</span>
      </div>
    </div>
  );
}

export function AccordionContent({ children, className }: AccordionContentProps) {
  const itemContext = React.useContext(AccordionItemContext);
  
  if (!itemContext) {
    throw new Error("AccordionContent must be used within AccordionItem");
  }

  return (
    <div className={cn(
      "flex-1 transition-all duration-300 ease-in-out overflow-hidden bg-background",
      itemContext.isOpen ? "opacity-100 w-full" : "opacity-0 w-0",
      className
    )}>
      <div className="px-4 py-1 h-full flex items-center">
        {children}
      </div>
    </div>
  );
}