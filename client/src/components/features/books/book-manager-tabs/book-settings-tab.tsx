import { Card, CardContent, CardHeader } from '../../../ui/composites/card';
import { SelectInput } from '../../../ui/primitives/select-input';

interface BookSettingsTabProps {
  pageSize: string;
  orientation: string;
  onPageSizeChange: (value: string) => void;
  onOrientationChange: (value: string) => void;
}

export function BookSettingsTab({
  pageSize,
  orientation,
  onPageSizeChange,
  onOrientationChange,
}: BookSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Page Settings</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Page Size</label>
          <SelectInput value={pageSize} onChange={onPageSizeChange} className="w-full">
            <option value="A4">A4 (210 × 297 mm)</option>
            <option value="Letter">Letter (8.5 × 11 in)</option>
            <option value="Legal">Legal (8.5 × 14 in)</option>
            <option value="A5">A5 (148 × 210 mm)</option>
            <option value="Square">Square (210 × 210 mm)</option>
          </SelectInput>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Orientation</label>
          <SelectInput value={orientation} onChange={onOrientationChange} className="w-full">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </SelectInput>
        </div>
      </CardContent>
    </Card>
  );
}









