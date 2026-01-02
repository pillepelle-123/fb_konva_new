export const THEME_OPTIONS = [
  { value: 'default', label: 'Default (Clean)' },
  { value: 'rough', label: 'Rough (Hand-drawn)' },
  { value: 'glow', label: 'Glow (Soft)' },
  { value: 'candy', label: 'Candy (Dotted)' },
  { value: 'zigzag', label: 'Zig-zag (Electric)' },
  { value: 'wobbly', label: 'Wobbly (Variable width)' },
  { value: 'dashed', label: 'Dashed (Dotted line)' }
];

export function ThemeSelect({ value, onChange, className }: { 
  value: string; 
  onChange: (value: string) => void; 
  className?: string; 
}) {
  return (
    <select
      value={value || 'rough'}
      onChange={(e) => onChange(e.target.value)}
      className={className || "w-full p-1 text-xs border rounded mb-2"}
    >
      {THEME_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}