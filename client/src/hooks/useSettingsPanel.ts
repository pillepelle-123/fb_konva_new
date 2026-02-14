import { useRef, useEffect } from 'react';

/**
 * Centralizes the Settings Preview Pattern: clear on unmount, click outside, and canvas click.
 * Returns a panelRef that must be attached to the root container of the settings panel.
 * @param onClear - Called when panel should clear (unmount, click outside, canvas click)
 * @param shouldIgnore - Optional. When returning true, onClear is not called (e.g. when a modal is open)
 */
export function useSettingsPanel(onClear: () => void, shouldIgnore?: () => boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldIgnoreRef = useRef(shouldIgnore);
  const onClearRef = useRef(onClear);
  shouldIgnoreRef.current = shouldIgnore;
  onClearRef.current = onClear;

  const runClear = () => {
    if (shouldIgnoreRef.current?.()) return;
    onClearRef.current();
  };

  // Clear on unmount - use ref so effect doesn't re-run when onClear identity changes (avoids
  // "Maximum update depth" and spurious clear when selecting items triggers state updates)
  useEffect(() => {
    return () => onClearRef.current();
  }, []);

  // Clear on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) runClear();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Clear on canvas click
  useEffect(() => {
    const handler = () => runClear();
    window.addEventListener('editor:canvasClicked', handler);
    return () => window.removeEventListener('editor:canvasClicked', handler);
  }, []);

  return { panelRef };
}
