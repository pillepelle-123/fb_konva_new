import { cn } from '../../../../lib/utils';

type GridColumns = number | [number, number] | [number, number, number] | [number, [number, string]] | [number, [number, number]];

interface StepGridProps {
  children: React.ReactNode;
  columns: GridColumns;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StepGrid({ 
  children, 
  columns, 
  gap = 'md',
  className = '' 
}: StepGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  // Convert columns to Tailwind grid classes
  const getGridClasses = (cols: GridColumns): string => {
    // Always start with mobile: grid-cols-1
    let classes = 'grid grid-cols-1';
    
    if (typeof cols === 'number') {
      // Simple number: e.g., 2 -> lg:grid-cols-2
      classes += ` lg:grid-cols-${cols}`;
    } else if (cols.length === 2) {
      // Two values: [mobile, desktop]
      const [_, desktop] = cols;
      
      if (Array.isArray(desktop)) {
        // Custom fraction array like [1fr, 2fr] or [1, 2]
        const fractionString = desktop.map((v: number | string) => {
          if (typeof v === 'string') return v;
          return `${v}fr`;
        }).join(' ');
        classes += ` lg:grid-cols-[${fractionString}]`;
      } else if (desktop === 1) {
        classes += '';
      } else if (desktop === 2) {
        classes += ' lg:grid-cols-2';
      } else if (desktop === 3) {
        classes += ' lg:grid-cols-3';
      } else if (desktop === 4) {
        classes += ' lg:grid-cols-4';
      } else {
        // For custom fractions or sizes, use arbitrary values
        classes += ` lg:grid-cols-[${desktop}fr]`;
      }
    } else if (cols.length === 3) {
      // Three values: [mobile, tablet, desktop]
      const [_, tablet, desktop] = cols;
      
      // Tablet breakpoint
      if (tablet === 2) {
        classes += ' md:grid-cols-2';
      } else if (tablet === 3) {
        classes += ' md:grid-cols-3';
      } else if (tablet === 4) {
        classes += ' md:grid-cols-4';
      }
      
      // Desktop breakpoint
      if (desktop === 2) {
        classes += ' lg:grid-cols-2';
      } else if (desktop === 3) {
        classes += ' lg:grid-cols-3';
      } else if (desktop === 4) {
        classes += ' lg:grid-cols-4';
      } else if (typeof desktop === 'number' && desktop > 4) {
        classes += ` lg:grid-cols-${desktop}`;
      } else if (Array.isArray(desktop)) {
        // Handle custom fraction arrays like [2, 2, 1]
        const fractionString = desktop.map(v => `${v}fr`).join('_');
        classes += ` lg:grid-cols-[${fractionString.replace(/_/g, ' ')}]`;
      }
    }
    
    return classes;
  };
  
  // Handle special case for fraction arrays like [2, 2, 1] or custom widths like [320px, auto]
  let gridClasses = '';
  if (Array.isArray(columns) && columns.length === 3 && Array.isArray(columns[2])) {
    // This is a custom fraction array like [2, 2, [2fr, 2fr, 1fr]]
    const fractionString = columns[2].map((v: number) => `${v}fr`).join(' ');
    gridClasses = `grid grid-cols-1 lg:grid-cols-[${fractionString}]`;
  } else if (Array.isArray(columns) && columns.length === 2 && (typeof columns[1] === 'string' || typeof columns[0] === 'string')) {
    // Custom width like [320px, auto] or [320, 'auto']
    const [first, second] = columns;
    const firstVal = typeof first === 'number' ? `${first}px` : first;
    const secondVal = typeof second === 'number' ? `${second}px` : second;
    gridClasses = `grid grid-cols-1 lg:grid-cols-[${firstVal}_${secondVal}]`;
  } else {
    gridClasses = getGridClasses(columns);
  }
  
  return (
    <div className={cn(
      gridClasses,
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

