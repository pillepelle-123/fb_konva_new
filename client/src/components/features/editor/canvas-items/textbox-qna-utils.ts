import type { CanvasElement } from '../../../context/editor-context';
import type { RichTextStyle } from '../../../../../shared/types/text-layout';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';

type QnaSettings = {
  fontSize?: number;
  fontFamily?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor?: string;
  fontOpacity?: number;
  paragraphSpacing?: 'small' | 'medium' | 'large';
  align?: 'left' | 'center' | 'right' | 'justify';
};

interface QnaCanvasElement extends CanvasElement {
  questionSettings?: QnaSettings;
  answerSettings?: QnaSettings;
  qnaIndividualSettings?: boolean;
  layoutVariant?: 'inline' | 'block';
}

interface Page {
  themeId?: string;
  background?: { pageTheme?: string };
  colorPaletteId?: string;
  layoutTemplateId?: string;
}

interface Book {
  themeId?: string;
  bookTheme?: string;
  colorPaletteId?: string;
  layoutTemplateId?: string;
}

/**
 * Calculate question style for a QNA element
 * Replicates the logic from TextboxQna component's questionStyle useMemo
 */
export function calculateQuestionStyle(
  element: CanvasElement,
  currentPage: Page | undefined,
  currentBook: Book | undefined
): RichTextStyle {
  const qnaElement = element as QnaCanvasElement;
  
  // Get theme information
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || currentBook?.bookTheme || currentBook?.themeId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = currentBook?.colorPaletteId;
  
  // Get QNA defaults
  const activeTheme = pageTheme || bookTheme || 'default';
  const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
  const qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna', effectivePaletteId);
  
  const layoutVariant = qnaElement.layoutVariant || 'inline';
  const individualSettings = qnaElement.qnaIndividualSettings ?? false;
  
  // Determine align: if inline OR (block without individual settings), use shared align
  // Otherwise use individual question align
  let align: 'left' | 'center' | 'right' | 'justify' = 'left';
  if (layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
    // Shared align: check element.align, element.format?.textAlign, questionSettings.align, answerSettings.align
    align = (element.align || (element as any).format?.textAlign || qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || 'left') as 'left' | 'center' | 'right' | 'justify';
  } else {
    // Individual align: use questionSettings.align
    align = (qnaElement.questionSettings?.align || element.align || (element as any).format?.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
  }
  
  // Use spread operator to set defaults first, then override with element settings
  const style = {
    ...qnaDefaults.questionSettings,
    ...qnaElement.questionSettings,
    fontSize: qnaElement.questionSettings?.fontSize ?? qnaDefaults.questionSettings?.fontSize ?? qnaDefaults.fontSize ?? 58,
    fontFamily: qnaElement.questionSettings?.fontFamily || qnaDefaults.questionSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
    fontBold: qnaElement.questionSettings?.fontBold ?? qnaDefaults.questionSettings?.fontBold ?? false,
    fontItalic: qnaElement.questionSettings?.fontItalic ?? qnaDefaults.questionSettings?.fontItalic ?? false,
    fontOpacity: qnaElement.questionSettings?.fontOpacity ?? qnaDefaults.questionSettings?.fontOpacity ?? 1,
    paragraphSpacing: qnaElement.questionSettings?.paragraphSpacing || qnaDefaults.questionSettings?.paragraphSpacing || element.paragraphSpacing || 'small',
    align
  } as RichTextStyle;
  
  // Direct color override - element settings have absolute priority
  if (qnaElement.questionSettings?.fontColor) {
    style.fontColor = qnaElement.questionSettings.fontColor;
  }
  
  return style;
}

/**
 * Calculate answer style for a QNA element
 * Replicates the logic from TextboxQna component's answerStyle useMemo
 */
export function calculateAnswerStyle(
  element: CanvasElement,
  currentPage: Page | undefined,
  currentBook: Book | undefined
): RichTextStyle {
  const qnaElement = element as QnaCanvasElement;
  
  // Get theme information
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || currentBook?.bookTheme || currentBook?.themeId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = currentBook?.colorPaletteId;
  
  // Get QNA defaults
  const activeTheme = pageTheme || bookTheme || 'default';
  const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
  const qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna', effectivePaletteId);
  
  const layoutVariant = qnaElement.layoutVariant || 'inline';
  const individualSettings = qnaElement.qnaIndividualSettings ?? false;
  
  // Determine align: if inline OR (block without individual settings), use shared align
  // Otherwise use individual answer align
  let align: 'left' | 'center' | 'right' | 'justify' = 'left';
  if (layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
    // Shared align: check element.align, element.format?.textAlign, questionSettings.align, answerSettings.align
    align = (element.align || (element as any).format?.textAlign || qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || 'left') as 'left' | 'center' | 'right' | 'justify';
  } else {
    // Individual align: use answerSettings.align
    align = (qnaElement.answerSettings?.align || element.align || (element as any).format?.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
  }
  
  // Use spread operator to set defaults first, then override with element settings
  const style = {
    ...qnaDefaults.answerSettings,
    ...qnaElement.answerSettings,
    fontSize: qnaElement.answerSettings?.fontSize ?? qnaDefaults.answerSettings?.fontSize ?? qnaDefaults.fontSize ?? 50,
    fontFamily: qnaElement.answerSettings?.fontFamily || qnaDefaults.answerSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
    fontBold: qnaElement.answerSettings?.fontBold ?? qnaDefaults.answerSettings?.fontBold ?? false,
    fontItalic: qnaElement.answerSettings?.fontItalic ?? qnaDefaults.answerSettings?.fontItalic ?? false,
    fontOpacity: qnaElement.answerSettings?.fontOpacity ?? qnaDefaults.answerSettings?.fontOpacity ?? 1,
    paragraphSpacing: qnaElement.answerSettings?.paragraphSpacing || qnaDefaults.answerSettings?.paragraphSpacing || element.paragraphSpacing || 'medium',
    align
  } as RichTextStyle;
  
  // Direct color override - element settings have absolute priority
  if (qnaElement.answerSettings?.fontColor) {
    style.fontColor = qnaElement.answerSettings.fontColor;
  }
  
  return style;
}

/**
 * Parse question payload (JSON string) to extract text
 */
export function parseQuestionPayload(payload: string | undefined | null): string {
  if (!payload) return '';
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && parsed.text) {
      return parsed.text as string;
    }
  } catch {
    // ignore
  }
  return payload;
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(text: string): string {
  if (!text) return '';
  if (typeof document === 'undefined') {
    return text.replace(/<[^>]+>/g, '');
  }
  const temp = document.createElement('div');
  temp.innerHTML = text;
  return temp.textContent || temp.innerText || '';
}
