import { Button } from '../../../ui/primitives/button';
import { Image } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';

interface ImageSettingsFormProps {
  element: any;
  updateSetting: (key: string, value: any) => void;
  setSelectedImageElementId: (id: string | null) => void;
  setShowImageModal: (show: boolean) => void;
}

export function ImageSettingsForm({
  element,
  updateSetting,
  setSelectedImageElementId,
  setShowImageModal
}: ImageSettingsFormProps) {
  return (
    <div className="space-y-2">
      <Slider
        label="Corner Radius"
        value={actualToCommonRadius(element.cornerRadius || 0)}
        onChange={(value) => updateSetting('cornerRadius', commonToActualRadius(value))}
        min={COMMON_CORNER_RADIUS_RANGE.min}
        max={COMMON_CORNER_RADIUS_RANGE.max}
      />
      
      <Separator />
      
      <Button
        variant="outline"
        size="xs"
        onClick={() => {
          setSelectedImageElementId(element.id);
          setShowImageModal(true);
        }}
        className="w-full"
      >
        <Image className="h-4 w-4 mr-2" />
        Change Image
      </Button>
    </div>
  );
}