import { Input } from '../../../../ui/primitives/input';

interface BasicInfoStepProps {
  name: string;
  pageSize: string;
  orientation: string;
  onChange: (updates: Partial<Pick<BasicInfoStepProps, 'name' | 'pageSize' | 'orientation'>>) => void;
}

export function BasicInfoStep({ name, pageSize, orientation, onChange }: BasicInfoStepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Basic Information</h3>
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Book Name
        </label>
        <Input
          id="name"
          type="text"
          placeholder="Enter book name"
          value={name}
          onChange={(event) => onChange({ name: event.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="pageSize" className="text-sm font-medium">
          Page Size
        </label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(event) => onChange({ pageSize: event.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="A3">A3</option>
          <option value="Letter">Letter</option>
          <option value="Square">Square</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Orientation</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="portrait"
              checked={orientation === 'portrait'}
              onChange={(event) => onChange({ orientation: event.target.value })}
            />
            <span>Portrait</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="landscape"
              checked={orientation === 'landscape'}
              onChange={(event) => onChange({ orientation: event.target.value })}
            />
            <span>Landscape</span>
          </label>
        </div>
      </div>
    </div>
  );
}

