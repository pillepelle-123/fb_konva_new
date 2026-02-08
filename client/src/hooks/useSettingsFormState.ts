import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../context/editor-context';
import type { CanvasElement } from '../context/editor-context';

interface SettingsFormStateOptions {
  ignoreKeys?: string[];
  preserveOnRestore?: string[];
}

const stripKeys = (element: CanvasElement, ignoreKeys?: string[]) => {
  if (!ignoreKeys?.length) return element;
  const clone = structuredClone(element) as CanvasElement;
  ignoreKeys.forEach((key) => {
    if (key in clone) {
      delete (clone as Record<string, unknown>)[key];
    }
  });
  return clone;
};

const buildRestoredElement = (
  originalElement: CanvasElement,
  currentElement: CanvasElement | null,
  preserveKeys?: string[]
) => {
  if (!preserveKeys?.length || !currentElement) return originalElement;
  const restored = structuredClone(originalElement) as CanvasElement;
  preserveKeys.forEach((key) => {
    if (key in currentElement) {
      (restored as Record<string, unknown>)[key] = (currentElement as Record<string, unknown>)[key];
    }
  });
  return restored;
};

export function useSettingsFormState(
  element?: CanvasElement | null,
  options?: SettingsFormStateOptions
) {
  const { dispatch } = useEditor();
  const originalElementRef = useRef<CanvasElement | null>(null);
  const lastElementRef = useRef<CanvasElement | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasChangesRef = useRef(false);
  const elementId = element?.id;
  const ignoreKeys = options?.ignoreKeys;
  const preserveOnRestore = options?.preserveOnRestore;

  // Capture original element state on mount
  useEffect(() => {
    const previousElement = lastElementRef.current;
    if (!element) {
      if (hasChangesRef.current && originalElementRef.current) {
        const restored = buildRestoredElement(
          originalElementRef.current,
          previousElement,
          preserveOnRestore
        );
        dispatch({
          type: 'RESTORE_ELEMENT_STATE',
          payload: {
            elementId: restored.id,
            elementState: restored
          }
        });
      }
      originalElementRef.current = null;
      lastElementRef.current = null;
      setHasChanges(false);
      return;
    }

    if (originalElementRef.current && originalElementRef.current.id !== element.id && hasChangesRef.current) {
      const restored = buildRestoredElement(
        originalElementRef.current,
        previousElement,
        preserveOnRestore
      );
      dispatch({
        type: 'RESTORE_ELEMENT_STATE',
        payload: {
          elementId: restored.id,
          elementState: restored
        }
      });
    }

    originalElementRef.current = structuredClone(element);
    lastElementRef.current = element;
    setHasChanges(false);
  }, [elementId, dispatch, preserveOnRestore]);

  // Detect changes by comparing current element with original
  useEffect(() => {
    if (!element || !originalElementRef.current) {
      setHasChanges(false);
      return;
    }
    const currentElement = stripKeys(element, ignoreKeys);
    const originalElement = stripKeys(originalElementRef.current, ignoreKeys);
    const changed = JSON.stringify(currentElement) !== JSON.stringify(originalElement);
    setHasChanges(changed);
  }, [element, ignoreKeys]);

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Auto-discard on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (element && hasChanges && originalElementRef.current) {
        const restored = buildRestoredElement(
          originalElementRef.current,
          element,
          preserveOnRestore
        );
        dispatch({
          type: 'RESTORE_ELEMENT_STATE',
          payload: {
            elementId: restored.id,
            elementState: restored
          }
        });
      }
    };
  }, [hasChanges, dispatch, preserveOnRestore]);

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
    
    const restored = buildRestoredElement(
      originalElementRef.current,
      element,
      preserveOnRestore
    );
    dispatch({
      type: 'RESTORE_ELEMENT_STATE',
      payload: {
        elementId: element.id,
        elementState: restored
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
