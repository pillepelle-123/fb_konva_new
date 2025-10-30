import type { ShapeStyle } from '../../types/template-types';

export interface ShapePreset {
  id: string;
  name: string;
  description: string;
  theme: string;
  shapeType: string;
  style: ShapeStyle;
}

export const shapePresets: ShapePreset[] = [
  // DEFAULT THEME PRESETS
  {
    id: 'default-circle',
    name: 'Simple Circle',
    description: 'Clean circle with basic styling',
    theme: 'default',
    shapeType: 'circle',
    style: {
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent',
      inheritTheme: 'default'
    }
  },
  {
    id: 'default-rect',
    name: 'Simple Rectangle',
    description: 'Clean rectangle with rounded corners',
    theme: 'default',
    shapeType: 'rect',
    style: {
      strokeWidth: 2,
      cornerRadius: 8,
      stroke: '#1f2937',
      fill: 'transparent',
      inheritTheme: 'default'
    }
  },
  {
    id: 'default-star',
    name: 'Simple Star',
    description: 'Clean star shape',
    theme: 'default',
    shapeType: 'star',
    style: {
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent',
      inheritTheme: 'default'
    }
  },

  // SKETCHY THEME PRESETS
  {
    id: 'sketchy-circle',
    name: 'Hand-drawn Circle',
    description: 'Rough, sketchy circle',
    theme: 'sketchy',
    shapeType: 'circle',
    style: {
      strokeWidth: 3,
      stroke: '#8b4513',
      fill: '#f5deb3',
      inheritTheme: 'rough',
      backgroundEnabled: true
    }
  },
  {
    id: 'sketchy-heart',
    name: 'Sketchy Heart',
    description: 'Hand-drawn heart shape',
    theme: 'sketchy',
    shapeType: 'heart',
    style: {
      strokeWidth: 3,
      stroke: '#8b4513',
      fill: '#f5deb3',
      inheritTheme: 'rough',
      backgroundEnabled: true
    }
  },
  {
    id: 'sketchy-dog',
    name: 'Doodle Dog',
    description: 'Playful dog doodle',
    theme: 'sketchy',
    shapeType: 'dog',
    style: {
      strokeWidth: 3,
      stroke: '#8b4513',
      fill: '#f5deb3',
      inheritTheme: 'rough'
    }
  },

  // COLORFUL THEME PRESETS
  {
    id: 'colorful-star',
    name: 'Glowing Star',
    description: 'Bright star with glow effect',
    theme: 'colorful',
    shapeType: 'star',
    style: {
      strokeWidth: 4,
      stroke: '#ff1744',
      fill: '#fff3e0',
      cornerRadius: 12,
      inheritTheme: 'glow',
      backgroundEnabled: true
    }
  },
  {
    id: 'colorful-heart',
    name: 'Vibrant Heart',
    description: 'Colorful heart with glow',
    theme: 'colorful',
    shapeType: 'heart',
    style: {
      strokeWidth: 3,
      stroke: '#ff1744',
      fill: '#fff3e0',
      cornerRadius: 12,
      inheritTheme: 'glow'
    }
  },
  {
    id: 'colorful-smiley',
    name: 'Happy Face',
    description: 'Bright smiley face',
    theme: 'colorful',
    shapeType: 'smiley',
    style: {
      strokeWidth: 3,
      stroke: '#ff1744',
      fill: '#fff3e0',
      inheritTheme: 'glow'
    }
  },

  // MINIMAL THEME PRESETS
  {
    id: 'minimal-rect',
    name: 'Clean Rectangle',
    description: 'Minimal rectangular shape',
    theme: 'minimal',
    shapeType: 'rect',
    style: {
      strokeWidth: 1,
      stroke: '#6c757d',
      fill: 'transparent',
      cornerRadius: 0,
      inheritTheme: 'default'
    }
  },
  {
    id: 'minimal-circle',
    name: 'Clean Circle',
    description: 'Simple circle outline',
    theme: 'minimal',
    shapeType: 'circle',
    style: {
      strokeWidth: 1,
      stroke: '#6c757d',
      fill: 'transparent',
      inheritTheme: 'default'
    }
  },

  // VINTAGE THEME PRESETS
  {
    id: 'vintage-rect',
    name: 'Vintage Frame',
    description: 'Aged rectangular frame',
    theme: 'vintage',
    shapeType: 'rect',
    style: {
      strokeWidth: 2,
      stroke: '#654321',
      fill: '#f5deb3',
      cornerRadius: 4,
      inheritTheme: 'wobbly',
      backgroundEnabled: true
    }
  },
  {
    id: 'vintage-circle',
    name: 'Antique Circle',
    description: 'Vintage circular decoration',
    theme: 'vintage',
    shapeType: 'circle',
    style: {
      strokeWidth: 2,
      stroke: '#654321',
      fill: '#f5deb3',
      inheritTheme: 'wobbly',
      backgroundEnabled: true
    }
  },

  // DARK THEME PRESETS
  {
    id: 'dark-circle',
    name: 'Neon Circle',
    description: 'Glowing neon circle',
    theme: 'dark',
    shapeType: 'circle',
    style: {
      strokeWidth: 10,
      stroke: '#ff00ff',
      fill: '#1a1a1a',
      opacity: 0.1,
      cornerRadius: 20,
      inheritTheme: 'zigzag',
      backgroundEnabled: true
    }
  },
  {
    id: 'dark-star',
    name: 'Cyber Star',
    description: 'Futuristic star shape',
    theme: 'dark',
    shapeType: 'star',
    style: {
      strokeWidth: 8,
      stroke: '#ffff00',
      fill: 'transparent',
      inheritTheme: 'zigzag'
    }
  },
  {
    id: 'dark-triangle',
    name: 'Digital Triangle',
    description: 'Sharp digital triangle',
    theme: 'dark',
    shapeType: 'triangle',
    style: {
      strokeWidth: 6,
      stroke: '#00ffff',
      fill: 'transparent',
      inheritTheme: 'zigzag'
    }
  }
];

export function getShapePresetsByTheme(theme: string): ShapePreset[] {
  return shapePresets.filter(preset => preset.theme === theme);
}

export function getShapePresetById(id: string): ShapePreset | undefined {
  return shapePresets.find(preset => preset.id === id);
}

export function getShapePresetsByType(shapeType: string): ShapePreset[] {
  return shapePresets.filter(preset => preset.shapeType === shapeType);
}