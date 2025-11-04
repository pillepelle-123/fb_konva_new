import type { PageTemplate } from '../../types/template-types';

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
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 300 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 50, fontFamily: 'Century Gothic, sans-serif', fontColor: '#1f2937' },
          border: { enabled: false },
          format: { textAlign: 'left', padding: 12 },
          background: { enabled: false },
          cornerRadius: 30
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1200, y: 300 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 54, fontFamily: 'Roboto, sans-serif', fontBold: true, fontColor: '#2563eb' },
          border: { enabled: true, borderWidth: 1, borderColor: '#3b82f6' },
          format: { textAlign: 'center', padding: 16 },
          background: { enabled: true, backgroundColor: '#dbeafe', backgroundOpacity: 0.4 },
          cornerRadius: 20
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 600 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 58, fontFamily: 'Century Gothic, sans-serif', fontBold: true, fontColor: '#1976D2' },
          border: { enabled: true, borderWidth: 2, borderColor: '#42A5F5' },
          format: { textAlign: 'center', paragraphSpacing: 'medium', padding: 15 },
          background: { enabled: true, backgroundColor: '#E3F2FD', backgroundOpacity: 0.3 },
          cornerRadius: 25
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1200, y: 600 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 50, fontFamily: 'Georgia, serif', fontItalic: true, fontColor: '#059669' },
          border: { enabled: false },
          format: { textAlign: 'right', paragraphSpacing: 'large', padding: 18 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#81C784', lineOpacity: 0.4 },
          cornerRadius: 30
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 900 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 67, fontFamily: 'Arial, sans-serif', fontColor: '#1976D2' },
          border: { enabled: true, borderWidth: 3, borderColor: '#81C784' },
          format: { textAlign: 'left', paragraphSpacing: 'large', padding: 20 },
          background: { enabled: true, backgroundColor: '#C8E6C9', backgroundOpacity: 0.2 },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#4ade80', lineOpacity: 0.5 },
          cornerRadius: 15
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1200, y: 900 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 54, fontFamily: 'Verdana, sans-serif', fontBold: false, fontColor: '#42A5F5' },
          border: { enabled: true, borderWidth: 3, borderColor: '#1976D2' },
          format: { textAlign: 'center', paragraphSpacing: 'small', padding: 14 },
          background: { enabled: true, backgroundColor: '#E1F5FE', backgroundOpacity: 0.5 },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#81C784', lineOpacity: 0.6 },
          cornerRadius: 35
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 1200 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 75, fontFamily: 'Georgia, serif', fontBold: true, fontItalic: true, fontColor: '#1976D2' },
          border: { enabled: false },
          format: { textAlign: 'left', paragraphSpacing: 'large', padding: 25 },
          background: { enabled: true, backgroundColor: '#BBDEFB', backgroundOpacity: 0.7 },
          ruledLines: { enabled: false },
          cornerRadius: 40
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1200, y: 1200 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 62, fontFamily: 'Consolas, monospace', fontBold: true, fontColor: '#7c3aed' },
          border: { enabled: true, borderWidth: 2, borderColor: '#a855f7' },
          format: { textAlign: 'right', paragraphSpacing: 'medium', padding: 12 },
          background: { enabled: true, backgroundColor: '#f3e8ff', backgroundOpacity: 0.6 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#c084fc', lineOpacity: 0.3 },
          cornerRadius: 8
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 1500 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 58, fontFamily: 'Times New Roman, serif', fontColor: '#dc2626' },
          border: { enabled: true, borderWidth: 1, borderColor: '#ef4444' },
          format: { textAlign: 'center', paragraphSpacing: 'small', padding: 22 },
          background: { enabled: true, backgroundColor: '#fef2f2', backgroundOpacity: 0.8 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1200, y: 1500 }, 
        size: { width: 800, height: 120 },
        style: {
          font: { fontSize: 50, fontFamily: 'Arial, sans-serif', fontItalic: true, fontColor: '#ea580c' },
          border: { enabled: false },
          format: { textAlign: 'left', paragraphSpacing: 'large', padding: 8 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 3, lineColor: '#fb923c', lineOpacity: 0.7 },
          cornerRadius: 45
        }
      }
    ],
    elements: [
      { type: 'image', position: { x: 800, y: 2000 }, size: { width: 600, height: 400 } },
      { 
        type: 'shape', 
        position: { x: 100, y: 100 }, 
        size: { width: 80, height: 80 },
        shapeType: 'circle',
        style: {
          strokeWidth: 2,
          stroke: '#1976D2',
          fill: 'transparent',
          inheritTheme: 'default'
        }
      },
      { 
        type: 'shape', 
        position: { x: 2200, y: 100 }, 
        size: { width: 80, height: 80 },
        shapeType: 'star',
        style: {
          strokeWidth: 2,
          stroke: '#81C784',
          fill: 'transparent',
          inheritTheme: 'default'
        }
      }
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
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 400 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 67, fontFamily: 'Helvetica, Arial, sans-serif', fontBold: true, fontColor: '#6c757d' },
          border: { enabled: true, borderWidth: 2, borderColor: '#adb5bd' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 16 },
          background: { enabled: true, backgroundColor: '#f8f9fa', backgroundOpacity: 0.5 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#dee2e6', lineOpacity: 0.4 },
          cornerRadius: 10
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 600 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 58, fontFamily: 'Helvetica, Arial, sans-serif', fontBold: true, fontColor: '#424242' },
          border: { enabled: true, borderWidth: 2, borderColor: '#BDBDBD' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 14 },
          background: { enabled: true, backgroundColor: '#F5F5F5', backgroundOpacity: 0.6 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#9e9e9e', lineOpacity: 0.4 },
          cornerRadius: 8
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 800 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 62, fontFamily: 'Georgia, serif', fontItalic: true, fontColor: '#757575' },
          border: { enabled: false },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 18 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#BDBDBD', lineOpacity: 0.5 },
          cornerRadius: 0
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 1000 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 71, fontFamily: 'Helvetica, Arial, sans-serif', fontBold: true, fontColor: '#212121' },
          border: { enabled: true, borderWidth: 3, borderColor: '#757575' },
          format: { textAlign: 'right', paragraphSpacing: 'medium', padding: 16 },
          background: { enabled: true, backgroundColor: '#EEEEEE', backgroundOpacity: 0.4 },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#424242', lineOpacity: 0.3 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 1200 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 54, fontFamily: 'Consolas, monospace', fontColor: '#1565c0' },
          border: { enabled: true, borderWidth: 1, borderColor: '#42a5f5' },
          format: { textAlign: 'left', paragraphSpacing: 'small', padding: 10 },
          background: { enabled: true, backgroundColor: '#e3f2fd', backgroundOpacity: 0.5 },
          cornerRadius: 6
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 1400 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 67, fontFamily: 'Times New Roman, serif', fontBold: true, fontItalic: true, fontColor: '#2e7d32' },
          border: { enabled: false },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 20 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 3, lineColor: '#66bb6a', lineOpacity: 0.6 },
          cornerRadius: 0
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 1600 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 58, fontFamily: 'Verdana, sans-serif', fontColor: '#d32f2f' },
          border: { enabled: true, borderWidth: 2, borderColor: '#f44336' },
          format: { textAlign: 'right', paragraphSpacing: 'medium', padding: 12 },
          background: { enabled: true, backgroundColor: '#ffebee', backgroundOpacity: 0.7 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#ef5350', lineOpacity: 0.4 },
          cornerRadius: 15
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 1800 }, 
        size: { width: 1800, height: 100 },
        style: {
          font: { fontSize: 62, fontFamily: 'Arial, sans-serif', fontItalic: true, fontColor: '#7b1fa2' },
          border: { enabled: true, borderWidth: 4, borderColor: '#ab47bc' },
          format: { textAlign: 'left', paragraphSpacing: 'small', padding: 16 },
          background: { enabled: true, backgroundColor: '#f3e5f5', backgroundOpacity: 0.8 },
          cornerRadius: 25
        }
      }
    ],
    elements: [
      { type: 'image', position: { x: 300, y: 2100 }, size: { width: 800, height: 600 } },
      { type: 'image', position: { x: 1300, y: 2100 }, size: { width: 800, height: 600 } },
      { 
        type: 'shape', 
        position: { x: 200, y: 200 }, 
        size: { width: 60, height: 60 },
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
        type: 'shape', 
        position: { x: 2200, y: 200 }, 
        size: { width: 60, height: 60 },
        shapeType: 'rect',
        style: {
          strokeWidth: 1,
          stroke: '#6c757d',
          fill: 'transparent',
          cornerRadius: 0,
          inheritTheme: 'default'
        }
      }
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
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 400 }, 
        size: { width: 900, height: 120 },
        style: {
          font: { fontSize: 14, fontFamily: 'Century Gothic, sans-serif', fontColor: '#2E2E2E' },
          border: { enabled: true, borderWidth: 1, borderColor: '#388E3C' },
          format: { textAlign: 'left', padding: 12 },
          background: { enabled: true, backgroundColor: '#66BB6A', backgroundOpacity: 0.2 },
          cornerRadius: 8
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1300, y: 400 }, 
        size: { width: 900, height: 120 },
        style: {
          font: { fontSize: 14, fontFamily: 'Century Gothic, sans-serif', fontColor: '#2E2E2E' },
          border: { enabled: true, borderWidth: 1, borderColor: '#388E3C' },
          format: { textAlign: 'right', padding: 12 },
          background: { enabled: true, backgroundColor: '#8BC34A', backgroundOpacity: 0.2 },
          cornerRadius: 8
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 700 }, 
        size: { width: 900, height: 120 },
        style: {
          font: { fontSize: 15, fontFamily: 'Century Gothic, sans-serif', fontBold: true, fontColor: '#388E3C' },
          border: { enabled: true, borderWidth: 2, borderColor: '#66BB6A' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 18 },
          background: { enabled: true, backgroundColor: '#E8F5E8', backgroundOpacity: 0.4 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1300, y: 700 }, 
        size: { width: 900, height: 120 },
        style: {
          font: { fontSize: 14, fontFamily: 'Century Gothic, sans-serif', fontColor: '#2E2E2E' },
          border: { enabled: true, borderWidth: 1, borderColor: '#8BC34A' },
          format: { textAlign: 'right', padding: 12 },
          background: { enabled: true, backgroundColor: '#F1F8E9', backgroundOpacity: 0.6 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#388E3C', lineOpacity: 0.3 },
          cornerRadius: 8
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 1000 }, 
        size: { width: 900, height: 120 },
        style: {
          font: { fontSize: 16, fontFamily: 'Trebuchet MS, sans-serif', fontColor: '#388E3C' },
          border: { enabled: true, borderWidth: 1, borderColor: '#66BB6A' },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 22 },
          background: { enabled: true, backgroundColor: '#C8E6C9', backgroundOpacity: 0.3 },
          ruledLines: { enabled: true, lineWidth: 1.5, lineColor: '#4CAF50', lineOpacity: 0.5 },
          cornerRadius: 10
        }
      },
      { type: 'qna_inline', position: { x: 1300, y: 1000 }, size: { width: 900, height: 120 } },
      { type: 'qna_inline', position: { x: 200, y: 1300 }, size: { width: 900, height: 120 } },
      { type: 'qna_inline', position: { x: 1300, y: 1300 }, size: { width: 900, height: 120 } },
      { type: 'qna_inline', position: { x: 200, y: 1600 }, size: { width: 900, height: 120 } }
    ],
    elements: [
      { type: 'image', position: { x: 900, y: 2000 }, size: { width: 680, height: 500 } },
      { 
        type: 'shape', 
        position: { x: 100, y: 150 }, 
        size: { width: 70, height: 70 },
        shapeType: 'circle',
        style: {
          strokeWidth: 2,
          stroke: '#388E3C',
          fill: '#8BC34A',
          backgroundEnabled: true,
          inheritTheme: 'default'
        }
      },
      { type: 'shape', position: { x: 2300, y: 150 }, size: { width: 70, height: 70 }, shapeType: 'heart' },
      { type: 'shape', position: { x: 1200, y: 150 }, size: { width: 70, height: 70 }, shapeType: 'star' }
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
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 500 }, 
        size: { width: 1600, height: 100 },
        style: {
          font: { fontSize: 16, fontFamily: 'Helvetica, Arial, sans-serif', fontColor: '#6c757d' },
          border: { enabled: false },
          format: { textAlign: 'left', padding: 10 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 0.5, lineColor: '#90A4AE', lineOpacity: 0.3 },
          cornerRadius: 0
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 650 }, 
        size: { width: 1600, height: 100 },
        style: {
          font: { fontSize: 15, fontFamily: 'Helvetica, Arial, sans-serif', fontColor: '#607D8B' },
          border: { enabled: true, borderWidth: 1, borderColor: '#90A4AE' },
          format: { textAlign: 'center', padding: 8 },
          background: { enabled: true, backgroundColor: '#ECEFF1', backgroundOpacity: 0.2 },
          cornerRadius: 4
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 800 }, 
        size: { width: 1600, height: 100 },
        style: {
          font: { fontSize: 14, fontFamily: 'Helvetica, Arial, sans-serif', fontColor: '#6c757d' },
          border: { enabled: false },
          format: { textAlign: 'left', paragraphSpacing: 'small', padding: 6 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 0.8, lineColor: '#B0BEC5', lineOpacity: 0.4 },
          cornerRadius: 0
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 950 }, 
        size: { width: 1600, height: 100 },
        style: {
          font: { fontSize: 18, fontFamily: 'Helvetica, Arial, sans-serif', fontBold: true, fontColor: '#263238' },
          border: { enabled: true, borderWidth: 3, borderColor: '#607D8B' },
          format: { textAlign: 'right', paragraphSpacing: 'small', padding: 5 },
          background: { enabled: true, backgroundColor: '#CFD8DC', backgroundOpacity: 0.6 },
          ruledLines: { enabled: false },
          cornerRadius: 8
        }
      },
      { type: 'qna_inline', position: { x: 400, y: 1100 }, size: { width: 1600, height: 100 } },
      { type: 'qna_inline', position: { x: 400, y: 1250 }, size: { width: 1600, height: 100 } },
      { type: 'qna_inline', position: { x: 400, y: 1400 }, size: { width: 1600, height: 100 } },
      { type: 'qna_inline', position: { x: 400, y: 1550 }, size: { width: 1600, height: 100 } },
      { type: 'qna_inline', position: { x: 400, y: 1700 }, size: { width: 1600, height: 100 } },
      { type: 'qna_inline', position: { x: 400, y: 1850 }, size: { width: 1600, height: 100 } }
    ],
    elements: [
      { type: 'image', position: { x: 840, y: 2200 }, size: { width: 800, height: 600 } },
      { 
        type: 'shape', 
        position: { x: 200, y: 300 }, 
        size: { width: 80, height: 80 },
        shapeType: 'rect',
        style: {
          strokeWidth: 1,
          stroke: '#607D8B',
          fill: 'transparent',
          cornerRadius: 0,
          inheritTheme: 'default'
        }
      },
      { type: 'shape', position: { x: 2200, y: 300 }, size: { width: 80, height: 80 }, shapeType: 'circle' }
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
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 400 }, 
        size: { width: 600, height: 100 },
        style: {
          font: { fontSize: 18, fontFamily: "'Knewave', cursive", fontBold: true, fontColor: '#ff6b35' },
          border: { enabled: true, borderWidth: 3, borderColor: '#ff1744', borderTheme: 'glow' },
          format: { textAlign: 'left', padding: 16 },
          background: { enabled: true, backgroundColor: '#fff3e0', backgroundOpacity: 0.7 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1400, y: 350 }, 
        size: { width: 700, height: 120 },
        style: {
          font: { fontSize: 16, fontFamily: "'Knewave', cursive", fontBold: true, fontColor: '#ff6b35' },
          border: { enabled: true, borderWidth: 2, borderColor: '#ff1744', borderTheme: 'glow' },
          format: { textAlign: 'center', padding: 14 },
          background: { enabled: true, backgroundColor: '#fff3e0', backgroundOpacity: 0.5 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 800 }, 
        size: { width: 650, height: 110 },
        style: {
          font: { fontSize: 20, fontFamily: "'Knewave', cursive", fontBold: true, fontColor: '#E65100' },
          border: { enabled: true, borderWidth: 4, borderColor: '#FF5722', borderTheme: 'glow' },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 20 },
          background: { enabled: true, backgroundColor: '#FFF3E0', backgroundOpacity: 0.8 },
          cornerRadius: 20
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1300, y: 750 }, 
        size: { width: 600, height: 100 },
        style: {
          font: { fontSize: 14, fontFamily: "'Knewave', cursive", fontColor: '#FF9800' },
          border: { enabled: true, borderWidth: 2, borderColor: '#ff1744', borderTheme: 'glow' },
          format: { textAlign: 'right', padding: 16 },
          background: { enabled: true, backgroundColor: '#fff3e0', backgroundOpacity: 0.4 },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#FF5722', lineOpacity: 0.6, ruledLinesTheme: 'glow' },
          cornerRadius: 15
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 1200 }, 
        size: { width: 700, height: 120 },
        style: {
          font: { fontSize: 16, fontFamily: "'Knewave', cursive", fontBold: true, fontColor: '#ff6b35' },
          border: { enabled: true, borderWidth: 3, borderColor: '#ff1744', borderTheme: 'glow' },
          format: { textAlign: 'left', padding: 14 },
          background: { enabled: true, backgroundColor: '#fff3e0', backgroundOpacity: 0.5 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1200, y: 1150 }, 
        size: { width: 650, height: 110 },
        style: {
          font: { fontSize: 18, fontFamily: "'Knewave', cursive", fontBold: true, fontItalic: true, fontColor: '#FF9800' },
          border: { enabled: true, borderWidth: 5, borderColor: '#E65100', borderTheme: 'glow' },
          format: { textAlign: 'center', paragraphSpacing: 'medium', padding: 25 },
          background: { enabled: true, backgroundColor: '#FFF8E1', backgroundOpacity: 0.9 },
          ruledLines: { enabled: false },
          cornerRadius: 25
        }
      }
    ],
    elements: [
      { type: 'image', position: { x: 600, y: 1600 }, size: { width: 500, height: 400 } },
      { type: 'image', position: { x: 1300, y: 1600 }, size: { width: 500, height: 400 } },
      { 
        type: 'shape', 
        position: { x: 150, y: 200 }, 
        size: { width: 100, height: 100 },
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
        type: 'shape', 
        position: { x: 2200, y: 150 }, 
        size: { width: 120, height: 120 },
        shapeType: 'star',
        style: {
          strokeWidth: 4,
          stroke: '#ff1744',
          fill: '#fff3e0',
          inheritTheme: 'glow'
        }
      },
      { type: 'shape', position: { x: 100, y: 1000 }, size: { width: 80, height: 80 }, shapeType: 'circle' },
      { type: 'shape', position: { x: 2300, y: 950 }, size: { width: 90, height: 90 }, shapeType: 'smiley' },
      { type: 'shape', position: { x: 1100, y: 500 }, size: { width: 70, height: 70 }, shapeType: 'triangle' }
    ],
    constraints: {
      minQuestions: 6,
      maxQuestions: 10,
      imageSlots: 2,
      stickerSlots: 5
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
      { type: 'qna_inline', position: { x: 250, y: 500 }, size: { width: 800, height: 120 } },
      { type: 'qna_inline', position: { x: 1350, y: 450 }, size: { width: 750, height: 130 } },
      { type: 'qna_inline', position: { x: 300, y: 900 }, size: { width: 700, height: 110 } },
      { type: 'qna_inline', position: { x: 1400, y: 850 }, size: { width: 650, height: 120 } },
      { type: 'qna_inline', position: { x: 200, y: 1300 }, size: { width: 800, height: 100 } },
      { type: 'qna_inline', position: { x: 1300, y: 1250 }, size: { width: 700, height: 110 } },
      { type: 'qna_inline', position: { x: 500, y: 1650 }, size: { width: 600, height: 120 } }
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
      { type: 'qna_inline', position: { x: 400, y: 300 }, size: { width: 700, height: 130 } },
      { type: 'qna_inline', position: { x: 1200, y: 500 }, size: { width: 650, height: 120 } },
      { type: 'qna_inline', position: { x: 300, y: 750 }, size: { width: 600, height: 110 } },
      { type: 'qna_inline', position: { x: 1400, y: 900 }, size: { width: 700, height: 120 } },
      { type: 'qna_inline', position: { x: 200, y: 1200 }, size: { width: 750, height: 130 } },
      { type: 'qna_inline', position: { x: 1300, y: 1400 }, size: { width: 600, height: 100 } }
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
      { type: 'qna_inline', position: { x: 350, y: 400 }, size: { width: 650, height: 120 } },
      { type: 'qna_inline', position: { x: 1350, y: 350 }, size: { width: 700, height: 130 } },
      { type: 'qna_inline', position: { x: 250, y: 800 }, size: { width: 750, height: 110 } },
      { type: 'qna_inline', position: { x: 1250, y: 750 }, size: { width: 600, height: 120 } },
      { type: 'qna_inline', position: { x: 400, y: 1150 }, size: { width: 700, height: 130 } },
      { type: 'qna_inline', position: { x: 1400, y: 1100 }, size: { width: 650, height: 110 } }
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
      { type: 'qna_inline', position: { x: 500, y: 600 }, size: { width: 1400, height: 150 } },
      { type: 'qna_inline', position: { x: 500, y: 1000 }, size: { width: 1400, height: 150 } },
      { type: 'qna_inline', position: { x: 500, y: 1400 }, size: { width: 1400, height: 150 } }
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
      { type: 'qna_inline', position: { x: 400, y: 700 }, size: { width: 1600, height: 180 } },
      { type: 'qna_inline', position: { x: 400, y: 1200 }, size: { width: 1600, height: 180 } },
      { type: 'qna_inline', position: { x: 400, y: 1700 }, size: { width: 1600, height: 180 } },
      { type: 'qna_inline', position: { x: 400, y: 2200 }, size: { width: 1600, height: 180 } }
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
      { type: 'qna_inline', position: { x: 600, y: 800 }, size: { width: 1200, height: 200 } },
      { type: 'qna_inline', position: { x: 600, y: 1300 }, size: { width: 1200, height: 200 } },
      { type: 'qna_inline', position: { x: 600, y: 1800 }, size: { width: 1200, height: 200 } }
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
      { type: 'qna_inline', position: { x: 500, y: 900 }, size: { width: 1400, height: 200 } },
      { type: 'qna_inline', position: { x: 500, y: 1500 }, size: { width: 1400, height: 200 } },
      { type: 'qna_inline', position: { x: 500, y: 2100 }, size: { width: 1400, height: 200 } }
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
      { type: 'qna_inline', position: { x: 300, y: 400 }, size: { width: 800, height: 120 } },
      { type: 'qna_inline', position: { x: 1300, y: 350 }, size: { width: 700, height: 130 } },
      { type: 'qna_inline', position: { x: 200, y: 700 }, size: { width: 900, height: 110 } },
      { type: 'qna_inline', position: { x: 1200, y: 750 }, size: { width: 800, height: 120 } },
      { type: 'qna_inline', position: { x: 400, y: 1100 }, size: { width: 700, height: 130 } },
      { type: 'qna_inline', position: { x: 1400, y: 1050 }, size: { width: 600, height: 110 } },
      { type: 'qna_inline', position: { x: 300, y: 1400 }, size: { width: 800, height: 120 } },
      { type: 'qna_inline', position: { x: 1300, y: 1350 }, size: { width: 700, height: 130 } }
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
    id: 'playful-sketchy-1',
    name: 'Hand-drawn Fun',
    category: 'playful',
    thumbnail: '/templates/playful-sketchy-1.png',
    theme: 'sketchy',
    colorPalette: {
      primary: '#8b4513',
      secondary: '#f5deb3',
      accent: '#654321',
      background: '#faf9f7',
      text: '#654321'
    },
    background: {
      type: 'pattern',
      value: 'cross',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 250, y: 400 }, 
        size: { width: 700, height: 150 },
        style: {
          font: { fontSize: 18, fontFamily: 'Comic Sans MS, cursive', fontColor: '#654321' },
          border: { enabled: true, borderWidth: 2, borderColor: '#8b4513', borderTheme: 'wobbly' },
          format: { textAlign: 'left', padding: 15 },
          background: { enabled: true, backgroundColor: '#f5deb3', backgroundOpacity: 0.4 },
          cornerRadius: 18
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1200, y: 350 }, 
        size: { width: 800, height: 140 },
        style: {
          font: { fontSize: 16, fontFamily: 'Comic Sans MS, cursive', fontColor: '#654321' },
          border: { enabled: true, borderWidth: 1, borderColor: '#8b4513', borderTheme: 'wobbly' },
          format: { textAlign: 'left', padding: 12 },
          background: { enabled: true, backgroundColor: '#f5deb3', backgroundOpacity: 0.3 },
          ruledLines: { enabled: false, lineWidth: 0.8, lineColor: '#8b4513', ruledLinesTheme: 'wobbly' },
          cornerRadius: 18
        }
      }
    ],
    elements: [
      { 
        type: 'shape', 
        position: { x: 100, y: 150 }, 
        size: { width: 120, height: 120 },
        shapeType: 'dog',
        style: {
          strokeWidth: 3,
          stroke: '#8b4513',
          fill: '#f5deb3',
          inheritTheme: 'rough'
        }
      },
      { 
        type: 'shape', 
        position: { x: 2200, y: 200 }, 
        size: { width: 100, height: 100 },
        shapeType: 'cat',
        style: {
          strokeWidth: 3,
          stroke: '#8b4513',
          fill: '#f5deb3',
          inheritTheme: 'rough'
        }
      }
    ],
    constraints: {
      minQuestions: 4,
      maxQuestions: 8,
      imageSlots: 1,
      stickerSlots: 3
    }
  },
  {
    id: 'minimal-vintage-1',
    name: 'Vintage Elegance',
    category: 'minimal',
    thumbnail: '/templates/minimal-vintage-1.png',
    theme: 'vintage',
    colorPalette: {
      primary: '#8b4513',
      secondary: '#f5deb3',
      accent: '#654321',
      background: '#f7f3e9',
      text: '#8b4513'
    },
    background: {
      type: 'pattern',
      value: 'lines',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 500 }, 
        size: { width: 1600, height: 120 },
        style: {
          font: { fontSize: 71, fontFamily: "'Times New Roman', serif", fontItalic: true, fontColor: '#8b4513' },
          border: { enabled: true, borderWidth: 1, borderColor: '#654321', borderTheme: 'wobbly' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 14 },
          background: { enabled: true, backgroundColor: '#f5deb3', backgroundOpacity: 0.5 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#8b4513', lineOpacity: 0.6, ruledLinesTheme: 'wobbly' },
          cornerRadius: 14
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 700 }, 
        size: { width: 1600, height: 100 },
        style: {
          font: { fontSize: 62, fontFamily: "'Times New Roman', serif", fontItalic: true, fontColor: '#8b4513' },
          border: { enabled: true, borderWidth: 1, borderColor: '#654321', borderTheme: 'wobbly' },
          format: { textAlign: 'left', paragraphSpacing: 'large', padding: 12 },
          background: { enabled: true, backgroundColor: '#f5deb3', backgroundOpacity: 0.3 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#8b4513', lineOpacity: 0.6, ruledLinesTheme: 'wobbly' },
          cornerRadius: 14
        }
      }
    ],
    elements: [
      { 
        type: 'shape', 
        position: { x: 200, y: 200 }, 
        size: { width: 80, height: 80 },
        shapeType: 'rect',
        style: {
          strokeWidth: 2,
          stroke: '#654321',
          fill: '#f5deb3',
          cornerRadius: 4,
          inheritTheme: 'wobbly'
        }
      }
    ],
    constraints: {
      minQuestions: 6,
      maxQuestions: 10,
      imageSlots: 1,
      stickerSlots: 2
    }
  },
  {
    id: 'creative-dark-1',
    name: 'Neon Dreams',
    category: 'creative',
    thumbnail: '/templates/creative-dark-1.png',
    theme: 'dark',
    colorPalette: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00',
      background: '#000000',
      text: '#00ffff'
    },
    background: {
      type: 'color',
      value: '#000000',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 400 }, 
        size: { width: 1800, height: 150 },
        style: {
          font: { fontSize: 52, fontFamily: 'Audiowide, non-serif', fontColor: '#00ffff', fontOpacity: 0.5 },
          border: { enabled: true, borderWidth: 1, borderColor: '#ff00ff', borderTheme: 'glow' },
          format: { textAlign: 'left', padding: 14 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 4, lineColor: 'yellow', lineOpacity: 0.5, ruledLinesTheme: 'candy' },
          cornerRadius: 20
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 800 }, 
        size: { width: 1600, height: 120 },
        style: {
          font: { fontSize: 16, fontFamily: 'Consolas, monospace', fontBold: true, fontColor: '#00ffff', fontOpacity: 0.5 },
          border: { enabled: true, borderWidth: 15, borderColor: '#C0C0C0', borderTheme: 'candy' },
          format: { textAlign: 'left', padding: 10 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 12, lineColor: '#00ffff', lineOpacity: 0.3, ruledLinesTheme: 'zigzag' },
          cornerRadius: 0
        }
      }
    ],
    elements: [
      { 
        type: 'shape', 
        position: { x: 200, y: 200 }, 
        size: { width: 100, height: 100 },
        shapeType: 'circle',
        style: {
          strokeWidth: 10,
          stroke: '#ff00ff',
          fill: '#1a1a1a',
          opacity: 0.1,
          cornerRadius: 20,
          inheritTheme: 'zigzag'
        }
      },
      { 
        type: 'shape', 
        position: { x: 2100, y: 150 }, 
        size: { width: 120, height: 120 },
        shapeType: 'star',
        style: {
          strokeWidth: 8,
          stroke: '#ffff00',
          fill: 'transparent',
          inheritTheme: 'zigzag'
        }
      }
    ],
    constraints: {
      minQuestions: 4,
      maxQuestions: 8,
      imageSlots: 1,
      stickerSlots: 3
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
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 300 }, 
        size: { width: 700, height: 120 },
        style: {
          font: { fontSize: 58, fontFamily: 'Roboto, sans-serif', fontBold: true, fontColor: '#0277BD' },
          border: { enabled: true, borderWidth: 2, borderColor: '#03A9F4' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 15 },
          background: { enabled: true, backgroundColor: '#E1F5FE', backgroundOpacity: 0.4 },
          cornerRadius: 20
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1400, y: 500 }, 
        size: { width: 650, height: 110 },
        style: {
          font: { fontSize: 54, fontFamily: 'Georgia, serif', fontItalic: true, fontColor: '#1565C0' },
          border: { enabled: false },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 18 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#81D4FA', lineOpacity: 0.5 },
          cornerRadius: 15
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1300, y: 800 }, 
        size: { width: 700, height: 130 },
        style: {
          font: { fontSize: 62, fontFamily: 'Arial, sans-serif', fontColor: '#0288D1' },
          border: { enabled: true, borderWidth: 3, borderColor: '#29B6F6' },
          format: { textAlign: 'right', paragraphSpacing: 'small', padding: 12 },
          background: { enabled: true, backgroundColor: '#B3E5FC', backgroundOpacity: 0.6 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#4FC3F7', lineOpacity: 0.3 },
          cornerRadius: 25
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 800, y: 1100 }, 
        size: { width: 600, height: 120 },
        style: {
          font: { fontSize: 67, fontFamily: 'Consolas, monospace', fontBold: true, fontColor: '#01579B' },
          border: { enabled: true, borderWidth: 1, borderColor: '#0277BD' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 20 },
          background: { enabled: true, backgroundColor: '#E0F2F1', backgroundOpacity: 0.7 },
          cornerRadius: 8
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 1300 }, 
        size: { width: 750, height: 110 },
        style: {
          font: { fontSize: 50, fontFamily: 'Times New Roman, serif', fontItalic: true, fontColor: '#0097A7' },
          border: { enabled: false },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 14 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 3, lineColor: '#26C6DA', lineOpacity: 0.4 },
          cornerRadius: 30
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 200, y: 900 }, 
        size: { width: 650, height: 130 },
        style: {
          font: { fontSize: 58, fontFamily: 'Verdana, sans-serif', fontColor: '#00838F' },
          border: { enabled: true, borderWidth: 2, borderColor: '#00ACC1' },
          format: { textAlign: 'right', paragraphSpacing: 'small', padding: 16 },
          background: { enabled: true, backgroundColor: '#E0F7FA', backgroundOpacity: 0.5 },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#4DD0E1', lineOpacity: 0.6 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 500, y: 600 }, 
        size: { width: 700, height: 120 },
        style: {
          font: { fontSize: 71, fontFamily: 'Arial, sans-serif', fontBold: true, fontItalic: true, fontColor: '#006064' },
          border: { enabled: true, borderWidth: 4, borderColor: '#0097A7' },
          format: { textAlign: 'left', paragraphSpacing: 'large', padding: 22 },
          background: { enabled: true, backgroundColor: '#B2EBF2', backgroundOpacity: 0.8 },
          cornerRadius: 18
        }
      }
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
      { 
        type: 'qna_inline', 
        position: { x: 350, y: 450 }, 
        size: { width: 650, height: 130 },
        style: {
          font: { fontSize: 62, fontFamily: 'Comic Sans MS, cursive', fontBold: true, fontColor: '#558B2F' },
          border: { enabled: true, borderWidth: 3, borderColor: '#689F38' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 18 },
          background: { enabled: true, backgroundColor: '#F1F8E9', backgroundOpacity: 0.6 },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#9CCC65', lineOpacity: 0.4 },
          cornerRadius: 22
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1350, y: 400 }, 
        size: { width: 700, height: 120 },
        style: {
          font: { fontSize: 58, fontFamily: 'Georgia, serif', fontItalic: true, fontColor: '#33691E' },
          border: { enabled: false },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 20 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 3, lineColor: '#8BC34A', lineOpacity: 0.5 },
          cornerRadius: 0
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 250, y: 750 }, 
        size: { width: 800, height: 110 },
        style: {
          font: { fontSize: 54, fontFamily: 'Verdana, sans-serif', fontColor: '#689F38' },
          border: { enabled: true, borderWidth: 2, borderColor: '#7CB342' },
          format: { textAlign: 'right', paragraphSpacing: 'small', padding: 14 },
          background: { enabled: true, backgroundColor: '#E8F5E8', backgroundOpacity: 0.7 },
          cornerRadius: 16
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1250, y: 700 }, 
        size: { width: 650, height: 130 },
        style: {
          font: { fontSize: 67, fontFamily: 'Times New Roman, serif', fontBold: true, fontColor: '#2E7D32' },
          border: { enabled: true, borderWidth: 1, borderColor: '#4CAF50' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 16 },
          background: { enabled: true, backgroundColor: '#C8E6C9', backgroundOpacity: 0.5 },
          ruledLines: { enabled: true, lineWidth: 1, lineColor: '#66BB6A', lineOpacity: 0.3 },
          cornerRadius: 12
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 400, y: 1050 }, 
        size: { width: 700, height: 120 },
        style: {
          font: { fontSize: 71, fontFamily: 'Arial, sans-serif', fontItalic: true, fontColor: '#1B5E20' },
          border: { enabled: false },
          format: { textAlign: 'center', paragraphSpacing: 'large', padding: 22 },
          background: { enabled: false },
          ruledLines: { enabled: true, lineWidth: 4, lineColor: '#A5D6A7', lineOpacity: 0.6 },
          cornerRadius: 35
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1400, y: 1000 }, 
        size: { width: 600, height: 110 },
        style: {
          font: { fontSize: 50, fontFamily: 'Consolas, monospace', fontBold: true, fontColor: '#388E3C' },
          border: { enabled: true, borderWidth: 4, borderColor: '#43A047' },
          format: { textAlign: 'right', paragraphSpacing: 'small', padding: 10 },
          background: { enabled: true, backgroundColor: '#DCEDC8', backgroundOpacity: 0.8 },
          cornerRadius: 8
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 300, y: 1350 }, 
        size: { width: 750, height: 130 },
        style: {
          font: { fontSize: 58, fontFamily: 'Georgia, serif', fontBold: true, fontItalic: true, fontColor: '#4CAF50' },
          border: { enabled: true, borderWidth: 2, borderColor: '#66BB6A' },
          format: { textAlign: 'left', paragraphSpacing: 'medium', padding: 18 },
          background: { enabled: true, backgroundColor: '#F1F8E9', backgroundOpacity: 0.4 },
          ruledLines: { enabled: true, lineWidth: 2, lineColor: '#81C784', lineOpacity: 0.5 },
          cornerRadius: 20
        }
      },
      { 
        type: 'qna_inline', 
        position: { x: 1300, y: 1300 }, 
        size: { width: 650, height: 120 } }
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
      { type: 'qna_inline', position: { x: 200, y: 400 }, size: { width: 900, height: 120 } },
      { type: 'qna_inline', position: { x: 1400, y: 300 }, size: { width: 600, height: 130 } },
      { type: 'qna_inline', position: { x: 300, y: 700 }, size: { width: 700, height: 110 } },
      { type: 'qna_inline', position: { x: 1200, y: 650 }, size: { width: 800, height: 120 } },
      { type: 'qna_inline', position: { x: 500, y: 1000 }, size: { width: 650, height: 130 } },
      { type: 'qna_inline', position: { x: 1300, y: 950 }, size: { width: 700, height: 110 } },
      { type: 'qna_inline', position: { x: 200, y: 1300 }, size: { width: 800, height: 120 } },
      { type: 'qna_inline', position: { x: 1100, y: 1250 }, size: { width: 600, height: 130 } },
      { type: 'qna_inline', position: { x: 400, y: 1600 }, size: { width: 750, height: 110 } }
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
  },
  
  // SIMPLE LAYOUTS (migrated from layout-templates.ts)
  {
    id: 'simple-single-question',
    name: 'Single Question',
    category: 'structured',
    thumbnail: '/templates/simple-single-question.png',
    theme: 'default',
    colorPalette: {
      primary: '#1f2937',
      secondary: '#3d405b',
      accent: '#81b29a',
      background: '#ffffff',
      text: '#1f2937'
    },
    background: {
      type: 'color',
      value: '#ffffff',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 840, y: 1400 }, 
        size: { width: 800, height: 150 },
        layoutVariant: 'inline'
      }
    ],
    elements: [],
    constraints: {
      minQuestions: 1,
      maxQuestions: 1,
      imageSlots: 0,
      stickerSlots: 0
    }
  },
  {
    id: 'simple-two-column',
    name: 'Two Column',
    category: 'structured',
    thumbnail: '/templates/simple-two-column.png',
    theme: 'default',
    colorPalette: {
      primary: '#1f2937',
      secondary: '#3d405b',
      accent: '#81b29a',
      background: '#ffffff',
      text: '#1f2937'
    },
    background: {
      type: 'color',
      value: '#ffffff',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 340, y: 1200 }, 
        size: { width: 800, height: 150 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 1340, y: 1200 }, 
        size: { width: 800, height: 150 },
        layoutVariant: 'inline'
      }
    ],
    elements: [],
    constraints: {
      minQuestions: 2,
      maxQuestions: 2,
      imageSlots: 0,
      stickerSlots: 0
    }
  },
  {
    id: 'simple-grid-layout',
    name: 'Grid Layout',
    category: 'structured',
    thumbnail: '/templates/simple-grid-layout.png',
    theme: 'default',
    colorPalette: {
      primary: '#1f2937',
      secondary: '#3d405b',
      accent: '#81b29a',
      background: '#ffffff',
      text: '#1f2937'
    },
    background: {
      type: 'color',
      value: '#ffffff',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 340, y: 800 }, 
        size: { width: 800, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 1340, y: 800 }, 
        size: { width: 800, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 340, y: 1100 }, 
        size: { width: 800, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 1340, y: 1100 }, 
        size: { width: 800, height: 120 },
        layoutVariant: 'inline'
      }
    ],
    elements: [],
    constraints: {
      minQuestions: 4,
      maxQuestions: 4,
      imageSlots: 0,
      stickerSlots: 0
    }
  },
  {
    id: 'simple-interview-style',
    name: 'Interview Style',
    category: 'structured',
    thumbnail: '/templates/simple-interview-style.png',
    theme: 'default',
    colorPalette: {
      primary: '#1f2937',
      secondary: '#3d405b',
      accent: '#81b29a',
      background: '#ffffff',
      text: '#1f2937'
    },
    background: {
      type: 'color',
      value: '#ffffff',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 440, y: 600 }, 
        size: { width: 1600, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 440, y: 900 }, 
        size: { width: 1600, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 440, y: 1200 }, 
        size: { width: 1600, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 440, y: 1500 }, 
        size: { width: 1600, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 440, y: 1800 }, 
        size: { width: 1600, height: 120 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 440, y: 2100 }, 
        size: { width: 1600, height: 120 },
        layoutVariant: 'inline'
      }
    ],
    elements: [],
    constraints: {
      minQuestions: 6,
      maxQuestions: 6,
      imageSlots: 0,
      stickerSlots: 0
    }
  },
  {
    id: 'simple-mixed-content',
    name: 'Mixed Content',
    category: 'structured',
    thumbnail: '/templates/simple-mixed-content.png',
    theme: 'default',
    colorPalette: {
      primary: '#1f2937',
      secondary: '#3d405b',
      accent: '#81b29a',
      background: '#ffffff',
      text: '#1f2937'
    },
    background: {
      type: 'color',
      value: '#ffffff',
      enabled: true
    },
    textboxes: [
      { 
        type: 'qna_inline', 
        position: { x: 340, y: 400 }, 
        size: { width: 800, height: 140 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 340, y: 700 }, 
        size: { width: 800, height: 140 },
        layoutVariant: 'inline'
      },
      { 
        type: 'qna_inline', 
        position: { x: 340, y: 1200 }, 
        size: { width: 800, height: 140 },
        layoutVariant: 'inline'
      }
    ],
    elements: [
      { type: 'image', position: { x: 1380, y: 400 }, size: { width: 600, height: 450 } },
      { 
        type: 'shape', 
        position: { x: 1380, y: 900 }, 
        size: { width: 300, height: 300 },
        shapeType: 'heart',
        style: {
          strokeWidth: 2,
          stroke: '#1f2937',
          fill: 'transparent',
          inheritTheme: 'default'
        }
      }
    ],
    constraints: {
      minQuestions: 3,
      maxQuestions: 3,
      imageSlots: 1,
      stickerSlots: 1
    }
  }
];