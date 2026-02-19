/**
 * Rich text layout and HTML conversion for textbox-qna2
 * Handles mixed-format segments with different styles
 */

import type { RichTextStyle, TextRun, TextSegment } from '../types/text-layout';
import type { LayoutResult, LinePosition } from '../types/layout';
import {
  getLineHeight,
  measureText
} from './text-layout';

/** Abstand der Ruled Line unter der Text-Baseline (wie textbox-qna) */
const RULED_LINE_BASELINE_OFFSET = 12;

/** Token with style and segment index for gap handling */
interface StyledToken {
  text: string;
  style: RichTextStyle;
  segmentIndex: number;
}

export interface CreateRichTextLayoutParams {
  segments: TextSegment[];
  width: number;
  height: number;
  padding: number;
  ctx: CanvasRenderingContext2D | null;
  /** Vertikaler Abstand nach dem Frage-Block (Segment 0), wenn answerInNewRow */
  questionAnswerGapVertical?: number;
  /** Horizontaler Abstand zwischen Frage und Antwort auf derselben Zeile */
  questionAnswerGapHorizontal?: number;
}

/**
 * Create layout (TextRun[]) from rich text segments.
 * Segments flow sequentially; mixed styles can appear on the same line.
 * Supports paragraphSpacing (via style), align (via style), and QnA gaps.
 */
export function createRichTextLayoutFromSegments(params: CreateRichTextLayoutParams): LayoutResult {
  const {
    segments,
    width,
    height,
    padding,
    ctx,
    questionAnswerGapVertical = 0,
    questionAnswerGapHorizontal = 0
  } = params;
  const runs: TextRun[] = [];
  const linePositions: LinePosition[] = [];
  const availableWidth = Math.max(10, width - padding * 2);
  const startX = padding;

  if (segments.length === 0) {
    return { runs, contentHeight: height, linePositions };
  }

  // Flatten segments into tokens (words, spaces, newlines - all preserved), with segmentIndex
  const tokens: StyledToken[] = [];
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
    if (!seg.text) continue;
    const parts = seg.text.split(/(\n)/);
    for (const part of parts) {
      if (part === '\n') {
        tokens.push({ text: '\n', style: seg.style, segmentIndex: segIdx });
      } else {
        const wordAndSpaceParts = part.split(/(\s+)/);
        for (const p of wordAndSpaceParts) {
          if (p.length > 0) tokens.push({ text: p, style: seg.style, segmentIndex: segIdx });
        }
      }
    }
  }

  let cursorX = startX;
  let cursorY = padding;
  let currentLineHeight = 0;
  let lineRuns: TextRun[] = [];
  let prevSegmentIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const { text, style, segmentIndex } = tokens[i];
    const baselineOffset = style.fontSize * 0.8;
    const tokenLineHeight = getLineHeight(style);

    // Gap zwischen Frage- und Antwort-Block: vertikal nach Segment 0
    if (segmentIndex > 0 && prevSegmentIndex === 0 && questionAnswerGapVertical > 0) {
      flushLine();
      cursorY += questionAnswerGapVertical;
      currentLineHeight = 0;
      cursorX = startX;
    }
    // Horizontaler Gap: beim Wechsel von Segment 0 zu 1 auf derselben Zeile
    if (segmentIndex > 0 && prevSegmentIndex === 0 && cursorX > startX && questionAnswerGapHorizontal > 0) {
      cursorX += questionAnswerGapHorizontal;
    }
    prevSegmentIndex = segmentIndex;

    if (text === '\n') {
      flushLine();
      cursorY += currentLineHeight;
      currentLineHeight = tokenLineHeight;
      cursorX = startX;
      continue;
    }

    const tokenWidth = measureText(text, style, ctx);
    const totalWidth = tokenWidth;

    if (cursorX > startX && cursorX + totalWidth > startX + availableWidth) {
      flushLine();
      cursorY += currentLineHeight;
      currentLineHeight = 0;
      cursorX = startX;
    }

    currentLineHeight = Math.max(currentLineHeight, tokenLineHeight);
    lineRuns.push({
      text,
      x: cursorX,
      y: cursorY + baselineOffset,
      style
    });
    cursorX += totalWidth;
  }

  function flushLine() {
    if (lineRuns.length === 0) return;
    const firstRun = lineRuns[0];
    const lineHeight = Math.max(...lineRuns.map((r) => getLineHeight(r.style)));
    const lineBaselineY = cursorY + Math.max(...lineRuns.map((r) => r.style.fontSize * 0.8));
    const align = firstRun.style.align || 'left';

    // Text Align: gesamte Zeile ausrichten (nicht nur Single-Run)
    const totalLineWidth = lineRuns.reduce((sum, r) => sum + measureText(r.text, r.style, ctx), 0);
    let offsetX = 0;
    if (align === 'center') {
      offsetX = (availableWidth - totalLineWidth) / 2;
    } else if (align === 'right') {
      offsetX = availableWidth - totalLineWidth;
    }

    for (const run of lineRuns) {
      runs.push({ ...run, x: run.x + offsetX, y: lineBaselineY });
    }

    linePositions.push({
      y: lineBaselineY + RULED_LINE_BASELINE_OFFSET,
      lineHeight,
      style: firstRun.style
    });
    lineRuns = [];
    currentLineHeight = lineHeight;
  }

  flushLine();

  return {
    runs,
    contentHeight: Math.max(cursorY + currentLineHeight, height),
    linePositions
  };
}

/**
 * Convert text segments to HTML with inline styles.
 * Escapes HTML entities in text content.
 * Converts newlines (\n) to <br> so they are visible and preserved in contenteditable.
 */
export function segmentsToHtml(segments: TextSegment[]): string {
  if (segments.length === 0) return '';

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  let result = '';
  for (const { text, style } of segments) {
    const parts: string[] = [];
    if (style.fontSize) parts.push(`font-size: ${style.fontSize}px`);
    if (style.fontFamily) parts.push(`font-family: ${style.fontFamily}`);
    if (style.fontColor) parts.push(`color: ${style.fontColor}`);
    if (style.fontBold) parts.push('font-weight: bold');
    if (style.fontItalic) parts.push('font-style: italic');
    if (style.fontOpacity !== undefined) parts.push(`opacity: ${style.fontOpacity}`);
    const styleStr = parts.join('; ');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) result += '<br>';
      result += `<span style="${styleStr}">${escapeHtml(lines[i])}</span>`;
    }
  }
  return result;
}

const BLOCK_ELEMENTS = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE']);

function isBlockElement(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_ELEMENTS.has((node as HTMLElement).tagName);
}

/**
 * Parse HTML from contenteditable back into TextSegment[].
 * Handles <span>, <b>, <i>, <strong>, <em>, <font>, <br>, block elements (div, p) and inline styles.
 * Preserves spaces and line breaks.
 */
export function parseHtmlToSegments(html: string, defaultStyle: RichTextStyle): TextSegment[] {
  if (!html || typeof document === 'undefined') {
    return [];
  }

  const div = document.createElement('div');
  div.innerHTML = html;

  const segments: TextSegment[] = [];

  function styleFromElement(el: HTMLElement): RichTextStyle {
    const style: RichTextStyle = { ...defaultStyle };
    const computed = window.getComputedStyle?.(el) || el.style;

    const fontSize = parseFloat(computed.fontSize || el.style.fontSize);
    if (!isNaN(fontSize)) style.fontSize = fontSize;

    const fontFamily = computed.fontFamily || el.style.fontFamily;
    if (fontFamily) style.fontFamily = fontFamily;

    const color = computed.color || el.style.color;
    if (color) style.fontColor = color;

    const fontWeight = computed.fontWeight || el.style.fontWeight;
    style.fontBold = fontWeight === 'bold' || parseInt(fontWeight, 10) >= 700;

    const fontStyle = computed.fontStyle || el.style.fontStyle;
    style.fontItalic = fontStyle === 'italic';

    const opacity = parseFloat(computed.opacity || el.style.opacity);
    if (!isNaN(opacity)) style.fontOpacity = opacity;

    return style;
  }

  function traverse(node: Node, inheritedStyle: RichTextStyle) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        segments.push({ text, style: inheritedStyle });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    let currentStyle = inheritedStyle;

    if (el.tagName === 'SPAN' || el.tagName === 'FONT') {
      currentStyle = styleFromElement(el);
    } else if (el.tagName === 'B' || el.tagName === 'STRONG') {
      currentStyle = { ...inheritedStyle, fontBold: true };
    } else if (el.tagName === 'I' || el.tagName === 'EM') {
      currentStyle = { ...inheritedStyle, fontItalic: true };
    } else if (el.tagName === 'BR') {
      segments.push({ text: '\n', style: inheritedStyle });
      return;
    }

    const children = Array.from(el.childNodes);
    let prevWasBlock = false;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (isBlockElement(child)) {
        if (prevWasBlock) segments.push({ text: '\n', style: currentStyle });
        traverse(child, currentStyle);
        prevWasBlock = true;
      } else {
        traverse(child, currentStyle);
        prevWasBlock = false;
      }
    }
  }

  let prevWasBlock = false;
  for (let i = 0; i < div.childNodes.length; i++) {
    const child = div.childNodes[i];
    if (isBlockElement(child)) {
      if (prevWasBlock) segments.push({ text: '\n', style: defaultStyle });
      traverse(child, defaultStyle);
      prevWasBlock = true;
    } else {
      traverse(child, defaultStyle);
      prevWasBlock = false;
    }
  }

  return segments;
}
