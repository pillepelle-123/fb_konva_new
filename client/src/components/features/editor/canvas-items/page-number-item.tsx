import { Text } from 'react-konva';
import type { CanvasElement } from '../../../../context/editor-context';
import type { PageNumberingSettings } from '../../../../utils/page-number-utils';

interface PageNumberItemProps {
  element: CanvasElement;
  /** Live preview settings – when set, overrides element styles (active page only) */
  pageNumberingPreview?: PageNumberingSettings;
}

/**
 * Renders a page number as a simple Konva Text element.
 * Page numbers are not selectable or transformable (listening=false).
 * When pageNumberingPreview is provided, it overrides font styles for live preview.
 */
export function PageNumberItem({ element, pageNumberingPreview }: PageNumberItemProps) {
  if (pageNumberingPreview && !pageNumberingPreview.enabled) return null;

  const text = element.text ?? '';
  const fontFamily = pageNumberingPreview?.fontFamily ?? element.fontFamily ?? 'Arial, sans-serif';
  const fontSize = pageNumberingPreview?.fontSize ?? element.fontSize ?? 14;
  const fontColor = pageNumberingPreview?.fontColor ?? element.fontColor ?? '#000000';
  const fontOpacity = pageNumberingPreview?.fontOpacity ?? element.fontOpacity ?? 1;
  const fontBold = pageNumberingPreview?.fontBold ?? element.fontBold ?? false;
  const fontItalic = pageNumberingPreview?.fontItalic ?? element.fontItalic ?? false;

  const fontStyleParts: string[] = [];
  if (fontItalic) fontStyleParts.push('italic');
  if (fontBold) fontStyleParts.push('bold');
  const fontStyle = fontStyleParts.length > 0 ? fontStyleParts.join(' ') : 'normal';

  return (
    <Text
      x={element.x}
      y={element.y}
      text={text}
      fontFamily={fontFamily}
      fontSize={fontSize}
      fill={fontColor}
      opacity={fontOpacity}
      fontStyle={fontStyle}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}
