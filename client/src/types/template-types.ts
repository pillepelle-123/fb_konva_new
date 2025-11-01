export type TemplateCategory = 'structured' | 'playful' | 'minimal' | 'creative';
export type ThemeVariant = 'default' | 'sketchy' | 'minimal' | 'colorful' | 'vintage' | 'dark';

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

export interface PageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  thumbnail: string;
  theme: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  background: {
    type: 'color' | 'pattern' | 'image';
    value: string;
    enabled: boolean;
  };
  textboxes: Array<{
    type: 'question' | 'answer' | 'text';
    position: { x: number; y: number };
    size: { width: number; height: number };
    style?: TextboxStyle;
    questionSettings?: Record<string, any>;
    answerSettings?: Record<string, any>;
    layoutVariant?: string;
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
}
