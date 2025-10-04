import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content?: string;
  title?: string;
  description?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ children, content, title, description, side = "right" }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  return (
    <div 
      ref={triggerRef}
      className="relative block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg transform -translate-y-1/2 w-48"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {title && description ? (
            <div>
              <div className="font-medium">{title}</div>
              <div className="text-xs text-gray-300 mt-1">{description}</div>
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