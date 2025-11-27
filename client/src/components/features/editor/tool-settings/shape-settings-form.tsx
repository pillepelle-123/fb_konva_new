import { Button } from '../../../ui/primitives/button';
import { Palette } from 'lucide-react';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { ThemeSelect } from '../../../../utils/theme-options';
import { commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth } from '../../../../utils/stroke-width-converter';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getElementTheme } from '../../../../utils/theme-utils';

interface ShapeSettingsFormProps {
  element: any;
  updateSetting: (key: string, value: any) => void;
  setShowColorSelector: (type: string | null) => void;
}

export function ShapeSettingsForm({
  element,
  updateSetting,
  setShowColorSelector
}: ShapeSettingsFormProps) {
  const getMaxStrokeWidth = () => {
    return getMaxCommonWidth();
  };

  switch (element.type) {
    case 'brush':
      return (
        <div className="space-y-2">
          <Slider
            label="Brush Size"
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
            Brush Color
          </Button>
          
          <Slider
            label="Brush Opacity"
            value={Math.round(((element as any).strokeOpacity || 1) * 100)}
            onChange={(value) => updateSetting('strokeOpacity', value / 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
          />
        </div>
      );

    case 'line':
      return (
        <div className="space-y-2">
          <div>
            <Label variant="xs">Theme</Label>
            <ThemeSelect 
              value={getElementTheme(element)}
              onChange={(value) => {
                updateSetting('theme', value);
                updateSetting('inheritTheme', value);
              }}
            />
          </div>
          
          <Separator />

          <Slider
            label="Stroke Width"
            value={actualToCommonStrokeWidth(element.strokeWidth || 2, getElementTheme(element))}
            onChange={(value) => updateSetting('strokeWidth', commonToActualStrokeWidth(value, getElementTheme(element)))}
            min={1}
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
        <div className="space-y-2">
          <div>
            <Label variant="xs">Theme</Label>
            <ThemeSelect 
              value={getElementTheme(element)}
              onChange={(value) => {
                updateSetting('inheritTheme', value);
                updateSetting('theme', value);
              }}
            />
          </div>
          
          <Separator />
          
          <div>
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox
                checked={element.borderEnabled !== undefined ? element.borderEnabled : (element.strokeWidth || 0) > 0}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  updateSetting('borderEnabled', isChecked);
                  if (isChecked) {
                    const lastBorderWidth = localStorage.getItem(`shape-border-width-${element.id}`) || '2';
                    const lastBorderColor = localStorage.getItem(`shape-border-color-${element.id}`) || '#1f2937';
                    updateSetting('strokeWidth', Math.max(1, parseInt(lastBorderWidth)));
                    updateSetting('stroke', lastBorderColor);
                  } else {
                    if ((element.strokeWidth || 0) > 0) {
                      localStorage.setItem(`shape-border-width-${element.id}`, String(element.strokeWidth));
                    }
                    localStorage.setItem(`shape-border-color-${element.id}`, element.stroke || '#1f2937');
                    updateSetting('strokeWidth', 0);
                  }
                }}
              />
              Border
            </Label>
          </div>
          
          {(element.borderEnabled !== undefined ? element.borderEnabled : (element.strokeWidth || 0) > 0) && (
            <IndentedSection>
              <Slider
                label="Border Width"
                value={actualToCommonStrokeWidth(element.strokeWidth || 0, getElementTheme(element))}
                onChange={(value) => {
                  const actualWidth = commonToActualStrokeWidth(value, getElementTheme(element));
                  updateSetting('strokeWidth', actualWidth);
                  localStorage.setItem(`shape-border-width-${element.id}`, String(actualWidth));
                }}
                min={1}
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
                  Border Color
                </Button>
              </div>
              
              <Slider
                label="Border Opacity"
                value={Math.round((element.strokeOpacity !== undefined ? element.strokeOpacity : (element.opacity !== undefined ? element.opacity : 1)) * 100)}
                onChange={(value) => updateSetting('strokeOpacity', value / 100)}
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
                  Background Color
                </Button>
              </div>
              
              <Slider
                label="Background Opacity"
                value={Math.round((element.fillOpacity !== undefined ? element.fillOpacity : (element.opacity !== undefined ? element.opacity : 1)) * 100)}
                onChange={(value) => updateSetting('fillOpacity', value / 100)}
                min={0}
                max={100}
                step={5}
                unit="%"
              />
            </IndentedSection>
          )}
          
          {element.theme === 'candy' && (
            <div>
              <Separator />
              <div className="flex items-center gap-2 h-12">
                <Label className="flex items-center gap-1" variant="xs">
                  <Checkbox
                    checked={element.candyRandomness || false}
                    onCheckedChange={(checked) => updateSetting('candyRandomness', checked === true)}
                  />
                  Randomness
                </Label>
                {element.candyRandomness && (
                  <ButtonGroup>
                    <Button
                      variant={(!element.candyIntensity || element.candyIntensity === 'weak') ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateSetting('candyIntensity', 'weak')}
                    >
                      weak
                    </Button>
                    <Button
                      variant={element.candyIntensity === 'middle' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateSetting('candyIntensity', 'middle')}
                    >
                      middle
                    </Button>
                    <Button
                      variant={element.candyIntensity === 'strong' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => updateSetting('candyIntensity', 'strong')}
                    >
                      strong
                    </Button>
                  </ButtonGroup>
                )}
              </div>
            </div>
          )}
          
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
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          No settings available for this element.
        </div>
      );
  }
}