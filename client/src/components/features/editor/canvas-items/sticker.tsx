import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Group, Rect, Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import Image from './image';
import type { CanvasItemProps } from './base-canvas-item';

/**
 * Wrapper-Komponente für Sticker-Elemente.
 * Setzt Sticker-spezifische Defaults und delegiert das Rendering an die Image-Komponente.
 * 
 * Diese Komponente trennt die Sticker-Logik von der Image-Logik, ohne den bewährten
 * Renderpfad zu ändern. Alle Bildlade-, Crop- und Transform-Logik wird von Image übernommen.
 */
export default function Sticker(props: CanvasItemProps) {
  const { element, isSelected, onSelect, dispatch, interactive, activeTool, lockElements, zoom = 1 } = props;
  const [isTextSelected, setIsTextSelected] = useState(false);
  const textRef = useRef<Konva.Text>(null);
  const textGroupRef = useRef<Konva.Group>(null);
  const [textBoxHeight, setTextBoxHeight] = useState(0);
  const isDraggingTextRef = useRef(false);
  const localTextOffsetRef = useRef<{ x: number; y: number } | null>(null);

  // All hooks must be called unconditionally before any conditional logic
  
  useEffect(() => {
    if (!isSelected) {
      setIsTextSelected(false);
      isDraggingTextRef.current = false;
      
      // Save local text offset to store when sticker is deselected
      if (localTextOffsetRef.current && dispatch) {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            id: element.id,
            updates: {
              stickerTextOffset: localTextOffsetRef.current
            }
          }
        });
        localTextOffsetRef.current = null;
      }
    }
  }, [isSelected, dispatch, element.id]);

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
  }, [element.stickerTextSettings]); // Add dependency array

  const fontStyle = useMemo(() => {
    const parts: string[] = [];
    if (textSettings.fontBold) parts.push('bold');
    if (textSettings.fontItalic) parts.push('italic');
    return parts.length > 0 ? parts.join(' ') : 'normal';
  }, [textSettings.fontBold, textSettings.fontItalic]); // More specific deps instead of textSettings

  const textOffset = useMemo(() => {
    // Use local offset during/after drag, before persisting to store
    if (localTextOffsetRef.current) return localTextOffsetRef.current;
    // Otherwise use persisted offset from element
    if (element.stickerTextOffset) return element.stickerTextOffset;
    // Fallback to default position below sticker
    const height = element.height || 100;
    return { x: 0, y: height + 8 };
  }, [element.stickerTextOffset, element.height]); // localTextOffsetRef changes don't trigger re-render

  useEffect(() => {
    const textNode = textRef.current;
    if (!textNode) return;
    const measuredHeight = Math.max(1, textNode.height());
    setTextBoxHeight(measuredHeight);
  }, [element.stickerText, textSettings.fontFamily, textSettings.fontSize, textSettings.fontBold, textSettings.fontItalic]);

  // Define handlers before early return
  const handleTextClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const canSelectText = interactive !== false && activeTool === 'select';
    if (!canSelectText) return;
    e.cancelBubble = true;
    if (!isSelected) {
      onSelect?.(e);
      setIsTextSelected(false);
    } else {
      // Toggle text selection only if sticker is already selected
      setIsTextSelected((prev) => !prev);
    }
  }, [interactive, activeTool, isSelected, onSelect]);

  const handleTextDragStart = useCallback(() => {
    isDraggingTextRef.current = true;
    setIsTextSelected(true);
  }, []);

  const handleTextDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    
    const groupNode = e.target as Konva.Group;
    const newOffset = {
      x: groupNode.x(),
      y: groupNode.y()
    };
    
    // Mark as no longer dragging
    isDraggingTextRef.current = false;
    
    // Save to local ref - will be persisted to store when sticker is deselected
    localTextOffsetRef.current = newOffset;
    
    // No need to trigger re-render - Group already at correct position from drag
    // Will persist to store when sticker is deselected
    
    // Keep text selected
    setIsTextSelected(true);
  }, []);

  // Initialize Group position from textOffset on mount or when it changes
  useEffect(() => {
    const groupNode = textGroupRef.current;
    if (!groupNode) return;
    if (isDraggingTextRef.current) return; // Don't override during drag
    if (localTextOffsetRef.current) return; // Don't override if we have local changes
    
    groupNode.position({ x: textOffset.x, y: textOffset.y });
  }, [textOffset]);

  // Early return for non-sticker elements - AFTER all hooks are called
  if (element.type !== 'sticker') {
    return <Image {...props} />;
  }

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

  const overlay = isStickerTextEnabled && hasStickerText ? (
    <Group
      ref={textGroupRef}
      draggable={canDragText}
      onDragStart={handleTextDragStart}
      onDragEnd={handleTextDragEnd}
    >
      <Rect
        width={element.width || 100}
        height={textBoxHeight || Math.max(1, Math.round((textSettings.fontSize || 16) * 1.2))}
        stroke={isTextSelected ? '#72bcf5' : 'transparent'}
        strokeWidth={isTextSelected ? 1.5 / zoom : 0}
        dash={isTextSelected ? [6 / zoom, 6 / zoom] : undefined}
        shadowColor={isTextSelected ? 'rgba(0, 0, 0, 1)' : undefined}
        shadowBlur={isTextSelected ? 4 : 0}
        shadowOffsetX={isTextSelected ? 2 : 0}
        shadowOffsetY={isTextSelected ? 2 : 0}
        listening={true}
        onClick={handleTextClick}
        onTap={handleTextClick}
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

