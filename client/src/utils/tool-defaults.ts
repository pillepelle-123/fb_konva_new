// Centralized default values for all drawing tools
import { getGlobalThemeDefaults } from './global-themes';
export const TOOL_DEFAULTS = {
  line: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937'
  },
  brush: {
    theme: 'default',
    strokeWidth: 3, // Common scale value
    stroke: '#1f2937'
  },
  rect: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent',
    cornerRadius: 0
  },
  circle: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  heart: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  star: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  'speech-bubble': {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  dog: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  cat: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  smiley: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  text: {
    fontSize: 58, // Common size 14
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#1f2937',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1, // Common scale value
    cornerRadius: 0,
    borderWidth: 0, // Common scale value
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4
  },
  question: {
    fontSize: 58, // Common size 14
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#1f2937',
    align: 'left',
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4
  },
  answer: {
    fontSize: 58, // Common size 14
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#1f2937',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1, // Common scale value
    cornerRadius: 0,
    borderWidth: 0, // Common scale value
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4
  }
} as const;

export type ToolType = keyof typeof TOOL_DEFAULTS;

export function getToolDefaults(tool: ToolType, globalTheme?: string) {
  const baseDefaults = TOOL_DEFAULTS[tool] || {};
  const themeDefaults = globalTheme ? getGlobalThemeDefaults(globalTheme, tool) : {};
  return { ...baseDefaults, ...themeDefaults };
}