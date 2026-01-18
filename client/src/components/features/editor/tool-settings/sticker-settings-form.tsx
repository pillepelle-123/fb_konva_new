import { Button } from '../../../ui/primitives/button';
import { Palette } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';

interface StickerSettingsFormProps {
  element: any;
  updateElementSettingLocal: (key: string, value: any) => void;
  setShowColorSelector: (value: string | null) => void;
}

export function StickerSettingsForm({
  element,
  updateElementSettingLocal,
  setShowColorSelector,
}: StickerSettingsFormProps) {
  const stickerOpacity = element.imageOpacity !== undefined ? element.imageOpacity : 1;

  return (
    <div className="space-y-3">
      <div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowColorSelector('element-sticker-color')}
          className="w-full"
        >
          <Palette className="h-4 w-4 mr-2" />
          Sticker Color
        </Button>
      </div>

      <Slider
        label="Opacity"
        value={Math.round(stickerOpacity * 100)}
        displayValue={Math.round(stickerOpacity * 100)}
        onChange={(value) => updateElementSettingLocal('imageOpacity', value / 100)}
        min={0}
        max={100}
        step={5}
        unit="%"
      />
    </div>
  );
}