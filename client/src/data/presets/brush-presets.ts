export interface BrushPreset {
  id: string;
  name: string;
  description: string;
  theme: string;
  settings: {
    strokeWidth: number;
    stroke: string;
    strokeOpacity?: number;
    inheritTheme: string;
  };
}

export const brushPresets: BrushPreset[] = [
  // DEFAULT THEME PRESETS
  {
    id: 'default-thin',
    name: 'Thin Line',
    description: 'Fine line for detailed work',
    theme: 'default',
    settings: {
      strokeWidth: 1,
      stroke: '#1f2937',
      strokeOpacity: 1,
      inheritTheme: 'default'
    }
  },
  {
    id: 'default-medium',
    name: 'Medium Brush',
    description: 'Standard brush for general use',
    theme: 'default',
    settings: {
      strokeWidth: 3,
      stroke: '#1f2937',
      strokeOpacity: 1,
      inheritTheme: 'default'
    }
  },
  {
    id: 'default-thick',
    name: 'Thick Marker',
    description: 'Bold strokes for emphasis',
    theme: 'default',
    settings: {
      strokeWidth: 6,
      stroke: '#1f2937',
      strokeOpacity: 1,
      inheritTheme: 'default'
    }
  },

  // SKETCHY THEME PRESETS
  {
    id: 'sketchy-pencil',
    name: 'Sketchy Pencil',
    description: 'Hand-drawn pencil effect',
    theme: 'sketchy',
    settings: {
      strokeWidth: 2,
      stroke: '#8b4513',
      strokeOpacity: 0.8,
      inheritTheme: 'rough'
    }
  },
  {
    id: 'sketchy-charcoal',
    name: 'Charcoal Brush',
    description: 'Rough charcoal texture',
    theme: 'sketchy',
    settings: {
      strokeWidth: 4,
      stroke: '#654321',
      strokeOpacity: 0.7,
      inheritTheme: 'rough'
    }
  },
  {
    id: 'sketchy-crayon',
    name: 'Crayon Style',
    description: 'Textured crayon strokes',
    theme: 'sketchy',
    settings: {
      strokeWidth: 6,
      stroke: '#8b4513',
      strokeOpacity: 0.9,
      inheritTheme: 'rough'
    }
  },

  // COLORFUL THEME PRESETS
  {
    id: 'colorful-neon',
    name: 'Neon Brush',
    description: 'Glowing neon effect',
    theme: 'colorful',
    settings: {
      strokeWidth: 4,
      stroke: '#ff1744',
      strokeOpacity: 1,
      inheritTheme: 'glow'
    }
  },
  {
    id: 'colorful-highlighter',
    name: 'Bright Highlighter',
    description: 'Vibrant highlighting brush',
    theme: 'colorful',
    settings: {
      strokeWidth: 8,
      stroke: '#ff6b35',
      strokeOpacity: 0.7,
      inheritTheme: 'glow'
    }
  },
  {
    id: 'colorful-marker',
    name: 'Color Marker',
    description: 'Bold colorful marker',
    theme: 'colorful',
    settings: {
      strokeWidth: 5,
      stroke: '#ff1744',
      strokeOpacity: 1,
      inheritTheme: 'glow'
    }
  },

  // MINIMAL THEME PRESETS
  {
    id: 'minimal-fine',
    name: 'Fine Line',
    description: 'Ultra-thin precise line',
    theme: 'minimal',
    settings: {
      strokeWidth: 0.5,
      stroke: '#6c757d',
      strokeOpacity: 1,
      inheritTheme: 'default'
    }
  },
  {
    id: 'minimal-clean',
    name: 'Clean Brush',
    description: 'Simple, clean strokes',
    theme: 'minimal',
    settings: {
      strokeWidth: 2,
      stroke: '#6c757d',
      strokeOpacity: 1,
      inheritTheme: 'default'
    }
  },

  // VINTAGE THEME PRESETS
  {
    id: 'vintage-ink',
    name: 'Vintage Ink',
    description: 'Classic ink pen effect',
    theme: 'vintage',
    settings: {
      strokeWidth: 2,
      stroke: '#654321',
      strokeOpacity: 1,
      inheritTheme: 'wobbly'
    }
  },
  {
    id: 'vintage-quill',
    name: 'Quill Pen',
    description: 'Old-fashioned quill writing',
    theme: 'vintage',
    settings: {
      strokeWidth: 3,
      stroke: '#8b4513',
      strokeOpacity: 0.9,
      inheritTheme: 'wobbly'
    }
  },

  // DARK THEME PRESETS
  {
    id: 'dark-laser',
    name: 'Laser Beam',
    description: 'Sharp digital line',
    theme: 'dark',
    settings: {
      strokeWidth: 2,
      stroke: '#ff00ff',
      strokeOpacity: 1,
      inheritTheme: 'zigzag'
    }
  },
  {
    id: 'dark-plasma',
    name: 'Plasma Trail',
    description: 'Glowing plasma effect',
    theme: 'dark',
    settings: {
      strokeWidth: 6,
      stroke: '#00ffff',
      strokeOpacity: 0.8,
      inheritTheme: 'zigzag'
    }
  },
  {
    id: 'dark-digital',
    name: 'Digital Brush',
    description: 'Pixelated digital strokes',
    theme: 'dark',
    settings: {
      strokeWidth: 4,
      stroke: '#ffff00',
      strokeOpacity: 1,
      inheritTheme: 'candy'
    }
  }
];

export function getBrushPresetsByTheme(theme: string): BrushPreset[] {
  return brushPresets.filter(preset => preset.theme === theme);
}

export function getBrushPresetById(id: string): BrushPreset | undefined {
  return brushPresets.find(preset => preset.id === id);
}