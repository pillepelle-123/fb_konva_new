import type { TextboxStyle } from '../../types/template-types';

export interface TextboxPreset {
  id: string;
  name: string;
  description: string;
  theme: string;
  style: TextboxStyle;
}

export const textboxPresets: TextboxPreset[] = [
  // DEFAULT THEME PRESETS
  {
    id: 'default-clean',
    name: 'Clean & Simple',
    description: 'Minimal styling with clean lines',
    theme: 'default',
    style: {
      font: { fontSize: 12, fontFamily: 'Century Gothic, sans-serif', fontColor: '#1f2937' },
      border: { enabled: false },
      format: { textAlign: 'left', padding: 12 },
      background: { enabled: false },
      cornerRadius: 30
    }
  },
  {
    id: 'default-bordered',
    name: 'Subtle Border',
    description: 'Clean with light border',
    theme: 'default',
    style: {
      font: { fontSize: 14, fontFamily: 'Century Gothic, sans-serif', fontColor: '#1f2937' },
      border: { enabled: true, borderWidth: 1, borderColor: '#e5e7eb' },
      format: { textAlign: 'left', padding: 15 },
      background: { enabled: true, backgroundColor: '#f9fafb', backgroundOpacity: 0.5 },
      cornerRadius: 8
    }
  },

  // SKETCHY THEME PRESETS
  {
    id: 'sketchy-handdrawn',
    name: 'Hand-drawn Style',
    description: 'Wobbly borders with comic font',
    theme: 'sketchy',
    style: {
      font: { fontSize: 18, fontFamily: 'Comic Sans MS, cursive', fontColor: '#654321' },
      border: { enabled: true, borderWidth: 2, borderColor: '#8b4513', borderTheme: 'wobbly' },
      format: { textAlign: 'left', padding: 15 },
      background: { enabled: true, backgroundColor: '#f5deb3', backgroundOpacity: 0.4 },
      cornerRadius: 18
    }
  },

  // COLORFUL THEME PRESETS
  {
    id: 'colorful-vibrant',
    name: 'Vibrant Glow',
    description: 'Bright colors with glow effect',
    theme: 'colorful',
    style: {
      font: { fontSize: 18, fontFamily: "'Knewave', cursive", fontBold: true, fontColor: '#ff6b35' },
      border: { enabled: true, borderWidth: 3, borderColor: '#ff1744', borderTheme: 'glow' },
      format: { textAlign: 'left', padding: 16 },
      background: { enabled: true, backgroundColor: '#fff3e0', backgroundOpacity: 0.7 },
      cornerRadius: 12
    }
  },

  // MINIMAL THEME PRESETS
  {
    id: 'minimal-clean',
    name: 'Ultra Clean',
    description: 'Minimal with no decorations',
    theme: 'minimal',
    style: {
      font: { fontSize: 16, fontFamily: 'Helvetica, Arial, sans-serif', fontColor: '#6c757d' },
      border: { enabled: false },
      format: { textAlign: 'left', padding: 10 },
      background: { enabled: false },
      cornerRadius: 0
    }
  },

  // VINTAGE THEME PRESETS
  {
    id: 'vintage-elegant',
    name: 'Vintage Elegance',
    description: 'Classic serif with aged styling',
    theme: 'vintage',
    style: {
      font: { fontSize: 17, fontFamily: "'Times New Roman', serif", fontItalic: true, fontColor: '#8b4513' },
      border: { enabled: true, borderWidth: 1, borderColor: '#654321', borderTheme: 'wobbly' },
      format: { textAlign: 'left', padding: 14 },
      background: { enabled: true, backgroundColor: '#f5deb3', backgroundOpacity: 0.5 },
      ruledLines: { enabled: true, lineWidth: 1, lineColor: '#8b4513', lineOpacity: 0.6, ruledLinesTheme: 'wobbly' },
      cornerRadius: 14
    }
  },

  // DARK THEME PRESETS
  {
    id: 'dark-neon',
    name: 'Neon Glow',
    description: 'Cyberpunk style with neon effects',
    theme: 'dark',
    style: {
      font: { fontSize: 28, fontFamily: 'Audiowide, non-serif', fontColor: '#00ffff', fontOpacity: 0.5 },
      border: { enabled: true, borderWidth: 1, borderColor: '#ff00ff', borderTheme: 'glow' },
      format: { textAlign: 'left', padding: 14 },
      background: { enabled: false },
      ruledLines: { enabled: true, lineWidth: 4, lineColor: 'yellow', lineOpacity: 0.5, ruledLinesTheme: 'candy' },
      cornerRadius: 20
    }
  }
];

export function getTextboxPresetsByTheme(theme: string): TextboxPreset[] {
  return textboxPresets.filter(preset => preset.theme === theme);
}

export function getTextboxPresetById(id: string): TextboxPreset | undefined {
  return textboxPresets.find(preset => preset.id === id);
}