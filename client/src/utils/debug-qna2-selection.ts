/**
 * Debug-Logging für QnA2-Einzelauswahl (Autoren).
 * In der Browser-Konsole aktivieren mit: window.__debugQna2Selection = true
 * Deaktivieren mit: window.__debugQna2Selection = false
 */

const isEnabled = () => typeof window !== 'undefined' && (window as any).__debugQna2Selection === true;

export function debugQna2Selection(label: string, data?: Record<string, unknown>) {
  if (!isEnabled()) return;
  const msg = `[QnA2-Selection] ${label}`;
  if (data) {
    console.log(msg, data);
  } else {
    console.log(msg);
  }
}
