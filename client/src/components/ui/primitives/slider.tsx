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

  const currentDisplayValue = Math.round(displayValue !== undefined ? displayValue : value);

  const handleValueClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setInputValue(currentDisplayValue.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    // Limit to maximum 3 characters
    const limitedValue = value.slice(0, 3);
    setInputValue(limitedValue);
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
      <span 
        className={`text-xs text-muted-foreground flex-shrink-0 inline-flex items-baseline py-1 pl-2 relative ${disabled ? '' : 'cursor-pointer hover:bg-background/50 px-1 rounded'}`}
        onClick={!isEditing ? handleValueClick : undefined}
      >
        {/* Invisible placeholder to maintain consistent width */}
        <span className="invisible inline-flex items-baseline" aria-hidden="true">
          <span style={{ width: `${currentDisplayValue.toString().length * 0.6}rem`, minWidth: '1.5rem', textAlign: 'right', display: 'inline-block' }}>
            {currentDisplayValue}
          </span>
          <span style={{ width: '1.2rem', minWidth: '1.2rem', textAlign: 'left', display: 'inline-block' }}>
            {unit}
          </span>
        </span>
        {/* Actual content - positioned absolutely to overlay placeholder */}
        <span className="absolute inset-0 flex items-baseline">
          <span className="inline-block text-right" style={{ width: `${currentDisplayValue.toString().length * 0.6}rem`, minWidth: '1.5rem' }}>
            {isEditing ? (
              <Input
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="text-xs text-muted-foreground text-right h-5 p-0 px-0 m-0 border-0 bg-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none focus:shadow-none rounded-none focus:rounded-none block w-full"
                autoFocus
                disabled={disabled}
              />
            ) : (
              <span className="inline-block w-full text-right pt-0.5">
                {currentDisplayValue}
              </span>
            )}
          </span>
          {/* Unit with fixed width for 2 characters, left-aligned */}
          <span className="inline-block text-left" style={{ width: '1.2rem', minWidth: '1.2rem' }}>
            {unit}
          </span>
        </span>
      </span>
    </div>
  );
}