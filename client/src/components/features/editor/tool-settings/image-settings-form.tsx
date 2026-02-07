import { Button } from '../../../ui/primitives/button';
import { Image, Trash2, Palette } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { ThemeSelect } from '../../../../utils/theme-options';
import { commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth, getMinActualStrokeWidth } from '../../../../utils/stroke-width-converter';
import { ThemeSettingsRenderer } from './theme-settings-renderer';
import { useSettingsFormState } from '../../../../hooks/useSettingsFormState';
import { SettingsFormFooter } from './settings-form-footer';

interface ImageSettingsFormProps {
  element: any;
  updateSetting: (key: string, value: any) => void;
  updateSettings?: (updates: Record<string, any>) => void; // For multiple updates at once
  setSelectedImageElementId: (id: string | null) => void;
  setShowImageModal: (show: boolean) => void;
  setShowColorSelector?: (type: string | null) => void;
}

export function ImageSettingsForm({
  element,
  updateSetting,
  updateSettings,
  setSelectedImageElementId,
  setShowImageModal,
  setShowColorSelector
}: ImageSettingsFormProps) {
  const { hasChanges, handleSave, handleDiscard } = useSettingsFormState(element);
  const frameEnabled = element.frameEnabled !== undefined 
    ? element.frameEnabled 
    : (element.strokeWidth || 0) > 0;
  
  const frameTheme = element.frameTheme || element.theme || 'default';
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
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
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
                    if (!element.stroke) {
                      updateSetting('stroke', '#1f2937');
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
              {/* Frame Theme */}
              <div>
                <Label variant="xs">Frame Theme</Label>
                <ThemeSelect 
                  value={frameTheme}
                  onChange={(value) => {
                    // When frame theme changes, set strokeWidth to minimum value of new theme
                    const minWidth = getMinActualStrokeWidth(value);
                    updateSetting('frameTheme', value);
                    updateSetting('theme', value);
                    // Only update strokeWidth if frame is enabled (strokeWidth > 0)
                    if ((element.strokeWidth || 0) > 0) {
                      updateSetting('strokeWidth', minWidth);
                    }
                  }}
                />
              </div>
              
              {/* Theme-specific settings for Frame */}
              <ThemeSettingsRenderer
                element={element}
                theme={frameTheme}
                updateSetting={updateSetting}
              />
              
              {/* Frame Width */}
              <Slider
                label="Frame Width"
                value={actualToCommonStrokeWidth(element.strokeWidth || 2, frameTheme)}
                onChange={(value) => updateSetting('strokeWidth', commonToActualStrokeWidth(value, frameTheme))}
                min={1}
                max={getMaxStrokeWidth()}
              />
              
              {/* Frame Color */}
              {setShowColorSelector && (
                <div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowColorSelector('element-image-frame-stroke')}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Frame Color
                  </Button>
                </div>
              )}
              
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
      <SettingsFormFooter hasChanges={hasChanges} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}