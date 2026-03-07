/**
 * Hook for managing Konva Stage
 * Provides stage reference and container reference
 */
import { useRef, useEffect } from 'react';
import type Konva from 'konva';

export interface UseKonvaStageOptions {
  width: number;
  height: number;
  onStageReady?: (stage: Konva.Stage) => void;
}

export function useKonvaStage({ width, height, onStageReady }: UseKonvaStageOptions) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (stageRef.current && onStageReady) {
      onStageReady(stageRef.current);
    }
  }, [onStageReady]);

  return {
    stageRef,
    containerRef,
    stageWidth: width,
    stageHeight: height,
  };
}

/**
 * Hook for managing item selection in Konva
 */
export interface UseItemSelectionOptions {
  items: Array<{ id: string }>;
  onSelectionChange?: (selectedId: string | null) => void;
}

export function useItemSelection({ items, onSelectionChange }: UseItemSelectionOptions) {
  const selectedIdRef = useRef<string | null>(null);

  const selectItem = (id: string | null) => {
    selectedIdRef.current = id;
    if (onSelectionChange) {
      onSelectionChange(id);
    }
  };

  const deselectAll = () => {
    selectItem(null);
  };

  const isSelected = (id: string) => {
    return selectedIdRef.current === id;
  };

  return {
    selectedId: selectedIdRef.current,
    selectItem,
    deselectAll,
    isSelected,
  };
}

/**
 * Hook for managing item transformations (drag, resize, rotate)
 */
export interface UseItemTransformOptions<T> {
  items: T[];
  onUpdate: (id: string, updates: Partial<T>) => void;
}

export function useItemTransform<T extends { id: string }>({
  items,
  onUpdate,
}: UseItemTransformOptions<T>) {
  const handleTransform = (
    id: string,
    updates: Partial<T>
  ) => {
    onUpdate(id, updates);
  };

  const findItem = (id: string): T | undefined => {
    return items.find((item) => item.id === id);
  };

  return {
    handleTransform,
    findItem,
  };
}
