import { Button } from '../../../ui/primitives/button';
import { Image, Trash2, Palette } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { StyleSelect } from '../../../../utils/style-options';
import { commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth } from '../../../../utils/stroke-width-converter';
import { StyleSettingsRenderer } from './style-settings-renderer';
import { SettingsFormFooter } from './settings-form-footer';
import { SlotSelector } from './slot-selector';
import { Tooltip } from '../../../ui/composites/tooltip';
import type { SandboxContextValue } from '../../../../context/sandbox-context';
import type { PaletteColorSlot } from '../../../../utils/sandbox-utils';
import { DEFAULT_PALETTE_PARTS } from '../../../../data/templates/color-palettes';

interface ImageSettingsFormProps {
  element: any;
  updateSetting: (key: string, value: any) => void;
  updateSettings?: (updates: Record<string, any>) => void; // For multiple updates at once
  setSelectedImageElementId: (id: string | null) => void;
  setShowImageModal: (show: boolean) => void;
  setShowColorSelector?: (type: string | null) => void;
  hasChanges?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  isSandboxMode?: boolean;
  sandbox?: SandboxContextValue;
}

export function ImageSettingsForm({
  element,
  updateSetting,
  updateSettings,
  setSelectedImageElementId,
  setShowImageModal,
  setShowColorSelector,
  hasChanges,
  onSave,
  onDiscard,
  isSandboxMode = false,
  sandbox
}: ImageSettingsFormProps) {
  const shouldShowFooter =
    hasChanges !== undefined && Boolean(onSave) && Boolean(onDiscard);
  const frameEnabled = element.frameEnabled !== undefined 
    ? element.frameEnabled 
    : (element.strokeWidth || 0) > 0;
  
  const frameStyle = element.frameStyle || element.theme || element.style || 'default';
  const imageOpacity = element.imageOpacity !== undefined ? element.imageOpacity : 1;

  const handleRemoveImage = () => {
    // Reset element to placeholder - update both type and src in one operation
    if (updateSettings) {
      updateSettings({
        type: 'placeholder',
        src: undefined
      });
    } else {
      // Fallback: update sequentially if updateSettings is not available
      updateSetting('type', 'placeholder');
      updateSetting('src', undefined);
    }
  };

  const getMaxStrokeWidth = () => {
    return getMaxCommonWidth();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-w-0 overflow-y-auto space-y-2 p-2">
      {/* Image Opacity */}
      <Slider
        label="Image Opacity"
        value={Math.round(imageOpacity * 100)}
        onChange={(value) => updateSetting('imageOpacity', value / 100)}
        min={0}
        max={100}
        step={5}
        unit="%"
      />
      
      <Separator />
      
      {/* Corner Radius */}
      <Slider
        label="Corner Radius"
        value={actualToCommonRadius(element.cornerRadius || 0)}
        onChange={(value) => updateSetting('cornerRadius', commonToActualRadius(value))}
        min={COMMON_CORNER_RADIUS_RANGE.min}
        max={COMMON_CORNER_RADIUS_RANGE.max}
      />
      
      <Separator />
      
      {/* Frame/Border Color for placeholder in sandbox */}
      {element.type === 'placeholder' && isSandboxMode && sandbox && (
        <div>
          <SlotSelector
            label="Frame Color"
            value={(sandbox.getPartSlot(element.id, 'imageBorder') ?? DEFAULT_PALETTE_PARTS.imageBorder) as PaletteColorSlot}
            onChange={(slot) => {
              sandbox.setPartSlotOverride(element.id, 'imageBorder', slot);
              updateSetting('borderColor', sandbox.getColorForSlot(slot));
            }}
            slotColors={sandbox.state.sandboxColors}
          />
        </div>
      )}
      
      {/* Frame Settings - only show for image elements, not placeholders */}
      {element.type === 'image' && (
        <>
          <div>
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox
                checked={frameEnabled}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  updateSetting('frameEnabled', isChecked);
                  if (isChecked) {
                    // Enable frame with default values
                    if (!element.strokeWidth) {
                      updateSetting('strokeWidth', 2);
                    }
                    if (!element.borderColor) {
                      updateSetting('borderColor', '#1f2937');
                    }
                    if (element.borderOpacity === undefined) {
                      updateSetting('borderOpacity', 1);
                    }
                  } else {
                    // Disable frame
                    updateSetting('strokeWidth', 0);
                  }
                }}
              />
              Frame
            </Label>
          </div>
          
          {frameEnabled && (
            <IndentedSection>
              {/* Frame Style */}
              <Tooltip side='left' content="Frame Style">
                <StyleSelect 
                  value={frameStyle}
                  onChange={(value) => {
                    updateSetting('frameStyle', value);
                    updateSetting('theme', value);
                  }}
                />
              </Tooltip>
              
              {/* Style-specific settings for Frame */}
              <StyleSettingsRenderer
                element={element}
                style={frameStyle}
                updateSetting={updateSetting}
              />
              
              {/* Frame Width */}
              <Slider
                label="Frame Width"
                value={actualToCommonStrokeWidth(element.strokeWidth || 2, frameStyle)}
                onChange={(value) => updateSetting('strokeWidth', commonToActualStrokeWidth(value, frameStyle))}
                min={1}
                max={getMaxStrokeWidth()}
              />
              
              {/* Frame Color */}
              {isSandboxMode && sandbox ? (
                <div>
                  <SlotSelector
                    label="Frame Color"
                    value={(sandbox.getPartSlot(element.id, 'imageBorder') ?? DEFAULT_PALETTE_PARTS.imageBorder) as PaletteColorSlot}
                    onChange={(slot) => {
                      sandbox.setPartSlotOverride(element.id, 'imageBorder', slot);
                      updateSetting('borderColor', sandbox.getColorForSlot(slot));
                    }}
                    slotColors={sandbox.state.sandboxColors}
                  />
                </div>
              ) : setShowColorSelector ? (
                <div className="w-full min-w-0">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowColorSelector('element-image-frame-stroke')}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: element.borderColor || '#1f2937' }} />
                    Frame Color
                  </Button>
                </div>
              ) : null}
              
              {/* Frame Opacity */}
              <Slider
                label="Frame Opacity"
                value={Math.round((element.borderOpacity !== undefined ? element.borderOpacity : 1) * 100)}
                onChange={(value) => updateSetting('borderOpacity', value / 100)}
                min={0}
                max={100}
                step={5}
                unit="%"
              />
            </IndentedSection>
          )}
          
          <Separator />
        </>
      )}
      
      {/* Change Image Button - only show for image elements */}
      {element.type === 'image' && (
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
      )}
      
      {/* Remove Image Button - only show for image elements, not placeholders */}
      {element.type === 'image' && (
        <Button
          variant="outline"
          size="xs"
          onClick={handleRemoveImage}
          className="w-full text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove Image
        </Button>
      )}
      </div>
      {shouldShowFooter && (
        <SettingsFormFooter
          hasChanges={hasChanges ?? false}
          onSave={onSave!}
          onDiscard={onDiscard!}
        />
      )}
    </div>
  );
}