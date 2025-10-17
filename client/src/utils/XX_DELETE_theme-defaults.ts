// Theme-specific default values for element settings
export const THEME_DEFAULTS = {
  rough: {
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  default: {
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  glow: {
    strokeWidth: 20, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  candy: {
    strokeWidth: 10, // Common scale value
    stroke: '#ff0000',
    fill: 'transparent'
  },
  zigzag: {
    strokeWidth: 40, // Common scale value
    stroke: '#bf4d28',
    fill: 'transparent'
  },
  wobbly: {
    strokeWidth: 3, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  }
} as const;

export type ThemeType = keyof typeof THEME_DEFAULTS;

export function getThemeDefaults(theme: ThemeType) {
  return THEME_DEFAULTS[theme] || THEME_DEFAULTS.default;
}