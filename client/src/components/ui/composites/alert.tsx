import * as React from "react"

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'destructive' }, ref) => (
    <div
      ref={ref}
      role="alert"
      className=" bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-sm text-destructive text-center"
    >
      {children}
    </div>
  )
)
Alert.displayName = "Alert"

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

export { Alert, AlertDescription }