import { Button } from '../../../ui/primitives/button';
import { Palette } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';
import { useSettingsFormState } from '../../../../hooks/useSettingsFormState';
import { SettingsFormFooter } from './settings-form-footer';

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
  const { hasChanges, handleSave, handleDiscard } = useSettingsFormState(element);
  const stickerOpacity = element.imageOpacity !== undefined ? element.imageOpacity : 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
      <div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowColorSelector('element-sticker-color')}
          className="w-full"
        >
          <Palette className="h-4 w-4 mr-2" />
          <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: element.stickerColor || '#000000' }} />
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
      <SettingsFormFooter hasChanges={hasChanges} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}