import { cn } from '../../../lib/utils';

interface LabelProps {
  children: React.ReactNode;
  variant?: 'xs' | 'sm' | 'default';
  className?: string;
  htmlFor?: string;
}

export function Label({ children, variant = 'default', className, htmlFor }: LabelProps) {
  const baseClasses = 'font-medium block mb-1';
  
  const variantClasses = {
    xs: 'text-xs',
    sm: 'text-sm', 
    default: 'text-base'
  };

  return (
    <label 
      htmlFor={htmlFor}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {children}
    </label>
  );
}