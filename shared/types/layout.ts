/**
 * Gemeinsame Typen für Layout-Berechnungen
 * Werden sowohl Client- als auch Server-seitig verwendet
 */

import type { RichTextStyle, TextRun } from './text-layout';

export interface LinePosition {
  y: number;
  lineHeight: number;
  style: RichTextStyle;
}

export interface LayoutResult {
  runs: TextRun[];
  contentHeight: number;
  linePositions: LinePosition[];
  questionArea?: { x: number; y: number; width: number; height: number };
  answerArea?: { x: number; y: number; width: number; height: number };
}

