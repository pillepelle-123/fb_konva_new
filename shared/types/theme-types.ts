/**
 * TypeScript Interfaces für Shared Theme Engine
 * Vollständige Interfaces für alle Themes
 */

/**
 * Options object für Theme-Engine Funktionen
 * Alle externen Abhängigkeiten werden hier injiziert
 */
export interface ThemeEngineOptions {
  /** Document object für DOM-Operationen (z.B. createElementNS) */
  document?: Document;
  /** Zoom-Faktor für Skalierung */
  zoom?: number;
  /** Rough.js instance für Rough-Theme */
  roughInstance?: any;
}

/**
 * Ergebnis einer Theme-Pfad-Generierung
 */
export interface ThemeResult {
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
 * Theme-Typen
 * Alle unterstützten Themes
 */
export type Theme = 'default' | 'rough' | 'glow' | 'candy' | 'wobbly' | 'zigzag';

