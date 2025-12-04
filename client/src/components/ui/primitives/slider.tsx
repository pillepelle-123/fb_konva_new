import { useState } from 'react';
import { Tooltip } from '../composites/tooltip';
import { Input } from './input';

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
  disabled?: boolean;
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
  disabled = false,
}: SliderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState((displayValue !== undefined ? displayValue : value).toString());

  const currentDisplayValue = displayValue !== undefined ? displayValue : value;

  const handleValueClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setInputValue(currentDisplayValue.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && numValue >= min && numValue <= max) {
        onChange(numValue);
      } else {
        setInputValue(currentDisplayValue.toString());
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(currentDisplayValue.toString());
    }
  };

  const handleBlur = () => {
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    } else {
      setInputValue(currentDisplayValue.toString());
    }
    setIsEditing(false);
  };

  const sliderInput = (
    <input
      type="range"
      value={isNaN(value) ? 0 : value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full"
      disabled={disabled}
    />
  );

  return (
    <div className={`${className} flex flex-row gap-2 w-full`}>
      <div className="flex-1 min-w-0">
        {hasLabel ? (
          <Tooltip content={label} side={tooltipPosition}>
            {sliderInput}
          </Tooltip>
        ) : (
          sliderInput
        )}
      </div>
      {isEditing ? (
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="text-xs text-muted-foreground text-center w-12 h-5 p-0 border-0 bg-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none focus:shadow-none rounded-none focus:rounded-none flex-shrink-0"
          autoFocus
          disabled={disabled}
        />
      ) : (
        <span 
          className={`text-xs text-muted-foreground flex-shrink-0 ${disabled ? '' : 'cursor-pointer hover:bg-background/50 px-1 rounded'}`}
          onClick={handleValueClick}
        >
          {currentDisplayValue}{unit}
        </span>
      )}
    </div>
  );
}