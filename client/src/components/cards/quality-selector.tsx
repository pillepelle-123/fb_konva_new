import { FormField } from '../ui/layout/form-field';
import { SelectInput } from '../ui/primitives/select-input';

interface QualitySelectorProps {
  value: 'preview' | 'medium' | 'printing';
  onChange: (value: 'preview' | 'medium' | 'printing') => void;
}

export function QualitySelector({ value, onChange }: QualitySelectorProps) {
  return (
    <FormField label="PDF Quality:">
      <SelectInput value={value} onChange={onChange as (value: string) => void}>
        <option value="preview">Preview</option>
        <option value="medium">Medium</option>
        <option value="printing">For Printing</option>
      </SelectInput>
    </FormField>
  );
}