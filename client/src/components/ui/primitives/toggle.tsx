import * as React from "react"
import { cn } from "../../../lib/utils"

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed, onPressedChange, variant = "default", size = "default", onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onPressedChange?.(!pressed);
      onClick?.(e);
    };

    const variantClasses = {
      default: "bg-transparent",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    };

    const sizeClasses = {
      default: "h-10 px-3",
      sm: "h-9 px-2.5",
      lg: "h-11 px-5"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          pressed && "bg-accent text-accent-foreground",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

Toggle.displayName = "Toggle";

export { Toggle }