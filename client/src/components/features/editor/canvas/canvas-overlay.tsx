import React, { createContext, useContext, ReactNode, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface CanvasOverlayContextValue {
  containerRef: React.RefObject<HTMLDivElement>;
}

const CanvasOverlayContext = createContext<CanvasOverlayContextValue | null>(null);

export const useCanvasOverlay = () => {
  const context = useContext(CanvasOverlayContext);
  if (!context) {
    throw new Error('useCanvasOverlay must be used within CanvasOverlayProvider');
  }
  return context;
};

interface CanvasOverlayProviderProps {
  children: ReactNode;
}

export function CanvasOverlayProvider({ children }: CanvasOverlayProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <CanvasOverlayContext.Provider value={{ containerRef }}>
      {children}
    </CanvasOverlayContext.Provider>
  );
}

/**
 * Canvas Overlay Container - wird direkt im Canvas-Container gerendert (nicht als Portal)
 * Damit liegt es in derselben Stacking-Context wie der Canvas-Container und die Toolbars können darüber liegen
 */
export function CanvasOverlayContainer() {
  const { containerRef } = useCanvasOverlay();

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: 10, // Über Canvas (0), aber in derselben Stacking-Context wie Canvas-Container
        pointerEvents: 'none', // Standard: keine Pointer-Events, einzelne Elemente können sie aktivieren
      }}
    />
  );
}

/**
 * Hook zum Hinzufügen von Elementen zum Canvas-Overlay
 * Gibt eine Funktion zurück, die ein Element zum Overlay hinzufügt
 */
export function useCanvasOverlayElement() {
  const { containerRef } = useCanvasOverlay();

  const addElement = useCallback((element: HTMLElement) => {
    if (containerRef.current) {
      containerRef.current.appendChild(element);
      return () => {
        if (containerRef.current && containerRef.current.contains(element)) {
          containerRef.current.removeChild(element);
        }
      };
    }
    return () => {};
  }, [containerRef]);

  return { addElement, containerRef };
}

/**
 * Portal-Komponente zum Rendern von React-Elementen im Canvas-Overlay
 * Rendert die Kinder direkt in den Overlay-Container (nicht als Portal)
 */
export function CanvasOverlayPortal({ children }: { children: ReactNode }) {
  const { containerRef } = useCanvasOverlay();
  
  // Warte bis containerRef initialisiert ist
  if (!containerRef.current) {
    return null;
  }
  
  // Rendere die Kinder direkt in den Overlay-Container
  // React wird die Kinder automatisch in den containerRef.current einfügen
  return createPortal(children, containerRef.current);
}

