import React, { useEffect, useState, useRef } from 'react';
import { MessageCircleQuestionMark, CircleCheck, Lock, LockOpen } from 'lucide-react';
import { CanvasOverlayPortal } from './canvas-overlay';
import { useQna2Overlay } from './qna2-overlay-context';
import type { Qna2OverlayState } from './qna2-overlay-context';
import { Tooltip } from '../../../ui/composites/tooltip';

const BUTTON_SIZE = 30;
const ICON_SIZE = 22;
const MARGIN = 4;

function getCssColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value ? `hsl(${value})` : fallback;
}

function getHighlightColor(): string {
  return getCssColor('--highlight', '#C79D0B');
}

function getPrimaryForegroundColor(): string {
  return getCssColor('--primary-foreground', '#f8fafc');
}

const QNA2_DEBUG = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('debug') === 'qna2' || localStorage.getItem('debugQna2') === '1');

/** QNA2-Buttons im Overlay – über allen Canvas-Items */
function Qna2ButtonsOverlay({ overlay }: { overlay: Qna2OverlayState }) {
  const { getButtonPositions, getRect, showQuestionButton, showAnswerButton, onQuestionClick, onAnswerClick } = overlay;
  const { stageRef } = useQna2Overlay();
  const [positions, setPositions] = useState<{ topRight: { x: number; y: number }; bottomRight: { x: number; y: number } } | null>(null);
  const lastPositionsRef = useRef<typeof positions>(null);

  useEffect(() => {
    const update = () => {
      const pos = getButtonPositions();
      if (pos) {
        lastPositionsRef.current = pos;
        setPositions(pos);
      } else if (lastPositionsRef.current) {
        setPositions(lastPositionsRef.current);
      }
    };
    update();
    const interval = window.setInterval(update, 50);
    return () => clearInterval(interval);
  }, [getButtonPositions]);

  if (!positions || (!showQuestionButton && !showAnswerButton)) return null;

  const buttonBg = getHighlightColor();
  const iconColor = getPrimaryForegroundColor();

  const topRight = { x: positions.topRight.x - BUTTON_SIZE - MARGIN, y: positions.topRight.y + MARGIN };
  const bottomRight = { x: positions.bottomRight.x - BUTTON_SIZE - MARGIN, y: positions.bottomRight.y - BUTTON_SIZE - MARGIN };

  const rect = getRect();
  const stageBox = stageRef?.current?.container()?.getBoundingClientRect();
  const debugOverlay = QNA2_DEBUG && rect && stageBox && (
    <>
      <div style={{ position: 'fixed', left: stageBox.left + rect.x, top: stageBox.top + rect.y, width: rect.width, height: rect.height, border: '2px dashed red', backgroundColor: 'rgba(255,0,0,0.1)', zIndex: 99999, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', left: topRight.x, top: topRight.y, width: BUTTON_SIZE, height: BUTTON_SIZE, border: '2px solid green', zIndex: 99999, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', left: bottomRight.x, top: bottomRight.y, width: BUTTON_SIZE, height: BUTTON_SIZE, border: '2px solid blue', zIndex: 99999, pointerEvents: 'none' }} />
    </>
  );

  const buttonStyle: React.CSSProperties = {
    position: 'fixed',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    padding: 0,
    border: 'none',
    borderRadius: 6,
    background: buttonBg,
    color: iconColor,
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10003,
  };

  const handleOverlayMouseEnter = () => {
    window.dispatchEvent(new CustomEvent('qna2OverlayMouseEnter', { detail: { elementId: overlay.elementId } }));
  };
  const handleOverlayMouseLeave = () => {
    window.dispatchEvent(new CustomEvent('qna2OverlayMouseLeave', { detail: { elementId: overlay.elementId } }));
  };

  // Erweiterte Hit-Area: Wrapper deckt Buttons + Lücke zur Textbox ab, damit Hover beim Bewegen zu den Buttons erhalten bleibt
  const hitAreaLeft = Math.min(topRight.x, bottomRight.x) - 20;
  const hitAreaTop = Math.min(topRight.y, bottomRight.y) - 4;
  const hitAreaWidth = Math.max(topRight.x, bottomRight.x) + BUTTON_SIZE + MARGIN - hitAreaLeft;
  const hitAreaHeight = Math.abs(bottomRight.y - topRight.y) + BUTTON_SIZE + MARGIN * 2;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {debugOverlay}
      <div
        style={{
          position: 'fixed',
          left: hitAreaLeft,
          top: hitAreaTop,
          width: hitAreaWidth,
          height: hitAreaHeight,
          pointerEvents: 'auto',
          zIndex: 10002,
        }}
        onMouseEnter={handleOverlayMouseEnter}
        onMouseLeave={handleOverlayMouseLeave}
      >
        {showQuestionButton && (
        <Tooltip content="Add, edit or remove Question" side="right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuestionClick();
            }}
            style={{ ...buttonStyle, left: topRight.x, top: topRight.y }}
            aria-label="Frage setzen"
          >
            <MessageCircleQuestionMark size={ICON_SIZE} stroke="currentColor" strokeWidth={2} />
          </button>
        </Tooltip>
      )}
      {showAnswerButton && (
        <Tooltip content="Add, edit or remove Answer" side="right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAnswerClick();
            }}
            style={{ ...buttonStyle, left: bottomRight.x, top: bottomRight.y }}
            aria-label="Antwort eingeben"
          >
            <CircleCheck size={ICON_SIZE} stroke="currentColor" strokeWidth={2} />
          </button>
        </Tooltip>
      )}
      </div>
    </div>
  );
}

interface CanvasOverlayUnifiedProps {
  /** Lock-Button: Sichtbar, gesperrt, Klick-Handler, Position */
  lockButton: {
    visible: boolean;
    locked: boolean;
    onClick: () => void;
    panelOffset: number;
    settingsPanelVisible: boolean;
  };
  /** Image-Druckqualität-Anzeige (screenX, screenY = Viewport-Koordinaten rechte obere Ecke, text, color) */
  imageQualityTooltip: { screenX: number; screenY: number; text: string; color?: string } | null;
}

/** Einheitliche Overlay-Ebene: QNA2-Buttons, Lock-Button, Image-Quality-Tooltip */
export function CanvasOverlayUnified({ lockButton, imageQualityTooltip }: CanvasOverlayUnifiedProps) {
  const { overlay } = useQna2Overlay();

  return (
    <CanvasOverlayPortal>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {/* QNA2-Buttons – über gehoverter Textbox */}
        {overlay && <Qna2ButtonsOverlay overlay={overlay} />}

        {/* Lock Elements Toggle Button – oben rechts */}
        {lockButton.visible && (
          <div
            className="absolute top-2 bg-background/90 backdrop-blur-sm border border-border rounded-md p-1.5 shadow-lg cursor-pointer hover:bg-background/95 transition-colors"
            style={{
              right: lockButton.settingsPanelVisible && lockButton.panelOffset > 0 ? `${lockButton.panelOffset}px` : '0.5rem',
              pointerEvents: 'auto',
            }}
            onClick={lockButton.onClick}
          >
            <Tooltip
              side="left"
              content={
                lockButton.locked
                  ? 'Click to unlock elements (allow moving, resizing, rotating, and adding new elements)'
                  : 'Click to lock elements (prevent moving, resizing, rotating, and adding new elements)'
              }
            >
              <div style={{ pointerEvents: 'auto' }}>
                {lockButton.locked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <LockOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Tooltip>
          </div>
        )}

        {/* Image-Druckqualität – Kreis immer bei Hover, Tooltip nur in rechter oberer Ecke */}
        {imageQualityTooltip && (
          <>
            {imageQualityTooltip.color && (
              <div
                className="fixed w-3 h-3 rounded-full border-2 border-white shadow-sm pointer-events-none"
                style={{
                  left: imageQualityTooltip.screenX - 6,
                  top: imageQualityTooltip.screenY - 6,
                  backgroundColor: imageQualityTooltip.color,
                  zIndex: 10004,
                }}
              />
            )}
            {imageQualityTooltip.text && (
              <Tooltip
                side="right"
                content={imageQualityTooltip.text}
                forceVisible
                screenPosition={{ x: imageQualityTooltip.screenX + 14, y: imageQualityTooltip.screenY }}
                backgroundColor="#ffffff"
                textColor="#111827"
              >
                <div />
              </Tooltip>
            )}
          </>
        )}
      </div>
    </CanvasOverlayPortal>
  );
}
