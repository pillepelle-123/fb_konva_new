import { Tooltip } from '../composites/tooltip';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  className?: string;
}

export function Slider({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  unit = 'px',
  className = ''
}: SliderProps) {
  return (
    <div className={`${className} flex flex-row gap-2`}>
      {/* <div className="flex flex-row gap-2"> */}
        <div className="flex-1">
          {/* <Tooltip content={label} side='left'> */}
            <input
              type="range"
              value={value}
              onChange={(e) => onChange(parseInt(e.target.value))}
              min={min}
              max={max}
              step={step}
              className="w-full"
            />
          {/* </Tooltip> */}
        </div>
        <span className="text-xs text-muted-foreground">{value}</span>
      {/* </div> */}
    </div>
  );
}