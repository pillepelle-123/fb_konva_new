/**
 * Utility for rendering ruled lines in textboxes
 * Consolidates duplicate logic from textbox-qna2 and textbox-free-text
 */

import { renderStyledBorder, createLinePath } from '../utils/styled-border';
import type { Style } from '../utils/styles-client';
import type { RichTextStyle } from '../../../shared/types/text-layout';

export interface LinePosition {
  y: number;
  lineHeight?: number;
  style?: RichTextStyle;
}

export interface RenderRuledLinesOptions {
  elementId: string;
  ruledLinesWidth: number;
  ruledLinesStyle: Style;
  ruledLinesColor: string;
  ruledLinesOpacity: number;
  linePositions: LinePosition[];
  padding: number;
  elementWidth: number;
  topLimit?: number;
  bottomLimit?: number;
}

// Supported styles for ruled lines
const SUPPORTED_RULED_LINE_STYLES: Style[] = [
  'default',
  'rough',
  'glow',
  'candy',
  'zigzag',
  'wobbly',
  'dashed',
  'marker',
  'crayon',
  'pencil',
  'paint-brush'
];

/**
 * Renders styled ruled lines for textboxes
 * Returns array of Konva elements
 * 
 * Note: Line position calculation should be done in the component
 * This function only handles the rendering of provided positions
 */
export function renderRuledLines(options: RenderRuledLinesOptions): Array<React.ReactElement | null> {
  const {
    elementId,
    ruledLinesWidth,
    ruledLinesStyle,
    ruledLinesColor,
    ruledLinesOpacity,
    linePositions,
    padding,
    elementWidth,
    topLimit = -Infinity,
    bottomLimit = Infinity
  } = options;

  if (!linePositions || linePositions.length === 0) return [];

  const elements: Array<React.ReactElement | null> = [];

  // Ensure style is valid
  const styleString = String(ruledLinesStyle || 'default').toLowerCase().trim();
  const lineStyle = (SUPPORTED_RULED_LINE_STYLES.includes(styleString as Style)
    ? styleString
    : 'default') as Style;

  // Generate seed from element ID
  const seed = parseInt(elementId.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;

  linePositions.forEach((linePos: LinePosition) => {
    if (linePos.y >= topLimit && linePos.y <= bottomLimit) {
      const lineElement = renderStyledBorder({
        width: ruledLinesWidth,
        color: ruledLinesColor,
        opacity: ruledLinesOpacity,
        path: createLinePath(padding, linePos.y, elementWidth - padding, linePos.y),
        style: lineStyle,
        styleSettings: { 
          seed: seed + Math.floor(linePos.y), 
          roughness: lineStyle === 'rough' ? 2 : 1 
        },
        strokeScaleEnabled: true,
        listening: false,
        key: `ruled-line-${elementId}-${linePos.y}`
      });
      if (lineElement) elements.push(lineElement);
    }
  });

  return elements;
}
