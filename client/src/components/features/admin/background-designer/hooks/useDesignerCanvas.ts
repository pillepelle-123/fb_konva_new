/**
 * Hook for managing designer canvas state and operations
 * Handles canvas structure, items, selections, and persistence
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasStructure,
  DesignerItem as DesignerAsset,
  DesignerImageItem,
  DesignerTextItem,
  DesignerStickerItem,
  DesignerItemPosition as DesignerAssetPosition,
  DEFAULT_DESIGNER_CANVAS,
} from '../../../../../../../shared/types/background-designer';
import { calculatePositionFromPreset } from '../../../../../../../shared/types/background-designer';

export interface DesignerCanvasHookState {
  canvasStructure: CanvasStructure;
  selectedAssetId: string | null;
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

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
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
      setSelectedAssetId(null);
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
  const addImageAsset = useCallback((uploadPath: string, width: number = 400, height: number = 400, assetId?: string) => {
    const newAsset: DesignerImageItem = {
      id: uuidv4(),
      type: 'image',
      assetId,
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
      items: [...prev.items, newAsset],
    }));

    setSelectedAssetId(newAsset.id);
    setIsDirty(true);
  }, []);

  /**
   * Add new text item
   * All sizes are absolute pixels, position is normalized (0-1)
   */
  const addTextAsset = useCallback((text: string = 'Sample Text') => {
    const newAsset: DesignerTextItem = {
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
      items: [...prev.items, newAsset],
    }));

    setSelectedAssetId(newAsset.id);
    setIsDirty(true);
  }, []);

  /**
   * Add new sticker item
   * Size parameters are absolute pixels, position is normalized (0-1)
   */
  const addStickerAsset = useCallback((stickerId: string, width: number = 300, height: number = 300) => {
    const newAsset: DesignerStickerItem = {
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
      items: [...prev.items, newAsset],
    }));

    setSelectedAssetId(newAsset.id);
    setIsDirty(true);
  }, []);

  /**
   * Update item properties
   */
  const updateAsset = useCallback((assetId: string, updates: Partial<DesignerAsset>) => {
    setCanvasStructure((prev) => ({
      ...prev,
      items: prev.items.map((asset) => (asset.id === assetId ? { ...asset, ...updates } : asset)),
    }));
    setIsDirty(true);
  }, []);

  /**
   * Delete item
   */
  const deleteAsset = useCallback((assetId: string) => {
    setCanvasStructure((prev) => ({
      ...prev,
      items: prev.items.filter((asset) => asset.id !== assetId),
    }));

    // Deselect if the deleted asset was selected
    setSelectedAssetId((prevId) => (prevId === assetId ? null : prevId));

    setIsDirty(true);
  }, []);

  /**
   * Apply position preset to item
   * Sizes are already absolute, only positions are calculated
   */
  const applyPositionPreset = useCallback((assetId: string, preset: DesignerAssetPosition) => {
    setCanvasStructure((prev) => {
      const asset = prev.items.find((i) => i.id === assetId);
      if (!asset) return prev;

      const pos = calculatePositionFromPreset(
        preset,
        asset.width, // Already absolute
        asset.height, // Already absolute
        canvasWidth,
        canvasHeight
      );

      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === assetId
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
    (assetId: string, direction: 'forward' | 'backward' | 'front' | 'back') => {
      setCanvasStructure((prev) => {
        const newAssets = [...prev.items];
        const index = newAssets.findIndex((asset) => asset.id === assetId);

        if (index === -1) return prev;

        switch (direction) {
          case 'forward':
            if (index < newAssets.length - 1) {
              [newAssets[index], newAssets[index + 1]] = [newAssets[index + 1], newAssets[index]];
            }
            break;

          case 'backward':
            if (index > 0) {
              [newAssets[index], newAssets[index - 1]] = [newAssets[index - 1], newAssets[index]];
            }
            break;

          case 'front':
            if (index < newAssets.length - 1) {
              const asset = newAssets.splice(index, 1)[0];
              newAssets.push(asset);
            }
            break;

          case 'back':
            if (index > 0) {
              const asset = newAssets.splice(index, 1)[0];
              newAssets.unshift(asset);
            }
            break;
        }

        return { ...prev, items: newAssets };
      });

      setIsDirty(true);
    },
    []
  );

  /**
   * Duplicate item
   */
  const duplicateAsset = useCallback((assetId: string) => {
    const newAssetId = uuidv4();

    setCanvasStructure((prev) => {
      const asset = prev.items.find((i) => i.id === assetId);
      if (!asset) return prev;

      const newAsset = {
        ...asset,
        id: newAssetId,
        x: asset.x + 0.05,
        y: asset.y + 0.05,
      };

      return {
        ...prev,
        items: [...prev.items, newAsset],
      };
    });

    setSelectedAssetId(newAssetId);
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
    setSelectedAssetId(null);
    setIsDirty(false);
  }, [initialStructure]);

  /**
   * Get selected item
   */
  const getSelectedAsset = useCallback(() => {
    return canvasStructure.items.find((asset) => asset.id === selectedAssetId);
  }, [canvasStructure.items, selectedAssetId]);

  return {
    // State
    canvasStructure,
    selectedAssetId,
    isDirty,
    isSaving,
    canvasWidth,
    canvasHeight,

    // Canvas operations
    updateCanvasBackground,

    // Item operations
    addImageAsset,
    addTextAsset,
    addStickerAsset,
    updateAsset,
    deleteAsset,
    applyPositionPreset,
    changeZIndex,
    duplicateAsset,

    // Selection
    setSelectedAssetId,
    getSelectedAsset,

    // Persistence
    save,
    reset,
  };
}
