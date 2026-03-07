import type { CanvasElement } from '../context/editor-context';

export interface StyleSetting {
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

export interface StyleSettingsConfig {
  [style: string]: StyleSetting[];
}

export const STYLE_SETTINGS: StyleSettingsConfig = {
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
  freehand: [
    {
      key: 'freehandSimplification',
      type: 'slider',
      label: 'Smoothness',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05
    },
    {
      key: 'freehandTaperStart',
      type: 'slider',
      label: 'Taper Start',
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.1
    },
    {
      key: 'freehandTaperEnd',
      type: 'slider',
      label: 'Taper End',
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.1
    },
    {
      key: 'freehandPressure',
      type: 'checkbox',
      label: 'Simulate Pressure',
      defaultValue: true
    },
    {
      key: 'freehandSeed',
      type: 'slider',
      label: 'Randomness Seed',
      defaultValue: undefined,
      min: 0,
      max: 99999,
      step: 1
    }
  ],
  'paint-brush': [
    {
      key: 'paintBrushWobbly',
      type: 'checkbox',
      label: 'Wobbly Edges (Hand-drawn)',
      defaultValue: false
    }
  ]
};

/**
 * Gets all style-specific settings for a given style.
 */
export function getStyleSettings(style: string): StyleSetting[] {
  return STYLE_SETTINGS[style] || [];
}

/**
 * Gets the value of a style-specific setting from an element.
 */
export function getStyleSettingValue(element: CanvasElement, settingKey: string): any {
  return (element as any)[settingKey];
}

/**
 * Creates an update object for a style-specific setting.
 */
export function updateStyleSetting(element: CanvasElement, settingKey: string, value: any): Partial<CanvasElement> {
  return {
    [settingKey]: value
  } as Partial<CanvasElement>;
}
