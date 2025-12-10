import { v4 as uuidv4 } from 'uuid';
import type React from 'react';
import type Konva from 'konva';
import type { RichTextStyle, TextRun } from '../../../../../../shared/types/text-layout';
import type { LayoutResult } from '../../../../../../shared/types/layout';
import type { CanvasElement } from '../../../../context/editor-context';

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

  // Close any existing editor instance
  if (activeEditorInstance) {
    activeEditorInstance.cleanup();
    activeEditorInstance = null;
  }

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
  
  // Calculate absolute position relative to viewport
  const stageBox = stage.container().getBoundingClientRect();
  
  // Get zoom factor from stage (scaleX and scaleY should be the same for uniform scaling)
  const zoom = stage.scaleX();
  
  // Apply zoom to dimensions and font size (needed for line height calculation)
  const scaledFontSize = answerStyle.fontSize * zoom;
  const lineHeightValue = getLineHeight(answerStyle);
  const scaledLineHeight = lineHeightValue * zoom;
  
  // Use actual text bounds if available, otherwise use answerArea
  const textBounds = actualTextBounds || answerArea;
  
  // Position textarea horizontally at the left edge of the textbox (padding)
  // This ensures the textarea always aligns with the textbox's horizontal position,
  // regardless of where the answer text starts (e.g., in a combined question-answer row)
  const runX = padding;
  // Position textarea one line below the first answer text row (only if text exists)
  const runY = actualTextBounds 
    ? textBounds.y + lineHeightValue // Add one line height to position below first row when text exists
    : textBounds.y; // Use normal position when no text exists yet
  
  // Transform run position through the group's transform to get stage coordinates
  const groupTransform = groupNode.getAbsoluteTransform();
  const runStagePos = groupTransform.point({ x: runX, y: runY });
  
  // Convert to viewport coordinates (stage container position + transformed run position)
  // Apply small offsets to fine-tune positioning
  // Textarea needs to shift slightly right (positive X) and down (positive Y) for correct alignment
  const areaPosition = {
    x: stageBox.left + runStagePos.x + (1 * zoom), // Shift slightly right
    y: stageBox.top + runStagePos.y + (4 * zoom), // Shift down a bit more
  };
  
  // Use answerArea width for textarea (full available width for wrapping)
  // This ensures textarea has the same width as the text area on canvas
  const scaledWidth = answerArea.width * zoom;
  // Initial height will be calculated using scrollHeight after textarea is styled
  const initialMinimumHeight = scaledLineHeight * 2; // Minimum height (two lines) for better usability
  const scaledHeight = initialMinimumHeight; // Will be updated by scrollHeight calculation
  
  // Create textarea
  const textarea = document.createElement('textarea');
  // Remove any classes that might add borders
  textarea.className = '';
  textarea.removeAttribute('class');
  document.body.appendChild(textarea);
  
  // Set initial value
  textarea.value = answerText || '';
  
  // Style textarea exactly like canvas rendering (with zoom applied)
  textarea.style.position = 'fixed'; // Use fixed instead of absolute for viewport-relative positioning
  textarea.style.top = areaPosition.y + 'px';
  textarea.style.left = areaPosition.x + 'px';
  textarea.style.width = scaledWidth + 'px';
  textarea.style.height = scaledHeight + 'px';
  textarea.style.fontSize = scaledFontSize + 'px';
  textarea.style.fontFamily = answerStyle.fontFamily;
  textarea.style.fontWeight = answerStyle.fontBold ? 'bold' : 'normal';
  textarea.style.fontStyle = answerStyle.fontItalic ? 'italic' : 'normal';
  textarea.style.color = 'var(--foreground)'; // Always use foreground color for editor textarea
  textarea.style.opacity = '1'; // Full opacity for text (background is transparent)
  textarea.style.lineHeight = scaledLineHeight + 'px'; // Set lineHeight as pixel value (scaled)
  textarea.style.textAlign = answerStyle.align || 'left';
  textarea.style.padding = '0px';
  textarea.style.margin = '0px';
  textarea.style.border = '3px dashed #d1d5db'; // Light gray dashed border, 3px width
  textarea.style.borderWidth = '3px';
  textarea.style.borderStyle = 'dashed';
  textarea.style.borderColor = '#d1d5db'; // Light gray color
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.backgroundColor = 'transparent'; // Transparent background - canvas visible underneath
  textarea.style.background = 'transparent';
  textarea.style.backgroundImage = 'none'; // Ensure no background image
  textarea.style.backgroundClip = 'padding-box'; // Ensure background doesn't extend to border
  textarea.style.resize = 'none';
  textarea.style.overflow = 'hidden';
  textarea.style.whiteSpace = 'pre-wrap';
  textarea.style.transformOrigin = 'left top';
  textarea.style.zIndex = '10000'; // Above canvas overlay (9999)
  textarea.style.boxSizing = 'border-box';
  
  // Remove any focus styles that might add borders
  textarea.style.setProperty('--tw-ring-width', '0');
  textarea.style.setProperty('--tw-ring-offset-width', '0');
  
  // Handle rotation if needed
  const rotation = textRef.current?.rotation() || 0;
  let transform = '';
  if (rotation) {
    transform += 'rotateZ(' + rotation + 'deg)';
  }
  transform += 'translateY(-2px)';
  textarea.style.transform = transform;
  
  // Focus textarea
  textarea.focus();
  
  // Create white overlay to cover the canvas when editor is open
  // We'll create 4 overlay sections (top, bottom, left, right) to exclude the textarea area
  const canvasRect = stageBox; // Use stageBox which contains the canvas position and size
  
  // Ensure we have valid dimensions
  const overlayTop = canvasRect.top || 0;
  const overlayLeft = canvasRect.left || 0;
  const overlayWidth = canvasRect.width || window.innerWidth;
  const overlayHeight = canvasRect.height || window.innerHeight;
  
  // Create overlay container
  const canvasOverlayContainer = document.createElement('div');
  canvasOverlayContainer.style.position = 'fixed';
  canvasOverlayContainer.style.top = overlayTop + 'px';
  canvasOverlayContainer.style.left = overlayLeft + 'px';
  canvasOverlayContainer.style.width = overlayWidth + 'px';
  canvasOverlayContainer.style.height = overlayHeight + 'px';
  canvasOverlayContainer.style.zIndex = '9999'; // High z-index to ensure it's above canvas
  canvasOverlayContainer.style.pointerEvents = 'none'; // Allow clicks to pass through
  canvasOverlayContainer.id = 'inline-editor-canvas-overlay-container';
  
  // Function to update overlay sections based on current textarea dimensions
  const updateOverlaySections = () => {
    // Clear existing sections
    canvasOverlayContainer.innerHTML = '';
    
    // Get current textarea dimensions (including border)
    const textareaRect = textarea.getBoundingClientRect();
    const textareaTop = textareaRect.top;
    const textareaLeft = textareaRect.left;
    const textareaWidth = textareaRect.width;
    const textareaHeight = textareaRect.height;
    
    // Create 4 overlay sections to cover canvas but exclude textarea area
    const createOverlaySection = (top: number, left: number, width: number, height: number) => {
      if (width <= 0 || height <= 0) return null; // Skip invalid sections
      const section = document.createElement('div');
      section.style.position = 'absolute';
      section.style.top = (top - overlayTop) + 'px';
      section.style.left = (left - overlayLeft) + 'px';
      section.style.width = width + 'px';
      section.style.height = height + 'px';
      section.style.backgroundColor = '#ffffff';
      section.style.opacity = '0.6';
      return section;
    };
    
    // Top section (above textarea)
    if (textareaTop > overlayTop) {
      const topSection = createOverlaySection(
        overlayTop,
        overlayLeft,
        overlayWidth,
        textareaTop - overlayTop
      );
      if (topSection) canvasOverlayContainer.appendChild(topSection);
    }
    
    // Bottom section (below textarea)
    const textareaBottom = textareaTop + textareaHeight;
    const overlayBottom = overlayTop + overlayHeight;
    if (textareaBottom < overlayBottom) {
      const bottomSection = createOverlaySection(
        textareaBottom,
        overlayLeft,
        overlayWidth,
        overlayBottom - textareaBottom
      );
      if (bottomSection) canvasOverlayContainer.appendChild(bottomSection);
    }
    
    // Left section (left of textarea)
    if (textareaLeft > overlayLeft) {
      const leftSectionTop = Math.max(overlayTop, textareaTop);
      const leftSectionBottom = Math.min(overlayBottom, textareaBottom);
      if (leftSectionTop < leftSectionBottom) {
        const leftSection = createOverlaySection(
          leftSectionTop,
          overlayLeft,
          textareaLeft - overlayLeft,
          leftSectionBottom - leftSectionTop
        );
        if (leftSection) canvasOverlayContainer.appendChild(leftSection);
      }
    }
    
    // Right section (right of textarea)
    const textareaRight = textareaLeft + textareaWidth;
    const overlayRight = overlayLeft + overlayWidth;
    if (textareaRight < overlayRight) {
      const rightSectionTop = Math.max(overlayTop, textareaTop);
      const rightSectionBottom = Math.min(overlayBottom, textareaBottom);
      if (rightSectionTop < rightSectionBottom) {
        const rightSection = createOverlaySection(
          rightSectionTop,
          textareaRight,
          overlayRight - textareaRight,
          rightSectionBottom - rightSectionTop
        );
        if (rightSection) canvasOverlayContainer.appendChild(rightSection);
      }
    }
  };
  
  // Initial overlay creation
  updateOverlaySections();
  
  // Update overlay when textarea size changes (e.g., when text is added and height increases)
  let overlayResizeObserver: ResizeObserver | null = new ResizeObserver(() => {
    updateOverlaySections();
  });
  overlayResizeObserver.observe(textarea);
  
  // Insert before textarea to ensure proper stacking
  document.body.insertBefore(canvasOverlayContainer, textarea);
  
  // Create container for buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-1';
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.zIndex = '10001'; // Above textarea (10000) and canvas overlay (9999)
  buttonContainer.style.pointerEvents = 'auto';
  document.body.appendChild(buttonContainer);
  
  // Create resize observer for button positioning
  let resizeObserver: ResizeObserver | null = null;
  
  // Tooltip cleanup functions (will be set when buttons are created)
  let discardTooltipCleanup: (() => void) | null = null;
  let saveTooltipCleanup: (() => void) | null = null;

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
      // Allow clicks on textarea and buttons
      const target = e.target as HTMLElement;
      if (target === textarea || textarea.contains(target) || buttonContainer.contains(target)) {
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
      if (activeElement === textarea || buttonContainer.contains(activeElement)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Block touch events on stage
    const blockTouchEvents = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target === textarea || textarea.contains(target) || buttonContainer.contains(target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Block pointer events on stage
    const blockPointerEvents = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target === textarea || textarea.contains(target) || buttonContainer.contains(target)) {
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
    
    // Don't close if clicking on textarea or buttons
    if (target === textarea || textarea.contains(target) || buttonContainer.contains(target)) {
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
  
  // Function to remove textarea and cleanup
  function removeTextarea() {
    // Remove all event handlers
    canvasEventHandlers.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler, true);
    });
    canvasEventHandlers = [];

    // Restore original cursor on canvas
    stageContainer.style.cursor = originalCursor;

    // Remove canvas overlay container
    const overlayContainer = document.getElementById('inline-editor-canvas-overlay-container');
    if (overlayContainer && overlayContainer.parentNode) {
      overlayContainer.parentNode.removeChild(overlayContainer);
    }

    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    if (buttonContainer.parentNode) {
      buttonContainer.parentNode.removeChild(buttonContainer);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (overlayResizeObserver) {
      overlayResizeObserver.disconnect();
      overlayResizeObserver = null;
    }
    // Cleanup tooltips
    if (discardTooltipCleanup) {
      discardTooltipCleanup();
    }
    if (saveTooltipCleanup) {
      saveTooltipCleanup();
    }
    // Show answer text again by resetting state
    setIsAnswerEditorOpen(false);
    stageInstance.draw();
    
    // Clear global state
    if (activeEditorInstance && activeEditorInstance.textarea === textarea) {
      activeEditorInstance = null;
    }
  }
  
  // Function to save changes
  function saveChanges() {
    const newText = textarea.value;
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
  
  // Update button container position when textarea position/size changes
  // Position buttons on bottom border of textarea, halfway between inside and outside
  const updateButtonPosition = () => {
    const textareaRect = textarea.getBoundingClientRect();
    const buttonHeight = 32; // h-7 = 28px
    const borderWidth = 3; // textarea border is 3px
    // Position on bottom border, halfway inside/outside: bottom - borderWidth/2 - buttonHeight/2
    buttonContainer.style.left = (textareaRect.right - 8) + 'px';
    buttonContainer.style.top = (textareaRect.bottom - borderWidth / 2 - buttonHeight / 2) + 'px';
    buttonContainer.style.transform = 'translate(-100%, 0)';
  };
  
  // Initial position
  updateButtonPosition();
  
  // Helper function to create and manage tooltip for buttons
  const createButtonTooltip = (button: HTMLElement, text: string) => {
    let tooltipElement: HTMLElement | null = null;
    let tooltipVisible = false;
    let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const showTooltip = () => {
      if (tooltipVisible) return;
      
      // Clear any existing timeout
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      
      // Remove existing tooltip if any
      if (tooltipElement && tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }
      
      // Create tooltip element
      tooltipElement = document.createElement('div');
      tooltipElement.className = 'fixed pointer-events-none transition-all duration-200 ease-out opacity-0 scale-95';
      tooltipElement.style.zIndex = '11'; // Above buttons
      
      const tooltipContent = document.createElement('div');
      tooltipContent.className = 'text-xs bg-background text-foreground px-2 py-1 rounded whitespace-nowrap';
      tooltipContent.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      tooltipContent.textContent = text;
      tooltipElement.appendChild(tooltipContent);
      
      document.body.appendChild(tooltipElement);
      
      // Calculate position (above button, centered)
      const buttonRect = button.getBoundingClientRect();
      tooltipElement.style.left = (buttonRect.left + buttonRect.width / 2) + 'px';
      tooltipElement.style.top = (buttonRect.top - 8) + 'px';
      tooltipElement.style.transform = 'translate(-50%, -100%)';
      
      // Show with transition
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
        
        // Remove after transition
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
    
    // Cleanup function
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
  discardButton.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm h-7 px-3 text-xs border border-input bg-background hover:bg-secondary hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-7 p-0';
  discardButton.setAttribute('aria-label', 'Discard changes');
  // Set color with fallback
  const computedStyle = getComputedStyle(document.documentElement);
  const foregroundColor = computedStyle.getPropertyValue('--foreground').trim() || '#000000';
  discardButton.style.color = foregroundColor ? `hsl(${foregroundColor})` : '#000000';
  
  // Create SVG icon for X
  const xIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  xIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  xIcon.setAttribute('width', '16');
  xIcon.setAttribute('height', '16');
  xIcon.setAttribute('viewBox', '0 0 24 24');
  xIcon.setAttribute('fill', 'none');
  xIcon.setAttribute('stroke', 'currentColor');
  xIcon.setAttribute('stroke-width', '2');
  xIcon.setAttribute('stroke-linecap', 'round');
  xIcon.setAttribute('stroke-linejoin', 'round');
  xIcon.style.display = 'block';
  xIcon.style.color = 'inherit';
  xIcon.style.verticalAlign = 'middle';
  xIcon.style.flexShrink = '0';
  xIcon.style.width = '16px';
  xIcon.style.height = '16px';
  
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
  discardButton.addEventListener('click', (e) => {
    e.stopPropagation();
    discardChanges();
  });
  buttonContainer.appendChild(discardButton);
  
  // Add tooltip to discard button
  discardTooltipCleanup = createButtonTooltip(discardButton, 'Discard changes');
  
  // Create save button (Save icon, primary variant, xs size)
  const saveButton = document.createElement('button');
  saveButton.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm h-7 px-3 text-xs border border-primary bg-primary text-primary-foreground hover:bg-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-7 p-0';
  saveButton.setAttribute('aria-label', 'Save changes');
  // Set color with fallback
  const primaryForegroundColor = computedStyle.getPropertyValue('--primary-foreground').trim() || '#ffffff';
  saveButton.style.color = primaryForegroundColor ? `hsl(${primaryForegroundColor})` : '#ffffff';
  
  // Create SVG icon for Save
  const saveIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  saveIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  saveIcon.setAttribute('width', '16');
  saveIcon.setAttribute('height', '16');
  saveIcon.setAttribute('viewBox', '0 0 24 24');
  saveIcon.setAttribute('fill', 'none');
  saveIcon.setAttribute('stroke', 'currentColor');
  saveIcon.setAttribute('stroke-width', '2');
  saveIcon.setAttribute('stroke-linecap', 'round');
  saveIcon.setAttribute('stroke-linejoin', 'round');
  saveIcon.style.display = 'block';
  saveIcon.style.color = 'inherit';
  saveIcon.style.verticalAlign = 'middle';
  saveIcon.style.flexShrink = '0';
  saveIcon.style.width = '16px';
  saveIcon.style.height = '16px';
  
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
  saveButton.addEventListener('click', (e) => {
    e.stopPropagation();
    saveChanges();
  });
  buttonContainer.appendChild(saveButton);
  
  // Add tooltip to save button
  saveTooltipCleanup = createButtonTooltip(saveButton, 'Save changes');
  
  // Update button position when textarea resizes
  resizeObserver = new ResizeObserver(() => {
    updateButtonPosition();
  });
  resizeObserver.observe(textarea);
  
  // Handle keydown events
  textarea.addEventListener('keydown', function (e: KeyboardEvent) {
    // Ctrl+Enter: Save and close editor
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const newText = textarea.value;
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
  
  // Update height on input - use a small debounce to batch rapid changes
  let updateHeightTimeout: ReturnType<typeof setTimeout> | null = null;
  textarea.addEventListener('input', function () {
    if (updateHeightTimeout) {
      clearTimeout(updateHeightTimeout);
    }
    
    // Use a very short delay to allow the browser to update scrollHeight
    updateHeightTimeout = setTimeout(() => {
      updateHeight();
      updateHeightTimeout = null;
    }, 10); // Very short delay to allow DOM update
  });
  
  // Store this editor instance globally
  activeEditorInstance = {
    cleanup: removeTextarea,
    textarea,
    buttonContainer
  };
  
  // Return cleanup function
  return removeTextarea;
}

