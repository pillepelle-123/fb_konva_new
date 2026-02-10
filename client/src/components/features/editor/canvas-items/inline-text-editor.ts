import { v4 as uuidv4 } from 'uuid';
import type React from 'react';
import type Konva from 'konva';
import type { RichTextStyle, TextRun } from '../../../../../../shared/types/text-layout';
import type { LayoutResult } from '../../../../../../shared/types/layout';
import type { CanvasElement } from '../../../../context/editor-context';

// Shared styling constants for inline text editors
const INLINE_EDITOR_STYLES = {
  borderWidth: '3px',
  borderStyle: 'dashed',
  borderColor: '#d1d5db', // Light gray
  backgroundColor: 'transparent',
  textColor: 'var(--foreground)', // Theme-aware text color
  zIndex: '10000',
  borderRadius: '4px',
  boxShadow: 'none',
  outline: 'none',
  resize: 'none',
  overflow: 'hidden',
  whiteSpace: 'pre-wrap' as const,
  boxSizing: 'border-box' as const,
  transformOrigin: 'left top',
  padding: '0px',
  margin: '0px'
} as const;

// Shared helper functions for inline text editors
function applyInlineEditorStyling(textarea: HTMLTextAreaElement, style: RichTextStyle, scaledFontSize: number, scaledLineHeight: number): void {
  // Remove any existing classes that might add borders
  textarea.className = '';
  textarea.removeAttribute('class');

  // Apply shared styling
  Object.assign(textarea.style, {
    position: 'fixed',
    fontSize: scaledFontSize + 'px',
    fontFamily: style.fontFamily,
    fontWeight: style.fontBold ? 'bold' : 'normal',
    fontStyle: style.fontItalic ? 'italic' : 'normal',
    color: INLINE_EDITOR_STYLES.textColor,
    opacity: '1', // Full opacity for text
    lineHeight: scaledLineHeight + 'px',
    textAlign: style.align || 'left',
    border: `${INLINE_EDITOR_STYLES.borderWidth} ${INLINE_EDITOR_STYLES.borderStyle} ${INLINE_EDITOR_STYLES.borderColor}`,
    borderWidth: INLINE_EDITOR_STYLES.borderWidth,
    borderStyle: INLINE_EDITOR_STYLES.borderStyle,
    borderColor: INLINE_EDITOR_STYLES.borderColor,
    outline: INLINE_EDITOR_STYLES.outline,
    boxShadow: INLINE_EDITOR_STYLES.boxShadow,
    backgroundColor: INLINE_EDITOR_STYLES.backgroundColor,
    background: INLINE_EDITOR_STYLES.backgroundColor,
    backgroundImage: 'none',
    backgroundClip: 'padding-box',
    resize: INLINE_EDITOR_STYLES.resize,
    overflow: INLINE_EDITOR_STYLES.overflow,
    whiteSpace: INLINE_EDITOR_STYLES.whiteSpace,
    transformOrigin: INLINE_EDITOR_STYLES.transformOrigin,
    zIndex: INLINE_EDITOR_STYLES.zIndex,
    boxSizing: INLINE_EDITOR_STYLES.boxSizing,
    padding: INLINE_EDITOR_STYLES.padding,
    margin: INLINE_EDITOR_STYLES.margin,
    borderRadius: INLINE_EDITOR_STYLES.borderRadius
  });

  // Remove any focus styles that might add borders
  textarea.style.setProperty('--tw-ring-width', '0');
  textarea.style.setProperty('--tw-ring-offset-width', '0');
}

interface User {
  id: string;
  [key: string]: unknown;
}

// Global state to track active editor instance
let activeEditorInstance: {
  cleanup: () => void;
  textarea: HTMLTextAreaElement;
  buttonContainer: HTMLElement;
} | null = null;

export interface InlineTextEditorParams {
  // Element data
  element: CanvasElement & { questionId?: string; answerId?: string };
  answerText: string;
  
  // Styling
  answerStyle: RichTextStyle;
  effectiveQuestionStyle: RichTextStyle;
  padding: number;
  
  // Layout
  layout: LayoutResult;
  layoutVariant: 'inline' | 'block';
  boxWidth: number;
  boxHeight: number;
  
  // Refs
  textRef: React.RefObject<Konva.Rect>;
  
  // State setters
  setIsAnswerEditorOpen: (open: boolean) => void;
  
  // User and dispatch
  user: User | null;
  dispatch: (action: { type: string; payload?: unknown }) => void;
  
  // Helper functions
  getLineHeight: (style: RichTextStyle) => number;
  measureText: (text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null) => number;
}

/**
 * Creates an inline text editor (textarea) for editing answer text in QnA textboxes.
 * Returns a cleanup function that can be called to close the editor.
 * Only one editor can be open at a time - if another editor is already open, it will be closed first.
 */
export function createInlineTextEditor(params: InlineTextEditorParams): () => void {
  const {
    element,
    answerText,
    answerStyle,
    effectiveQuestionStyle,
    layout,
    layoutVariant,
    padding,
    boxWidth,
    boxHeight,
    textRef,
    setIsAnswerEditorOpen,
    user,
    dispatch,
    getLineHeight,
    measureText
  } = params;

  const stage = textRef.current?.getStage();
  if (!stage) {
    return () => {}; // Return empty cleanup function if stage is not available
  }
  const stageInstance: Konva.Stage = stage;

  // Close any existing editor instance and ensure cleanup
  if (activeEditorInstance) {
    try {
      activeEditorInstance.cleanup();
    } catch (error) {
      console.warn('Error during editor cleanup:', error);
    }
    activeEditorInstance = null;
  }
  
  // Force removal of any lingering overlays from previous instances
  const existingOverlays = document.querySelectorAll('[id="inline-editor-canvas-overlay-container"]');
  existingOverlays.forEach(overlay => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });

  // Get answer area and calculate actual text bounds
  let answerArea: { x: number; y: number; width: number; height: number };
  let actualTextBounds: { x: number; y: number; width: number; height: number } | null = null;
  
  if (layoutVariant === 'block' && layout.answerArea) {
    answerArea = layout.answerArea;
    // For block layout, calculate actual text bounds from runs
    const answerRuns = layout.runs.filter((run: TextRun) => run.style === answerStyle);
    if (answerRuns.length > 0) {
      const answerBaselineOffset = answerStyle.fontSize * 0.8;
      const answerLineHeight = getLineHeight(answerStyle);
      const canvasContext = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
      const minAnswerX = Math.min(...answerRuns.map((run: TextRun) => run.x));
      const maxAnswerX = Math.max(...answerRuns.map((run: TextRun) => {
        const textWidth = measureText(run.text, answerStyle, canvasContext);
        return run.x + textWidth;
      }));
      const minAnswerY = Math.min(...answerRuns.map((run: TextRun) => run.y - answerBaselineOffset));
      const maxAnswerY = Math.max(...answerRuns.map((run: TextRun) => run.y - answerBaselineOffset + answerLineHeight));
      
      actualTextBounds = {
        x: minAnswerX,
        y: minAnswerY,
        width: maxAnswerX - minAnswerX,
        height: maxAnswerY - minAnswerY
      };
    }
  } else {
    // For inline layout, calculate answer area from runs
    const answerRuns = layout.runs.filter((run: TextRun) => run.style === answerStyle);
    const questionRuns = layout.runs.filter((run: TextRun) => run.style === effectiveQuestionStyle);
    
    if (answerRuns.length === 0) {
      // No answer text, calculate position below question text
      if (questionRuns.length > 0) {
        const questionBaselineOffset = effectiveQuestionStyle.fontSize * 0.8;
        const questionLineHeight = getLineHeight(effectiveQuestionStyle);
        const answerLineHeight = getLineHeight(answerStyle);
        
        // Find the last question line position
        const lastQuestionY = Math.max(...questionRuns.map((run: TextRun) => run.y - questionBaselineOffset + questionLineHeight));
        
        // Answer area starts after the question (with some spacing)
        const answerStartY = lastQuestionY + (answerLineHeight * 0.2);
        
        answerArea = {
          x: padding,
          y: answerStartY,
          width: boxWidth - padding * 2,
          height: Math.max(answerLineHeight, boxHeight - answerStartY - padding)
        };
      } else {
        // No question text either, use default area
        answerArea = { x: padding, y: padding, width: boxWidth - padding * 2, height: boxHeight - padding * 2 };
      }
      actualTextBounds = null;
    } else {
      const answerBaselineOffset = answerStyle.fontSize * 0.8;
      const answerLineHeight = getLineHeight(answerStyle);
      const minAnswerY = Math.min(...answerRuns.map((run: TextRun) => run.y - answerBaselineOffset));
      const maxAnswerY = Math.max(...answerRuns.map((run: TextRun) => run.y - answerBaselineOffset + answerLineHeight));
      // Create canvas context for text measurement
      const canvasContext = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
      const minAnswerX = Math.min(...answerRuns.map((run: TextRun) => run.x));
      const maxAnswerX = Math.max(...answerRuns.map((run: TextRun) => {
        const textWidth = measureText(run.text, answerStyle, canvasContext);
        return run.x + textWidth;
      }));
      
      actualTextBounds = {
        x: minAnswerX,
        y: minAnswerY,
        width: maxAnswerX - minAnswerX,
        height: maxAnswerY - minAnswerY
      };
      
      answerArea = {
        x: minAnswerX,
        y: minAnswerY,
        width: Math.max(maxAnswerX - minAnswerX, boxWidth - padding * 2),
        height: maxAnswerY - minAnswerY
      };
    }
  }
  
  // Set state to hide only answer text (not question) during editing
  setIsAnswerEditorOpen(true);
  
  // Remove any existing tooltips on canvas when editor opens
  // This ensures no tooltips are visible while editing
  const removeExistingTooltips = () => {
    // Remove tooltips by ID pattern (e.g., qna-tooltip-*)
    const tooltips = document.querySelectorAll('[id^="qna-tooltip-"]');
    tooltips.forEach(tooltip => tooltip.remove());
    
    // Also remove any tooltips that might be in the canvas overlay
    const canvasOverlay = document.querySelector('[class*="canvas-overlay"]');
    if (canvasOverlay) {
      const overlayTooltips = canvasOverlay.querySelectorAll('[class*="tooltip"]');
      overlayTooltips.forEach(tooltip => tooltip.remove());
    }
  };
  
  removeExistingTooltips();
  
  const groupNode = textRef.current?.getParent();
  if (!groupNode) {
    return () => {}; // Return empty cleanup function if groupNode is not available
  }
  
  // Position editor outside canvas context (centered in viewport)
  const stageBox = stage.container().getBoundingClientRect();
  
  // Editor dimensions (percentage-based, independent of canvas zoom)
  const editorWidth = window.innerWidth * 0.8;
  const editorMinHeight = window.innerHeight * 0.7;
  
  // Center editor in viewport
  const editorLeft = (window.innerWidth - editorWidth) / 2;
  const editorTop = (window.innerHeight - editorMinHeight) / 2;
  
  // Font size without zoom (use original style, but scale down more)
  const fontSize = 24;
  const lineHeight = fontSize * 1.2;
  const scaledLineHeight = lineHeight;
  
  // Extract question text from layout
  const questionRuns = layout.runs.filter((run: TextRun) => run.style === effectiveQuestionStyle);
  const questionText = questionRuns.map((run: TextRun) => run.text).join('');
  
  // Default font for readable mode
  const defaultFont = 'Inter, system-ui, sans-serif';
  
  // Create question header bar
  const questionHeader = document.createElement('div');
  questionHeader.style.position = 'fixed';
  questionHeader.style.left = editorLeft + 'px';
  questionHeader.style.top = (editorTop - 50) + 'px';
  questionHeader.style.width = editorWidth + 'px';
  questionHeader.style.height = '50px';
  questionHeader.style.backgroundColor = '#FFF';
  questionHeader.style.borderRadius = '8px 8px 0 0';
  questionHeader.style.padding = '12px 16px';
  questionHeader.style.fontSize = '20px';
  questionHeader.style.fontWeight = effectiveQuestionStyle.fontBold ? 'bold' : 'normal';
  questionHeader.style.fontStyle = effectiveQuestionStyle.fontItalic ? 'italic' : 'normal';
  questionHeader.style.fontFamily = effectiveQuestionStyle.fontFamily;
  questionHeader.style.color = effectiveQuestionStyle.fill || '#000000';
  questionHeader.style.display = 'flex';
  questionHeader.style.alignItems = 'center';
  questionHeader.style.justifyContent = 'space-between';
  questionHeader.style.gap = '12px';
  questionHeader.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
  questionHeader.style.zIndex = '10001';
  
  // Question text span
  const questionTextSpan = document.createElement('span');
  questionTextSpan.style.overflow = 'hidden';
  questionTextSpan.style.textOverflow = 'ellipsis';
  questionTextSpan.style.whiteSpace = 'nowrap';
  questionTextSpan.style.flex = '1';
  questionTextSpan.textContent = questionText || 'Question';
  questionHeader.appendChild(questionTextSpan);
  
  // Checkbox container
  const checkboxContainer = document.createElement('label');
  checkboxContainer.style.display = 'flex';
  checkboxContainer.style.alignItems = 'center';
  checkboxContainer.style.gap = '6px';
  checkboxContainer.style.cursor = 'pointer';
  checkboxContainer.style.fontSize = '14px';
  checkboxContainer.style.whiteSpace = 'nowrap';
  checkboxContainer.style.userSelect = 'none';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.style.width = '16px';
  checkbox.style.height = '16px';
  checkbox.style.cursor = 'pointer';
  checkbox.style.accentColor = 'hsl(var(--primary))';
  
  const checkboxLabel = document.createElement('span');
  checkboxLabel.textContent = 'Display in readable font';
  checkboxLabel.style.color = '#6b7280';
  checkboxLabel.style.fontFamily = defaultFont;
  
  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(checkboxLabel);
  questionHeader.appendChild(checkboxContainer);
  
  // Handle checkbox change
  checkbox.addEventListener('change', () => {
    const useReadableFont = checkbox.checked;
    textarea.style.fontFamily = useReadableFont ? defaultFont : answerStyle.fontFamily;
    questionTextSpan.style.fontFamily = useReadableFont ? defaultFont : effectiveQuestionStyle.fontFamily;
  });
  
  document.body.appendChild(questionHeader);
  
  // Create textarea
  const textarea = document.createElement('textarea');
  document.body.appendChild(textarea);

  // Set initial value and position
  textarea.value = answerText || '';
  textarea.style.position = 'fixed';
  textarea.style.left = editorLeft + 'px';
  textarea.style.top = editorTop + 'px';
  textarea.style.width = editorWidth + 'px';
  textarea.style.minHeight = editorMinHeight + 'px';

  // Apply shared styling
  applyInlineEditorStyling(textarea, answerStyle, fontSize, lineHeight);
  
  // Override styling for QnA editor: white background, no bottom rounded corners, shadow
  textarea.style.backgroundColor = '#ffffff';
  textarea.style.background = '#ffffff';
  textarea.style.borderRadius = '0';
  textarea.style.boxShadow = 'none';
  textarea.style.border = 'none';
  textarea.style.padding = '16px';
  textarea.style.textAlign = 'left';
  
  // Focus textarea
  textarea.focus();
  
  // Update editor size and position on window resize
  const updateEditorSize = () => {
    const newEditorWidth = window.innerWidth * 0.8;
    const newEditorMinHeight = window.innerHeight * 0.7;
    const newEditorLeft = (window.innerWidth - newEditorWidth) / 2;
    const newEditorTop = (window.innerHeight - newEditorMinHeight) / 2;
    
    textarea.style.left = newEditorLeft + 'px';
    textarea.style.top = newEditorTop + 'px';
    textarea.style.width = newEditorWidth + 'px';
    textarea.style.minHeight = newEditorMinHeight + 'px';
    
    questionHeader.style.left = newEditorLeft + 'px';
    questionHeader.style.top = (newEditorTop - 50) + 'px';
    questionHeader.style.width = newEditorWidth + 'px';
    
    updateButtonFooterPosition();
  };
  
  window.addEventListener('resize', updateEditorSize);
  
  // Create button footer bar (similar to question header)
  const buttonFooter = document.createElement('div');
  buttonFooter.style.position = 'fixed';
  buttonFooter.style.backgroundColor = '#FFF';
  buttonFooter.style.borderRadius = '0 0 8px 8px';
  buttonFooter.style.padding = '12px 16px';
  buttonFooter.style.display = 'flex';
  buttonFooter.style.alignItems = 'center';
  buttonFooter.style.justifyContent = 'flex-end';
  buttonFooter.style.gap = '4px';
  buttonFooter.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
  buttonFooter.style.zIndex = '10001';
  buttonFooter.style.pointerEvents = 'auto';
  document.body.appendChild(buttonFooter);
  
  // Update button footer position
  const updateButtonFooterPosition = () => {
    const textareaRect = textarea.getBoundingClientRect();
    buttonFooter.style.left = textareaRect.left + 'px';
    buttonFooter.style.top = (textareaRect.bottom + 1) + 'px';
    buttonFooter.style.width = textareaRect.width + 'px';
  };
  
  updateButtonFooterPosition();
  
  // Create fullscreen overlay to cover entire viewport
  const canvasOverlayContainer = document.createElement('div');
  canvasOverlayContainer.style.position = 'fixed';
  canvasOverlayContainer.style.top = '0';
  canvasOverlayContainer.style.left = '0';
  canvasOverlayContainer.style.width = '100vw';
  canvasOverlayContainer.style.height = '100vh';
  canvasOverlayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  canvasOverlayContainer.style.zIndex = '9999';
  canvasOverlayContainer.style.pointerEvents = 'auto';
  canvasOverlayContainer.id = 'inline-editor-canvas-overlay-container';
  
  // Close editor when clicking on overlay
  canvasOverlayContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === canvasOverlayContainer) {
      discardChanges();
    }
  });
  
  // Insert before textarea to ensure proper stacking
  document.body.insertBefore(canvasOverlayContainer, textarea);

  // Event handlers for blocking canvas interactions
  let canvasEventHandlers: Array<{ element: HTMLElement | Window; event: string; handler: (e: Event) => void }> = [];

  // Store original cursor to restore it later
  const stageContainer = stage.container();
  const originalCursor = stageContainer.style.cursor || '';

  // Block canvas interactions when editor is open
  const blockCanvasInteractions = () => {
    // Set cursor to default (arrow) on canvas when editor is open
    // This prevents the "hand" cursor from showing when hovering over canvas
    stageContainer.style.cursor = 'default';
    
    // Block mouse events on stage
    const blockMouseEvents = (e: MouseEvent) => {
      // Allow clicks on textarea, buttons, and question header
      const target = e.target as HTMLElement;
      if (target === textarea || textarea.contains(target) || buttonFooter.contains(target) || target === questionHeader || questionHeader.contains(target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Block keyboard events on stage (except editor-specific ones)
    const blockKeyboardEvents = (e: KeyboardEvent) => {
      // Allow Escape and Ctrl+Enter/Cmd+Enter (handled by textarea)
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        return;
      }
      // Allow if focus is on textarea or buttons
      const activeElement = document.activeElement;
      if (activeElement === textarea || buttonFooter.contains(activeElement)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Block touch events on stage
    const blockTouchEvents = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target === textarea || textarea.contains(target) || buttonFooter.contains(target) || target === questionHeader || questionHeader.contains(target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Block pointer events on stage
    const blockPointerEvents = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target === textarea || textarea.contains(target) || buttonFooter.contains(target) || target === questionHeader || questionHeader.contains(target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Add event listeners with capture phase to block early
    const events = [
      { event: 'mousedown', handler: blockMouseEvents },
      { event: 'mouseup', handler: blockMouseEvents },
      { event: 'click', handler: blockMouseEvents },
      { event: 'dblclick', handler: blockMouseEvents },
      { event: 'contextmenu', handler: blockMouseEvents },
      { event: 'wheel', handler: blockMouseEvents },
      { event: 'mousemove', handler: blockMouseEvents }, // Block tooltip triggers
      { event: 'mouseenter', handler: blockMouseEvents }, // Block tooltip triggers
      { event: 'mouseleave', handler: blockMouseEvents }, // Block tooltip triggers
      { event: 'mouseover', handler: blockMouseEvents }, // Block tooltip triggers
      { event: 'mouseout', handler: blockMouseEvents }, // Block tooltip triggers
      { event: 'keydown', handler: blockKeyboardEvents },
      { event: 'keyup', handler: blockKeyboardEvents },
      { event: 'touchstart', handler: blockTouchEvents },
      { event: 'touchend', handler: blockTouchEvents },
      { event: 'touchmove', handler: blockTouchEvents },
      { event: 'pointerdown', handler: blockPointerEvents },
      { event: 'pointerup', handler: blockPointerEvents },
      { event: 'pointermove', handler: blockPointerEvents }, // Block tooltip triggers
      { event: 'pointerenter', handler: blockPointerEvents }, // Block tooltip triggers
      { event: 'pointerleave', handler: blockPointerEvents }, // Block tooltip triggers
    ];

    events.forEach(({ event, handler }) => {
      stageContainer.addEventListener(event, handler as EventListener, true); // Use capture phase
      canvasEventHandlers.push({ element: stageContainer, event, handler: handler as EventListener });
    });

    // Also block on window level for keyboard events
    window.addEventListener('keydown', blockKeyboardEvents as EventListener, true);
    window.addEventListener('keyup', blockKeyboardEvents as EventListener, true);
    canvasEventHandlers.push({ element: window, event: 'keydown', handler: blockKeyboardEvents as EventListener });
    canvasEventHandlers.push({ element: window, event: 'keyup', handler: blockKeyboardEvents as EventListener });
  };

  // Handle clicks outside canvas (close editor without saving)
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't close if clicking on textarea, buttons, or question header
    if (target === textarea || textarea.contains(target) || buttonFooter.contains(target) || target === questionHeader || questionHeader.contains(target)) {
      return;
    }

    // Check if click is outside the canvas container
    const canvasRect = stageContainer.getBoundingClientRect();
    const clickX = e.clientX;
    const clickY = e.clientY;

    // If click is outside canvas bounds, close editor
    if (
      clickX < canvasRect.left ||
      clickX > canvasRect.right ||
      clickY < canvasRect.top ||
      clickY > canvasRect.bottom
    ) {
      removeTextarea();
    }
  };

  // Add click outside handler
  window.addEventListener('mousedown', handleClickOutside as EventListener, true);
  canvasEventHandlers.push({ element: window, event: 'mousedown', handler: handleClickOutside as EventListener });

  // Block canvas interactions
  blockCanvasInteractions();
  
  let discardTooltipCleanup: (() => void) | null = null;
  let saveTooltipCleanup: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;

  // Function to remove textarea and cleanup
  function removeTextarea() {
    if (discardTooltipCleanup) {
      discardTooltipCleanup();
      discardTooltipCleanup = null;
    }
    if (saveTooltipCleanup) {
      saveTooltipCleanup();
      saveTooltipCleanup = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    // Remove resize listener
    window.removeEventListener('resize', updateEditorSize);
    
    // Remove all event handlers with error handling
    try {
      canvasEventHandlers.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler, true);
      });
    } catch (error) {
      console.warn('Error removing event handlers:', error);
    }
    canvasEventHandlers = [];

    // Restore original cursor on canvas
    stageContainer.style.cursor = originalCursor;

    // Remove canvas overlay container - force removal of all instances
    const overlayContainers = document.querySelectorAll('[id="inline-editor-canvas-overlay-container"]');
    overlayContainers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    if (buttonFooter.parentNode) {
      buttonFooter.parentNode.removeChild(buttonFooter);
    }
    if (questionHeader.parentNode) {
      questionHeader.parentNode.removeChild(questionHeader);
    }
    // Show answer text again by resetting state
    setIsAnswerEditorOpen(false);
    stageInstance.draw();
    
    // Clear global state
    if (activeEditorInstance && activeEditorInstance.textarea === textarea) {
      activeEditorInstance = null;
    }
    
    // Force a small delay to ensure DOM cleanup is complete
    setTimeout(() => {
      // Verify overlay is removed
      const remainingOverlays = document.querySelectorAll('[id="inline-editor-canvas-overlay-container"]');
      if (remainingOverlays.length > 0) {
        remainingOverlays.forEach(overlay => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        });
      }
    }, 0);
  }
  
  // Function to save changes
  function saveChanges() {
    const newText = textarea.value;
    if (!element.questionId) {
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: element.id,
          updates: {
            text: newText,
            formattedText: newText
          }
        }
      });
    }

    if (element.questionId && user?.id) {
      dispatch({
        type: 'UPDATE_TEMP_ANSWER',
        payload: {
          questionId: element.questionId,
          text: newText,
          userId: user.id,
          answerId: element.answerId || uuidv4()
        }
      });
    }

    removeTextarea();
  }
  
  // Function to discard changes
  function discardChanges() {
    removeTextarea();
  }
  const createButtonTooltip = (button: HTMLButtonElement, text: string) => {
    let tooltipElement: HTMLDivElement | null = null;
    let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;
    let tooltipVisible = false;

    const showTooltip = () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }

      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }

      tooltipElement = document.createElement('div');
      tooltipElement.className = 'fixed pointer-events-none transition-all duration-200 ease-out opacity-0 scale-95';
      tooltipElement.style.zIndex = '11'; // Above buttons

      const tooltipContent = document.createElement('div');
      tooltipContent.className = 'text-xs bg-background text-foreground px-2 py-1 rounded whitespace-nowrap';
      tooltipContent.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      tooltipContent.textContent = text;
      tooltipElement.appendChild(tooltipContent);

      document.body.appendChild(tooltipElement);

      const buttonRect = button.getBoundingClientRect();
      tooltipElement.style.left = (buttonRect.left + buttonRect.width / 2) + 'px';
      tooltipElement.style.top = (buttonRect.top - 8) + 'px';
      tooltipElement.style.transform = 'translate(-50%, -100%)';

      tooltipTimeout = setTimeout(() => {
        if (tooltipElement) {
          tooltipElement.className = 'fixed pointer-events-none transition-all duration-200 ease-out opacity-100 scale-100';
          tooltipVisible = true;
        }
      }, 10);
    };

    const hideTooltip = () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }

      if (tooltipElement) {
        tooltipElement.className = 'fixed pointer-events-none transition-all duration-200 ease-out opacity-0 scale-95';
        tooltipVisible = false;

        setTimeout(() => {
          if (tooltipElement && tooltipElement.parentNode) {
            tooltipElement.parentNode.removeChild(tooltipElement);
            tooltipElement = null;
          }
        }, 200);
      }
    };

    button.addEventListener('mouseenter', showTooltip);
    button.addEventListener('mouseleave', hideTooltip);

    return () => {
      button.removeEventListener('mouseenter', showTooltip);
      button.removeEventListener('mouseleave', hideTooltip);
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }
    };
  };
  
  // Create discard button (X icon, outline variant, xs size)
  const discardButton = document.createElement('button');
  discardButton.setAttribute('aria-label', 'Discard changes');
  discardButton.style.display = 'inline-flex';
  discardButton.style.alignItems = 'center';
  discardButton.style.justifyContent = 'center';
  discardButton.style.whiteSpace = 'nowrap';
  discardButton.style.borderRadius = '6px';
  discardButton.style.fontSize = '12px';
  discardButton.style.height = '36px';
  discardButton.style.padding = '0 12px';
  discardButton.style.border = '1px solid hsl(var(--input))';
  discardButton.style.background = 'hsl(var(--background))';
  discardButton.style.color = 'hsl(var(--foreground))';
  discardButton.style.cursor = 'pointer';
  discardButton.style.transition = 'all 0.2s';
  
  // Create SVG icon for X
  const xIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  xIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  xIcon.setAttribute('width', '20');
  xIcon.setAttribute('height', '20');
  xIcon.setAttribute('viewBox', '0 0 24 24');
  xIcon.setAttribute('fill', 'none');
  xIcon.setAttribute('stroke', 'currentColor');
  xIcon.setAttribute('stroke-width', '2');
  xIcon.setAttribute('stroke-linecap', 'round');
  xIcon.setAttribute('stroke-linejoin', 'round');
  xIcon.style.display = 'inline-block';
  xIcon.style.marginRight = '8px';
  xIcon.style.flexShrink = '0';
  
  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', '18');
  line1.setAttribute('y1', '6');
  line1.setAttribute('x2', '6');
  line1.setAttribute('y2', '18');
  xIcon.appendChild(line1);
  
  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '6');
  line2.setAttribute('y1', '6');
  line2.setAttribute('x2', '18');
  line2.setAttribute('y2', '18');
  xIcon.appendChild(line2);
  
  discardButton.appendChild(xIcon);
  
  const discardText = document.createElement('span');
  discardText.textContent = 'Discard changes';
  discardButton.appendChild(discardText);
  discardButton.addEventListener('click', (e) => {
    e.stopPropagation();
    discardChanges();
  });
  buttonFooter.appendChild(discardButton);
  
  // Add tooltip to discard button
  discardTooltipCleanup = createButtonTooltip(discardButton, 'Discard changes');
  
  // Create save button (Save icon, primary variant, xs size)
  const saveButton = document.createElement('button');
  saveButton.setAttribute('aria-label', 'Save changes');
  saveButton.style.display = 'inline-flex';
  saveButton.style.alignItems = 'center';
  saveButton.style.justifyContent = 'center';
  saveButton.style.whiteSpace = 'nowrap';
  saveButton.style.borderRadius = '6px';
  saveButton.style.fontSize = '12px';
  saveButton.style.height = '36px';
  saveButton.style.padding = '0 12px';
  saveButton.style.border = '1px solid hsl(var(--primary))';
  saveButton.style.background = 'hsl(var(--primary))';
  saveButton.style.color = 'hsl(var(--primary-foreground))';
  saveButton.style.cursor = 'pointer';
  saveButton.style.transition = 'all 0.2s';
  
  // Create SVG icon for Save
  const saveIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  saveIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  saveIcon.setAttribute('width', '20');
  saveIcon.setAttribute('height', '20');
  saveIcon.setAttribute('viewBox', '0 0 24 24');
  saveIcon.setAttribute('fill', 'none');
  saveIcon.setAttribute('stroke', 'currentColor');
  saveIcon.setAttribute('stroke-width', '2');
  saveIcon.setAttribute('stroke-linecap', 'round');
  saveIcon.setAttribute('stroke-linejoin', 'round');
  saveIcon.style.display = 'inline-block';
  saveIcon.style.marginRight = '8px';
  saveIcon.style.flexShrink = '0';
  
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z');
  saveIcon.appendChild(path1);
  
  const polyline1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline1.setAttribute('points', '17 21 17 13 7 13 7 21');
  saveIcon.appendChild(polyline1);
  
  const polyline2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline2.setAttribute('points', '7 3 7 8 15 8');
  saveIcon.appendChild(polyline2);
  
  saveButton.appendChild(saveIcon);
  
  const saveText = document.createElement('span');
  saveText.textContent = 'Save changes';
  saveButton.appendChild(saveText);
  saveButton.addEventListener('click', (e) => {
    e.stopPropagation();
    saveChanges();
  });
  buttonFooter.appendChild(saveButton);
  
  // Add tooltip to save button
  saveTooltipCleanup = createButtonTooltip(saveButton, 'Save changes');
  
  // Update button footer position when textarea resizes
  resizeObserver = new ResizeObserver(() => {
    updateButtonFooterPosition();
  });
  resizeObserver.observe(textarea);
  
  // Handle keydown events
  textarea.addEventListener('keydown', function (e: KeyboardEvent) {
    // Ctrl+Enter: Save and close editor
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const newText = textarea.value;
      if (!element.questionId) {
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: element.id,
            updates: {
              text: newText,
              formattedText: newText
            }
          }
        });
      }

      if (element.questionId && user?.id) {
        dispatch({
          type: 'UPDATE_TEMP_ANSWER',
          payload: {
            questionId: element.questionId,
            text: newText,
            userId: user.id,
            answerId: element.answerId || uuidv4()
          }
        });
      }

      removeTextarea();
    }
    // Enter without Ctrl: Allow default behavior (new line) - don't prevent default
    // Shift+Enter: Also allow default behavior (new line) - don't prevent default
    // Escape: Close editor without saving
    if (e.key === 'Escape') {
      e.preventDefault();
      removeTextarea();
    }
  });
  
  // Handle input events for auto-wrapping and height adjustment
  // Use scrollHeight to accurately measure the actual content height
  // This is more reliable than calculating based on line count
  const minimumHeight = scaledLineHeight * 2; // Minimum height (two lines) for better usability
  const heightBuffer = scaledLineHeight * 0.5; // Small buffer on top for better visibility
  
  // Set initial height
  const updateHeight = () => {
    // Reset height to auto to get accurate scrollHeight measurement
    textarea.style.height = 'auto';
    
    // Get the actual scroll height (content height)
    const scrollHeight = textarea.scrollHeight;
    
    // Calculate new height: scrollHeight + buffer, but at least minimumHeight
    const newHeight = Math.max(minimumHeight, scrollHeight + heightBuffer);
    
    // Only update if height actually changed to prevent unnecessary reflows
    const currentHeight = parseFloat(textarea.style.height) || 0;
    if (Math.abs(newHeight - currentHeight) > 1) { // 1px tolerance to avoid micro-adjustments
      textarea.style.height = newHeight + 'px';
    }
  };
  
  // Initial height calculation
  updateHeight();
  
  // Update height on input
  textarea.addEventListener('input', updateHeight);
  
  // Store this editor instance globally
  activeEditorInstance = {
    cleanup: removeTextarea,
    textarea,
    buttonContainer: buttonFooter
  };
  
  // Return cleanup function
  return removeTextarea;
}

/**
 * Parameters for free text inline editor
 */
export interface InlineTextEditorForFreeTextParams {
  // Element data
  element: CanvasElement;

  // Text content
  text: string;

  // Styling (single style for free text)
  textStyle: RichTextStyle;
  padding: number;

  // Layout
  layout: LayoutResult;
  boxWidth: number;
  boxHeight: number;

  // Refs
  textRef: React.RefObject<Konva.Rect>;

  // State setters
  setIsEditorOpen: (open: boolean) => void;

  // Dispatch
  dispatch: (action: { type: string; payload?: unknown }) => void;

  // Helper functions
  getLineHeight: (style: RichTextStyle) => number;
  measureText: (text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null) => number;
}

/**
 * Creates an inline text editor for free text elements (no QnA logic).
 * Returns a cleanup function that can be called to close the editor.
 * Only one editor can be open at a time - if another editor is already open, it will be closed first.
 */
export function createInlineTextEditorForFreeText(params: InlineTextEditorForFreeTextParams): () => void {
  const {
    element,
    text,
    textStyle,
    layout,
    padding,
    boxWidth,
    boxHeight,
    textRef,
    setIsEditorOpen,
    dispatch,
    getLineHeight,
    measureText
  } = params;

  const stage = textRef.current?.getStage();
  if (!stage) {
    return () => {};
  }

  // Close any existing editor instance
  if (activeEditorInstance) {
    activeEditorInstance.cleanup();
    activeEditorInstance = null;
  }

  // Set state to hide text during editing
  setIsEditorOpen(true);

  // Remove any existing tooltips
  const removeExistingTooltips = () => {
    const tooltips = document.querySelectorAll('[id^="qna-tooltip-"]');
    tooltips.forEach(tooltip => tooltip.remove());
    const canvasOverlay = document.querySelector('[class*="canvas-overlay"]');
    if (canvasOverlay) {
      const overlayTooltips = canvasOverlay.querySelectorAll('[class*="tooltip"]');
      overlayTooltips.forEach(tooltip => tooltip.remove());
    }
  };
  removeExistingTooltips();

  // Editor dimensions (centered in viewport like QnA editor)
  const editorWidth = window.innerWidth * 0.8;
  const editorMinHeight = window.innerHeight * 0.7;
  const editorLeft = (window.innerWidth - editorWidth) / 2;
  const editorTop = (window.innerHeight - editorMinHeight) / 2;
  const fontSize = 24;
  const lineHeight = fontSize * 1.2;
  const scaledLineHeight = lineHeight;

  // Default font for readable mode
  const defaultFont = 'Inter, system-ui, sans-serif';

  // Create neutral header bar (no question text)
  const questionHeader = document.createElement('div');
  questionHeader.style.position = 'fixed';
  questionHeader.style.left = editorLeft + 'px';
  questionHeader.style.top = (editorTop - 50) + 'px';
  questionHeader.style.width = editorWidth + 'px';
  questionHeader.style.height = '50px';
  questionHeader.style.backgroundColor = '#FFF';
  questionHeader.style.borderRadius = '8px 8px 0 0';
  questionHeader.style.padding = '12px 16px';
  questionHeader.style.fontSize = '20px';
  questionHeader.style.fontWeight = textStyle.fontBold ? 'bold' : 'normal';
  questionHeader.style.fontStyle = textStyle.fontItalic ? 'italic' : 'normal';
  questionHeader.style.fontFamily = textStyle.fontFamily;
  questionHeader.style.color = textStyle.fill || '#000000';
  questionHeader.style.display = 'flex';
  questionHeader.style.alignItems = 'center';
  questionHeader.style.justifyContent = 'space-between';
  questionHeader.style.gap = '12px';
  questionHeader.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
  questionHeader.style.zIndex = '10001';

  // Neutral text span (no question content)
  const questionTextSpan = document.createElement('span');
  questionTextSpan.style.overflow = 'hidden';
  questionTextSpan.style.textOverflow = 'ellipsis';
  questionTextSpan.style.whiteSpace = 'nowrap';
  questionTextSpan.style.flex = '1';
  questionTextSpan.style.fontFamily = defaultFont;
  questionTextSpan.textContent = 'Text';
  questionHeader.appendChild(questionTextSpan);

  // Checkbox container
  const checkboxContainer = document.createElement('label');
  checkboxContainer.style.display = 'flex';
  checkboxContainer.style.alignItems = 'center';
  checkboxContainer.style.gap = '6px';
  checkboxContainer.style.cursor = 'pointer';
  checkboxContainer.style.fontSize = '14px';
  checkboxContainer.style.whiteSpace = 'nowrap';
  checkboxContainer.style.userSelect = 'none';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.style.width = '16px';
  checkbox.style.height = '16px';
  checkbox.style.cursor = 'pointer';
  checkbox.style.accentColor = 'hsl(var(--primary))';

  const checkboxLabel = document.createElement('span');
  checkboxLabel.textContent = 'Display in readable font';
  checkboxLabel.style.color = '#6b7280';
  checkboxLabel.style.fontFamily = defaultFont;

  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(checkboxLabel);
  questionHeader.appendChild(checkboxContainer);

  document.body.appendChild(questionHeader);

  // Create textarea
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = editorLeft + 'px';
  textarea.style.top = editorTop + 'px';
  textarea.style.width = editorWidth + 'px';
  textarea.style.minHeight = editorMinHeight + 'px';

  // Apply shared styling (same as QnA)
  applyInlineEditorStyling(textarea, textStyle, fontSize, lineHeight);

  // Override styling for editor: white background, no bottom rounded corners, shadow
  textarea.style.backgroundColor = '#ffffff';
  textarea.style.background = '#ffffff';
  textarea.style.borderRadius = '0';
  textarea.style.boxShadow = 'none';
  textarea.style.border = 'none';
  textarea.style.padding = '16px';
  textarea.style.textAlign = 'left';

  document.body.appendChild(textarea);
  textarea.focus();

  // Handle checkbox change
  checkbox.addEventListener('change', () => {
    const useReadableFont = checkbox.checked;
    textarea.style.fontFamily = useReadableFont ? defaultFont : textStyle.fontFamily;
    questionTextSpan.style.fontFamily = useReadableFont ? defaultFont : textStyle.fontFamily;
  });

  // Create fullscreen overlay
  const canvasOverlayContainer = document.createElement('div');
  canvasOverlayContainer.style.position = 'fixed';
  canvasOverlayContainer.style.top = '0';
  canvasOverlayContainer.style.left = '0';
  canvasOverlayContainer.style.width = '100vw';
  canvasOverlayContainer.style.height = '100vh';
  canvasOverlayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  canvasOverlayContainer.style.zIndex = '9999';
  canvasOverlayContainer.style.pointerEvents = 'auto';
  canvasOverlayContainer.id = 'inline-editor-canvas-overlay-container';
  document.body.insertBefore(canvasOverlayContainer, textarea);

  // Create button footer
  const buttonFooter = document.createElement('div');
  buttonFooter.style.position = 'fixed';
  buttonFooter.style.backgroundColor = '#FFF';
  buttonFooter.style.borderRadius = '0 0 8px 8px';
  buttonFooter.style.padding = '12px 16px';
  buttonFooter.style.display = 'flex';
  buttonFooter.style.alignItems = 'center';
  buttonFooter.style.justifyContent = 'flex-end';
  buttonFooter.style.gap = '4px';
  buttonFooter.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
  buttonFooter.style.zIndex = '10001';
  document.body.appendChild(buttonFooter);

  const updateButtonFooterPosition = () => {
    const textareaRect = textarea.getBoundingClientRect();
    buttonFooter.style.left = textareaRect.left + 'px';
    buttonFooter.style.top = (textareaRect.bottom + 1) + 'px';
    buttonFooter.style.width = textareaRect.width + 'px';
  };
  updateButtonFooterPosition();

  const updateEditorSize = () => {
    const newEditorWidth = window.innerWidth * 0.8;
    const newEditorMinHeight = window.innerHeight * 0.7;
    const newEditorLeft = (window.innerWidth - newEditorWidth) / 2;
    const newEditorTop = (window.innerHeight - newEditorMinHeight) / 2;

    textarea.style.left = newEditorLeft + 'px';
    textarea.style.top = newEditorTop + 'px';
    textarea.style.width = newEditorWidth + 'px';
    textarea.style.minHeight = newEditorMinHeight + 'px';

    questionHeader.style.left = newEditorLeft + 'px';
    questionHeader.style.top = (newEditorTop - 50) + 'px';
    questionHeader.style.width = newEditorWidth + 'px';

    updateButtonFooterPosition();
  };
  window.addEventListener('resize', updateEditorSize);

  let resizeObserver: ResizeObserver | null = null;
  let discardTooltipCleanup: (() => void) | null = null;
  let saveTooltipCleanup: (() => void) | null = null;

  const createButtonTooltip = (button: HTMLButtonElement, text: string) => {
    let tooltipElement: HTMLDivElement | null = null;
    let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;
    let tooltipVisible = false;

    const showTooltip = () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }

      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }

      tooltipElement = document.createElement('div');
      tooltipElement.className = 'fixed pointer-events-none transition-all duration-200 ease-out opacity-0 scale-95';
      tooltipElement.style.zIndex = '11';

      const tooltipContent = document.createElement('div');
      tooltipContent.className = 'text-xs bg-background text-foreground px-2 py-1 rounded whitespace-nowrap';
      tooltipContent.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      tooltipContent.textContent = text;
      tooltipElement.appendChild(tooltipContent);

      document.body.appendChild(tooltipElement);

      const buttonRect = button.getBoundingClientRect();
      tooltipElement.style.left = (buttonRect.left + buttonRect.width / 2) + 'px';
      tooltipElement.style.top = (buttonRect.top - 8) + 'px';
      tooltipElement.style.transform = 'translate(-50%, -100%)';

      tooltipTimeout = setTimeout(() => {
        if (tooltipElement) {
          tooltipElement.className = 'fixed pointer-events-none transition-all duration-200 ease-out opacity-100 scale-100';
          tooltipVisible = true;
        }
      }, 10);
    };

    const hideTooltip = () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }

      if (tooltipElement) {
        tooltipElement.className = 'fixed pointer-events-none transition-all duration-200 ease-out opacity-0 scale-95';
        tooltipVisible = false;

        setTimeout(() => {
          if (tooltipElement && tooltipElement.parentNode && !tooltipVisible) {
            tooltipElement.parentNode.removeChild(tooltipElement);
          }
        }, 200);
      }
    };

    const onMouseEnter = () => showTooltip();
    const onMouseLeave = () => hideTooltip();

    button.addEventListener('mouseenter', onMouseEnter);
    button.addEventListener('mouseleave', onMouseLeave);

    return () => {
      button.removeEventListener('mouseenter', onMouseEnter);
      button.removeEventListener('mouseleave', onMouseLeave);
      hideTooltip();
    };
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node | null;
    if (!target) return;
    if (target === textarea || textarea.contains(target)) return;
    if (target === buttonFooter || buttonFooter.contains(target)) return;
    if (target === questionHeader || questionHeader.contains(target)) return;
    discardChanges();
  };

  window.addEventListener('mousedown', handleClickOutside, true);

  const removeTextarea = () => {
    window.removeEventListener('mousedown', handleClickOutside, true);
    window.removeEventListener('resize', updateEditorSize);
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (discardTooltipCleanup) {
      discardTooltipCleanup();
      discardTooltipCleanup = null;
    }
    if (saveTooltipCleanup) {
      saveTooltipCleanup();
      saveTooltipCleanup = null;
    }
    if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
    if (buttonFooter.parentNode) buttonFooter.parentNode.removeChild(buttonFooter);
    if (questionHeader.parentNode) questionHeader.parentNode.removeChild(questionHeader);
    if (canvasOverlayContainer.parentNode) canvasOverlayContainer.parentNode.removeChild(canvasOverlayContainer);
    setIsEditorOpen(false);
    if (activeEditorInstance && activeEditorInstance.textarea === textarea) {
      activeEditorInstance = null;
    }
  };

  const saveChanges = () => {
    const newText = textarea.value;
    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: { id: element.id, updates: { text: newText, formattedText: newText } }
    });
    dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Update Free Text' });
    removeTextarea();
  };

  const discardChanges = () => {
    removeTextarea();
  };

  // Create discard button (X icon, outline variant, xs size)
  const discardButton = document.createElement('button');
  discardButton.setAttribute('aria-label', 'Discard changes');
  discardButton.style.display = 'inline-flex';
  discardButton.style.alignItems = 'center';
  discardButton.style.justifyContent = 'center';
  discardButton.style.whiteSpace = 'nowrap';
  discardButton.style.borderRadius = '6px';
  discardButton.style.fontSize = '12px';
  discardButton.style.height = '36px';
  discardButton.style.padding = '0 12px';
  discardButton.style.border = '1px solid hsl(var(--input))';
  discardButton.style.background = 'hsl(var(--background))';
  discardButton.style.color = 'hsl(var(--foreground))';
  discardButton.style.cursor = 'pointer';
  discardButton.style.transition = 'all 0.2s';
  
  // Create SVG icon for X
  const xIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  xIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  xIcon.setAttribute('width', '20');
  xIcon.setAttribute('height', '20');
  xIcon.setAttribute('viewBox', '0 0 24 24');
  xIcon.setAttribute('fill', 'none');
  xIcon.setAttribute('stroke', 'currentColor');
  xIcon.setAttribute('stroke-width', '2');
  xIcon.setAttribute('stroke-linecap', 'round');
  xIcon.setAttribute('stroke-linejoin', 'round');
  xIcon.style.display = 'inline-block';
  xIcon.style.marginRight = '8px';
  xIcon.style.flexShrink = '0';
  
  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', '18');
  line1.setAttribute('y1', '6');
  line1.setAttribute('x2', '6');
  line1.setAttribute('y2', '18');
  xIcon.appendChild(line1);
  
  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '6');
  line2.setAttribute('y1', '6');
  line2.setAttribute('x2', '18');
  line2.setAttribute('y2', '18');
  xIcon.appendChild(line2);
  
  discardButton.appendChild(xIcon);
  
  const discardText = document.createElement('span');
  discardText.textContent = 'Discard changes';
  discardButton.appendChild(discardText);
  discardButton.addEventListener('click', (e) => {
    e.stopPropagation();
    discardChanges();
  });
  buttonFooter.appendChild(discardButton);
  
  // Add tooltip to discard button
  discardTooltipCleanup = createButtonTooltip(discardButton, 'Discard changes');
  
  // Create save button (Save icon, primary variant, xs size)
  const saveButton = document.createElement('button');
  saveButton.setAttribute('aria-label', 'Save changes');
  saveButton.style.display = 'inline-flex';
  saveButton.style.alignItems = 'center';
  saveButton.style.justifyContent = 'center';
  saveButton.style.whiteSpace = 'nowrap';
  saveButton.style.borderRadius = '6px';
  saveButton.style.fontSize = '12px';
  saveButton.style.height = '36px';
  saveButton.style.padding = '0 12px';
  saveButton.style.border = '1px solid hsl(var(--primary))';
  saveButton.style.background = 'hsl(var(--primary))';
  saveButton.style.color = 'hsl(var(--primary-foreground))';
  saveButton.style.cursor = 'pointer';
  saveButton.style.transition = 'all 0.2s';
  
  // Create SVG icon for Save
  const saveIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  saveIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  saveIcon.setAttribute('width', '20');
  saveIcon.setAttribute('height', '20');
  saveIcon.setAttribute('viewBox', '0 0 24 24');
  saveIcon.setAttribute('fill', 'none');
  saveIcon.setAttribute('stroke', 'currentColor');
  saveIcon.setAttribute('stroke-width', '2');
  saveIcon.setAttribute('stroke-linecap', 'round');
  saveIcon.setAttribute('stroke-linejoin', 'round');
  saveIcon.style.display = 'inline-block';
  saveIcon.style.marginRight = '8px';
  saveIcon.style.flexShrink = '0';
  
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z');
  saveIcon.appendChild(path1);
  
  const polyline1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline1.setAttribute('points', '17 21 17 13 7 13 7 21');
  saveIcon.appendChild(polyline1);
  
  const polyline2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline2.setAttribute('points', '7 3 7 8 15 8');
  saveIcon.appendChild(polyline2);
  
  saveButton.appendChild(saveIcon);
  
  const saveText = document.createElement('span');
  saveText.textContent = 'Save changes';
  saveButton.appendChild(saveText);
  saveButton.addEventListener('click', (e) => {
    e.stopPropagation();
    saveChanges();
  });
  buttonFooter.appendChild(saveButton);
  
  // Add tooltip to save button
  saveTooltipCleanup = createButtonTooltip(saveButton, 'Save changes');
  
  // Update button footer position when textarea resizes
  resizeObserver = new ResizeObserver(() => {
    updateButtonFooterPosition();
  });
  resizeObserver.observe(textarea);
  
  // Handle keydown events
  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveChanges();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      removeTextarea();
    }
  });
  
  // Handle input events for auto-wrapping and height adjustment
  // Use scrollHeight to accurately measure the actual content height
  // This is more reliable than calculating based on line count
  const minimumHeight = scaledLineHeight * 2; // Minimum height (two lines) for better usability
  const heightBuffer = scaledLineHeight * 0.5; // Small buffer on top for better visibility
  
  // Set initial height
  const updateHeight = () => {
    // Reset height to auto to get accurate scrollHeight measurement
    textarea.style.height = 'auto';
    
    // Get the actual scroll height (content height)
    const scrollHeight = textarea.scrollHeight;
    
    // Calculate new height: scrollHeight + buffer, but at least minimumHeight
    const newHeight = Math.max(minimumHeight, scrollHeight + heightBuffer);
    
    // Only update if height actually changed to prevent unnecessary reflows
    const currentHeight = parseFloat(textarea.style.height) || 0;
    if (Math.abs(newHeight - currentHeight) > 1) { // 1px tolerance to avoid micro-adjustments
      textarea.style.height = newHeight + 'px';
    }
  };
  
  // Initial height calculation
  updateHeight();
  
  // Update height on input
  textarea.addEventListener('input', updateHeight);
  
  // Store this editor instance globally
  activeEditorInstance = {
    cleanup: removeTextarea,
    textarea,
    buttonContainer: buttonFooter
  };
  
  // Return cleanup function
  return removeTextarea;
}
