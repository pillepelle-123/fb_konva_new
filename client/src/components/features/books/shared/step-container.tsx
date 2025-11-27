import { cn } from '../../../../lib/utils';

interface StepContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'muted' | 'card';
  padding?: 'sm' | 'md' | 'lg';
}

export function StepContainer({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md' 
}: StepContainerProps) {
  const variantClasses = {
    default: 'bg-white',
    muted: 'bg-muted/40',
    card: 'bg-card'
  };
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5'
  };
  
  return (
    <div className={cn(
      'w-full border rounded-lg',
      variantClasses[variant],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

