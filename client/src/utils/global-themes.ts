import type { CanvasElement } from '../context/editor-context';
import { getPalette } from './global-palettes';

export interface GlobalTheme {
  id: string;
  name: string;
  description: string;
  elementDefaults: {
    text: Partial<CanvasElement>;
    question: Partial<CanvasElement>;
    answer: Partial<CanvasElement>;
    image: Partial<CanvasElement>;
    shape: Partial<CanvasElement>;
    brush: Partial<CanvasElement>;
    line: Partial<CanvasElement>;
  };
}

export const GLOBAL_THEMES: GlobalTheme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and simple',
    elementDefaults: {
      text: {
        theme: 'default', stroke: getPalette('default-palette')?.colors.primary || '#16697a', fill: getPalette('default-palette')?.colors.primary || '#16697a', strokeWidth: 1, // Common scale
        fontSize: 16, fontFamily: 'Arial, sans-serif', align: 'left',
        lineHeight: 1.2, paragraphSpacing: 'medium', roughness: 0,
        borderWidth: 0, borderColor: getPalette('default-palette')?.colors.secondary || '#489fb5', backgroundColor: getPalette('default-palette')?.colors.background || '#ede7e3',
        backgroundOpacity: 0.3, padding: 8, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'default', stroke: getPalette('default-palette')?.colors.primary || '#16697a', fill: getPalette('default-palette')?.colors.primary || '#16697a', strokeWidth: 2, // Common scale
        fontSize: 18, fontFamily: 'Arial, sans-serif', align: 'left',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 0,
        borderWidth: 1, borderColor: getPalette('default-palette')?.colors.secondary || '#489fb5', backgroundColor: getPalette('default-palette')?.colors.surface || '#ffa62b',
        backgroundOpacity: 0.4, padding: 12, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'default', stroke: getPalette('default-palette')?.colors.accent || '#82c0cc', fill: getPalette('default-palette')?.colors.accent || '#82c0cc', strokeWidth: 1, // Common scale
        fontSize: 16, fontFamily: 'Arial, sans-serif', align: 'left',
        lineHeight: 1.2, paragraphSpacing: 'medium', roughness: 0,
        borderWidth: 1, borderColor: getPalette('default-palette')?.colors.secondary || '#489fb5', backgroundColor: getPalette('default-palette')?.colors.background || '#ede7e3',
        backgroundOpacity: 0.3, padding: 10, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'default', stroke: getPalette('default-palette')?.colors.primary || '#16697a', strokeWidth: 1, roughness: 0,
        borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent',
        backgroundOpacity: 1, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'default', stroke: getPalette('default-palette')?.colors.primary || '#16697a', fill: getPalette('default-palette')?.colors.surface || '#ffa62b', strokeWidth: 2,
        roughness: 0, borderWidth: 0, borderColor: 'transparent',
        backgroundColor: 'transparent', backgroundOpacity: 0.6, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'default', stroke: getPalette('default-palette')?.colors.primary || '#16697a', strokeWidth: 2, roughness: 0,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'default', stroke: getPalette('default-palette')?.colors.primary || '#16697a', strokeWidth: 2, roughness: 0,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'rough',
    name: 'Rough',
    description: 'Hand-drawn sketchy style',
    elementDefaults: {
      text: {
        theme: 'rough', stroke: getPalette('rough-palette')?.colors.background || '#003554', fill: getPalette('rough-palette')?.colors.background || '#003554', strokeWidth: 2,
        fontSize: 16, fontFamily: 'Arial, sans-serif', align: 'left',
        lineHeight: 1.2, paragraphSpacing: 'medium', roughness: 1.5,
        borderWidth: 0, borderColor: getPalette('rough-palette')?.colors.surface || '#051923', backgroundColor: 'transparent',
        backgroundOpacity: 1, padding: 8, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'rough', stroke: getPalette('rough-palette')?.colors.background || '#003554', fill: getPalette('rough-palette')?.colors.background || '#003554', strokeWidth: 3,
        fontSize: 18, fontFamily: 'Arial, sans-serif', align: 'left',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 1.5,
        borderWidth: 2, borderColor: getPalette('rough-palette')?.colors.surface || '#051923', backgroundColor: 'transparent',
        backgroundOpacity: 1, padding: 12, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'rough', stroke: getPalette('rough-palette')?.colors.background || '#003554', fill: getPalette('rough-palette')?.colors.background || '#003554', strokeWidth: 2,
        fontSize: 16, fontFamily: 'Arial, sans-serif', align: 'left',
        lineHeight: 1.2, paragraphSpacing: 'medium', roughness: 1.5,
        borderWidth: 1, borderColor: getPalette('rough-palette')?.colors.surface || '#051923', backgroundColor: 'transparent',
        backgroundOpacity: 1, padding: 10, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'rough', stroke: getPalette('rough-palette')?.colors.surface || '#051923', strokeWidth: 2, roughness: 1.5,
        borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent',
        backgroundOpacity: 1, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'rough', stroke: getPalette('rough-palette')?.colors.surface || '#051923', fill: 'transparent', strokeWidth: 2,
        roughness: 1.5, borderWidth: 0, borderColor: 'transparent',
        backgroundColor: 'transparent', backgroundOpacity: 1, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'rough', stroke: getPalette('rough-palette')?.colors.surface || '#051923', strokeWidth: 3, roughness: 1.5,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'rough', stroke: getPalette('rough-palette')?.colors.surface || '#051923', strokeWidth: 2, roughness: 1.5,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },  
  {
    id: 'glow',
    name: 'Glow',
    description: 'Soft glowing effects',
    elementDefaults: {
      text: {
        theme: 'glow', stroke: '#c5ca30', fill: '#3b82f6', strokeWidth: 2,
        fontSize: 18, fontFamily: 'Arial, sans-serif', align: 'center',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 0.5,
        borderWidth: 2, borderColor: '#93c5fd', backgroundColor: '#eff6ff',
        backgroundOpacity: 0.8, padding: 12, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'glow', stroke: '#dc2626', fill: '#dc2626', strokeWidth: 3,
        fontSize: 20, fontFamily: 'Arial, sans-serif', align: 'center',
        lineHeight: 1.4, paragraphSpacing: 'medium', roughness: 0.5,
        borderWidth: 3, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 0.9, padding: 16, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'glow', stroke: '#059669', fill: '#059669', strokeWidth: 2,
        fontSize: 17, fontFamily: 'Arial, sans-serif', align: 'center',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 0.5,
        borderWidth: 2, borderColor: '#34d399', backgroundColor: '#ecfdf5',
        backgroundOpacity: 0.8, padding: 14, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'glow', stroke: '#3b82f6', strokeWidth: 2, roughness: 0.5,
        borderWidth: 2, borderColor: '#93c5fd', backgroundColor: '#eff6ff',
        backgroundOpacity: 0.8, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'glow', stroke: '#c5ca30', fill: '#dbeafe', strokeWidth: 3,
        roughness: 0.5, borderWidth: 2, borderColor: '#93c5fd',
        backgroundColor: '#eff6ff', backgroundOpacity: 0.8, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'glow', stroke: '#c5ca30', strokeWidth: 4, roughness: 0.5,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'glow', stroke: '#c5ca30', strokeWidth: 3, roughness: 0.5,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'candy',
    name: 'Candy',
    description: 'Colorful dotted style',
    elementDefaults: {
      text: {
        theme: 'candy', stroke: '#ec4899', fill: '#ec4899', strokeWidth: 3,
        fontSize: 20, fontFamily: 'Comic Sans MS, cursive', align: 'center',
        lineHeight: 1.4, paragraphSpacing: 'large', roughness: 2,
        borderWidth: 3, borderColor: '#f9a8d4', backgroundColor: '#fdf2f8',
        backgroundOpacity: 0.9, padding: 16, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'candy', stroke: '#dc2626', fill: '#dc2626', strokeWidth: 4,
        fontSize: 22, fontFamily: 'Comic Sans MS, cursive', align: 'center',
        lineHeight: 1.5, paragraphSpacing: 'large', roughness: 2,
        borderWidth: 4, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 0.95, padding: 20, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'candy', stroke: '#059669', fill: '#059669', strokeWidth: 3,
        fontSize: 18, fontFamily: 'Comic Sans MS, cursive', align: 'center',
        lineHeight: 1.4, paragraphSpacing: 'large', roughness: 2,
        borderWidth: 3, borderColor: '#34d399', backgroundColor: '#ecfdf5',
        backgroundOpacity: 0.9, padding: 16, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'candy', stroke: '#ec4899', strokeWidth: 3, roughness: 2,
        borderWidth: 3, borderColor: '#f9a8d4', backgroundColor: '#fdf2f8',
        backgroundOpacity: 0.9, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'candy', stroke: '#ec4899', fill: '#fce7f3', strokeWidth: 4,
        roughness: 2, borderWidth: 3, borderColor: '#f9a8d4',
        backgroundColor: '#fdf2f8', backgroundOpacity: 0.9, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'candy', stroke: '#ec4899', strokeWidth: 5, roughness: 2,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'candy', stroke: '#ec4899', strokeWidth: 4, roughness: 2,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'zigzag',
    name: 'Zigzag',
    description: 'Jagged zigzag lines',
    elementDefaults: {
      text: {
        theme: 'zigzag', stroke: '#dc2626', fill: '#dc2626', strokeWidth: 2,
        fontSize: 18, fontFamily: 'Impact, sans-serif', align: 'left',
        lineHeight: 1.1, paragraphSpacing: 'small', roughness: 3,
        borderWidth: 4, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 0.7, padding: 10, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'zigzag', stroke: '#b91c1c', fill: '#b91c1c', strokeWidth: 3,
        fontSize: 20, fontFamily: 'Impact, sans-serif', align: 'left',
        lineHeight: 1.1, paragraphSpacing: 'small', roughness: 3,
        borderWidth: 5, borderColor: '#dc2626', backgroundColor: '#fee2e2',
        backgroundOpacity: 0.8, padding: 12, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'zigzag', stroke: '#166534', fill: '#166534', strokeWidth: 2,
        fontSize: 16, fontFamily: 'Impact, sans-serif', align: 'left',
        lineHeight: 1.1, paragraphSpacing: 'small', roughness: 3,
        borderWidth: 3, borderColor: '#22c55e', backgroundColor: '#f0fdf4',
        backgroundOpacity: 0.7, padding: 8, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'zigzag', stroke: '#dc2626', strokeWidth: 2, roughness: 3,
        borderWidth: 4, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 0.7, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'zigzag', stroke: '#dc2626', fill: '#fee2e2', strokeWidth: 3,
        roughness: 3, borderWidth: 4, borderColor: '#f87171',
        backgroundColor: '#fef2f2', backgroundOpacity: 0.7, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'zigzag', stroke: '#dc2626', strokeWidth: 6, roughness: 3,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'zigzag', stroke: '#dc2626', strokeWidth: 4, roughness: 3,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'wobbly',
    name: 'Wobbly',
    description: 'Wavy hand-drawn lines',
    elementDefaults: {
      text: {
        theme: 'wobbly', stroke: '#059669', fill: '#059669', strokeWidth: 3,
        fontSize: 17, fontFamily: 'Trebuchet MS, sans-serif', align: 'left',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 2.5,
        borderWidth: 5, borderColor: '#34d399', backgroundColor: '#ecfdf5',
        backgroundOpacity: 0.8, padding: 14, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'wobbly', stroke: '#dc2626', fill: '#dc2626', strokeWidth: 4,
        fontSize: 19, fontFamily: 'Trebuchet MS, sans-serif', align: 'left',
        lineHeight: 1.4, paragraphSpacing: 'medium', roughness: 2.5,
        borderWidth: 6, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 0.9, padding: 16, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'wobbly', stroke: '#047857', fill: '#047857', strokeWidth: 3,
        fontSize: 16, fontFamily: 'Trebuchet MS, sans-serif', align: 'left',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 2.5,
        borderWidth: 4, borderColor: '#10b981', backgroundColor: '#d1fae5',
        backgroundOpacity: 0.8, padding: 12, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'wobbly', stroke: '#059669', strokeWidth: 5, roughness: 2.5,
        borderWidth: 5, borderColor: '#34d399', backgroundColor: '#ecfdf5',
        backgroundOpacity: 0.8, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'wobbly', stroke: '#059669', fill: '#d1fae5', strokeWidth: 6,
        roughness: 2.5, borderWidth: 5, borderColor: '#34d399',
        backgroundColor: '#ecfdf5', backgroundOpacity: 0.8, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'wobbly', stroke: '#059669', strokeWidth: 8, roughness: 2.5,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'wobbly', stroke: '#059669', strokeWidth: 4, roughness: 2.5,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'sketchy',
    name: 'Sketchy',
    description: 'High roughness hand-drawn style',
    elementDefaults: {
      text: {
        theme: 'rough', stroke: '#4a5568', fill: '#4a5568', strokeWidth: 2,
        fontSize: 15, fontFamily: 'Courier New, monospace', align: 'left',
        lineHeight: 1.2, paragraphSpacing: 'small', roughness: 3.5,
        borderWidth: 1, borderColor: '#718096', backgroundColor: '#f7fafc',
        backgroundOpacity: 0.6, padding: 6, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'rough', stroke: '#dc2626', fill: '#dc2626', strokeWidth: 3,
        fontSize: 17, fontFamily: 'Courier New, monospace', align: 'left',
        lineHeight: 1.3, paragraphSpacing: 'small', roughness: 3.5,
        borderWidth: 2, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 0.7, padding: 8, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'rough', stroke: '#059669', fill: '#059669', strokeWidth: 2,
        fontSize: 14, fontFamily: 'Courier New, monospace', align: 'left',
        lineHeight: 1.2, paragraphSpacing: 'small', roughness: 3.5,
        borderWidth: 1, borderColor: '#34d399', backgroundColor: '#ecfdf5',
        backgroundOpacity: 0.6, padding: 6, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'rough', stroke: '#4a5568', strokeWidth: 2, roughness: 3.5,
        borderWidth: 1, borderColor: '#718096', backgroundColor: '#f7fafc',
        backgroundOpacity: 0.6, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'rough', stroke: '#4a5568', fill: '#edf2f7', strokeWidth: 3,
        roughness: 3.5, borderWidth: 1, borderColor: '#718096',
        backgroundColor: '#f7fafc', backgroundOpacity: 0.6, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'rough', stroke: '#4a5568', strokeWidth: 4, roughness: 3.5,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'rough', stroke: '#4a5568', strokeWidth: 3, roughness: 3.5,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean corporate styling',
    elementDefaults: {
      text: {
        theme: 'default', stroke: '#1a202c', fill: '#1a202c', strokeWidth: 1,
        fontSize: 14, fontFamily: 'Helvetica, Arial, sans-serif', align: 'left',
        lineHeight: 1.4, paragraphSpacing: 'medium', roughness: 0,
        borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
        backgroundOpacity: 1, padding: 12, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'default', stroke: '#dc2626', fill: '#dc2626', strokeWidth: 2,
        fontSize: 16, fontFamily: 'Helvetica, Arial, sans-serif', align: 'left',
        lineHeight: 1.5, paragraphSpacing: 'medium', roughness: 0,
        borderWidth: 2, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 1, padding: 16, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'default', stroke: '#059669', fill: '#059669', strokeWidth: 1,
        fontSize: 14, fontFamily: 'Helvetica, Arial, sans-serif', align: 'left',
        lineHeight: 1.4, paragraphSpacing: 'medium', roughness: 0,
        borderWidth: 1, borderColor: '#34d399', backgroundColor: '#ecfdf5',
        backgroundOpacity: 1, padding: 12, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'default', stroke: '#2d3748', strokeWidth: 1, roughness: 0,
        borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
        backgroundOpacity: 1, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'default', stroke: '#2d3748', fill: '#f8fafc', strokeWidth: 1,
        roughness: 0, borderWidth: 1, borderColor: '#e2e8f0',
        backgroundColor: '#ffffff', backgroundOpacity: 1, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'default', stroke: '#2d3748', strokeWidth: 2, roughness: 0,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'default', stroke: '#2d3748', strokeWidth: 1, roughness: 0,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Bright colors and fun styling',
    elementDefaults: {
      text: {
        theme: 'glow', stroke: '#f56565', fill: '#f56565', strokeWidth: 2,
        fontSize: 19, fontFamily: 'Verdana, sans-serif', align: 'center',
        lineHeight: 1.5, paragraphSpacing: 'large', roughness: 1,
        borderWidth: 3, borderColor: '#feb2b2', backgroundColor: '#fed7d7',
        backgroundOpacity: 0.9, padding: 15, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'glow', stroke: '#dc2626', fill: '#dc2626', strokeWidth: 3,
        fontSize: 21, fontFamily: 'Verdana, sans-serif', align: 'center',
        lineHeight: 1.6, paragraphSpacing: 'large', roughness: 1,
        borderWidth: 4, borderColor: '#f87171', backgroundColor: '#fef2f2',
        backgroundOpacity: 0.95, padding: 18, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'glow', stroke: '#059669', fill: '#059669', strokeWidth: 2,
        fontSize: 17, fontFamily: 'Verdana, sans-serif', align: 'center',
        lineHeight: 1.5, paragraphSpacing: 'large', roughness: 1,
        borderWidth: 3, borderColor: '#34d399', backgroundColor: '#ecfdf5',
        backgroundOpacity: 0.9, padding: 15, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'glow', stroke: '#ed8936', strokeWidth: 2, roughness: 1,
        borderWidth: 3, borderColor: '#fbd38d', backgroundColor: '#fef5e7',
        backgroundOpacity: 0.9, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'glow', stroke: '#ed8936', fill: '#feebc8', strokeWidth: 3,
        roughness: 1, borderWidth: 3, borderColor: '#fbd38d',
        backgroundColor: '#fef5e7', backgroundOpacity: 0.9, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'glow', stroke: '#f56565', strokeWidth: 4, roughness: 1,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'glow', stroke: '#ed8936', strokeWidth: 3, roughness: 1,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Sepia tones and classic styling',
    elementDefaults: {
      text: {
        theme: 'rough', stroke: '#744210', fill: '#744210', strokeWidth: 2,
        fontSize: 16, fontFamily: 'Georgia, Times, serif', align: 'left',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 1.8,
        borderWidth: 2, borderColor: '#d69e2e', backgroundColor: '#fef3c7',
        backgroundOpacity: 0.8, padding: 10, scaleX: 1, scaleY: 1, rotation: 0
      },
      question: {
        theme: 'rough', stroke: '#92400e', fill: '#92400e', strokeWidth: 3,
        fontSize: 18, fontFamily: 'Georgia, Times, serif', align: 'left',
        lineHeight: 1.4, paragraphSpacing: 'medium', roughness: 1.8,
        borderWidth: 3, borderColor: '#d97706', backgroundColor: '#fef3c7',
        backgroundOpacity: 0.9, padding: 14, scaleX: 1, scaleY: 1, rotation: 0
      },
      answer: {
        theme: 'rough', stroke: '#65a30d', fill: '#65a30d', strokeWidth: 2,
        fontSize: 15, fontFamily: 'Georgia, Times, serif', align: 'left',
        lineHeight: 1.3, paragraphSpacing: 'medium', roughness: 1.8,
        borderWidth: 2, borderColor: '#84cc16', backgroundColor: '#f7fee7',
        backgroundOpacity: 0.8, padding: 10, scaleX: 1, scaleY: 1, rotation: 0
      },
      image: {
        theme: 'rough', stroke: '#92400e', strokeWidth: 2, roughness: 1.8,
        borderWidth: 2, borderColor: '#d69e2e', backgroundColor: '#fef3c7',
        backgroundOpacity: 0.8, scaleX: 1, scaleY: 1, rotation: 0
      },
      shape: {
        theme: 'rough', stroke: '#92400e', fill: '#fef3c7', strokeWidth: 2,
        roughness: 1.8, borderWidth: 2, borderColor: '#d69e2e',
        backgroundColor: '#fffbeb', backgroundOpacity: 0.8, scaleX: 1, scaleY: 1, rotation: 0
      },
      brush: {
        theme: 'rough', stroke: '#744210', strokeWidth: 3, roughness: 1.8,
        scaleX: 1, scaleY: 1, rotation: 0
      },
      line: {
        theme: 'rough', stroke: '#92400e', strokeWidth: 2, roughness: 1.8,
        scaleX: 1, scaleY: 1, rotation: 0
      }
    }
  }
];

export function getGlobalTheme(id: string): GlobalTheme | undefined {
  return GLOBAL_THEMES.find(theme => theme.id === id);
}

export function getGlobalThemeDefaults(themeId: string, elementType: string): Partial<CanvasElement> {
  const theme = getGlobalTheme(themeId);
  if (!theme) return {};
  
  // Map element types to theme categories
  const category = getThemeCategory(elementType);
  return theme.elementDefaults[category] || {};
}

function getThemeCategory(elementType: string): keyof GlobalTheme['elementDefaults'] {
  switch (elementType) {
    case 'text':
      return 'text';
    case 'question':
      return 'question';
    case 'answer':
      return 'answer';
    case 'image':
    case 'placeholder':
      return 'image';
    case 'brush':
      return 'brush';
    case 'line':
      return 'line';
    case 'rect':
    case 'circle':
    case 'heart':
    case 'star':
    case 'speech-bubble':
    case 'dog':
    case 'cat':
    case 'smiley':
    default:
      return 'shape';
  }
}