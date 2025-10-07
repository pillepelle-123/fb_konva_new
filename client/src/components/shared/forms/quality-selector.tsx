import { FormField } from '../../ui/layout/form-field';
import { SelectInput } from '../../ui/primitives/select-input';

interface QualitySelectorProps {
  value: 'preview' | 'medium' | 'printing';
  onChange: (value: 'preview' | 'medium' | 'printing') => void;
  userRole?: 'author' | 'publisher' | null;
}

export function QualitySelector({ value, onChange, userRole }: QualitySelectorProps) {
  const isAuthor = userRole === 'author';
  return (
    <FormField label="PDF Quality:">
      <SelectInput value={value} onChange={onChange as (value: string) => void}>
        <option value="preview">Preview</option>
        <option value="medium">Medium</option>
        <option value="printing" disabled={isAuthor}>
          For Printing {isAuthor ? '(Publisher only)' : ''}
        </option>
      </SelectInput>
    </FormField>
  );
}