import React from 'react';
import { Button } from '../../../ui/primitives/button';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Slider } from '../../../ui/primitives/slider';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Label } from '../../../ui/primitives/label';
import { Separator } from '../../../ui/primitives/separator';
import { getThemeSettings, getThemeSettingValue, type ThemeSetting } from '../../../../utils/theme-settings';
import type { CanvasElement } from '../../../../context/editor-context';

interface ThemeSettingsRendererProps {
  element: CanvasElement;
  theme: string;
  updateSetting: (key: string, value: any) => void;
}

export function ThemeSettingsRenderer({ element, theme, updateSetting }: ThemeSettingsRendererProps) {
  const settings = getThemeSettings(theme);
  
  if (settings.length === 0) {
    return null;
  }
  
  return (
    <>
      <Separator />
      {settings.map((setting) => {
        // Check if this setting depends on another setting
        if (setting.dependsOn) {
          const dependsOnValue = getThemeSettingValue(element, setting.dependsOn);
          if (!dependsOnValue) {
            return null;
          }
        }
        
        return <ThemeSettingControl key={setting.key} setting={setting} element={element} updateSetting={updateSetting} />;
      })}
    </>
  );
}

interface ThemeSettingControlProps {
  setting: ThemeSetting;
  element: CanvasElement;
  updateSetting: (key: string, value: any) => void;
}

function ThemeSettingControl({ setting, element, updateSetting }: ThemeSettingControlProps) {
  const currentValue = getThemeSettingValue(element, setting.key) ?? setting.defaultValue;
  
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
        <div>
          <Label variant="xs">{setting.label}</Label>
          <ButtonGroup className="mt-1">
            {setting.options.map((option) => (
              <Button
                key={option.value}
                variant={currentValue === option.value ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateSetting(setting.key, option.value)}
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
      // Color selector would need to be handled differently
      // For now, return null - can be extended later
      return null;
    }
    
    default:
      return null;
  }
}

