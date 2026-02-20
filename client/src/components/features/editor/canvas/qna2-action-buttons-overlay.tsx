import React, { useEffect, useState, useRef } from 'react';
import { MessageCircleQuestionMark, CircleCheck } from 'lucide-react';
import { CanvasOverlayPortal, useCanvasOverlay } from './canvas-overlay';
import { useQna2Overlay } from './qna2-overlay-context';
import type { Qna2OverlayState } from './qna2-overlay-context';

const BUTTON_SIZE = 24;
const MARGIN = 4;

/**
 * Rendert die QNA2-Buttons im Canvas-Overlay (auf Canvas-Ebene, nicht im Konva-Baum).
 * Buttons skalieren nicht mit Zoom (einheitliche Größe).
 * CircleCheck als Antwort-Icon (MessageCircleCheck existiert nicht in Lucide).
 */
export function Qna2ActionButtonsOverlay({ overlay }: { overlay: Qna2OverlayState }) {
  const { getRect, strokeColor, showQuestionButton, showAnswerButton, onQuestionClick, onAnswerClick } = overlay;
  const { containerRef } = useCanvasOverlay();
  const { stageRef } = useQna2Overlay();
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const lastRectRef = useRef<typeof rect>(null);

  useEffect(() => {
    const updateRect = () => {
      const r = getRect();
      if (r) {
        lastRectRef.current = r;
        setRect(r);
      } else if (lastRectRef.current) {
        setRect(lastRectRef.current);
      }
    };
    updateRect();
    const interval = window.setInterval(updateRect, 50);
    return () => clearInterval(interval);
  }, [getRect]);

  if (!rect || (!showQuestionButton && !showAnswerButton)) return null;
  const container = containerRef.current;
  if (!container) return null;

  const stageContainer = stageRef.current?.container?.();
  const cr = stageContainer?.getBoundingClientRect() ?? container.getBoundingClientRect();
  const topRightX = rect.x - cr.left + rect.width - BUTTON_SIZE - MARGIN;
  const topRightY = rect.y - cr.top + MARGIN;
  const bottomRightX = rect.x - cr.left + rect.width - BUTTON_SIZE - MARGIN;
  const bottomRightY = rect.y - cr.top + rect.height - BUTTON_SIZE - MARGIN;

  const iconColor = strokeColor || '#374151';
  const iconOpacity = 0.8;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {showQuestionButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuestionClick();
          }}
          style={{
            position: 'absolute',
            left: topRightX,
            top: topRightY,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Frage setzen"
        >
          <MessageCircleQuestionMark
            size={BUTTON_SIZE}
            stroke={iconColor}
            style={{ opacity: iconOpacity }}
          />
        </button>
      )}
      {showAnswerButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAnswerClick();
          }}
          style={{
            position: 'absolute',
            left: bottomRightX,
            top: bottomRightY,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Antwort eingeben"
        >
          <CircleCheck
            size={BUTTON_SIZE}
            stroke={iconColor}
            style={{ opacity: iconOpacity }}
          />
        </button>
      )}
    </div>
  );
}

/** Rendert QNA2-Buttons im Overlay, wenn ein qna2-Element gehovered/ausgewählt ist. */
export function Qna2OverlayRenderer() {
  const { overlay } = useQna2Overlay();
  if (!overlay) return null;
  return (
    <CanvasOverlayPortal>
      <Qna2ActionButtonsOverlay overlay={overlay} />
    </CanvasOverlayPortal>
  );
}
