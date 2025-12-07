/**
 * Feature Flags für schrittweise Migration zu shared Utilities
 * Ermöglicht schrittweise Aktivierung pro Komponente
 * Fallback auf lokale Implementierung bei Problemen
 * Standard: Alle Flags sind aktiviert (true), außer wenn explizit auf 'false' gesetzt
 */
export const FEATURE_FLAGS = {
  USE_SHARED_TEXT_LAYOUT: import.meta.env.VITE_USE_SHARED_TEXT_LAYOUT !== 'false',
  USE_SHARED_THEMES: import.meta.env.VITE_USE_SHARED_THEMES !== 'false',
  USE_SHARED_PALETTES: import.meta.env.VITE_USE_SHARED_PALETTES !== 'false',
  USE_SHARED_QNA_LAYOUT: import.meta.env.VITE_USE_SHARED_QNA_LAYOUT !== 'false',
};

