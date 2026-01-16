import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "../../../lib/utils"
import { Button } from "../primitives"

interface PageNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage?: number
  totalPages?: number
  onPrevPage?: () => void
  onNextPage?: () => void
  canGoPrev?: boolean
  canGoNext?: boolean
}

const PageNavigation = React.forwardRef<HTMLDivElement, PageNavigationProps>(
  ({
    className,
    currentPage = 1,
    totalPages = 1,
    onPrevPage,
    onNextPage,
    canGoPrev = true,
    canGoNext = true,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center space-x-1", className)}
        {...props}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!canGoPrev}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>

        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    )
  }
)
PageNavigation.displayName = "PageNavigation"

export { PageNavigation }