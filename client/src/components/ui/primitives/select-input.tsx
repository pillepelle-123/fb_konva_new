interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

export function SelectInput({ value, onChange, children }: SelectInputProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        border: '1px solid #d1d5db',
        borderRadius: '4px'
      }}
    >
      {children}
    </select>
  );
}