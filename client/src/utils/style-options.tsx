import { cn } from '../lib/utils';

export const STYLE_OPTIONS = [
  { value: 'default', label: 'Default (Clean)' },
  { value: 'rough', label: 'Rough (Hand-drawn)' },
  { value: 'glow', label: 'Glow (Soft)' },
  { value: 'candy', label: 'Candy (Dotted)' },
  { value: 'zigzag', label: 'Zig-zag (Electric)' },
  { value: 'wobbly', label: 'Wobbly (Variable width)' },
  { value: 'dashed', label: 'Dashed (Dotted line)' },
  { value: 'marker', label: 'Marker (Felt pen)' },
  { value: 'crayon', label: 'Crayon (Waxy)' },
  { value: 'ink', label: 'Ink (Brush)' }
];

export function StyleSelect({ value, onChange, className }: { 
  value: string; 
  onChange: (value: string) => void; 
  className?: string; 
}) {
  return (
    <select
      value={value || 'rough'}
      onChange={(e) => onChange(e.target.value)}
      className={cn("w-full min-w-0 p-1 text-xs border rounded mb-2", className)}
    >
      {STYLE_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
