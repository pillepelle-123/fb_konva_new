interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  width?: string;
  onFocus?: () => void;
}

export function NumberInput({ value, onChange, min, max, width = '60px', onFocus }: NumberInputProps) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      onFocus={onFocus}
      style={{
        width,
        padding: '4px',
        border: '1px solid #d1d5db',
        borderRadius: '4px'
      }}
    />
  );
}