import { useState, useRef } from 'react';

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export function useCanvasSelection() {
  // Selection rectangle states
  const [selectionRect, setSelectionRect] = useState<SelectionRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false
  });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);

  // Group movement states
  const [isMovingGroup, setIsMovingGroup] = useState(false);
  const isMovingGroupRef = useRef(false);
  const [groupMoveStart, setGroupMoveStart] = useState<{ x: number; y: number } | null>(null);
  const groupMoveStartRef = useRef<{ x: number; y: number } | null>(null);
  const groupMoveInitialPositionsRef = useRef<{ [elementId: string]: { x: number; y: number } } | null>(null);

  // UI interaction states
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false
  });

  // Clipboard state
  const [clipboard, setClipboard] = useState<any[]>([]);

  // Selection mode state for question-answer pairs
  const [selectionModeState, setSelectionModeState] = useState<Map<string, number>>(new Map());

  // Utility functions
  const clearSelectionRect = () => {
    setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
    setIsSelecting(false);
    setSelectionStart(null);
  };

  const clearGroupMoveStates = () => {
    setIsMovingGroup(false);
    isMovingGroupRef.current = false;
    setGroupMoveStart(null);
    groupMoveStartRef.current = null;
    groupMoveInitialPositionsRef.current = null;
  };

  const hideContextMenu = () => {
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  return {
    // Selection rectangle states
    selectionRect,
    setSelectionRect,
    isSelecting,
    setIsSelecting,
    selectionStart,
    setSelectionStart,

    // Group movement states
    isMovingGroup,
    setIsMovingGroup,
    isMovingGroupRef,
    groupMoveStart,
    setGroupMoveStart,
    groupMoveStartRef,
    groupMoveInitialPositionsRef,

    // UI interaction states
    lastClickTime,
    setLastClickTime,
    isDragging,
    setIsDragging,

    // Context menu state
    contextMenu,
    setContextMenu,

    // Clipboard state
    clipboard,
    setClipboard,

    // Selection mode state
    selectionModeState,
    setSelectionModeState,

    // Utility functions
    clearSelectionRect,
    clearGroupMoveStates,
    hideContextMenu,
  };
}
