import { Button } from '../../../ui/primitives/button';
import { Palette } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { ThemeSelect } from '../../../../utils/theme-options';
import { commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth, getMinActualStrokeWidth } from '../../../../utils/stroke-width-converter';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getElementTheme } from '../../../../utils/theme-utils';
import { ThemeSettingsRenderer } from './theme-settings-renderer';
import { SettingsFormFooter } from './settings-form-footer';

interface ShapeSettingsFormProps {
  element: any;
  updateSetting: (key: string, value: any) => void;
  setShowColorSelector: (type: string | null) => void;
  hasChanges?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}

export function ShapeSettingsForm({
  element,
  updateSetting,
  setShowColorSelector,
  hasChanges,
  onSave,
  onDiscard
}: ShapeSettingsFormProps) {
  const shouldShowFooter =
    hasChanges !== undefined && Boolean(onSave) && Boolean(onDiscard);
  const getMaxStrokeWidth = () => {
    return getMaxCommonWidth();
  };

  switch (element.type) {
    case 'brush':
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
          <Slider
            label="Stroke Size"
            value={Math.round(element.strokeWidth || 2)}
            displayValue={Math.round(element.strokeWidth || 2)}
            onChange={(value) => {
              updateSetting('strokeWidth', value);
              if (!element.originalStrokeWidth) {
                updateSetting('originalStrokeWidth', value);
              }
            }}
            min={1}
            max={100}
          />
          
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowColorSelector('element-brush-stroke')}
            className="w-full"
          >
            <Palette className="h-4 w-4 mr-2" />
            <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: element.stroke || '#1f2937' }} />
            Stroke Color
          </Button>
          
          <Slider
            label="Stroke Opacity"
            value={Math.round(((element as any).strokeOpacity || 1) * 100)}
            onChange={(value) => updateSetting('strokeOpacity', value / 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
          />
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

    case 'line':
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
          <div>
            <Label variant="xs">Theme</Label>
            <ThemeSelect 
              value={getElementTheme(element)}
              onChange={(value) => {
                // When theme changes, set strokeWidth to minimum value of new theme
                const minWidth = getMinActualStrokeWidth(value);
                updateSetting('theme', value);
                updateSetting('inheritTheme', value);
                // Only update strokeWidth if border is enabled (strokeWidth > 0)
                if ((element.strokeWidth || 0) > 0) {
                  updateSetting('strokeWidth', minWidth);
                }
              }}
            />
          </div>
          
          <Separator />

          <Slider
            label="Stroke Width"
            value={actualToCommonStrokeWidth(element.strokeWidth || 2, getElementTheme(element))}
            onChange={(value) => updateSetting('strokeWidth', commonToActualStrokeWidth(value, getElementTheme(element)))}
            min={0}
            max={getMaxStrokeWidth()}
          />
          
          <Separator />
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('element-line-stroke')}
              className="w-full"
            >
              <Palette className="h-4 w-4 mr-2" />
              <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: element.stroke || '#1f2937' }} />
              Color
            </Button>
          </div>
          
          <div>
            <Slider
              label="Line Opacity"
              value={Math.round(((element.strokeOpacity ?? 1) * 100))}
              displayValue={Math.round(((element.strokeOpacity ?? 1) * 100))}
              onChange={(value) => updateSetting('strokeOpacity', value / 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              hasLabel={false}
            />
          </div>
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

    case 'rect':
    case 'circle':
    case 'triangle':
    case 'polygon':
    case 'heart':
    case 'star':
    case 'speech-bubble':
    case 'dog':
    case 'cat':
    case 'smiley':
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
          <div>
            <Label variant="xs">Theme</Label>
            <ThemeSelect 
              value={getElementTheme(element)}
              onChange={(value) => {
                // When theme changes, set borderWidth to minimum value of new theme
                const minWidth = getMinActualStrokeWidth(value);
                updateSetting('inheritTheme', value);
                updateSetting('theme', value);
                // Only update borderWidth if border is enabled (borderWidth > 0)
                if ((element.borderWidth || element.strokeWidth || 0) > 0) {
                  updateSetting('borderWidth', minWidth);
                }
              }}
            />
          </div>
          
          <Separator />
          
          <div>
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox
                checked={element.borderEnabled !== undefined ? element.borderEnabled : ((element.borderWidth || element.strokeWidth || 0) > 0)}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  updateSetting('borderEnabled', isChecked);
                  if (isChecked) {
                    const lastBorderWidth = localStorage.getItem(`shape-border-width-${element.id}`) || '2';
                    const lastBorderColor = localStorage.getItem(`shape-border-color-${element.id}`) || '#1f2937';
                    updateSetting('borderWidth', Math.max(1, parseInt(lastBorderWidth)));
                    updateSetting('stroke', lastBorderColor);
                  } else {
                    const currentWidth = element.borderWidth || element.strokeWidth || 0;
                    if (currentWidth > 0) {
                      localStorage.setItem(`shape-border-width-${element.id}`, String(currentWidth));
                    }
                    localStorage.setItem(`shape-border-color-${element.id}`, element.stroke || '#1f2937');
                    updateSetting('borderWidth', 0);
                  }
                }}
              />
              Stroke
            </Label>
          </div>
          
          {(element.borderEnabled !== undefined ? element.borderEnabled : ((element.borderWidth || element.strokeWidth || 0) > 0)) && (
            <IndentedSection>
              <Slider
                label="Stroke Width"
                value={actualToCommonStrokeWidth((element.borderWidth || element.strokeWidth || 0), getElementTheme(element))}
                onChange={(value) => {
                  const actualWidth = commonToActualStrokeWidth(value, getElementTheme(element));
                  updateSetting('borderWidth', actualWidth);
                  localStorage.setItem(`shape-border-width-${element.id}`, String(actualWidth));
                }}
                min={0}
                max={getMaxStrokeWidth()}
              />
              
              <div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowColorSelector('element-shape-stroke')}
                  className="w-full"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: element.stroke || '#1f2937' }} />
                  Stroke Color
                </Button>
              </div>
              
              <Slider
                label="Stroke Opacity"
                value={Math.round((element.borderOpacity !== undefined ? element.borderOpacity : (element.opacity !== undefined ? element.opacity : 1)) * 100)}
                onChange={(value) => updateSetting('borderOpacity', value / 100)}
                min={0}
                max={100}
                step={5}
                unit="%"
              />
            </IndentedSection>
          )}
          
          <div>
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox
                checked={element.backgroundEnabled !== undefined ? element.backgroundEnabled : (element.fill !== 'transparent' && element.fill !== undefined)}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  updateSetting('backgroundEnabled', isChecked);
                  if (isChecked) {
                    const lastFillColor = localStorage.getItem(`shape-fill-color-${element.id}`) || '#ffffff';
                    updateSetting('fill', lastFillColor);
                  } else {
                    localStorage.setItem(`shape-fill-color-${element.id}`, element.fill || '#ffffff');
                    updateSetting('fill', 'transparent');
                  }
                }}
              />
              Background
            </Label>
          </div>
          
          {(element.backgroundEnabled !== undefined ? element.backgroundEnabled : (element.fill !== 'transparent' && element.fill !== undefined)) && (
            <IndentedSection>
              <div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowColorSelector('element-shape-fill')}
                  className="w-full"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: element.fill || '#ffffff' }} />
                  Background Color
                </Button>
              </div>
              
              <Slider
                label="Background Opacity"
                value={Math.round((element.backgroundOpacity !== undefined ? element.backgroundOpacity : (element.opacity !== undefined ? element.opacity : 1)) * 100)}
                onChange={(value) => updateSetting('backgroundOpacity', value / 100)}
                min={0}
                max={100}
                step={5}
                unit="%"
              />
            </IndentedSection>
          )}
          
          {/* Theme-specific settings */}
          <ThemeSettingsRenderer
            element={element}
            theme={getElementTheme(element)}
            updateSetting={updateSetting}
          />
          
          {element.type === 'rect' && (element.theme !== 'candy' && element.theme !== 'zigzag' && element.theme !== 'wobbly') && ( 
            <Slider
              label="Corner Radius"
              value={actualToCommonRadius(element.cornerRadius || 0)}
              onChange={(value) => updateSetting('cornerRadius', commonToActualRadius(value))}
              min={COMMON_CORNER_RADIUS_RANGE.min}
              max={COMMON_CORNER_RADIUS_RANGE.max}
            />
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

    default:
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="text-sm text-muted-foreground">
              No settings available for this element.
            </div>
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
}