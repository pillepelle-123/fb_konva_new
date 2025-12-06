import type { CanvasElement } from '../context/editor-context';

export interface ThemeSetting {
  key: string;
  type: 'checkbox' | 'select' | 'slider' | 'color';
  label: string;
  defaultValue?: any;
  options?: { value: any; label: string }[]; // For select
  min?: number; // For slider
  max?: number; // For slider
  step?: number; // For slider
  dependsOn?: string; // Key of another setting that must be true/enabled for this to show
}

export interface ThemeSettingsConfig {
  [theme: string]: ThemeSetting[];
}

export const THEME_SETTINGS: ThemeSettingsConfig = {
  candy: [
    {
      key: 'candyRandomness',
      type: 'checkbox',
      label: 'Randomness',
      defaultValue: false
    },
    {
      key: 'candyIntensity',
      type: 'select',
      label: 'Intensity',
      defaultValue: 'weak',
      options: [
        { value: 'weak', label: 'weak' },
        { value: 'middle', label: 'middle' },
        { value: 'strong', label: 'strong' }
      ],
      dependsOn: 'candyRandomness' // Nur anzeigen wenn candyRandomness true
    },
    {
      key: 'candyHoled',
      type: 'checkbox',
      label: 'Holed Circles',
      defaultValue: false
    }
  ],
  // Weitere Themes können hier hinzugefügt werden
};

/**
 * Gets all theme-specific settings for a given theme.
 */
export function getThemeSettings(theme: string): ThemeSetting[] {
  return THEME_SETTINGS[theme] || [];
}

/**
 * Gets the value of a theme-specific setting from an element.
 */
export function getThemeSettingValue(element: CanvasElement, settingKey: string): any {
  return (element as any)[settingKey];
}

/**
 * Creates an update object for a theme-specific setting.
 */
export function updateThemeSetting(element: CanvasElement, settingKey: string, value: any): Partial<CanvasElement> {
  return {
    [settingKey]: value
  } as Partial<CanvasElement>;
}

