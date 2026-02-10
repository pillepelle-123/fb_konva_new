import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Rect, Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import Image, { getCrop } from './image';
import type { CanvasItemProps } from './base-canvas-item';

/**
 * Wrapper-Komponente für Sticker-Elemente.
 * Setzt Sticker-spezifische Defaults und delegiert das Rendering an die Image-Komponente.
 * 
 * Diese Komponente trennt die Sticker-Logik von der Image-Logik, ohne den bewährten
 * Renderpfad zu ändern. Alle Bildlade-, Crop- und Transform-Logik wird von Image übernommen.
 */
export default function Sticker(props: CanvasItemProps) {
  const { element, isSelected, onSelect, dispatch, interactive, activeTool, lockElements } = props;
  const [isTextSelected, setIsTextSelected] = useState(false);
  const textRef = useRef<Konva.Text>(null);
  const [textBoxHeight, setTextBoxHeight] = useState(0);
  
  // Stelle sicher, dass Sticker-Elemente den richtigen Typ haben
  if (element.type !== 'sticker') {
    // Fallback: Wenn das Element kein Sticker ist, rendere es trotzdem als Image
    // Dies kann passieren, wenn die Komponente fälschlicherweise für andere Typen verwendet wird
    return <Image {...props} />;
  }
  
  useEffect(() => {
    if (!isSelected) {
      setIsTextSelected(false);
    }
  }, [isSelected]);

  // Setze Sticker-spezifische Defaults
  const stickerElement = {
    ...element,
    // Sticker verwenden standardmäßig center-middle für das Image-Clipping
    imageClipPosition: element.imageClipPosition ?? 'center-middle',
  };

  const hasStickerText = Boolean(element.stickerText && element.stickerText.trim().length > 0);
  const isStickerTextEnabled = element.stickerTextEnabled ?? hasStickerText;
  const canSelectText = interactive !== false && activeTool === 'select';
  const canDragText = canSelectText && isSelected && isTextSelected && !lockElements;

  const textSettings = useMemo(() => {
    const defaults = {
      fontFamily: 'Arial, sans-serif',
      fontSize: 50,
      fontBold: false,
      fontItalic: false,
      fontColor: '#1f2937',
      fontOpacity: 1
    };
    return {
      ...defaults,
      ...(element.stickerTextSettings || {})
    };
  }, [element.stickerTextSettings]);

  const textOffset = useMemo(() => {
    if (element.stickerTextOffset) return element.stickerTextOffset;
    const height = element.height || 100;
    return { x: 0, y: height + 8 };
  }, [element.stickerTextOffset, element.height]);

  const fontStyle = useMemo(() => {
    const parts: string[] = [];
    if (textSettings.fontBold) parts.push('bold');
    if (textSettings.fontItalic) parts.push('italic');
    return parts.length > 0 ? parts.join(' ') : 'normal';
  }, [textSettings.fontBold, textSettings.fontItalic]);

  useEffect(() => {
    const textNode = textRef.current;
    if (!textNode) return;
    const measuredHeight = Math.max(1, textNode.height());
    setTextBoxHeight(measuredHeight);
  }, [element.stickerText, textSettings.fontFamily, textSettings.fontSize, textSettings.fontBold, textSettings.fontItalic]);

  const handleTextPointerDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!canSelectText) return;
    e.cancelBubble = true;
    e.evt?.stopPropagation?.();
    if (!isSelected) {
      onSelect?.(e);
      setIsTextSelected(false);
    }
  };

  const handleTextClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!canSelectText) return;
    e.cancelBubble = true;
    e.evt?.stopPropagation?.();
    if (!isSelected) return;
    setIsTextSelected((prev) => !prev);
  };

  const handleTextDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    if (!isTextSelected) {
      setIsTextSelected(true);
    }
  };

  const handleTextDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    if (!dispatch) return;
    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: {
          stickerTextOffset: {
            x: e.target.x(),
            y: e.target.y()
          }
        }
      }
    });
  };

  const overlay = isStickerTextEnabled && hasStickerText ? (
    <Group
      x={textOffset.x}
      y={textOffset.y}
      draggable={canDragText}
      onMouseDown={handleTextPointerDown}
      onClick={handleTextClick}
      onTap={handleTextClick}
      onDragStart={handleTextDragStart}
      onDragEnd={handleTextDragEnd}
    >
      <Rect
        width={element.width || 100}
        height={textBoxHeight || Math.max(1, Math.round((textSettings.fontSize || 16) * 1.2))}
        stroke={isTextSelected ? '#3b82f6' : 'transparent'}
        strokeWidth={isTextSelected ? 1.5 : 0}
        dash={isTextSelected ? [4, 3] : undefined}
        listening={false}
      />
      <KonvaText
        ref={textRef}
        text={element.stickerText}
        width={element.width || 100}
        fontSize={textSettings.fontSize}
        fontFamily={textSettings.fontFamily}
        fontStyle={fontStyle}
        fill={textSettings.fontColor}
        opacity={textSettings.fontOpacity}
        align="center"
        listening={false}
      />
    </Group>
  ) : null;
  
  // Rendere mit angepasstem Element - alle anderen Props bleiben unverändert
  return (
    <Image
      {...props}
      element={stickerElement}
      onSelect={(e) => {
        setIsTextSelected(false);
        onSelect(e);
      }}
      overlay={overlay}
    />
  );
}

// Re-export getCrop für externe Verwendung (z.B. pdf-renderer.tsx)
export { getCrop };

