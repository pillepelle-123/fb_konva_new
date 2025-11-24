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

  return (
    <Sonner
      theme={getTheme()}
      className="toaster group"
      position="bottom-center"
      offset="64px"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
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

