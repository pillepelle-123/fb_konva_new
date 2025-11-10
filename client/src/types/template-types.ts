export type TemplateCategory = 'structured' | 'playful' | 'minimal' | 'creative';
export type ThemeVariant = 'default' | 'sketchy' | 'minimal' | 'colorful' | 'vintage' | 'dark';
export type BackgroundImageCategory = 
  | 'geometric'
  | 'nature'
  | 'abstract'
  | 'decorative'
  | 'texture'
  | 'minimal'
  | 'pattern'
  | 'floral';

export interface ColorPalette {
  id: string;
  name: string;
  colors: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    surface: string; // Added for compatibility with global-palettes usage
  };
  contrast: 'AA' | 'AAA';
}

export interface ElementArrangement {
  pattern: 'grid' | 'scattered' | 'linear' | 'circular' | 'custom';
  spacing?: number;
  alignment?: 'left' | 'center' | 'right' | 'top' | 'bottom';
}

export interface TextboxStyle {
  font?: {
    fontSize?: number;
    fontFamily?: string;
    fontBold?: boolean;
    fontItalic?: boolean;
    fontColor?: string;
    fontOpacity?: number;
  };
  border?: {
    enabled?: boolean;
    borderWidth?: number;
    borderColor?: string;
    borderOpacity?: number;
    borderTheme?: string;
  };
  format?: {
    textAlign?: 'left' | 'center' | 'right';
    paragraphSpacing?: 'small' | 'medium' | 'large';
    padding?: number;
  };
  background?: {
    enabled?: boolean;
    backgroundColor?: string;
    backgroundOpacity?: number;
  };
  ruledLines?: {
    enabled?: boolean;
    lineWidth?: number;
    lineColor?: string;
    lineOpacity?: number;
    ruledLinesTheme?: string;
  };
  cornerRadius?: number;
}

export interface ShapeStyle {
  strokeWidth?: number;
  cornerRadius?: number;
  stroke?: string;
  fill?: string;
  opacity?: number;
  inheritTheme?: string;
  borderEnabled?: boolean;
  backgroundEnabled?: boolean;
}

export interface TemplateMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit?: 'percent' | 'mm' | 'px';
}

export interface FontScaling {
  baseFontSize?: number;  // Referenz-Font-Size für Basis-Seitengröße
  scaleFactor?: number;   // Multiplikator für Seitengröße (optional, wird automatisch berechnet)
}

export interface TemplateConstraints {
  minQuestions?: number | ((pageSize: string) => number);
  maxQuestions?: number | ((pageSize: string) => number);
  imageSlots?: number | ((pageSize: string) => number);
  stickerSlots?: number | ((pageSize: string) => number);
}

export interface PageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  thumbnail: string;
  // theme, colorPalette, and background are NOT layout properties - they are managed by themes.json and color-palettes.json
  columns?: number; // 1 or 2, extracted from layout ID (e.g., "qna-1col-..." or "qna-2col-...")
  textboxes: Array<{
    type: 'question' | 'answer' | 'text' | 'qna_inline';
    position: { x: number; y: number };
    size: { width: number; height: number };
    style?: TextboxStyle;
    questionSettings?: Record<string, unknown>;
    answerSettings?: Record<string, unknown>;
    layoutVariant?: string;
    questionPosition?: string; // 'left' | 'right' | 'top' (layout property)
    questionWidth?: number; // Percentage (layout property)
  }>;
  elements: Array<{
    type: 'image' | 'shape' | 'sticker';
    position: { x: number; y: number };
    size: { width: number; height: number };
    style?: ShapeStyle;
    shapeType?: string;
  }>;
  constraints: {
    minQuestions: number;
    maxQuestions: number;
    imageSlots: number;
    stickerSlots: number;
  };
  // Neue Felder für responsive Templates
  baseSize?: { width: number; height: number }; // Referenzgröße (z.B. A4 Portrait: 2480x3508)
  margins?: TemplateMargins;
  fontScaling?: FontScaling;
  // Erweiterte Constraints (optional, überschreibt constraints wenn vorhanden)
  dynamicConstraints?: TemplateConstraints;
}

export interface BackgroundImage {
  id: string;
  name: string;
  category: BackgroundImageCategory;
  format: 'vector' | 'pixel';
  filePath: string;
  thumbnail: string;
  defaultSize: 'cover' | 'contain' | 'contain-repeat' | 'stretch';
  backgroundColor?: {
    enabled: boolean;
    defaultValue?: string;
  };
  paletteSlots?: 'standard' | 'auto';
  description?: string;
  tags?: string[];
}

export interface BackgroundImageWithUrl extends BackgroundImage {
  url: string;
  thumbnailUrl: string;
}

/**
 * Quick Template - vollständiges Komplettpaket für schnellen Einstieg
 * Erweitert PageTemplate um explizite Palette- und Background-Image-Referenzen
 */
export interface QuickTemplate extends PageTemplate {
  // Quick Template spezifische Felder (optional, für Kompatibilität)
  paletteId?: string;              // Explizite Color Palette ID (wenn vorhanden, überschreibt colorPalette)
  backgroundImageId?: string;      // Optional: Background Image ID für Template
  quickTemplateDescription?: string; // Beschreibung für Quick Template
}
