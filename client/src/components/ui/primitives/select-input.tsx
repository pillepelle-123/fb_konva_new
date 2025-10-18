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
      className="w-100 p-1 border border border-input bg-background hover:bg-secondary hover:text-accent-foreground rounded-md text-xs"
      // style={{
      //   width: '100%',
      //   padding: '4px',
      //   border: '1px solid #d1d5db',
      //   borderRadius: '4px',
      //   fontSize: '12px'
      // }}
    >
      {children}
    </select>
  );
}