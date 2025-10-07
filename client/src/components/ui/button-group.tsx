import { cn } from "../../lib/utils";
import { Children, cloneElement, isValidElement } from "react";

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div className={cn("inline-flex rounded-md shadow-sm", className)} role="group">
      {Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          const isFirst = index === 0;
          const isLast = index === Children.count(children) - 1;
          return cloneElement(child, {
            className: cn(
              child.props.className,
              "relative focus:z-10",
              !isFirst && "-ml-px",
              isFirst && "rounded-r-none",
              isLast && "rounded-l-none",
              !isFirst && !isLast && "rounded-none"
            )
          });
        }
        return child;
      })}
    </div>
  );
}