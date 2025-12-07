/**
 * Gemeinsame Typen für Text-Layout-Funktionen
 * Werden sowohl Client- als auch Server-seitig verwendet
 */

export type ParagraphSpacing = 'small' | 'medium' | 'large';

export interface RichTextStyle {
  fontSize: number;
  fontFamily: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor?: string;
  fontOpacity?: number;
  paragraphSpacing?: ParagraphSpacing;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface TextLine {
  text: string;
  width: number;
}

export interface TextRun {
  text: string;
  x: number;
  y: number;
  style: RichTextStyle;
}

