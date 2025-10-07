import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content?: string;
  title?: string;
  description?: string;
  side?: "top" | "right" | "bottom_editor_bar" | "left" | "bottom";
  backgroundColor?: string;
  textColor?: string;
}

export function Tooltip({ children, content, title, description, side = "right", backgroundColor = "bg-background", textColor = "text-foreground" }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (side === "bottom_editor_bar") {
        setPosition({ x: window.innerWidth / 2, y: rect.bottom + 12 });
      } else if (side === "bottom") {
        setPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
      } else if (side === "top") {
        setPosition({ x: rect.left + rect.width / 2, y: rect.top - 36 });
      } else if (side === "left") {
        setPosition({ x: rect.left - 6, y: rect.top + rect.height / 2 });
      } else {
        setPosition({ x: rect.right + 6, y: rect.top + rect.height / 2 });
      }
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsMounted(true);
    setTimeout(() => setIsVisible(true), 10);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
    setTimeout(() => setIsMounted(false), 200);
  };

  return (
    <div 
      ref={triggerRef}
      className="relative block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isMounted && createPortal(
        <div
          className={cn(
            "fixed z-[9999] px-3 py-2 text-sm rounded-md shadow-lg break-words transition-all duration-200 ease-out pointer-events-none",
            backgroundColor, textColor,
            side === "bottom_editor_bar" || side === "bottom" || side === "top" ? "transform -translate-x-1/2 max-w-xs" : side === "left" ? "transform -translate-x-full -translate-y-1/2 max-w-xs" : "transform -translate-y-1/2 w-60",
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {title && description ? (
            <div>
              <div className="font-medium">{title}</div>
              <div className={cn(
                "text-xs",
                textColor,
                "mt-1"
              )}
              >
            {description}</div>
              {/* <div className="text-xs text-gray-300 mt-1">{description}</div> */}
            </div>
          ) : (
            content
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// For compatibility with existing code
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;