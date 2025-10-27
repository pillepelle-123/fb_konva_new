import * as React from "react"

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'destructive' }, ref) => {
    const variantClasses = variant === 'default' 
      ? 'bg-primary/10 border-primary/20 text-primary'
      : 'bg-destructive/10 border-destructive/20 text-destructive';
    
    return (
      <div
        ref={ref}
        role="alert"
        className={`${variantClasses} border rounded-lg p-2 text-sm text-center`}
      >
        {children}
      </div>
    );
  }
)
Alert.displayName = "Alert"

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)

export { Alert, AlertDescription }