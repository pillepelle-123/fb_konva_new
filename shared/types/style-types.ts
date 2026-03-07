/**
 * TypeScript Interfaces für Shared Style Engine
 * Vollständige Interfaces für alle Linien-/Border-Styles
 */

/**
 * Options object für Style-Engine Funktionen
 * Alle externen Abhängigkeiten werden hier injiziert
 */
export interface StyleEngineOptions {
  /** Document object für DOM-Operationen (z.B. createElementNS) */
  document?: Document;
  /** Zoom-Faktor für Skalierung */
  zoom?: number;
  /** Rough.js instance für Rough-Style */
  roughInstance?: any;
}

/**
 * Ergebnis einer Style-Pfad-Generierung
 */
export interface StyleResult {
  /** SVG-Pfad-String */
  pathData: string;
  /** Stroke-Eigenschaften */
  strokeProps: {
    stroke: string;
    strokeWidth: number;
    fill?: string;
    opacity?: number;
    strokeDasharray?: string;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOpacity?: number;
    lineCap?: string;
    lineJoin?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
  };
}

/**
 * Style-Typen
 * Alle unterstützten Linien-/Border-Styles
 */
export type Style = 'default' | 'rough' | 'glow' | 'candy' | 'wobbly' | 'zigzag' | 'dashed' | 'marker' | 'crayon' | 'pencil' | 'paint-brush' | 'freehand';
