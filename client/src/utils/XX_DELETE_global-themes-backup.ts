import type { CanvasElement } from '../context/editor-context';
import { getPalette } from './global-palettes';
import { commonToActual } from './font-size-converter';
import { commonToActualStrokeWidth } from './stroke-width-converter';

export interface GlobalTheme {
  id: string;
  name: string;
  description: string;
  pageSettings: {
    backgroundColor: string;
    backgroundPattern?: {
      enabled: boolean;
      style: 'dots' | 'grid' | 'lines' | 'crosses';
      size: number;
      strokeWidth: number;
      patternBackgroundColor: string;
      patternBackgroundOpacity: number;
    };
    backgroundImage?: {
      enabled: boolean;
      size: 'cover' | 'contain' | 'stretch';
      repeat?: boolean;
    };
    cornerRadius: number;
  };
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

const RAW_THEMES: GlobalTheme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and simple',
    pageSettings: {
      backgroundColor: '#ffffff',
      backgroundPattern: {
        enabled: false,
        style: 'dots',
        size: 20,
        strokeWidth: 1,
        patternBackgroundColor: '#f0f0f0',
        patternBackgroundOpacity: 0.3
      },
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false
      },
      cornerRadius: 0
    },
    elementDefaults: {
      text: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        fill: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#e0e0e0',
          lineOpacity: 0.5
        },
        font: {
          fontSize: 16,
          fontFamily: 'Century Gothic, sans-serif',
          fontColor: '#16697a',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 0,
          borderColor: getPalette('neutral-harmony')?.colors.secondary || '#489fb5',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.2,
          paragraphSpacing: 'medium',
          padding: 8
        },
        background: {
          backgroundColor: getPalette('neutral-harmony')?.colors.background || '#ede7e3',
          backgroundOpacity: 0.3
        }
      },
      question: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        fill: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 2,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#e0e0e0',
          lineOpacity: 0.5
        },
        font: {
          fontSize: 18,
          fontFamily: 'Arial, sans-serif',
          fontColor: '#16697a',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 1,
          borderColor: getPalette('neutral-harmony')?.colors.secondary || '#489fb5',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.3,
          paragraphSpacing: 'medium',
          padding: 12
        },
        background: {
          backgroundColor: getPalette('neutral-harmony')?.colors.surface || '#ffa62b',
          backgroundOpacity: 0.4
        }
      },
      answer: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.accent || '#82c0cc',
        fill: getPalette('neutral-harmony')?.colors.accent || '#82c0cc',
        strokeWidth: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#e0e0e0',
          lineOpacity: 0.5
        },
        font: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontColor: '#82c0cc',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 1,
          borderColor: getPalette('neutral-harmony')?.colors.secondary || '#489fb5',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.2,
          paragraphSpacing: 'medium',
          padding: 10
        },
        background: {
          backgroundColor: getPalette('neutral-harmony')?.colors.background || '#ede7e3',
          backgroundOpacity: 0.3
        }
      },
      image: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        border: {
          borderWidth: 0,
          borderColor: 'transparent',
          borderOpacity: 1
        },
        background: {
          backgroundColor: 'transparent',
          backgroundOpacity: 1
        }
      },
      shape: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        fill: getPalette('neutral-harmony')?.colors.surface || '#ffa62b',
        strokeWidth: 2,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        border: {
          borderWidth: 0,
          borderColor: 'transparent',
          borderOpacity: 1
        },
        background: {
          backgroundColor: 'transparent',
          backgroundOpacity: 0.6
        }
      },
      brush: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 2,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      line: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 2,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    }
  },
  {
    id: 'sketchy',
    name: 'Sketchy',
    description: 'Hand-drawn style with rough edges',
    pageSettings: {
      backgroundColor: '#faf9f7',
      backgroundPattern: {
        enabled: true,
        style: 'dots',
        size: 25,
        strokeWidth: 1,
        patternBackgroundColor: '#e8e6e3',
        patternBackgroundOpacity: 0.4
      },
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false
      },
      cornerRadius: 8
    },
    elementDefaults: {
      text: {
        theme: 'sketchy',
        stroke: getPalette('warm-earth')?.colors.primary || '#8b4513',
        fill: getPalette('warm-earth')?.colors.primary || '#8b4513',
        strokeWidth: 1,
        cornerRadius: 8,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#d0ccc7',
          lineOpacity: 0.6
        },
        font: {
          fontSize: 16,
          fontFamily: 'Comic Sans MS, cursive',
          fontColor: '#2c3e50',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 0,
          borderColor: getPalette('warm-earth')?.colors.secondary || '#cd853f',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.3,
          paragraphSpacing: 'medium',
          padding: 10
        },
        background: {
          backgroundColor: getPalette('warm-earth')?.colors.background || '#f5deb3',
          backgroundOpacity: 0.3
        }
      },
      question: {
        theme: 'sketchy',
        stroke: getPalette('warm-earth')?.colors.primary || '#8b4513',
        fill: getPalette('warm-earth')?.colors.primary || '#8b4513',
        strokeWidth: 2,
        cornerRadius: 8,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#d0ccc7',
          lineOpacity: 0.6
        },
        font: {
          fontSize: 18,
          fontFamily: 'Comic Sans MS, cursive',
          fontColor: '#2c3e50',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 2,
          borderColor: getPalette('warm-earth')?.colors.secondary || '#cd853f',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.4,
          paragraphSpacing: 'medium',
          padding: 15
        },
        background: {
          backgroundColor: getPalette('warm-earth')?.colors.surface || '#daa520',
          backgroundOpacity: 0.4
        }
      },
      answer: {
        theme: 'sketchy',
        stroke: getPalette('warm-earth')?.colors.accent || '#d2691e',
        fill: getPalette('warm-earth')?.colors.accent || '#d2691e',
        strokeWidth: 1,
        cornerRadius: 8,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#d0ccc7',
          lineOpacity: 0.6
        },
        font: {
          fontSize: 16,
          fontFamily: 'Comic Sans MS, cursive',
          fontColor: '#d2691e',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 1,
          borderColor: getPalette('warm-earth')?.colors.secondary || '#cd853f',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.3,
          paragraphSpacing: 'medium',
          padding: 12
        },
        background: {
          backgroundColor: getPalette('warm-earth')?.colors.background || '#f5deb3',
          backgroundOpacity: 0.3
        }
      },
      image: {
        theme: 'sketchy',
        stroke: getPalette('warm-earth')?.colors.primary || '#8b4513',
        strokeWidth: 2,
        cornerRadius: 8,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        border: {
          borderWidth: 0,
          borderColor: 'transparent',
          borderOpacity: 1
        },
        background: {
          backgroundColor: 'transparent',
          backgroundOpacity: 1
        }
      },
      shape: {
        theme: 'sketchy',
        stroke: getPalette('warm-earth')?.colors.primary || '#8b4513',
        fill: getPalette('warm-earth')?.colors.surface || '#daa520',
        strokeWidth: 3,
        cornerRadius: 8,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        border: {
          borderWidth: 0,
          borderColor: 'transparent',
          borderOpacity: 1
        },
        background: {
          backgroundColor: 'transparent',
          backgroundOpacity: 0.6
        }
      },
      brush: {
        theme: 'sketchy',
        stroke: getPalette('warm-earth')?.colors.primary || '#8b4513',
        strokeWidth: 3,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      line: {
        theme: 'sketchy',
        stroke: getPalette('warm-earth')?.colors.primary || '#8b4513',
        strokeWidth: 3,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean lines and subtle colors',
    pageSettings: {
      backgroundColor: '#ffffff',
      backgroundPattern: {
        enabled: false,
        style: 'grid',
        size: 30,
        strokeWidth: 0.5,
        patternBackgroundColor: '#f8f9fa',
        patternBackgroundOpacity: 0.2
      },
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false
      },
      cornerRadius: 0
    },
    elementDefaults: {
      text: {
        theme: 'minimal',
        stroke: getPalette('monochrome')?.colors.primary || '#495057',
        fill: getPalette('monochrome')?.colors.primary || '#495057',
        strokeWidth: 0,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'graph',
          lineWidth: 0.5,
          lineColor: '#e9ecef',
          lineOpacity: 0.3
        },
        font: {
          fontSize: 14,
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontColor: '#495057',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 0,
          borderColor: 'transparent',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.4,
          paragraphSpacing: 'medium',
          padding: 6
        },
        background: {
          backgroundColor: 'transparent',
          backgroundOpacity: 0
        }
      },
      question: {
        theme: 'minimal',
        stroke: getPalette('monochrome')?.colors.primary || '#495057',
        fill: getPalette('monochrome')?.colors.primary || '#495057',
        strokeWidth: 0,
        fontSize: 16,
        fontFamily: 'Helvetica, Arial, sans-serif',
        align: 'left',
        lineHeight: 1.4,
        paragraphSpacing: 'medium',
        roughness: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: getPalette('monochrome')?.colors.background || '#f8f9fa',
        backgroundOpacity: 0.5,
        padding: 10,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'graph',
          lineWidth: 0.5,
          lineColor: '#e9ecef',
          lineOpacity: 0.3
        },
        fontColor: '#495057',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: false
      },
      answer: {
        theme: 'minimal',
        stroke: getPalette('monochrome')?.colors.accent || '#6c757d',
        fill: getPalette('monochrome')?.colors.accent || '#6c757d',
        strokeWidth: 0,
        fontSize: 14,
        fontFamily: 'Helvetica, Arial, sans-serif',
        align: 'left',
        lineHeight: 1.4,
        paragraphSpacing: 'medium',
        roughness: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 0,
        padding: 8,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'graph',
          lineWidth: 0.5,
          lineColor: '#e9ecef',
          lineOpacity: 0.3
        },
        fontColor: '#6c757d',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: false
      },
      image: {
        theme: 'minimal',
        stroke: 'transparent',
        strokeWidth: 0,
        roughness: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      shape: {
        theme: 'minimal',
        stroke: getPalette('monochrome')?.colors.primary || '#495057',
        fill: 'transparent',
        strokeWidth: 1,
        roughness: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 0,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      brush: {
        theme: 'minimal',
        stroke: getPalette('monochrome')?.colors.primary || '#495057',
        strokeWidth: 1,
        roughness: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      line: {
        theme: 'minimal',
        stroke: getPalette('monochrome')?.colors.primary || '#495057',
        strokeWidth: 1,
        roughness: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    }
  },
  {
    id: 'colorful',
    name: 'Colorful',
    description: 'Bright and vibrant colors',
    pageSettings: {
      backgroundColor: '#fff8e1',
      backgroundPattern: {
        enabled: true,
        style: 'dots',
        size: 15,
        strokeWidth: 1,
        patternBackgroundColor: '#ffecb3',
        patternBackgroundOpacity: 0.3
      },
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false
      },
      cornerRadius: 12
    },
    elementDefaults: {
      text: {
        theme: 'colorful',
        stroke: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        fill: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        strokeWidth: 1,
        fontSize: 16,
        fontFamily: 'Comic Sans MS, cursive',
        align: 'left',
        lineHeight: 1.3,
        paragraphSpacing: 'medium',
        roughness: 0.5,
        borderWidth: 2,
        borderColor: getPalette('vibrant-rainbow')?.colors.secondary || '#ff9800',
        backgroundColor: getPalette('vibrant-rainbow')?.colors.background || '#fff3e0',
        backgroundOpacity: 0.6,
        padding: 12,
        cornerRadius: 12,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'dotted',
          lineWidth: 1,
          lineColor: '#ffc107',
          lineOpacity: 0.4
        },
        fontColor: '#e91e63',
        fontOpacity: 1,
        fontBold: true,
        fontItalic: false
      },
      question: {
        theme: 'colorful',
        stroke: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        fill: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        strokeWidth: 2,
        fontSize: 18,
        fontFamily: 'Comic Sans MS, cursive',
        align: 'left',
        lineHeight: 1.3,
        paragraphSpacing: 'medium',
        roughness: 0.5,
        borderWidth: 3,
        borderColor: getPalette('vibrant-rainbow')?.colors.secondary || '#ff9800',
        backgroundColor: getPalette('vibrant-rainbow')?.colors.surface || '#4caf50',
        backgroundOpacity: 0.7,
        padding: 16,
        cornerRadius: 12,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'dotted',
          lineWidth: 1,
          lineColor: '#ffc107',
          lineOpacity: 0.4
        },
        fontColor: '#e91e63',
        fontOpacity: 1,
        fontBold: true,
        fontItalic: false
      },
      answer: {
        theme: 'colorful',
        stroke: getPalette('vibrant-rainbow')?.colors.accent || '#2196f3',
        fill: getPalette('vibrant-rainbow')?.colors.accent || '#2196f3',
        strokeWidth: 1,
        fontSize: 16,
        fontFamily: 'Comic Sans MS, cursive',
        align: 'left',
        lineHeight: 1.3,
        paragraphSpacing: 'medium',
        roughness: 0.5,
        borderWidth: 2,
        borderColor: getPalette('vibrant-rainbow')?.colors.secondary || '#ff9800',
        backgroundColor: getPalette('vibrant-rainbow')?.colors.background || '#fff3e0',
        backgroundOpacity: 0.5,
        padding: 14,
        cornerRadius: 12,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'dotted',
          lineWidth: 1,
          lineColor: '#ffc107',
          lineOpacity: 0.4
        },
        fontColor: '#2196f3',
        fontOpacity: 1,
        fontBold: true,
        fontItalic: false
      },
      image: {
        theme: 'colorful',
        stroke: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        strokeWidth: 3,
        roughness: 0.5,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 1,
        cornerRadius: 12,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      shape: {
        theme: 'colorful',
        stroke: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        fill: getPalette('vibrant-rainbow')?.colors.surface || '#4caf50',
        strokeWidth: 3,
        roughness: 0.5,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 0.8,
        cornerRadius: 12,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      brush: {
        theme: 'colorful',
        stroke: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        strokeWidth: 4,
        roughness: 0.5,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      line: {
        theme: 'colorful',
        stroke: getPalette('vibrant-rainbow')?.colors.primary || '#e91e63',
        strokeWidth: 3,
        roughness: 0.5,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Retro style with muted tones',
    pageSettings: {
      backgroundColor: '#f7f3e9',
      backgroundPattern: {
        enabled: true,
        style: 'lines',
        size: 24,
        strokeWidth: 1,
        patternBackgroundColor: '#e8dcc6',
        patternBackgroundOpacity: 0.4
      },
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false
      },
      cornerRadius: 4
    },
    elementDefaults: {
      text: {
        theme: 'vintage',
        stroke: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        fill: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        strokeWidth: 1,
        fontSize: 15,
        fontFamily: 'Times New Roman, serif',
        align: 'left',
        lineHeight: 1.4,
        paragraphSpacing: 'medium',
        roughness: 0.3,
        borderWidth: 0,
        borderColor: getPalette('vintage-sepia')?.colors.secondary || '#a0826d',
        backgroundColor: getPalette('vintage-sepia')?.colors.background || '#f5f0e8',
        backgroundOpacity: 0.4,
        padding: 10,
        cornerRadius: 4,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: true,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#d4c5a9',
          lineOpacity: 0.6
        },
        fontColor: '#5d4e37',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: true
      },
      question: {
        theme: 'vintage',
        stroke: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        fill: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        strokeWidth: 1,
        fontSize: 17,
        fontFamily: 'Times New Roman, serif',
        align: 'left',
        lineHeight: 1.4,
        paragraphSpacing: 'medium',
        roughness: 0.3,
        borderWidth: 1,
        borderColor: getPalette('vintage-sepia')?.colors.secondary || '#a0826d',
        backgroundColor: getPalette('vintage-sepia')?.colors.surface || '#ddbf94',
        backgroundOpacity: 0.5,
        padding: 14,
        cornerRadius: 4,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: true,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#d4c5a9',
          lineOpacity: 0.6
        },
        fontColor: '#5d4e37',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: true
      },
      answer: {
        theme: 'vintage',
        stroke: getPalette('vintage-sepia')?.colors.accent || '#b8956a',
        fill: getPalette('vintage-sepia')?.colors.accent || '#b8956a',
        strokeWidth: 1,
        fontSize: 15,
        fontFamily: 'Times New Roman, serif',
        align: 'left',
        lineHeight: 1.4,
        paragraphSpacing: 'medium',
        roughness: 0.3,
        borderWidth: 1,
        borderColor: getPalette('vintage-sepia')?.colors.secondary || '#a0826d',
        backgroundColor: getPalette('vintage-sepia')?.colors.background || '#f5f0e8',
        backgroundOpacity: 0.3,
        padding: 12,
        cornerRadius: 4,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: true,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#d4c5a9',
          lineOpacity: 0.6
        },
        fontColor: '#b8956a',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: true
      },
      image: {
        theme: 'vintage',
        stroke: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        strokeWidth: 1,
        roughness: 0.3,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 1,
        cornerRadius: 4,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      shape: {
        theme: 'vintage',
        stroke: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        fill: getPalette('vintage-sepia')?.colors.surface || '#ddbf94',
        strokeWidth: 2,
        roughness: 0.3,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 0.5,
        cornerRadius: 4,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      brush: {
        theme: 'vintage',
        stroke: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        strokeWidth: 2,
        roughness: 0.3,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      line: {
        theme: 'vintage',
        stroke: getPalette('vintage-sepia')?.colors.primary || '#8b7355',
        strokeWidth: 2,
        roughness: 0.3,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Dark theme with light elements',
    pageSettings: {
      backgroundColor: '#1a1a1a',
      backgroundPattern: {
        enabled: false,
        style: 'grid',
        size: 20,
        strokeWidth: 1,
        patternBackgroundColor: '#2d2d2d',
        patternBackgroundOpacity: 0.3
      },
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false
      },
      cornerRadius: 0
    },
    elementDefaults: {
      text: {
        theme: 'dark',
        stroke: getPalette('dark-neon')?.colors.primary || '#00ff88',
        fill: getPalette('dark-neon')?.colors.primary || '#00ff88',
        strokeWidth: 1,
        fontSize: 16,
        fontFamily: 'Consolas, monospace',
        align: 'left',
        lineHeight: 1.3,
        paragraphSpacing: 'medium',
        roughness: 0,
        borderWidth: 0,
        borderColor: getPalette('dark-neon')?.colors.secondary || '#0088ff',
        backgroundColor: getPalette('dark-neon')?.colors.background || '#2a2a2a',
        backgroundOpacity: 0.4,
        padding: 10,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'graph',
          lineWidth: 1,
          lineColor: '#404040',
          lineOpacity: 0.4
        },
        fontColor: '#e0e0e0',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: false
      },
      question: {
        theme: 'dark',
        stroke: getPalette('dark-neon')?.colors.primary || '#00ff88',
        fill: getPalette('dark-neon')?.colors.primary || '#00ff88',
        strokeWidth: 1,
        fontSize: 18,
        fontFamily: 'Audiowide, non-serif',
        align: 'left',
        lineHeight: 1.3,
        paragraphSpacing: 'medium',
        roughness: 0,
        borderWidth: 1,
        borderColor: getPalette('dark-neon')?.colors.secondary || '#0088ff',
        backgroundColor: getPalette('dark-neon')?.colors.surface || '#ff0088',
        backgroundOpacity: 0.3,
        padding: 14,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'graph',
          lineWidth: 1,
          lineColor: '#404040',
          lineOpacity: 0.4
        },
        fontColor: '#e0e0e0',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: false
      },
      answer: {
        theme: 'dark',
        stroke: getPalette('dark-neon')?.colors.accent || '#88ff00',
        fill: getPalette('dark-neon')?.colors.accent || '#88ff00',
        strokeWidth: 1,
        fontSize: 16,
        fontFamily: 'Consolas, monospace',
        align: 'left',
        lineHeight: 1.3,
        paragraphSpacing: 'medium',
        roughness: 0,
        borderWidth: 1,
        borderColor: getPalette('dark-neon')?.colors.secondary || '#0088ff',
        backgroundColor: getPalette('dark-neon')?.colors.background || '#2a2a2a',
        backgroundOpacity: 0.3,
        padding: 12,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'graph',
          lineWidth: 1,
          lineColor: '#404040',
          lineOpacity: 0.4
        },
        fontColor: '#88ff00',
        fontOpacity: 1,
        fontBold: false,
        fontItalic: false
      },
      image: {
        theme: 'dark',
        stroke: getPalette('dark-neon')?.colors.primary || '#00ff88',
        strokeWidth: 1,
        roughness: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      shape: {
        theme: 'dark',
        stroke: getPalette('dark-neon')?.colors.primary || '#00ff88',
        fill: getPalette('dark-neon')?.colors.surface || '#ff0088',
        strokeWidth: 2,
        roughness: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        backgroundOpacity: 0.4,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      brush: {
        theme: 'dark',
        stroke: getPalette('dark-neon')?.colors.primary || '#00ff88',
        strokeWidth: 2,
        roughness: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      line: {
        theme: 'dark',
        stroke: getPalette('dark-neon')?.colors.primary || '#00ff88',
        strokeWidth: 2,
        roughness: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    }
  }
];

const processedThemeCache = new Map<string, GlobalTheme>();

function processTheme(theme: GlobalTheme): GlobalTheme {
  return {
    ...theme,
    pageSettings: {
      ...theme.pageSettings,
      backgroundPattern: theme.pageSettings.backgroundPattern ? {
        ...theme.pageSettings.backgroundPattern,
        strokeWidth: commonToActualStrokeWidth(theme.pageSettings.backgroundPattern.strokeWidth, theme.id)
      } : undefined
    },
    elementDefaults: Object.fromEntries(
      Object.entries(theme.elementDefaults).map(([key, element]) => [
        key,
        {
          ...element,
          strokeWidth: typeof element.strokeWidth === 'number' 
            ? commonToActualStrokeWidth(element.strokeWidth, theme.id) 
            : element.strokeWidth,
          borderWidth: typeof element.borderWidth === 'number'
            ? commonToActualStrokeWidth(element.borderWidth, theme.id)
            : element.borderWidth,
          fontSize: typeof element.fontSize === 'number'
            ? commonToActual(element.fontSize)
            : element.fontSize,
          ruledLines: element.ruledLines ? {
            ...element.ruledLines,
            lineWidth: commonToActualStrokeWidth(element.ruledLines.lineWidth, theme.id)
          } : undefined
        }
      ])
    ) as GlobalTheme['elementDefaults']
  };
}

export function getGlobalTheme(id: string): GlobalTheme | undefined {
  if (processedThemeCache.has(id)) {
    return processedThemeCache.get(id);
  }
  
  const rawTheme = RAW_THEMES.find(theme => theme.id === id);
  if (!rawTheme) return undefined;
  
  const processedTheme = processTheme(rawTheme);
  processedThemeCache.set(id, processedTheme);
  return processedTheme;
}

export const GLOBAL_THEMES: GlobalTheme[] = RAW_THEMES;

export function getGlobalThemeDefaults(themeId: string, elementType: string): Partial<CanvasElement> {
  const theme = getGlobalTheme(themeId);
  if (!theme) return {};
  
  const category = getThemeCategory(elementType);
  return theme.elementDefaults[category] || {};
}

export function getAllGlobalThemes(): GlobalTheme[] {
  return RAW_THEMES.map(theme => getGlobalTheme(theme.id)!).filter(Boolean);
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