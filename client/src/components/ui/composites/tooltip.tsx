import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content?: string | React.ReactNode;
  title?: string;
  description?: string;
  side?: "top" | "right" | "bottom_editor_bar" | "left" | "bottom" | "floating_button_fixed";
  backgroundColor?: string;
  textColor?: string;
  fullWidth?: boolean;
  // Optional controlled visibility flag (bypasses hover events when set)
  forceVisible?: boolean;
  // Optional absolute screen position (in pixels relative to viewport)
  screenPosition?: { x: number; y: number };
}

export function Tooltip({
  children,
  content,
  title,
  description,
  side = "right",
  backgroundColor = "bg-background",
  textColor = "text-foreground",
  fullWidth = false,
  forceVisible,
  screenPosition,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const childRef = React.useRef<HTMLElement | null>(null);

  // Store ref to child element for event forwarding
  React.useEffect(() => {
    if (triggerRef.current) {
      // Find the actual child element (skip wrapper divs)
      let current = triggerRef.current.firstElementChild as HTMLElement;
      while (current && current.tagName === 'DIV' && current.children.length === 1) {
        current = current.firstElementChild as HTMLElement;
      }
      childRef.current = current || triggerRef.current.firstElementChild as HTMLElement;
    }
  }, [children]);

  const updatePosition = () => {
    // If we are given an explicit screen position, prefer that over DOM measurements
    if (screenPosition) {
      setPosition({ x: screenPosition.x, y: screenPosition.y });
      return;
    }
    // Use the actual child element for positioning - traverse through wrapper divs if needed
    let elementToMeasure: HTMLElement | null = null;
    if (triggerRef.current) {
      // Try to find the actual child element (skip wrapper divs)
      let current = triggerRef.current.firstElementChild as HTMLElement;
      while (current && current.tagName === 'DIV' && current.children.length === 1) {
        current = current.firstElementChild as HTMLElement;
      }
      elementToMeasure = current || triggerRef.current.firstElementChild as HTMLElement || triggerRef.current;
    }
    if (elementToMeasure) {
      const rect = elementToMeasure.getBoundingClientRect();
      if (side === "bottom_editor_bar") {
        setPosition({ x: window.innerWidth / 2, y: rect.bottom + 12 });
      } else if (side === "bottom") {
        setPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
      } else if (side === "top") {
        setPosition({ x: rect.left + rect.width / 2, y: rect.top - 36 });
      } else if (side === "floating_button_fixed") {
        // Fixed position for floating button - appears above the button at bottom-right
        setPosition({ x: window.innerWidth - 90 - 24, y: window.innerHeight - 96 - 38 });
      } else if (side === "left") {
        setPosition({ x: rect.left - 6, y: rect.top + rect.height / 2 });
      } else {
        setPosition({ x: rect.right + 6, y: rect.top + rect.height / 2 });
      }
    }
  };

  const handleMouseEnter = () => {
    // In controlled mode we don't react to hover events
    if (typeof forceVisible === "boolean") return;
    updatePosition();
    setIsMounted(true);
    setTimeout(() => setIsVisible(true), 10);
  };

  const handleMouseLeave = () => {
    // In controlled mode we don't react to hover events
    if (typeof forceVisible === "boolean") return;
    setIsVisible(false);
    setTimeout(() => setIsMounted(false), 200);
  };

  // Keep internal position in sync when screenPosition changes
  React.useEffect(() => {
    if (screenPosition) {
      setPosition({ x: screenPosition.x, y: screenPosition.y });
    }
  }, [screenPosition]);

  const visible = typeof forceVisible === "boolean" ? forceVisible : isVisible;
  const mounted = typeof forceVisible === "boolean" ? forceVisible : isMounted;

  return (
    <div 
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: fullWidth ? '100%' : 'auto' }}
    >
      <div className={fullWidth ? 'w-full' : ''}>
        {children}
      </div>
      {mounted && createPortal(
        <div
          className={cn(
            "fixed z-[10003] px-2 py-1 text-sm rounded-md shadow-lg break-words transition-all duration-200 ease-out pointer-events-none",
            backgroundColor?.startsWith('#') ? '' : backgroundColor,
            textColor?.startsWith('#') ? '' : textColor,
            side === "bottom_editor_bar" || side === "bottom" || side === "top" ? "transform -translate-x-1/2 max-w-xs" : side === "floating_button_fixed" ? "transform -translate-x-1/2 max-w-xs" : side === "left" ? "transform -translate-x-full -translate-y-1/2 max-w-xs" : "transform -translate-y-1/2 whitespace-nowrap",
            visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
          style={{
            left: screenPosition?.x ?? position.x,
            top: screenPosition?.y ?? position.y,
            ...(backgroundColor?.startsWith('#') ? { backgroundColor } : {}),
            ...(textColor?.startsWith('#') ? { color: textColor } : {}),
          }}
        >
          {title && description ? (
            <div>
              <div className="font-medium">{title}</div>
              <div 
                className={cn(
                  "text-xs",
                  textColor?.startsWith('#') ? '' : textColor,
                  "mt-1"
                )}
                style={textColor?.startsWith('#') ? { color: textColor } : undefined}
              >
            {description}</div>
              {/* <div className="text-xs text-gray-300 mt-1">{description}</div> */}
            </div>
          ) : (
            <div style={textColor?.startsWith('#') ? { color: textColor } : undefined}>
              {typeof content === 'string' ? content : content}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// For compatibility with existing code
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Allow className/props without passing them to Fragment
// Note: asChild is a Radix convention - we destructure it to avoid passing to DOM (invalid attribute)
export const TooltipTrigger = ({
  children,
  className,
  asChild,
  ...rest
}: { children: React.ReactNode; className?: string; asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...rest}>
    {children}
  </div>
);

export const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;