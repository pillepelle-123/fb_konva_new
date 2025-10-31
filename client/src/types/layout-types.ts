export interface LayoutElement {
  id: string;
  type: 'textbox-qna-inline' | 'shape' | 'image' | 'brush' | 'sticker';
  x: number;
  y: number;
  width: number;
  height: number;
  shapeType?: 'rect' | 'circle' | 'heart' | 'star' | 'triangle';
  stickerType?: string;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  elements: LayoutElement[];
}