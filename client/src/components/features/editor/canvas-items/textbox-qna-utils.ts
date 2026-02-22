import type { CanvasElement } from '../../../../context/editor-context';
import type { RichTextStyle, TextSegment } from '../../../../../../shared/types/text-layout';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { commonToActual } from '../../../../utils/font-size-converter';
import { parseHtmlToSegments } from '../../../../../../shared/utils/rich-text-layout';

/** FontSize aus "common" (8–24) in "actual" (33+) konvertieren, falls nötig. Siehe font-size-converter. */
function ensureActualFontSize(value: number, isQna2: boolean): number {
  if (!isQna2) return value;
  // Common-Werte sind typisch 8–24; actual-Werte ab ~33 (commonToActual(8)=33)
  if (value > 0 && value <= 24) return commonToActual(value);
  return value;
}

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
  textSettings?: QnaSettings & { padding?: number };
  qnaIndividualSettings?: boolean;
  layoutVariant?: 'inline' | 'block';
}

interface Page {
  themeId?: string;
  background?: { pageTheme?: string };
  colorPaletteId?: string;
  layoutId?: string;
}

interface Book {
  themeId?: string;
  bookTheme?: string;
  colorPaletteId?: string;
  layoutId?: string;
}

/**
 * Calculate question style for a QNA or QnA2 element
 * Replicates the logic from TextboxQna component's questionStyle useMemo
 */
export function calculateQuestionStyle(
  element: CanvasElement,
  currentPage: Page | undefined,
  currentBook: Book | undefined
): RichTextStyle {
  const qnaElement = element as QnaCanvasElement;
  const isQna2 = element.textType === 'qna2';

  // Get theme information
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || currentBook?.bookTheme || currentBook?.themeId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = currentBook?.colorPaletteId;

  // Get defaults (qna vs qna2)
  const activeTheme = pageTheme || bookTheme || 'default';
  const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
  const toolDefaults = getGlobalThemeDefaults(activeTheme, isQna2 ? 'qna2' : 'qna', effectivePaletteId);
  // qna2 nutzt nun wie qna questionSettings/answerSettings aus dem Theme
  const qnaDefaults = toolDefaults;

  const layoutVariant = qnaElement.layoutVariant || 'inline';
  const individualSettings = qnaElement.qnaIndividualSettings ?? false;

  // For qna2: always inline, no block layout
  let align: 'left' | 'center' | 'right' | 'justify' = 'left';
  if (isQna2 || layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
    const ts = qnaElement.textSettings || {};
    align = (element.align || (element as any).format?.textAlign || qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || ts.align || 'left') as 'left' | 'center' | 'right' | 'justify';
  } else {
    align = (qnaElement.questionSettings?.align || element.align || (element as any).format?.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
  }

  const qSettings = qnaElement.questionSettings || {};
  const tSettings = qnaElement.textSettings || {};
  const defQ = qnaDefaults.questionSettings || {};
  const rawFontSize = qSettings.fontSize ?? tSettings.fontSize ?? defQ.fontSize ?? (isQna2 ? 50 : 58);
  const style = {
    ...defQ,
    ...qSettings,
    fontSize: ensureActualFontSize(rawFontSize, isQna2),
    fontFamily: qSettings.fontFamily || tSettings.fontFamily || defQ.fontFamily || 'Arial, sans-serif',
    fontBold: qSettings.fontBold ?? tSettings.fontBold ?? defQ.fontBold ?? false,
    fontItalic: qSettings.fontItalic ?? tSettings.fontItalic ?? defQ.fontItalic ?? false,
    fontOpacity: qSettings.fontOpacity ?? tSettings.fontOpacity ?? defQ.fontOpacity ?? 1,
    paragraphSpacing: qSettings.paragraphSpacing || tSettings.paragraphSpacing || element.paragraphSpacing || (isQna2 ? 'medium' : 'small'),
    align
  } as RichTextStyle;

  if (qSettings.fontColor ?? tSettings.fontColor) {
    style.fontColor = qSettings.fontColor ?? tSettings.fontColor;
  }

  return style;
}

/**
 * Calculate answer style for a QNA or QnA2 element
 * Replicates the logic from TextboxQna component's answerStyle useMemo
 */
export function calculateAnswerStyle(
  element: CanvasElement,
  currentPage: Page | undefined,
  currentBook: Book | undefined
): RichTextStyle {
  const qnaElement = element as QnaCanvasElement;
  const isQna2 = element.textType === 'qna2';

  // Get theme information
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || currentBook?.bookTheme || currentBook?.themeId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = currentBook?.colorPaletteId;

  // Get defaults (qna vs qna2)
  const activeTheme = pageTheme || bookTheme || 'default';
  const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
  const toolDefaults = getGlobalThemeDefaults(activeTheme, isQna2 ? 'qna2' : 'qna', effectivePaletteId);
  // qna2 nutzt nun wie qna questionSettings/answerSettings aus dem Theme
  const qnaDefaults = toolDefaults;

  const layoutVariant = qnaElement.layoutVariant || 'inline';
  const individualSettings = qnaElement.qnaIndividualSettings ?? false;

  // For qna2: always inline
  let align: 'left' | 'center' | 'right' | 'justify' = 'left';
  if (isQna2 || layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
    const ts = qnaElement.textSettings || {};
    align = (element.align || (element as any).format?.textAlign || qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || ts.align || 'left') as 'left' | 'center' | 'right' | 'justify';
  } else {
    align = (qnaElement.answerSettings?.align || element.align || (element as any).format?.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
  }

  const aSettings = qnaElement.answerSettings || {};
  const tSettings = qnaElement.textSettings || {};
  const defA = qnaDefaults.answerSettings || {};
  const rawFontSize = aSettings.fontSize ?? tSettings.fontSize ?? defA.fontSize ?? 50;
  const style = {
    ...defA,
    ...aSettings,
    fontSize: ensureActualFontSize(rawFontSize, isQna2),
    fontFamily: aSettings.fontFamily || tSettings.fontFamily || defA.fontFamily || 'Arial, sans-serif',
    fontBold: aSettings.fontBold ?? tSettings.fontBold ?? defA.fontBold ?? false,
    fontItalic: aSettings.fontItalic ?? tSettings.fontItalic ?? defA.fontItalic ?? false,
    fontOpacity: aSettings.fontOpacity ?? tSettings.fontOpacity ?? defA.fontOpacity ?? 1,
    paragraphSpacing: aSettings.paragraphSpacing || tSettings.paragraphSpacing || element.paragraphSpacing || 'medium',
    align
  } as RichTextStyle;

  if (aSettings.fontColor ?? tSettings.fontColor) {
    style.fontColor = aSettings.fontColor ?? tSettings.fontColor;
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

/**
 * Build display segments for QnA2: question (questionStyle) + answer (answerStyle).
 * Shared between textbox-qna2.tsx and pdf-renderer for consistent PDF export.
 */
export function getDisplaySegments(
  element: CanvasElement,
  questionStyle: RichTextStyle,
  answerStyle: RichTextStyle,
  questionText: string,
  answerTextFromTempAnswers?: string
): TextSegment[] {
  let answerSegments: TextSegment[];
  if (element.questionId && answerTextFromTempAnswers !== undefined) {
    if (answerTextFromTempAnswers) {
      answerSegments = parseHtmlToSegments(answerTextFromTempAnswers, answerStyle);
      // Fallback: Plain-Text aus Textarea (z.B. wenn document fehlt) – Newlines bleiben erhalten
      if (answerSegments.length === 0 && answerTextFromTempAnswers.trim()) {
        answerSegments = [{ text: answerTextFromTempAnswers, style: answerStyle }];
      }
    } else {
      answerSegments = [];
    }
  } else if (!element.questionId && answerTextFromTempAnswers) {
    // Sandbox case: use sandboxDummyAnswer passed as answerTextFromTempAnswers
    answerSegments = parseHtmlToSegments(answerTextFromTempAnswers, answerStyle);
    if (answerSegments.length === 0 && answerTextFromTempAnswers.trim()) {
      answerSegments = [{ text: answerTextFromTempAnswers, style: answerStyle }];
    }
  } else {
    answerSegments = element.richTextSegments ?? [];
  }
  const answerInNewRow = (element as any).answerInNewRow ?? false;
  const hasAnswer = answerSegments.length > 0 || (element.questionId && answerTextFromTempAnswers !== undefined);
  if (questionText) {
    const separator = answerInNewRow && hasAnswer ? '\n' : (questionText.endsWith(' ') ? '' : ' ');
    const questionSegment: TextSegment = {
      text: questionText + separator,
      style: questionStyle
    };
    return [questionSegment, ...answerSegments];
  }
  if (answerSegments.length > 0) return answerSegments;
  const text = element.formattedText || element.text || '';
  if (!text) return [];
  return [{ text, style: answerStyle }];
}
