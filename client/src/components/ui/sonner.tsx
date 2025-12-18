"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"
import type { ComponentProps } from "react"
import { useEffect } from "react"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Detect theme from document class or system preference
  const getTheme = (): "light" | "dark" | "system" => {
    if (typeof window === "undefined") return "system"
    const htmlElement = document.documentElement
    if (htmlElement.classList.contains("dark")) return "dark"
    if (htmlElement.classList.contains("light")) return "light"
    return "system"
  }

  // Ensure close button uses --secondary on hover and is positioned in upper right corner
  // Also ensure success icon uses --success color
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      [data-sonner-toast] {
        position: relative !important;
      }
      [data-sonner-toast] [data-close-button] {
        border: none !important;
        position: absolute !important;
        top: 0.5rem !important;
        right: -0.3rem !important;
        left: auto !important;
      }
      [data-sonner-toast] [data-close-button]:hover {
        background-color: hsl(var(--secondary)) !important;
        color: hsl(var(--accent-foreground)) !important;
        border-color: hsl(var(--border)) !important;
      }
      [data-sonner-toast][data-type="success"] [data-icon] {
        color: hsl(var(--success)) !important;
      }
      [data-sonner-toast][data-type="success"] [data-icon] svg {
        color: hsl(var(--success)) !important;
        stroke: hsl(var(--success)) !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <Sonner
      theme={getTheme()}
      className="toaster group"
      position="bottom-center"
      offset="64px"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-primary" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      closeButton
      toastOptions={{
        classNames: {
          closeButton: "border border-input bg-background hover:bg-secondary hover:text-accent-foreground transition-colors rounded-md",
        },
      }}
      style={
        {
          "--normal-bg": "hsl(var(--popover))",
          "--normal-text": "hsl(var(--popover-foreground))",
          "--normal-border": "hsl(var(--border))",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

