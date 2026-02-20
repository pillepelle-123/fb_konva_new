import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface Qna2OverlayState {
  elementId: string;
  /** @deprecated Nutze getButtonPositions für korrekte Platzierung */
  getRect: () => { x: number; y: number; width: number; height: number } | null;
  /** Liefert Viewport-Koordinaten für die Buttons (wie Image-Druckqualitäts-Kreis) */
  getButtonPositions: () => { topRight: { x: number; y: number }; bottomRight: { x: number; y: number } } | null;
  strokeColor: string;
  showQuestionButton: boolean;
  showAnswerButton: boolean;
  /** Inset von den Rändern der Textbox (Padding + 4) */
  inset?: number;
  onQuestionClick: () => void;
  onAnswerClick: () => void;
}

type KonvaStage = { container: () => HTMLElement } | null;

const Qna2OverlayContext = createContext<{
  overlay: Qna2OverlayState | null;
  /** Setzt Overlay. Bei null: nur löschen wenn overlay.elementId === elementId (verhindert Race bei überlappenden Elementen) */
  setOverlay: (state: Qna2OverlayState | null, elementId?: string) => void;
  stageRef: React.RefObject<KonvaStage>;
  zoom: number;
  stagePos: { x: number; y: number };
} | null>(null);

export function Qna2OverlayProvider({
  children,
  stageRef,
  zoom = 1,
  stagePos = { x: 0, y: 0 },
}: {
  children: ReactNode;
  stageRef: React.RefObject<KonvaStage>;
  zoom?: number;
  stagePos?: { x: number; y: number };
}) {
  const [overlay, setOverlayState] = useState<Qna2OverlayState | null>(null);
  const setOverlay = useCallback((state: Qna2OverlayState | null, elementId?: string) => {
    setOverlayState((prev) => {
      if (state !== null) return state;
      if (elementId != null && prev?.elementId !== elementId) return prev;
      return null;
    });
  }, []);
  return (
    <Qna2OverlayContext.Provider value={{ overlay, setOverlay, stageRef, zoom, stagePos }}>
      {children}
    </Qna2OverlayContext.Provider>
  );
}

export function useQna2Overlay() {
  const ctx = useContext(Qna2OverlayContext);
  if (!ctx) return { overlay: null, setOverlay: () => {}, stageRef: { current: null }, zoom: 1, stagePos: { x: 0, y: 0 } };
  return ctx;
}

