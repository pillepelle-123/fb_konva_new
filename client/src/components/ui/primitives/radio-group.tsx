interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
}

export function RadioGroup({ value, onChange, options }: RadioGroupProps) {
  return (
    <div style={{ marginBottom: '8px' }}>
      {options.map((option) => (
        <label key={option.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <input
            type="radio"
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            style={{ marginRight: '8px' }}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}