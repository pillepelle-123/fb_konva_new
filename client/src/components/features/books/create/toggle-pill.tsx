import { Tooltip } from '../../../ui/composites/tooltip';
import { cn } from '../../../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const togglePillVariants = cva(
  'px-3 py-1 rounded-full border text-xs font-medium transition flex items-center justify-center',
  {
    variants: {
      variant: {
        ghost: 'border-transparent hover:bg-accent/80 hover:text-accent-foreground',
        ghost_hover: 'border-transparent hover:bg-muted/80 hover:text-accent-foreground',
        outline: 'border-input bg-background hover:bg-secondary hover:text-accent-foreground',
        primary: 'border-primary bg-primary text-primary-foreground hover:bg-primary/80',
        highlight: 'border-highlight bg-highlight text-primary-foreground hover:bg-highlight/80',
      },
      active: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'ghost',
        active: true,
        class: 'bg-accent text-accent-foreground',
      },
      {
        variant: 'ghost_hover',
        active: true,
        class: 'bg-muted text-accent-foreground',
      },
      {
        variant: 'outline',
        active: true,
        class: 'border-primary bg-primary text-primary-foreground hover:bg-[#444e61] hover:border-[#444e61] hover:text-primary-foreground',
      },
      {
        variant: 'primary',
        active: true,
        class: 'bg-primary text-primary-foreground border-primary',
      },
      {
        variant: 'highlight',
        active: true,
        class: 'bg-highlight text-primary-foreground border-highlight',
      },
      {
        variant: 'ghost',
        active: false,
        class: 'text-muted-foreground',
      },
      {
        variant: 'ghost_hover',
        active: false,
        class: 'text-muted-foreground',
      },
      {
        variant: 'outline',
        active: false,
        class: 'text-muted-foreground',
      },
      {
        variant: 'primary',
        active: false,
        class: 'text-muted-foreground',
      },
      {
        variant: 'highlight',
        active: false,
        class: 'text-muted-foreground',
      },
    ],
    defaultVariants: {
      variant: 'outline',
      active: false,
    },
  }
);

interface TogglePillProps extends VariantProps<typeof togglePillVariants> {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  className?: string;
}

export function TogglePill({ label, icon, active, onClick, className, variant = 'outline' }: TogglePillProps) {
  return (
    <Tooltip content={label} side="bottom">
      <button
        onClick={onClick}
        className={cn(togglePillVariants({ variant, active }), className)}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

