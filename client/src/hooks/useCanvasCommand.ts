import { useCallback, useRef } from 'react';
import { useEditor } from '../context/editor-context';
import type { HistoryCommand } from '../context/editor-context';

export function useCanvasCommand(actionName: string, command: HistoryCommand = 'CANVAS_BATCH') {
  const { dispatch } = useEditor();
  const startedRef = useRef(false);

  const start = useCallback(() => {
    if (startedRef.current) {
      return;
    }
    dispatch({ type: 'START_CANVAS_BATCH', payload: { command } });
    startedRef.current = true;
  }, [dispatch, command]);

  const end = useCallback(() => {
    if (!startedRef.current) {
      return;
    }
    dispatch({ type: 'END_CANVAS_BATCH', payload: { actionName } });
    startedRef.current = false;
  }, [dispatch, actionName]);

  const reset = useCallback(() => {
    startedRef.current = false;
  }, []);

  return {
    start,
    end,
    reset
  };
}
