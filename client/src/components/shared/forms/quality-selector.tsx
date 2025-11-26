import { FormField } from '../../ui/layout/form-field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/primitives/select';

interface QualitySelectorProps {
  value: 'preview' | 'medium' | 'printing';
  onChange: (value: 'preview' | 'medium' | 'printing') => void;
  userRole?: 'author' | 'publisher' | null;
}

export function QualitySelector({ value, onChange, userRole }: QualitySelectorProps) {
  const isAuthor = userRole === 'author';
  return (
    <FormField label="PDF Quality:">
      <Select value={value} onValueChange={onChange as (value: string) => void}>
        <SelectTrigger>
          <SelectValue placeholder="Select quality" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="preview">Preview</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="printing" disabled={isAuthor}>
            For Printing {isAuthor ? '(Publisher only)' : ''}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  );
}