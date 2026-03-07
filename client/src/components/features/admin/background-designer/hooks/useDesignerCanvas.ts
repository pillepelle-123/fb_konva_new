/**
 * Hook for managing designer canvas state and operations
 * Handles canvas structure, items, selections, and persistence
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasStructure,
  DesignerItem,
  DesignerImageItem,
  DesignerTextItem,
  DesignerStickerItem,
  DesignerItemPosition,
  DEFAULT_DESIGNER_CANVAS,
} from '../../../../../../../shared/types/background-designer';
import { calculatePositionFromPreset } from '../../../../../../../shared/types/background-designer';

export interface DesignerCanvasHookState {
  canvasStructure: CanvasStructure;
  selectedItemId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  isDirty: boolean;
}

export interface UseDesignerCanvasOptions {
  onSave?: (canvasStructure: CanvasStructure) => Promise<void>;
  designerId?: string;
  initialStructure?: CanvasStructure;
}

export function useDesignerCanvas(options: UseDesignerCanvasOptions = {}) {
  const { onSave, initialStructure } = options;

  // Canvas state
  const [canvasStructure, setCanvasStructure] = useState<CanvasStructure>(
    initialStructure || {
      backgroundColor: '#ffffff',
      backgroundOpacity: 1,
      items: [],
    }
  );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Undo/Redo stack
  const historyStack = useRef<CanvasStructure[]>([]);
  const historyIndex = useRef<number>(-1);

  // Constants: A4 @ 300 DPI
  const canvasWidth = 2480;
  const canvasHeight = 3508;

  /**
   * Update canvas structure when initialStructure changes (e.g., loading existing design)
   */
  useEffect(() => {
    if (initialStructure) {
      setCanvasStructure(initialStructure);
      setSelectedItemId(null);
      setIsDirty(false);
    }
  }, [initialStructure]);

  /**
   * Update canvas background properties
   */
  const updateCanvasBackground = useCallback((updates: Partial<CanvasStructure>) => {
    setCanvasStructure((prev) => {
      const updated = {
        ...prev,
        backgroundColor:
          updates.backgroundColor !== undefined ? updates.backgroundColor : prev.backgroundColor,
        backgroundOpacity:
          updates.backgroundOpacity !== undefined ? updates.backgroundOpacity : prev.backgroundOpacity,
      };
      setIsDirty(true);
      return updated;
    });
  }, []);

  /**
   * Add new image item
   * Size parameters are absolute pixels, position is normalized (0-1)
   */
  const addImageItem = useCallback((uploadPath: string, width: number = 400, height: number = 400) => {
    const newItem: DesignerImageItem = {
      id: uuidv4(),
      type: 'image',
      uploadPath,
      x: 0.1, // Normalized position
      y: 0.1, // Normalized position
      width, // Absolute pixels
      height, // Absolute pixels
      rotation: 0,
      opacity: 1,
      position: 'custom',
      aspectRatioLocked: true,
    };

    setCanvasStructure((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setSelectedItemId(newItem.id);
    setIsDirty(true);
  }, []);

  /**
   * Add new text item
   * All sizes are absolute pixels, position is normalized (0-1)
   */
  const addTextItem = useCallback((text: string = 'Sample Text') => {
    const newItem: DesignerTextItem = {
      id: uuidv4(),
      type: 'text',
      text,
      x: 0.1, // Normalized position
      y: 0.1, // Normalized position
      width: 800, // Absolute pixels
      height: 100, // Absolute pixels
      fontFamily: 'Arial',
      fontSize: 48, // Absolute pixels (not normalized)
      fontBold: false,
      fontItalic: false,
      fontColor: '#000000',
      fontOpacity: 1,
      rotation: 0,
      opacity: 1,
      position: 'custom',
      textAlign: 'left',
    };

    setCanvasStructure((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setSelectedItemId(newItem.id);
    setIsDirty(true);
  }, []);

  /**
   * Add new sticker item
   * Size parameters are absolute pixels, position is normalized (0-1)
   */
  const addStickerItem = useCallback((stickerId: string, width: number = 300, height: number = 300) => {
    const newItem: DesignerStickerItem = {
      id: uuidv4(),
      type: 'sticker',
      stickerId,
      x: 0.1, // Normalized position
      y: 0.1, // Normalized position
      width, // Absolute pixels
      height, // Absolute pixels
      rotation: 0,
      opacity: 1,
      position: 'custom',
    };

    setCanvasStructure((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setSelectedItemId(newItem.id);
    setIsDirty(true);
  }, []);

  /**
   * Update item properties
   */
  const updateItem = useCallback((itemId: string, updates: Partial<DesignerItem>) => {
    setCanvasStructure((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    }));
    setIsDirty(true);
  }, []);

  /**
   * Delete item
   */
  const deleteItem = useCallback((itemId: string) => {
    setCanvasStructure((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));

    // Deselect if the deleted item was selected
    setSelectedItemId((prevId) => (prevId === itemId ? null : prevId));

    setIsDirty(true);
  }, []);

  /**
   * Apply position preset to item
   * Sizes are already absolute, only positions are calculated
   */
  const applyPositionPreset = useCallback((itemId: string, preset: DesignerItemPosition) => {
    setCanvasStructure((prev) => {
      const item = prev.items.find((i) => i.id === itemId);
      if (!item) return prev;

      const pos = calculatePositionFromPreset(
        preset,
        item.width, // Already absolute
        item.height, // Already absolute
        canvasWidth,
        canvasHeight
      );

      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId
            ? {
                ...i,
                x: pos.x,
                y: pos.y,
                position: preset,
              }
            : i
        ),
      };
    });

    setIsDirty(true);
  }, [canvasWidth, canvasHeight]);

  /**
   * Change z-index (layer order)
   */
  const changeZIndex = useCallback(
    (itemId: string, direction: 'forward' | 'backward' | 'front' | 'back') => {
      setCanvasStructure((prev) => {
        const newItems = [...prev.items];
        const index = newItems.findIndex((item) => item.id === itemId);

        if (index === -1) return prev;

        switch (direction) {
          case 'forward':
            if (index < newItems.length - 1) {
              [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            }
            break;

          case 'backward':
            if (index > 0) {
              [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
            }
            break;

          case 'front':
            if (index < newItems.length - 1) {
              const item = newItems.splice(index, 1)[0];
              newItems.push(item);
            }
            break;

          case 'back':
            if (index > 0) {
              const item = newItems.splice(index, 1)[0];
              newItems.unshift(item);
            }
            break;
        }

        return { ...prev, items: newItems };
      });

      setIsDirty(true);
    },
    []
  );

  /**
   * Duplicate item
   */
  const duplicateItem = useCallback((itemId: string) => {
    const newItemId = uuidv4();

    setCanvasStructure((prev) => {
      const item = prev.items.find((i) => i.id === itemId);
      if (!item) return prev;

      const newItem = {
        ...item,
        id: newItemId,
        x: item.x + 0.05,
        y: item.y + 0.05,
      };

      return {
        ...prev,
        items: [...prev.items, newItem],
      };
    });

    setSelectedItemId(newItemId);
    setIsDirty(true);
  }, []);

  /**
   * Save canvas structure
   */
  const save = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(canvasStructure);
      }
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save designer canvas:', error);
    } finally {
      setIsSaving(false);
    }
  }, [canvasStructure, isDirty, isSaving, onSave]);

  /**
   * Auto-save with debounce
   */
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isDirty || !onSave) return;

    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Set new timer
    autoSaveTimer.current = setTimeout(() => {
      save();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [isDirty, save, onSave]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setCanvasStructure(
      initialStructure || {
        backgroundColor: '#ffffff',
        backgroundOpacity: 1,
        items: [],
      }
    );
    setSelectedItemId(null);
    setIsDirty(false);
  }, [initialStructure]);

  /**
   * Get selected item
   */
  const getSelectedItem = useCallback(() => {
    return canvasStructure.items.find((item) => item.id === selectedItemId);
  }, [canvasStructure.items, selectedItemId]);

  return {
    // State
    canvasStructure,
    selectedItemId,
    isDirty,
    isSaving,
    canvasWidth,
    canvasHeight,

    // Canvas operations
    updateCanvasBackground,

    // Item operations
    addImageItem,
    addTextItem,
    addStickerItem,
    updateItem,
    deleteItem,
    applyPositionPreset,
    changeZIndex,
    duplicateItem,

    // Selection
    setSelectedItemId,
    getSelectedItem,

    // Persistence
    save,
    reset,
  };
}
