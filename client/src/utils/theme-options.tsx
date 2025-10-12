export const THEME_OPTIONS = [
  { value: 'rough', label: 'Rough (Hand-drawn)' },
  { value: 'default', label: 'Default (Clean)' },
  { value: 'chalk', label: 'Chalk (Textured)' },
  { value: 'watercolor', label: 'Watercolor (Soft)' },
  { value: 'crayon', label: 'Crayon (Waxy)' },
  { value: 'candy', label: 'Candy (Dotted)' },
  { value: 'zigzag', label: 'Zig-zag (Electric)' },
  { value: 'multi-strokes', label: 'Multi-strokes (Parallel)' },
  { value: 'wobbly', label: 'Wobbly (Variable width)' }
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