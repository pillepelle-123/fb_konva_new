export type TemplateCategory = 'structured' | 'playful' | 'minimal' | 'creative';

export interface ColorPalette {
  id: string;
  name: string;
  colors: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
  contrast: 'AA' | 'AAA';
}

export interface ElementArrangement {
  pattern: 'grid' | 'scattered' | 'linear' | 'circular' | 'custom';
  spacing?: number;
  alignment?: 'left' | 'center' | 'right' | 'top' | 'bottom';
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
    questionSettings?: Record<string, any>;
    answerSettings?: Record<string, any>;
    layoutVariant?: string;
  }>;
  elements: Array<{
    type: 'image' | 'shape' | 'sticker';
    position: { x: number; y: number };
    size: { width: number; height: number };
    style?: Record<string, any>;
  }>;
  constraints: {
    minQuestions: number;
    maxQuestions: number;
    imageSlots: number;
    stickerSlots: number;
  };
}
