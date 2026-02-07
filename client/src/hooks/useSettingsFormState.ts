import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor } from '../context/editor-context';
import type { CanvasElement } from '../context/editor-context';

export function useSettingsFormState(element: CanvasElement) {
  const { dispatch } = useEditor();
  const originalElementRef = useRef<CanvasElement | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Capture original element state on mount
  useEffect(() => {
    originalElementRef.current = structuredClone(element);
  }, [element.id]);

  // Create a deep snapshot of current element on every render
  const currentSnapshot = useMemo(() => structuredClone(element), [element]);
  
  // Detect changes by comparing current snapshot with original
  useEffect(() => {
    if (originalElementRef.current) {
      const changed = JSON.stringify(currentSnapshot) !== JSON.stringify(originalElementRef.current);
      setHasChanges(changed);
    }
  }, [currentSnapshot]);

  // Auto-discard on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (hasChanges && originalElementRef.current) {
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
    if (!hasChanges) return;
    
    dispatch({ 
      type: 'SAVE_TO_HISTORY', 
      payload: `Update ${element.textType || element.type} Settings` 
    });
    
    originalElementRef.current = structuredClone(element);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    if (!originalElementRef.current || !hasChanges) return;
    
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
