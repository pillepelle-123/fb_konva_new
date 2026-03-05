import React from 'react';
import { Button } from '../../../ui/primitives/button';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Slider } from '../../../ui/primitives/slider';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Label } from '../../../ui/primitives/label';
import { Separator } from '../../../ui/primitives/separator';
import { getStyleSettings, getStyleSettingValue, type StyleSetting } from '../../../../utils/style-settings';
import type { CanvasElement } from '../../../../context/editor-context';

interface StyleSettingsRendererProps {
  element: CanvasElement;
  style: string;
  updateSetting: (key: string, value: any) => void;
}

export function StyleSettingsRenderer({ element, style, updateSetting }: StyleSettingsRendererProps) {
  const settings = getStyleSettings(style);
  
  if (settings.length === 0) {
    return null;
  }
  
  return (
    <>
      <Separator />
      {settings.map((setting) => {
        if (setting.dependsOn) {
          const dependsOnValue = getStyleSettingValue(element, setting.dependsOn);
          if (!dependsOnValue) {
            return null;
          }
        }
        
        return <StyleSettingControl key={setting.key} setting={setting} element={element} updateSetting={updateSetting} />;
      })}
    </>
  );
}

interface StyleSettingControlProps {
  setting: StyleSetting;
  element: CanvasElement;
  updateSetting: (key: string, value: any) => void;
}

function StyleSettingControl({ setting, element, updateSetting }: StyleSettingControlProps) {
  const currentValue = getStyleSettingValue(element, setting.key) ?? setting.defaultValue;
  
  switch (setting.type) {
    case 'checkbox': {
      return (
        <div className="flex items-center gap-2 h-12">
          <Label className="flex items-center gap-1" variant="xs">
            <Checkbox
              checked={currentValue || false}
              onCheckedChange={(checked) => updateSetting(setting.key, checked === true)}
            />
            {setting.label}
          </Label>
        </div>
      );
    }
    
    case 'select': {
      if (!setting.options) return null;
      
      return (
        <div className="w-full min-w-0">
          <Label variant="xs">{setting.label}</Label>
          <ButtonGroup className="mt-1 flex w-full flex-row">
            {setting.options.map((option) => (
              <Button
                key={option.value}
                variant={currentValue === option.value ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateSetting(setting.key, option.value)}
                className="flex-1"
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      );
    }
    
    case 'slider': {
      return (
        <div>
          <Slider
            label={setting.label}
            value={currentValue ?? setting.defaultValue ?? 0}
            onChange={(value) => updateSetting(setting.key, value)}
            min={setting.min ?? 0}
            max={setting.max ?? 100}
            step={setting.step ?? 1}
          />
        </div>
      );
    }
    
    case 'color': {
      return null;
    }
    
    default:
      return null;
  }
}
