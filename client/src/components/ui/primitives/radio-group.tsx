import * as React from "react"
import { cn } from "../../../lib/utils"

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  value: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void; // Alias for onValueChange for backwards compatibility
  options: RadioOption[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, onChange, options, className, orientation = 'vertical', ...props }, ref) => {
    // Support both onValueChange and onChange (onChange for backwards compatibility)
    // onChange takes precedence if both are provided
    const handleChange = onChange || onValueChange;
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-4",
          orientation === 'horizontal' ? "flex-row" : "flex-col",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="radio"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => {
                if (!option.disabled && handleChange) {
                  handleChange(e.target.value);
                }
              }}
              disabled={option.disabled}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className={cn(
              "text-sm",
              option.disabled && "text-muted-foreground"
            )}>
              {option.label}
            </span>
          </label>
        ))}
      </div>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export { RadioGroup };
export type { RadioOption, RadioGroupProps };
