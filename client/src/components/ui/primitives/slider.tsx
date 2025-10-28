import { Tooltip } from '../composites/tooltip';

interface SliderProps {
  label: string;
  tooltipPosition?: 'top' | 'left' | 'right' | 'bottom';
  hasLabel?: boolean;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  className?: string;
  displayValue?: number;
}

export function Slider({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  unit = 'px',
  className = '',
  tooltipPosition = 'left',
  hasLabel = true,
  displayValue,
}: SliderProps) {
  const sliderInput = (
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full"
    />
  );

  return (
    <div className={`${className} flex flex-row gap-2`}>
      <div className="flex-1">
        {hasLabel ? (
          <Tooltip content={label} side={tooltipPosition}>
            {sliderInput}
          </Tooltip>
        ) : (
          sliderInput
        )}
      </div>
      <span className="text-xs text-muted-foreground">{displayValue !== undefined ? displayValue : value}</span>
    </div>
  );
}