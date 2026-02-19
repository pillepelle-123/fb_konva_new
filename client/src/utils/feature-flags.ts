/**
 * Feature Flags für schrittweise Migration zu shared Utilities
 * Ermöglicht schrittweise Aktivierung pro Komponente
 * Fallback auf lokale Implementierung bei Problemen
 * Standard: Alle Flags sind aktiviert (true), außer wenn explizit auf 'false' gesetzt
 */
export const FEATURE_FLAGS = {
  USE_SHARED_TEXT_LAYOUT: import.meta.env.VITE_USE_SHARED_TEXT_LAYOUT !== 'false',
  USE_SHARED_QNA_LAYOUT: import.meta.env.VITE_USE_SHARED_QNA_LAYOUT !== 'false',
  USE_CENTRALIZED_BORDER_RENDERING: import.meta.env.VITE_USE_CENTRALIZED_BORDER_RENDERING !== 'false',
  /** QnA2: Rich Text Editor (Bold, Italic, Font, Color) vs. Plain Text (Textarea wie qna). Default: false = Plain Text. In .env: VITE_QNA2_RICH_TEXT_EDITOR=true */
  QNA2_RICH_TEXT_EDITOR: import.meta.env.VITE_QNA2_RICH_TEXT_EDITOR === 'true',
};

