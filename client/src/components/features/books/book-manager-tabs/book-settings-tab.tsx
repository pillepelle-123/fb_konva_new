import { Card, CardContent, CardHeader } from '../../../ui/composites/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../ui/primitives/select';

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
  const formatOrientation = (value: string) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Page Settings</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Page Size</label>
          <Select value={pageSize} onValueChange={onPageSizeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
              <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
              <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
              <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
              <SelectItem value="Square">Square (210 × 210 mm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Orientation</label>
          <Select value={orientation} onValueChange={onOrientationChange}>
            <SelectTrigger className="w-full">
              <span className="block truncate">{formatOrientation(orientation)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}









