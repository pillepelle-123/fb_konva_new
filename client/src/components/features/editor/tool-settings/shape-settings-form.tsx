import { Button } from '../../../ui/primitives/button';
import { Palette } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { StyleSelect } from '../../../../utils/style-options';
import { commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth, getMinActualStrokeWidth } from '../../../../utils/stroke-width-converter';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getElementStyle } from '../../../../utils/style-utils';
import { StyleSettingsRenderer } from './style-settings-renderer';
import { SettingsFormFooter } from './settings-form-footer';
import { SlotSelector } from './slot-selector';
import type { SandboxContextValue } from '../../../../context/sandbox-context';
import type { PaletteColorSlot } from '../../../../utils/sandbox-utils';
import { DEFAULT_PALETTE_PARTS } from '../../../../data/templates/color-palettes';

interface ShapeSettingsFormProps {
  element: any;
  updateSetting: (key: string, value: any) => void;
  setShowColorSelector: (type: string | null) => void;
  hasChanges?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  isSandboxMode?: boolean;
  sandbox?: SandboxContextValue;
}

export function ShapeSettingsForm({
  element,
  updateSetting,
  setShowColorSelector,
  hasChanges,
  onSave,
  onDiscard,
  isSandboxMode = false,
  sandbox
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
          <div className="flex-1 min-w-0 overflow-y-auto space-y-2 p-2">
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
          
          <div className="w-full min-w-0">
          {isSandboxMode && sandbox ? (
            <SlotSelector
              label="Stroke Color"
              value={(sandbox.getPartSlot(element.id, 'brushStroke') ?? DEFAULT_PALETTE_PARTS.brushStroke) as PaletteColorSlot}
              onChange={(slot) => {
                sandbox.setPartSlotOverride(element.id, 'brushStroke', slot);
                updateSetting('stroke', sandbox.getColorForSlot(slot));
              }}
              slotColors={sandbox.state.sandboxColors}
            />
          ) : (
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
          )}
          </div>
          
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
          <div className="flex-1 min-w-0 overflow-y-auto space-y-2 p-2">
          <div className="w-full min-w-0">
            <Label variant="xs">Style</Label>
            <StyleSelect 
              value={getElementStyle(element)}
              onChange={(value) => {
                const minWidth = getMinActualStrokeWidth(value);
                updateSetting('inheritStyle', value);
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
            value={actualToCommonStrokeWidth(element.strokeWidth || 2, getElementStyle(element))}
            onChange={(value) => updateSetting('strokeWidth', commonToActualStrokeWidth(value, getElementStyle(element)))}
            min={0}
            max={getMaxStrokeWidth()}
          />
          
          <Separator />
          
          <div className="w-full min-w-0">
            {isSandboxMode && sandbox ? (
              <SlotSelector
                label="Color"
                value={(sandbox.getPartSlot(element.id, 'lineStroke') ?? DEFAULT_PALETTE_PARTS.lineStroke) as PaletteColorSlot}
                onChange={(slot) => {
                  sandbox.setPartSlotOverride(element.id, 'lineStroke', slot);
                  updateSetting('stroke', sandbox.getColorForSlot(slot));
                }}
                slotColors={sandbox.state.sandboxColors}
              />
            ) : (
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
            )}
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
          <div className="flex-1 min-w-0 overflow-y-auto space-y-2 p-2">
          <div className="w-full min-w-0">
            <Label variant="xs">Style</Label>
            <StyleSelect 
              value={getElementStyle(element)}
              onChange={(value) => {
                const minWidth = getMinActualStrokeWidth(value);
                updateSetting('inheritStyle', value);
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
                value={actualToCommonStrokeWidth((element.borderWidth || element.strokeWidth || 0), getElementStyle(element))}
                onChange={(value) => {
                  const actualWidth = commonToActualStrokeWidth(value, getElementStyle(element));
                  updateSetting('borderWidth', actualWidth);
                  localStorage.setItem(`shape-border-width-${element.id}`, String(actualWidth));
                }}
                min={0}
                max={getMaxStrokeWidth()}
              />
              
              <div>
                {isSandboxMode && sandbox ? (
                  <SlotSelector
                    label="Stroke Color"
                    value={(sandbox.getPartSlot(element.id, 'shapeStroke') ?? DEFAULT_PALETTE_PARTS.shapeStroke) as PaletteColorSlot}
                    onChange={(slot) => {
                      sandbox.setPartSlotOverride(element.id, 'shapeStroke', slot);
                      updateSetting('stroke', sandbox.getColorForSlot(slot));
                    }}
                    slotColors={sandbox.state.sandboxColors}
                  />
                ) : (
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
                )}
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
              <div className="w-full min-w-0">
                {isSandboxMode && sandbox ? (
                  <SlotSelector
                    label="Background Color"
                    value={(sandbox.getPartSlot(element.id, 'shapeFill') ?? DEFAULT_PALETTE_PARTS.shapeFill) as PaletteColorSlot}
                    onChange={(slot) => {
                      sandbox.setPartSlotOverride(element.id, 'shapeFill', slot);
                      updateSetting('fill', sandbox.getColorForSlot(slot));
                    }}
                    slotColors={sandbox.state.sandboxColors}
                  />
                ) : (
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
                )}
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
          <StyleSettingsRenderer
            element={element}
            style={getElementStyle(element)}
            updateSetting={updateSetting}
          />
          
          {element.type === 'rect' && ((element as any).inheritStyle !== 'candy' && (element as any).inheritStyle !== 'zigzag' && (element as any).inheritStyle !== 'wobbly') && ( 
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