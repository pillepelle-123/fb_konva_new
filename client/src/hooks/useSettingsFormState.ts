import { useState, useEffect, useRef, useLayoutEffect } from 'react';
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

const elementsDiffer = (
  current: CanvasElement,
  original: CanvasElement,
  ignoreKeys?: string[]
) => {
  const currentElement = stripKeys(current, ignoreKeys);
  const originalElement = stripKeys(original, ignoreKeys);
  return JSON.stringify(currentElement) !== JSON.stringify(originalElement);
};

const buildRestoredElement = (
  originalElement: CanvasElement,
  currentElement: CanvasElement | null,
  preserveKeys?: string[]
) => {
  if (!preserveKeys?.length || !currentElement) return originalElement;
  const preserveSet = new Set<string>([...preserveKeys, 'text', 'formattedText', 'richTextSegments', 'questionId']);
  const restored = structuredClone(originalElement) as CanvasElement;
  preserveSet.forEach((key) => {
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
  const originalOptionsRef = useRef<SettingsFormStateOptions | null>(null);
  const lastElementRef = useRef<CanvasElement | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasChangesRef = useRef(false);
  const elementId = element?.id;
  const ignoreKeys = options?.ignoreKeys;
  const preserveOnRestore = options?.preserveOnRestore;

  // Helper function to restore element properties
  const restoreElement = (
    currentElement: CanvasElement,
    originalElement: CanvasElement,
    savedOptions: SettingsFormStateOptions | null
  ) => {
    const allKeys = new Set([...Object.keys(currentElement), ...Object.keys(originalElement)]);
    const updates: Record<string, any> = {};
    const preserveSet = new Set<string>([
      ...(savedOptions?.preserveOnRestore || []),
      'text',
      'formattedText',
      'richTextSegments', // Preserve: edited via rich-text-inline-editor Save, not tool settings
      'questionId' // Preserve: set via question-selector-modal, not tool settings
    ]);

    allKeys.forEach((key) => {
      if (preserveSet.has(key)) return;
      if (savedOptions?.ignoreKeys?.includes(key)) return;
      if (key === 'id' || key === 'type') return;
      const currentVal = (currentElement as any)[key];
      const originalVal = (originalElement as any)[key];
      if (JSON.stringify(currentVal) !== JSON.stringify(originalVal)) {
        updates[key] = originalVal;
      }
    });

    if (Object.keys(updates).length > 0) {
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: currentElement.id,
          updates
        }
      });
    }
  };

  // Capture original element state on mount
  useLayoutEffect(() => {
    const previousElement = lastElementRef.current;
    if (!element) {
      const shouldRestore =
        !!originalElementRef.current &&
        !!previousElement &&
        elementsDiffer(previousElement, originalElementRef.current, originalOptionsRef.current?.ignoreKeys);
      if ((hasChangesRef.current || shouldRestore) && originalElementRef.current && previousElement) {
        restoreElement(previousElement, originalElementRef.current, originalOptionsRef.current);
      }
      originalElementRef.current = null;
      originalOptionsRef.current = null;
      lastElementRef.current = null;
      setHasChanges(false);
      return;
    }

    if (originalElementRef.current && originalElementRef.current.id !== element.id) {
      const shouldRestore =
        !!previousElement &&
        elementsDiffer(previousElement, originalElementRef.current, originalOptionsRef.current?.ignoreKeys);
      if (!shouldRestore) {
        originalElementRef.current = structuredClone(element);
        originalOptionsRef.current = { ignoreKeys, preserveOnRestore };
        lastElementRef.current = element;
        setHasChanges(false);
        return;
      }
      restoreElement(previousElement, originalElementRef.current, originalOptionsRef.current);
    }

    originalElementRef.current = structuredClone(element);
    originalOptionsRef.current = { ignoreKeys, preserveOnRestore };
    lastElementRef.current = element;
    setHasChanges(false);
  }, [elementId, dispatch, preserveOnRestore, ignoreKeys]);

  // Detect changes by comparing current element with original
  useEffect(() => {
    if (!element || !originalElementRef.current) {
      setHasChanges(false);
      return;
    }
    lastElementRef.current = element;
    const changed = elementsDiffer(element, originalElementRef.current, originalOptionsRef.current?.ignoreKeys);
    setHasChanges(changed);
  }, [element]);

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Auto-discard on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (!element || !originalElementRef.current) return;
      if (originalElementRef.current.id !== element.id) return;
      const shouldRestore = elementsDiffer(
        element,
        originalElementRef.current,
        originalOptionsRef.current?.ignoreKeys
      );
      if (hasChanges || shouldRestore) {
        restoreElement(element, originalElementRef.current, originalOptionsRef.current);
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
    
    restoreElement(element, originalElementRef.current, originalOptionsRef.current);
    setHasChanges(false);
  };

  return {
    hasChanges,
    handleSave,
    handleDiscard
  };
}
