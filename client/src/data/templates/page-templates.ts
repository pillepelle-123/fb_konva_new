import type { PageTemplate } from '../../types/template-types';

// Canvas dimensions from canvas.tsx: A4 portrait = 2480x3508
const CANVAS_WIDTH = 2480;
const CANVAS_HEIGHT = 3508;

export const pageTemplates: PageTemplate[] = [
  // STRUCTURED CATEGORY (4 templates)
  {
    id: 'structured-grid-1',
    name: 'Classic Grid',
    category: 'structured',
    thumbnail: '/templates/structured-grid-1.png',
    theme: 'default',
    colorPalette: {
      primary: '#1976D2',
      secondary: '#42A5F5',
      accent: '#81C784',
      background: '#FFFFFF',
      text: '#1A1A1A'
    },
    background: {
      type: 'color',
      value: '#FFFFFF',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 200, y: 300 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1200, y: 300 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 200, y: 600 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1200, y: 600 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 200, y: 900 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1200, y: 900 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 200, y: 1200 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1200, y: 1200 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 200, y: 1500 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1200, y: 1500 }, size: { width: 800, height: 120 } }
    ],
    elements: [
      { type: 'image', position: { x: 800, y: 2000 }, size: { width: 600, height: 400 } },
      { type: 'sticker', position: { x: 100, y: 100 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 2200, y: 100 }, size: { width: 80, height: 80 } }
    ],
    constraints: {
      minQuestions: 8,
      maxQuestions: 12,
      imageSlots: 1,
      stickerSlots: 2
    }
  },
  {
    id: 'structured-formal-1',
    name: 'Formal Layout',
    category: 'structured',
    thumbnail: '/templates/structured-formal-1.png',
    theme: 'minimal',
    colorPalette: {
      primary: '#424242',
      secondary: '#757575',
      accent: '#BDBDBD',
      background: '#FFFFFF',
      text: '#212121'
    },
    background: {
      type: 'color',
      value: '#FFFFFF',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 300, y: 400 }, size: { width: 1800, height: 100 } },
      { type: 'question', position: { x: 300, y: 600 }, size: { width: 1800, height: 100 } },
      { type: 'question', position: { x: 300, y: 800 }, size: { width: 1800, height: 100 } },
      { type: 'question', position: { x: 300, y: 1000 }, size: { width: 1800, height: 100 } },
      { type: 'question', position: { x: 300, y: 1200 }, size: { width: 1800, height: 100 } },
      { type: 'question', position: { x: 300, y: 1400 }, size: { width: 1800, height: 100 } },
      { type: 'question', position: { x: 300, y: 1600 }, size: { width: 1800, height: 100 } },
      { type: 'question', position: { x: 300, y: 1800 }, size: { width: 1800, height: 100 } }
    ],
    elements: [
      { type: 'image', position: { x: 300, y: 2100 }, size: { width: 800, height: 600 } },
      { type: 'image', position: { x: 1300, y: 2100 }, size: { width: 800, height: 600 } },
      { type: 'sticker', position: { x: 200, y: 200 }, size: { width: 60, height: 60 } },
      { type: 'sticker', position: { x: 2200, y: 200 }, size: { width: 60, height: 60 } }
    ],
    constraints: {
      minQuestions: 8,
      maxQuestions: 12,
      imageSlots: 2,
      stickerSlots: 4
    }
  },
  {
    id: 'structured-columns-1',
    name: 'Two Columns',
    category: 'structured',
    thumbnail: '/templates/structured-columns-1.png',
    theme: 'default',
    colorPalette: {
      primary: '#388E3C',
      secondary: '#66BB6A',
      accent: '#8BC34A',
      background: '#F1F8E9',
      text: '#2E2E2E'
    },
    background: {
      type: 'color',
      value: '#F1F8E9',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 200, y: 400 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 1300, y: 400 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 200, y: 700 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 1300, y: 700 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 200, y: 1000 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 1300, y: 1000 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 200, y: 1300 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 1300, y: 1300 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 200, y: 1600 }, size: { width: 900, height: 120 } }
    ],
    elements: [
      { type: 'image', position: { x: 900, y: 2000 }, size: { width: 680, height: 500 } },
      { type: 'sticker', position: { x: 100, y: 150 }, size: { width: 70, height: 70 } },
      { type: 'sticker', position: { x: 2300, y: 150 }, size: { width: 70, height: 70 } },
      { type: 'sticker', position: { x: 1200, y: 150 }, size: { width: 70, height: 70 } }
    ],
    constraints: {
      minQuestions: 8,
      maxQuestions: 12,
      imageSlots: 1,
      stickerSlots: 3
    }
  },
  {
    id: 'structured-list-1',
    name: 'Question List',
    category: 'structured',
    thumbnail: '/templates/structured-list-1.png',
    theme: 'minimal',
    colorPalette: {
      primary: '#607D8B',
      secondary: '#90A4AE',
      accent: '#B0BEC5',
      background: '#FAFAFA',
      text: '#263238'
    },
    background: {
      type: 'color',
      value: '#FAFAFA',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 400, y: 500 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 650 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 800 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 950 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 1100 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 1250 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 1400 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 1550 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 1700 }, size: { width: 1600, height: 100 } },
      { type: 'question', position: { x: 400, y: 1850 }, size: { width: 1600, height: 100 } }
    ],
    elements: [
      { type: 'image', position: { x: 840, y: 2200 }, size: { width: 800, height: 600 } },
      { type: 'sticker', position: { x: 200, y: 300 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 2200, y: 300 }, size: { width: 80, height: 80 } }
    ],
    constraints: {
      minQuestions: 8,
      maxQuestions: 12,
      imageSlots: 1,
      stickerSlots: 2
    }
  },

  // PLAYFUL CATEGORY (4 templates)
  {
    id: 'playful-scattered-1',
    name: 'Fun Scatter',
    category: 'playful',
    thumbnail: '/templates/playful-scattered-1.png',
    theme: 'colorful',
    colorPalette: {
      primary: '#E65100',
      secondary: '#FF5722',
      accent: '#FF9800',
      background: '#FFF3E0',
      text: '#1A1A1A'
    },
    background: {
      type: 'pattern',
      value: 'dots',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 300, y: 400 }, size: { width: 600, height: 100 } },
      { type: 'question', position: { x: 1400, y: 350 }, size: { width: 700, height: 120 } },
      { type: 'question', position: { x: 200, y: 800 }, size: { width: 650, height: 110 } },
      { type: 'question', position: { x: 1300, y: 750 }, size: { width: 600, height: 100 } },
      { type: 'question', position: { x: 400, y: 1200 }, size: { width: 700, height: 120 } },
      { type: 'question', position: { x: 1200, y: 1150 }, size: { width: 650, height: 110 } }
    ],
    elements: [
      { type: 'image', position: { x: 600, y: 1600 }, size: { width: 500, height: 400 } },
      { type: 'image', position: { x: 1300, y: 1600 }, size: { width: 500, height: 400 } },
      { type: 'sticker', position: { x: 150, y: 200 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 2200, y: 150 }, size: { width: 120, height: 120 } },
      { type: 'sticker', position: { x: 100, y: 1000 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 2300, y: 950 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 1100, y: 500 }, size: { width: 70, height: 70 } }
    ],
    constraints: {
      minQuestions: 5,
      maxQuestions: 8,
      imageSlots: 2,
      stickerSlots: 7
    }
  },
  {
    id: 'playful-rainbow-1',
    name: 'Rainbow Fun',
    category: 'playful',
    thumbnail: '/templates/playful-rainbow-1.png',
    theme: 'colorful',
    colorPalette: {
      primary: '#C2185B',
      secondary: '#E91E63',
      accent: '#F06292',
      background: '#FCE4EC',
      text: '#1A1A1A'
    },
    background: {
      type: 'color',
      value: '#FCE4EC',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 250, y: 500 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1350, y: 450 }, size: { width: 750, height: 130 } },
      { type: 'question', position: { x: 300, y: 900 }, size: { width: 700, height: 110 } },
      { type: 'question', position: { x: 1400, y: 850 }, size: { width: 650, height: 120 } },
      { type: 'question', position: { x: 200, y: 1300 }, size: { width: 800, height: 100 } },
      { type: 'question', position: { x: 1300, y: 1250 }, size: { width: 700, height: 110 } },
      { type: 'question', position: { x: 500, y: 1650 }, size: { width: 600, height: 120 } }
    ],
    elements: [
      { type: 'image', position: { x: 400, y: 2100 }, size: { width: 600, height: 450 } },
      { type: 'image', position: { x: 1200, y: 2100 }, size: { width: 600, height: 450 } },
      { type: 'sticker', position: { x: 100, y: 100 }, size: { width: 120, height: 120 } },
      { type: 'sticker', position: { x: 2200, y: 200 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 150, y: 700 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 2250, y: 650 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 1150, y: 600 }, size: { width: 70, height: 70 } },
      { type: 'sticker', position: { x: 1200, y: 1500 }, size: { width: 85, height: 85 } }
    ],
    constraints: {
      minQuestions: 5,
      maxQuestions: 8,
      imageSlots: 2,
      stickerSlots: 8
    }
  },
  {
    id: 'playful-chaos-1',
    name: 'Creative Chaos',
    category: 'playful',
    thumbnail: '/templates/playful-chaos-1.png',
    theme: 'sketchy',
    colorPalette: {
      primary: '#FF6B35',
      secondary: '#F7931E',
      accent: '#FFB74D',
      background: '#FFF8E1',
      text: '#2E2E2E'
    },
    background: {
      type: 'pattern',
      value: 'cross',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 400, y: 300 }, size: { width: 700, height: 130 } },
      { type: 'question', position: { x: 1200, y: 500 }, size: { width: 650, height: 120 } },
      { type: 'question', position: { x: 300, y: 750 }, size: { width: 600, height: 110 } },
      { type: 'question', position: { x: 1400, y: 900 }, size: { width: 700, height: 120 } },
      { type: 'question', position: { x: 200, y: 1200 }, size: { width: 750, height: 130 } },
      { type: 'question', position: { x: 1300, y: 1400 }, size: { width: 600, height: 100 } }
    ],
    elements: [
      { type: 'image', position: { x: 700, y: 1800 }, size: { width: 600, height: 450 } },
      { type: 'image', position: { x: 1400, y: 1800 }, size: { width: 500, height: 400 } },
      { type: 'sticker', position: { x: 200, y: 150 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 2100, y: 100 }, size: { width: 120, height: 120 } },
      { type: 'sticker', position: { x: 100, y: 600 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 2200, y: 700 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 1000, y: 650 }, size: { width: 70, height: 70 } }
    ],
    constraints: {
      minQuestions: 5,
      maxQuestions: 8,
      imageSlots: 2,
      stickerSlots: 6
    }
  },
  {
    id: 'playful-burst-1',
    name: 'Color Burst',
    category: 'playful',
    thumbnail: '/templates/playful-burst-1.png',
    theme: 'colorful',
    colorPalette: {
      primary: '#7B1FA2',
      secondary: '#9C27B0',
      accent: '#BA68C8',
      background: '#F3E5F5',
      text: '#1A1A1A'
    },
    background: {
      type: 'color',
      value: '#F3E5F5',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 350, y: 400 }, size: { width: 650, height: 120 } },
      { type: 'question', position: { x: 1350, y: 350 }, size: { width: 700, height: 130 } },
      { type: 'question', position: { x: 250, y: 800 }, size: { width: 750, height: 110 } },
      { type: 'question', position: { x: 1250, y: 750 }, size: { width: 600, height: 120 } },
      { type: 'question', position: { x: 400, y: 1150 }, size: { width: 700, height: 130 } },
      { type: 'question', position: { x: 1400, y: 1100 }, size: { width: 650, height: 110 } }
    ],
    elements: [
      { type: 'image', position: { x: 800, y: 1600 }, size: { width: 700, height: 500 } },
      { type: 'image', position: { x: 200, y: 1900 }, size: { width: 400, height: 300 } },
      { type: 'sticker', position: { x: 150, y: 200 }, size: { width: 110, height: 110 } },
      { type: 'sticker', position: { x: 2150, y: 150 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 100, y: 950 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 2200, y: 900 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 1150, y: 600 }, size: { width: 70, height: 70 } }
    ],
    constraints: {
      minQuestions: 5,
      maxQuestions: 8,
      imageSlots: 2,
      stickerSlots: 7
    }
  },

  // MINIMAL CATEGORY (4 templates)
  {
    id: 'minimal-clean-1',
    name: 'Clean & Simple',
    category: 'minimal',
    thumbnail: '/templates/minimal-clean-1.png',
    theme: 'minimal',
    colorPalette: {
      primary: '#424242',
      secondary: '#757575',
      accent: '#BDBDBD',
      background: '#FFFFFF',
      text: '#212121'
    },
    background: {
      type: 'color',
      value: '#FFFFFF',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 500, y: 600 }, size: { width: 1400, height: 150 } },
      { type: 'question', position: { x: 500, y: 1000 }, size: { width: 1400, height: 150 } },
      { type: 'question', position: { x: 500, y: 1400 }, size: { width: 1400, height: 150 } }
    ],
    elements: [
      { type: 'image', position: { x: 900, y: 2000 }, size: { width: 680, height: 500 } }
    ],
    constraints: {
      minQuestions: 3,
      maxQuestions: 5,
      imageSlots: 1,
      stickerSlots: 0
    }
  },
  {
    id: 'minimal-space-1',
    name: 'Breathing Space',
    category: 'minimal',
    thumbnail: '/templates/minimal-space-1.png',
    theme: 'minimal',
    colorPalette: {
      primary: '#455A64',
      secondary: '#607D8B',
      accent: '#90A4AE',
      background: '#ECEFF1',
      text: '#1A1A1A'
    },
    background: {
      type: 'color',
      value: '#ECEFF1',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 400, y: 700 }, size: { width: 1600, height: 180 } },
      { type: 'question', position: { x: 400, y: 1200 }, size: { width: 1600, height: 180 } },
      { type: 'question', position: { x: 400, y: 1700 }, size: { width: 1600, height: 180 } },
      { type: 'question', position: { x: 400, y: 2200 }, size: { width: 1600, height: 180 } }
    ],
    elements: [
      { type: 'image', position: { x: 840, y: 2700 }, size: { width: 800, height: 600 } },
      { type: 'sticker', position: { x: 200, y: 400 }, size: { width: 60, height: 60 } }
    ],
    constraints: {
      minQuestions: 3,
      maxQuestions: 5,
      imageSlots: 1,
      stickerSlots: 1
    }
  },
  {
    id: 'minimal-focus-1',
    name: 'Focus Point',
    category: 'minimal',
    thumbnail: '/templates/minimal-focus-1.png',
    theme: 'minimal',
    colorPalette: {
      primary: '#00695C',
      secondary: '#26A69A',
      accent: '#80CBC4',
      background: '#E8F5E8',
      text: '#1A1A1A'
    },
    background: {
      type: 'color',
      value: '#E8F5E8',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 600, y: 800 }, size: { width: 1200, height: 200 } },
      { type: 'question', position: { x: 600, y: 1300 }, size: { width: 1200, height: 200 } },
      { type: 'question', position: { x: 600, y: 1800 }, size: { width: 1200, height: 200 } }
    ],
    elements: [
      { type: 'image', position: { x: 840, y: 2400 }, size: { width: 800, height: 600 } },
      { type: 'sticker', position: { x: 300, y: 500 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 2100, y: 500 }, size: { width: 80, height: 80 } }
    ],
    constraints: {
      minQuestions: 3,
      maxQuestions: 5,
      imageSlots: 1,
      stickerSlots: 2
    }
  },
  {
    id: 'minimal-zen-1',
    name: 'Zen Garden',
    category: 'minimal',
    thumbnail: '/templates/minimal-zen-1.png',
    theme: 'minimal',
    colorPalette: {
      primary: '#8D6E63',
      secondary: '#A1887F',
      accent: '#BCAAA4',
      background: '#FFF8E1',
      text: '#3E2723'
    },
    background: {
      type: 'color',
      value: '#FFF8E1',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 500, y: 900 }, size: { width: 1400, height: 200 } },
      { type: 'question', position: { x: 500, y: 1500 }, size: { width: 1400, height: 200 } },
      { type: 'question', position: { x: 500, y: 2100 }, size: { width: 1400, height: 200 } }
    ],
    elements: [
      { type: 'image', position: { x: 840, y: 2700 }, size: { width: 800, height: 600 } }
    ],
    constraints: {
      minQuestions: 3,
      maxQuestions: 5,
      imageSlots: 1,
      stickerSlots: 0
    }
  },

  // CREATIVE CATEGORY (4 templates)
  {
    id: 'creative-mixed-1',
    name: 'Mixed Layout',
    category: 'creative',
    thumbnail: '/templates/creative-mixed-1.png',
    theme: 'sketchy',
    colorPalette: {
      primary: '#D84315',
      secondary: '#FF5722',
      accent: '#FFAB91',
      background: '#FFF3E0',
      text: '#1A1A1A'
    },
    background: {
      type: 'pattern',
      value: 'waves',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 300, y: 400 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1300, y: 350 }, size: { width: 700, height: 130 } },
      { type: 'question', position: { x: 200, y: 700 }, size: { width: 900, height: 110 } },
      { type: 'question', position: { x: 1200, y: 750 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 400, y: 1100 }, size: { width: 700, height: 130 } },
      { type: 'question', position: { x: 1400, y: 1050 }, size: { width: 600, height: 110 } },
      { type: 'question', position: { x: 300, y: 1400 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1300, y: 1350 }, size: { width: 700, height: 130 } }
    ],
    elements: [
      { type: 'image', position: { x: 600, y: 1800 }, size: { width: 600, height: 450 } },
      { type: 'image', position: { x: 1300, y: 1800 }, size: { width: 500, height: 400 } },
      { type: 'sticker', position: { x: 150, y: 150 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 2200, y: 200 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 1150, y: 600 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 100, y: 950 }, size: { width: 70, height: 70 } }
    ],
    constraints: {
      minQuestions: 6,
      maxQuestions: 10,
      imageSlots: 2,
      stickerSlots: 5
    }
  },
  {
    id: 'creative-spiral-1',
    name: 'Spiral Flow',
    category: 'creative',
    thumbnail: '/templates/creative-spiral-1.png',
    theme: 'colorful',
    colorPalette: {
      primary: '#0277BD',
      secondary: '#03A9F4',
      accent: '#81D4FA',
      background: '#E1F5FE',
      text: '#1A1A1A'
    },
    background: {
      type: 'color',
      value: '#E1F5FE',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 400, y: 300 }, size: { width: 700, height: 120 } },
      { type: 'question', position: { x: 1400, y: 500 }, size: { width: 650, height: 110 } },
      { type: 'question', position: { x: 1300, y: 800 }, size: { width: 700, height: 130 } },
      { type: 'question', position: { x: 800, y: 1100 }, size: { width: 600, height: 120 } },
      { type: 'question', position: { x: 300, y: 1300 }, size: { width: 750, height: 110 } },
      { type: 'question', position: { x: 200, y: 900 }, size: { width: 650, height: 130 } },
      { type: 'question', position: { x: 500, y: 600 }, size: { width: 700, height: 120 } }
    ],
    elements: [
      { type: 'image', position: { x: 900, y: 1700 }, size: { width: 680, height: 500 } },
      { type: 'sticker', position: { x: 200, y: 200 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 2100, y: 150 }, size: { width: 120, height: 120 } },
      { type: 'sticker', position: { x: 1200, y: 400 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 100, y: 700 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 2200, y: 1000 }, size: { width: 70, height: 70 } }
    ],
    constraints: {
      minQuestions: 6,
      maxQuestions: 10,
      imageSlots: 1,
      stickerSlots: 6
    }
  },
  {
    id: 'creative-organic-1',
    name: 'Organic Flow',
    category: 'creative',
    thumbnail: '/templates/creative-organic-1.png',
    theme: 'sketchy',
    colorPalette: {
      primary: '#558B2F',
      secondary: '#689F38',
      accent: '#9CCC65',
      background: '#F1F8E9',
      text: '#1A1A1A'
    },
    background: {
      type: 'pattern',
      value: 'hexagon',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 350, y: 450 }, size: { width: 650, height: 130 } },
      { type: 'question', position: { x: 1350, y: 400 }, size: { width: 700, height: 120 } },
      { type: 'question', position: { x: 250, y: 750 }, size: { width: 800, height: 110 } },
      { type: 'question', position: { x: 1250, y: 700 }, size: { width: 650, height: 130 } },
      { type: 'question', position: { x: 400, y: 1050 }, size: { width: 700, height: 120 } },
      { type: 'question', position: { x: 1400, y: 1000 }, size: { width: 600, height: 110 } },
      { type: 'question', position: { x: 300, y: 1350 }, size: { width: 750, height: 130 } },
      { type: 'question', position: { x: 1300, y: 1300 }, size: { width: 650, height: 120 } }
    ],
    elements: [
      { type: 'image', position: { x: 700, y: 1700 }, size: { width: 600, height: 450 } },
      { type: 'sticker', position: { x: 150, y: 200 }, size: { width: 110, height: 110 } },
      { type: 'sticker', position: { x: 2150, y: 150 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 1100, y: 550 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 100, y: 900 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 2200, y: 850 }, size: { width: 70, height: 70 } }
    ],
    constraints: {
      minQuestions: 6,
      maxQuestions: 10,
      imageSlots: 1,
      stickerSlots: 5
    }
  },
  {
    id: 'creative-asymmetric-1',
    name: 'Asymmetric Art',
    category: 'creative',
    thumbnail: '/templates/creative-asymmetric-1.png',
    theme: 'colorful',
    colorPalette: {
      primary: '#AD1457',
      secondary: '#E91E63',
      accent: '#F8BBD9',
      background: '#FCE4EC',
      text: '#1A1A1A'
    },
    background: {
      type: 'color',
      value: '#FCE4EC',
      enabled: true
    },
    textboxes: [
      { type: 'question', position: { x: 200, y: 400 }, size: { width: 900, height: 120 } },
      { type: 'question', position: { x: 1400, y: 300 }, size: { width: 600, height: 130 } },
      { type: 'question', position: { x: 300, y: 700 }, size: { width: 700, height: 110 } },
      { type: 'question', position: { x: 1200, y: 650 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 500, y: 1000 }, size: { width: 650, height: 130 } },
      { type: 'question', position: { x: 1300, y: 950 }, size: { width: 700, height: 110 } },
      { type: 'question', position: { x: 200, y: 1300 }, size: { width: 800, height: 120 } },
      { type: 'question', position: { x: 1100, y: 1250 }, size: { width: 600, height: 130 } },
      { type: 'question', position: { x: 400, y: 1600 }, size: { width: 750, height: 110 } }
    ],
    elements: [
      { type: 'image', position: { x: 800, y: 2000 }, size: { width: 680, height: 500 } },
      { type: 'sticker', position: { x: 100, y: 150 }, size: { width: 120, height: 120 } },
      { type: 'sticker', position: { x: 2200, y: 200 }, size: { width: 100, height: 100 } },
      { type: 'sticker', position: { x: 1150, y: 500 }, size: { width: 80, height: 80 } },
      { type: 'sticker', position: { x: 150, y: 850 }, size: { width: 90, height: 90 } },
      { type: 'sticker', position: { x: 2150, y: 800 }, size: { width: 70, height: 70 } },
      { type: 'sticker', position: { x: 1000, y: 1150 }, size: { width: 85, height: 85 } }
    ],
    constraints: {
      minQuestions: 6,
      maxQuestions: 10,
      imageSlots: 1,
      stickerSlots: 6
    }
  }
];