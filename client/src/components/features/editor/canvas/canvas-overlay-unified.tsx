import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { CanvasOverlayPortal } from './canvas-overlay';
import { Tooltip } from '../../../ui/composites/tooltip';

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

/** Einheitliche Overlay-Ebene: Lock-Button, Image-Quality-Tooltip */
export function CanvasOverlayUnified({ lockButton, imageQualityTooltip }: CanvasOverlayUnifiedProps) {
  return (
    <CanvasOverlayPortal>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
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
