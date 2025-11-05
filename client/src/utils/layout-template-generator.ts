/**
 * Layout Template Generator für Freundebücher
 * Generiert Layout-Templates basierend auf Parametern
 */

import type { PageTemplate } from '../types/template-types';

// A4 Portrait Dimensions (300 DPI)
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const MM_TO_PX = 11.811; // 1mm = 11.811px bei 300 DPI

// Margins für Druck (gleichmäßig)
const MARGIN = 120; // ~10mm

// Abstände zwischen Elementen
const GAP = 60; // ~5mm

// Basis-Höhen für Textboxen (1-8 Textzeilen)
// Jede Höhe entspricht einer bestimmten Anzahl von Textzeilen
// Berücksichtigt Padding (15px oben und unten)
// Höhen sind deutlich größer, um die gesamte Seitenhöhe auszunutzen
const TEXTBOX_BASE_HEIGHTS: Record<number, number> = {
  1: 120 + 30,   // 1 Zeile + Padding (vorher 80)
  2: 180 + 30,   // 2 Zeilen + Padding (vorher 115)
  3: 240 + 30,   // 3 Zeilen + Padding (vorher 150)
  4: 300 + 30,   // 4 Zeilen + Padding (vorher 185)
  5: 360 + 30,   // 5 Zeilen + Padding (vorher 220)
  6: 420 + 30,   // 6 Zeilen + Padding (vorher 255)
  7: 480 + 30,   // 7 Zeilen + Padding (vorher 290)
  8: 540 + 30,   // 8 Zeilen + Padding (vorher 325)
};

// Bild-Aspektverhältnisse
const IMAGE_RATIOS: Record<string, [number, number]> = {
  '3:4': [3, 4],
  '4:3': [4, 3],
  '1:1': [1, 1],
  '3:2': [3, 2],
  '2:3': [2, 3],
  '16:9': [16, 9],
};

// Bildpositionen mit Beschreibungen
const IMAGE_POSITIONS: Record<string, { x: (imgWidth: number) => number, y: (imgHeight: number) => number }> = {
  'tl': { // top left
    x: () => MARGIN,
    y: () => MARGIN
  },
  'tr': { // top right
    x: (imgWidth) => A4_WIDTH - MARGIN - imgWidth,
    y: () => MARGIN
  },
  'bl': { // bottom left
    x: () => MARGIN,
    y: (imgHeight) => A4_HEIGHT - MARGIN - imgHeight
  },
  'br': { // bottom right
    x: (imgWidth) => A4_WIDTH - MARGIN - imgWidth,
    y: (imgHeight) => A4_HEIGHT - MARGIN - imgHeight
  },
  'ml': { // middle left
    x: () => MARGIN,
    y: (imgHeight) => (A4_HEIGHT - imgHeight) / 2
  },
  'mr': { // middle right
    x: (imgWidth) => A4_WIDTH - MARGIN - imgWidth,
    y: (imgHeight) => (A4_HEIGHT - imgHeight) / 2
  }
};

interface ImageConfig {
  position: string; // 'tl', 'tr', 'bl', 'br', 'ml', 'mr'
  ratio: string; // '3:4', '4:3', etc.
  widthCm: number; // 3.5, 4.5, 5, 6, etc.
}

interface LayoutConfig {
  columns: 1 | 2;
  heights: number[]; // Array von 1-8 (Textzeilen)
  images: ImageConfig[];
  category: 'structured' | 'playful' | 'creative' | 'minimal';
}

/**
 * Berechnet Bildgrößen in Pixeln
 */
function calculateImageSize(widthCm: number, ratio: [number, number]): { width: number, height: number } {
  const widthPx = widthCm * 10 * MM_TO_PX; // cm zu mm zu px
  const heightPx = (widthPx / ratio[0]) * ratio[1];
  return { width: widthPx, height: heightPx };
}

/**
 * Generiert eine Layout-ID basierend auf der Konfiguration
 */
function generateLayoutId(config: LayoutConfig): string {
  const colPart = config.columns === 1 ? '1col' : '2col';
  const heightsPart = config.heights.join('-');
  const imagePart = config.images.length > 0 
    ? `img-${config.images.length}-${config.images.map(img => 
        `${img.position}-${img.ratio}-${img.widthCm.toString().replace('.', ',')}`
      ).join('-')}`
    : 'img-0';
  
  return `qna-${colPart}-${heightsPart}-${imagePart}`;
}

/**
 * Generiert einen lesbaren Namen aus der ID
 */
function generateLayoutName(id: string): string {
  const parts = id.split('-');
  let name = 'Questions: ';
  
  // Spalten
  const colIdx = parts.indexOf('1col') !== -1 ? parts.indexOf('1col') : parts.indexOf('2col');
  if (colIdx !== -1) {
    const colCount = parts[colIdx] === '1col' ? '1' : '2';
    name += `${colCount} column`;
    
    // Höhen
    const heights: string[] = [];
    for (let i = colIdx + 1; i < parts.length; i++) {
      if (parts[i] === 'img') break;
      if (!isNaN(Number(parts[i]))) {
        heights.push(parts[i]);
      }
    }
    if (heights.length > 0) {
      name += ` ${heights.join('-')}`;
    }
  }
  
  // Bilder
  const imgIdx = parts.indexOf('img');
  if (imgIdx !== -1 && parts[imgIdx + 1] !== '0') {
    const imgCount = parts[imgIdx + 1];
    name += `; Image${imgCount !== '1' ? 's' : ''}: ${imgCount}`;
    
    // Parse Bild-Informationen
    let imgInfoIdx = imgIdx + 2;
    for (let i = 0; i < parseInt(imgCount); i++) {
      if (imgInfoIdx >= parts.length) break;
      const pos = parts[imgInfoIdx];
      const ratio = parts[imgInfoIdx + 1];
      const width = parts[imgInfoIdx + 2]?.replace(',', '.');
      
      const posNames: Record<string, string> = {
        'tl': 'top left',
        'tr': 'top right',
        'bl': 'bottom left',
        'br': 'bottom right',
        'ml': 'middle left',
        'mr': 'middle right'
      };
      
      name += ` ${posNames[pos] || pos} ${ratio} ratio ${width}cm wide`;
      imgInfoIdx += 3;
    }
  }
  
  return name;
}

/**
 * Berechnet Textbox-Positionen unter Berücksichtigung von Bildern
 * Verteilte die Textboxen gleichmäßig über die gesamte verfügbare Seitenhöhe
 */
function calculateTextboxPositions(
  config: LayoutConfig,
  imageRects: Array<{ x: number, y: number, width: number, height: number }>
): Array<{ x: number, y: number, width: number, height: number }> {
  const textboxes: Array<{ x: number, y: number, width: number, height: number }> = [];
  const contentWidth = A4_WIDTH - 2 * MARGIN;
  const contentHeight = A4_HEIGHT - 2 * MARGIN; // Verfügbare Höhe
  
  // Berechne Basis-Höhen für alle Textboxen
  const baseHeights = config.heights.map(h => TEXTBOX_BASE_HEIGHTS[h] || TEXTBOX_BASE_HEIGHTS[1]);
  
  // Berechne Gesamthöhe aller Textboxen (inkl. Gaps)
  const totalGaps = (baseHeights.length - 1) * GAP;
  const totalBaseHeight = baseHeights.reduce((sum, h) => sum + h, 0);
  const totalHeightWithGaps = totalBaseHeight + totalGaps;
  
  // Skaliere Höhen, um 85-90% der verfügbaren Höhe zu nutzen
  // Berücksichtige dabei, dass Bilder Platz einnehmen können
  const availableHeightForTextboxes = contentHeight * 0.88; // 88% der verfügbaren Höhe
  const scaleFactor = availableHeightForTextboxes / totalHeightWithGaps;
  
  // Skaliere alle Höhen
  const scaledHeights = baseHeights.map(h => h * scaleFactor);
  const scaledGap = GAP * scaleFactor;
  
  if (config.columns === 1) {
    // 1-Spalten-Layout - verteile gleichmäßig über die Höhe
    const textboxWidth = contentWidth;
    
    // Berechne Start-Y basierend auf gleichmäßiger Verteilung
    const totalScaledHeight = scaledHeights.reduce((sum, h) => sum + h, 0) + (scaledHeights.length - 1) * scaledGap;
    const startY = MARGIN + (contentHeight - totalScaledHeight) / 2; // Zentriert vertikal
    
    let currentY = startY;
    
    for (let i = 0; i < config.heights.length; i++) {
      const textboxHeight = scaledHeights[i];
      
      // Prüfe ob Textbox mit Bild kollidiert
      let x = MARGIN;
      let adjustedWidth = textboxWidth;
      
      for (const imgRect of imageRects) {
        // Wenn Textbox in vertikalem Bereich des Bildes ist
        if (currentY < imgRect.y + imgRect.height && currentY + textboxHeight > imgRect.y) {
          // Bild ist links
          if (imgRect.x < A4_WIDTH / 2) {
            x = imgRect.x + imgRect.width + GAP;
            adjustedWidth = A4_WIDTH - MARGIN - x;
          } else {
            // Bild ist rechts
            adjustedWidth = imgRect.x - GAP - MARGIN;
          }
          break;
        }
      }
      
      textboxes.push({
        x,
        y: currentY,
        width: adjustedWidth,
        height: textboxHeight
      });
      
      currentY += textboxHeight + scaledGap;
    }
  } else {
    // 2-Spalten-Layout (50/50) - verteile gleichmäßig über die Höhe
    const columnWidth = (contentWidth - GAP) / 2;
    
    // Berechne Anzahl der Zeilen
    const rowCount = Math.ceil(config.heights.length / 2);
    const rowHeights: number[] = [];
    
    for (let i = 0; i < config.heights.length; i += 2) {
      const leftHeight = scaledHeights[i];
      const rightHeight = scaledHeights[i + 1] || leftHeight;
      rowHeights.push(Math.max(leftHeight, rightHeight));
    }
    
    // Berechne Start-Y basierend auf gleichmäßiger Verteilung
    const totalScaledHeight = rowHeights.reduce((sum, h) => sum + h, 0) + (rowHeights.length - 1) * scaledGap;
    const startY = MARGIN + (contentHeight - totalScaledHeight) / 2; // Zentriert vertikal
    
    let currentY = startY;
    let row = 0;
    
    for (let i = 0; i < config.heights.length; i += 2) {
      const leftHeight = scaledHeights[i];
      const rightHeight = scaledHeights[i + 1] || leftHeight;
      const rowHeight = Math.max(leftHeight, rightHeight);
      
      // Linke Spalte
      let leftX = MARGIN;
      let leftWidth = columnWidth;
      
      // Rechte Spalte
      let rightX = MARGIN + columnWidth + GAP;
      let rightWidth = columnWidth;
      
      // Prüfe Kollisionen mit Bildern
      for (const imgRect of imageRects) {
        if (currentY < imgRect.y + imgRect.height && currentY + rowHeight > imgRect.y) {
          if (imgRect.x < A4_WIDTH / 2) {
            // Bild überlappt linke Spalte
            leftX = imgRect.x + imgRect.width + GAP;
            leftWidth = MARGIN + columnWidth - leftX;
          } else {
            // Bild überlappt rechte Spalte
            rightWidth = imgRect.x - GAP - rightX;
          }
        }
      }
      
      // Linke Textbox
      textboxes.push({
        x: leftX,
        y: currentY,
        width: leftWidth,
        height: leftHeight
      });
      
      // Rechte Textbox (wenn vorhanden)
      if (i + 1 < config.heights.length) {
        textboxes.push({
          x: rightX,
          y: currentY,
          width: rightWidth,
          height: rightHeight
        });
      }
      
      currentY += rowHeight + scaledGap;
      row++;
    }
  }
  
  return textboxes;
}

/**
 * Generiert Theme basierend auf Kategorie
 */
function getThemeForCategory(category: string): string {
  const themeMap: Record<string, string> = {
    'structured': 'default',
    'playful': 'sketchy',
    'creative': 'colorful',
    'minimal': 'minimal'
  };
  return themeMap[category] || 'default';
}

/**
 * Generiert Color Palette basierend auf Kategorie
 */
function getColorPaletteForCategory(category: string) {
  const palettes: Record<string, any> = {
    'structured': {
      primary: '#1976D2',
      secondary: '#42A5F5',
      accent: '#81C784',
      background: '#FFFFFF',
      text: '#1A1A1A'
    },
    'playful': {
      primary: '#E65100',
      secondary: '#FF5722',
      accent: '#FF9800',
      background: '#FFF3E0',
      text: '#1A1A1A'
    },
    'creative': {
      primary: '#7B1FA2',
      secondary: '#9C27B0',
      accent: '#BA68C8',
      background: '#F3E5F5',
      text: '#1A1A1A'
    },
    'minimal': {
      primary: '#424242',
      secondary: '#757575',
      accent: '#BDBDBD',
      background: '#FFFFFF',
      text: '#212121'
    }
  };
  return palettes[category] || palettes.structured;
}

/**
 * Generiert Font-Settings basierend auf Kategorie
 */
function getFontSettingsForCategory(category: string, height: number, index: number, total: number) {
  const baseSize = 12;
  let fontSize = baseSize;
  
  // Für playful/creative kann die Schriftgröße variieren
  if (category === 'playful' || category === 'creative') {
    // Variation basierend auf Index: ±2
    fontSize = baseSize + ((index % 5) - 2);
  }
  
  // Für structured/minimal kann es selten Highlights geben (jeder 10. Textbox)
  if ((category === 'structured' || category === 'minimal') && index % 10 === 5) {
    fontSize = baseSize + 2;
  }
  
  return {
    fontSize,
    fontFamily: category === 'playful' ? 'Comic Sans MS, cursive' : 
                category === 'minimal' ? 'Helvetica, Arial, sans-serif' :
                'Century Gothic, sans-serif',
    fontColor: '#1A1A1A',
    fontBold: false,
    fontItalic: false,
    fontOpacity: 1
  };
}

/**
 * Hauptfunktion: Generiert ein Layout-Template
 */
export function generateLayoutTemplate(config: LayoutConfig): PageTemplate {
  // Berechne Bild-Positionen und -Größen
  const imageRects: Array<{ x: number, y: number, width: number, height: number }> = [];
  const imageElements: any[] = [];
  
  for (const imgConfig of config.images) {
    const ratio = IMAGE_RATIOS[imgConfig.ratio] || [3, 4];
    const { width, height } = calculateImageSize(imgConfig.widthCm, ratio);
    const position = IMAGE_POSITIONS[imgConfig.position];
    
    if (position) {
      const x = position.x(width);
      const y = position.y(height);
      
      imageRects.push({ x, y, width, height });
      imageElements.push({
        type: 'image',
        position: { x, y },
        size: { width, height },
        style: { cornerRadius: 0 }
      });
    }
  }
  
  // Berechne Textbox-Positionen
  const textboxRects = calculateTextboxPositions(config, imageRects);
  
  // Erstelle Textbox-Elemente
  const textboxes = textboxRects.map((rect, index) => {
    const height = config.heights[index] || 1;
    const fontSettings = getFontSettingsForCategory(config.category, height, index, config.heights.length);
    
    return {
      type: 'qna_inline' as const,
      position: { x: rect.x, y: rect.y },
      size: { width: rect.width, height: rect.height },
      questionSettings: {
        fontSize: fontSettings.fontSize + 6, // Fragen etwas größer
        fontFamily: fontSettings.fontFamily,
        fontColor: fontSettings.fontColor,
        fontBold: false,
        fontItalic: false,
        fontOpacity: 1
      },
      answerSettings: {
        fontSize: fontSettings.fontSize,
        fontFamily: fontSettings.fontFamily,
        fontColor: fontSettings.fontColor,
        fontBold: false,
        fontItalic: false,
        fontOpacity: 1
      },
      layoutVariant: 'inline' as const,
      style: {
        font: {
          fontSize: fontSettings.fontSize,
          fontFamily: fontSettings.fontFamily,
          fontColor: fontSettings.fontColor,
          fontBold: false,
          fontItalic: false,
          fontOpacity: 1
        },
        border: {
          enabled: config.category === 'playful' || config.category === 'sketchy',
          borderWidth: config.category === 'playful' ? 5 : 2,
          borderColor: '#424242',
          borderOpacity: 1,
          borderTheme: config.category === 'playful' ? 'sketchy' : 'default'
        },
        background: {
          enabled: config.category === 'playful' || config.category === 'creative',
          backgroundColor: '#BDBDBD',
          backgroundOpacity: config.category === 'playful' ? 0.3 : 0.2
        },
        format: {
          textAlign: 'left' as const,
          paragraphSpacing: 'medium' as const,
          padding: 15
        },
        cornerRadius: config.category === 'playful' ? 18 : 0
      }
    };
  });
  
  // Generiere ID und Name
  const id = generateLayoutId(config);
  const name = generateLayoutName(id);
  
  // Erstelle Template
  const template: PageTemplate = {
    id,
    name,
    category: config.category,
    thumbnail: '/templates/default.png',
    theme: getThemeForCategory(config.category),
    colorPalette: getColorPaletteForCategory(config.category),
    background: {
      type: 'color',
      value: getColorPaletteForCategory(config.category).background,
      enabled: true
    },
    textboxes,
    elements: imageElements,
    constraints: {
      minQuestions: config.heights.length,
      maxQuestions: config.heights.length + 3,
      imageSlots: config.images.length,
      stickerSlots: 0
    },
    baseSize: {
      width: A4_WIDTH,
      height: A4_HEIGHT
    }
  };
  
  return template;
}

