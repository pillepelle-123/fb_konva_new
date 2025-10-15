// Theme-specific default values for element settings
export const THEME_DEFAULTS = {
  rough: {
    strokeWidth: 2,
    stroke: '#1f2937',
    fill: 'transparent'
  },
  default: {
    strokeWidth: 1,
    stroke: '#000000',
    fill: 'transparent'
  },
  glow: {
    strokeWidth: 10,
    stroke: '#c5ca30',
    fill: 'transparent'
  },
  candy: {
    strokeWidth: 24,
    stroke: '#ec4899',
    fill: 'transparent'
  },
  zigzag: {
    strokeWidth: 10,
    stroke: '#966a05',
    fill: 'transparent'
  },
  wobbly: {
    strokeWidth: 20,
    stroke: '#7c3aed',
    fill: 'transparent'
  }
} as const;

export type ThemeType = keyof typeof THEME_DEFAULTS;

export function getThemeDefaults(theme: ThemeType) {
  return THEME_DEFAULTS[theme] || THEME_DEFAULTS.default;
}