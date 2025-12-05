import { FormField } from '../../ui/layout/form-field';
import { RadioGroup } from '../../ui/primitives/radio-group';
import { NumberInput } from '../../ui/primitives/number-input';

interface PageRangeSelectorProps {
  pageRange: 'all' | 'range' | 'current';
  startPage: number;
  endPage: number;
  maxPages: number;
  onPageRangeChange: (value: 'all' | 'range' | 'current') => void;
  onStartPageChange: (value: number) => void;
  onEndPageChange: (value: number) => void;
}

export function PageRangeSelector({ 
  pageRange, 
  startPage, 
  endPage, 
  maxPages, 
  onPageRangeChange, 
  onStartPageChange, 
  onEndPageChange 
}: PageRangeSelectorProps) {
  const radioOptions = [
    { value: 'all', label: 'Print all pages' },
    { value: 'current', label: 'Print current page' },
    { value: 'range', label: 'Pages' }
  ];

  return (
    <FormField label="Page Range:">
      <RadioGroup 
        value={pageRange} 
        onChange={onPageRangeChange as (value: string) => void} 
        options={radioOptions} 
      />
      
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '24px' }}>
          <NumberInput
            value={startPage}
            onChange={onStartPageChange}
            min={1}
            max={maxPages}
            onFocus={() => onPageRangeChange('range')}
          />
          <span>to</span>
          <NumberInput
            value={endPage}
            onChange={onEndPageChange}
            min={1}
            max={maxPages}
            onFocus={() => onPageRangeChange('range')}
          />
        </div>
    
    </FormField>
  );
}