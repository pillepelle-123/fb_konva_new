import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ZoomContextType {
  zoom: number;
  setZoom: (zoom: number, centerPoint?: { x: number; y: number }) => void;
  minZoom: number;
  maxZoom: number;
  registerSetZoom: (setZoomFn: (zoom: number, centerPoint?: { x: number; y: number }) => void) => void;
}

const ZoomContext = createContext<ZoomContextType | null>(null);

export function ZoomProvider({
  children,
  initialZoom = 0.8,
  minZoom: minZoomProp,
  maxZoom: maxZoomProp,
}: {
  children: React.ReactNode;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}) {
  const [zoom, setZoomState] = useState(initialZoom);
  const minZoom = minZoomProp ?? 0.1;
  const maxZoom = maxZoomProp ?? 1;
  const setZoomRef = useRef<((zoom: number, centerPoint?: { x: number; y: number }) => void) | null>(null);
  
  const registerSetZoom = useCallback((setZoomFn: (zoom: number, centerPoint?: { x: number; y: number }) => void) => {
    setZoomRef.current = setZoomFn;
  }, []);
  
  const setZoom = useCallback((newZoom: number, centerPoint?: { x: number; y: number }) => {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    // Always update zoom state
    setZoomState(clampedZoom);
    // If a setZoom function is registered (from canvas.tsx), call it for position updates
    if (setZoomRef.current) {
      setZoomRef.current(clampedZoom, centerPoint);
    }
  }, [minZoom, maxZoom]);
  
  return (
    <ZoomContext.Provider value={{ zoom, setZoom, minZoom, maxZoom, registerSetZoom }}>
      {children}
    </ZoomContext.Provider>
  );
}

export function useZoom() {
  const context = useContext(ZoomContext);
  if (!context) {
    // Check if we're in a React Fast Refresh scenario or during initial render
    // During hot reload or initial render, components may render before providers are ready
    if (import.meta.env.DEV) {
      // In development, return a safe fallback instead of crashing
      // This prevents the app from breaking during hot reload
      return {
        zoom: 0.8,
        setZoom: () => {},
        minZoom: 0.1,
        maxZoom: 3,
        registerSetZoom: () => {},
      };
    }
    // In production, still throw to catch actual bugs
    throw new Error('useZoom must be used within ZoomProvider');
  }
  return context;
}

