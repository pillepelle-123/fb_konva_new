import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../context/editor-context';
import type { CanvasElement } from '../context/editor-context';

export function useSettingsFormState(element?: CanvasElement | null) {
  const { dispatch } = useEditor();
  const originalElementRef = useRef<CanvasElement | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasChangesRef = useRef(false);
  const elementId = element?.id;

  // Capture original element state on mount
  useEffect(() => {
    if (!element) {
      if (hasChangesRef.current && originalElementRef.current) {
        dispatch({
          type: 'RESTORE_ELEMENT_STATE',
          payload: {
            elementId: originalElementRef.current.id,
            elementState: originalElementRef.current
          }
        });
      }
      originalElementRef.current = null;
      setHasChanges(false);
      return;
    }

    if (originalElementRef.current && originalElementRef.current.id !== element.id && hasChangesRef.current) {
      dispatch({
        type: 'RESTORE_ELEMENT_STATE',
        payload: {
          elementId: originalElementRef.current.id,
          elementState: originalElementRef.current
        }
      });
    }

    originalElementRef.current = structuredClone(element);
    setHasChanges(false);
  }, [elementId, dispatch]);

  // Detect changes by comparing current element with original
  useEffect(() => {
    if (!element || !originalElementRef.current) {
      setHasChanges(false);
      return;
    }
    const changed = JSON.stringify(element) !== JSON.stringify(originalElementRef.current);
    setHasChanges(changed);
  }, [element]);

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Auto-discard on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (element && hasChanges && originalElementRef.current) {
        dispatch({
          type: 'RESTORE_ELEMENT_STATE',
          payload: {
            elementId: originalElementRef.current.id,
            elementState: originalElementRef.current
          }
        });
      }
    };
  }, [hasChanges, dispatch]);

  const handleSave = () => {
    if (!element || !hasChanges) return;
    
    dispatch({ 
      type: 'SAVE_TO_HISTORY', 
      payload: `Update ${element.textType || element.type} Settings` 
    });
    
    originalElementRef.current = structuredClone(element);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    if (!element || !originalElementRef.current || !hasChanges) return;
    
    dispatch({
      type: 'RESTORE_ELEMENT_STATE',
      payload: {
        elementId: element.id,
        elementState: originalElementRef.current
      }
    });
    
    setHasChanges(false);
  };

  return {
    hasChanges,
    handleSave,
    handleDiscard
  };
}
