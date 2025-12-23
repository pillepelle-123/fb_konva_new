import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Shape, Rect, Path, Text as KonvaText, Group } from 'react-konva';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { getThemeRenderer, type Theme } from '../../../../utils/themes-client';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { renderThemedBorder, createRectPath, createLinePath } from '../../../../utils/themed-border';
import type { CanvasElement } from '../../../../context/editor-context';
import type Konva from 'konva';
import type { RichTextStyle, TextRun, ParagraphSpacing } from '../../../../../../shared/types/text-layout';
import type { LinePosition, LayoutResult } from '../../../../../../shared/types/layout';
import { buildFont as sharedBuildFont, getLineHeight as sharedGetLineHeight, measureText as sharedMeasureText, calculateTextX as sharedCalculateTextX, wrapText as sharedWrapText } from '../../../../../../shared/utils/text-layout';
import { createInlineTextEditorForFreeText } from './inline-text-editor';

// Use shared functions with feature flag fallback
const buildFont = sharedBuildFont;
const getLineHeight = sharedGetLineHeight;
const measureText = sharedMeasureText;
const calculateTextX = sharedCalculateTextX;
const wrapText = sharedWrapText;

/**
 * Creates a simplified layout for free text (no QnA logic).
 * Only sequential text wrapping - no combined lines, no gaps between text types.
 */
function createFreeTextLayout(params: {
  text: string;
  textStyle: RichTextStyle;
  width: number;
  height: number;
  padding: number;
  ctx: CanvasRenderingContext2D | null;
}): LayoutResult {
  const { text, textStyle, width, height, padding, ctx } = params;

  const runs: TextRun[] = [];
  const linePositions: LinePosition[] = [];

  // Calculate line height
  const lineHeight = getLineHeight(textStyle);

  // Baseline offset: text baseline is typically at fontSize * 0.8 from top
  const baselineOffset = textStyle.fontSize * 0.8;

  // Available width for text
  const availableWidth = Math.max(10, width - padding * 2);

  let cursorY = padding;

  // Wrap text into lines
  const textLines = wrapText(text, textStyle, availableWidth, ctx);

  // Process each line
  textLines.forEach((line: { text: string; width: number }) => {
    if (line.text) {
      // Calculate baseline Y position: cursorY (top of line) + baseline offset
      const baselineY = cursorY + baselineOffset;

      // Calculate text X position based on alignment
      const textX = calculateTextX(line.text, textStyle, padding, availableWidth, ctx);

      // Create text run
      runs.push({
        text: line.text,
        x: textX,
        y: baselineY,
        style: textStyle
      });

      // Track line position for ruled lines (position line slightly below text baseline)
      linePositions.push({
        y: baselineY + textStyle.fontSize * 0.15,
        lineHeight: lineHeight,
        style: textStyle
      });

      cursorY += lineHeight;
    } else {
      // Empty line - still track position
      const baselineY = cursorY + baselineOffset;
      linePositions.push({
        y: baselineY + textStyle.fontSize * 0.15,
        lineHeight: lineHeight,
        style: textStyle
      });
      cursorY += lineHeight;
    }
  });

  const contentHeight = Math.max(cursorY, height);

  return {
    runs,
    contentHeight,
    linePositions
  };
}

// RichTextShape component for rendering text
const RichTextShape = React.forwardRef<Konva.Shape, {
  runs: TextRun[];
  width: number;
  height: number;
}>(({ runs, width, height }, ref) => (
  <Shape
    ref={ref}
    listening={false}
    width={width}
    height={height}
    sceneFunc={(ctx, shape) => {
      ctx.save();
      // Use 'alphabetic' baseline for proper text alignment
      // Y positions in runs are already baseline positions
      ctx.textBaseline = 'alphabetic';
      runs.forEach((run: TextRun) => {
        ctx.font = buildFont(run.style);
        ctx.fillStyle = run.style.fontColor || '#000000';
        ctx.globalAlpha = run.style.fontOpacity ?? 1;
        // Y position is already the baseline position
        ctx.fillText(run.text, run.x, run.y);
      });
      ctx.restore();
      ctx.fillStrokeShape(shape);
    }}
  />
));
RichTextShape.displayName = 'RichTextShape';

export default function TextboxFreeText(props: CanvasItemProps) {
  const { element } = props;
  const freeTextElement = element as CanvasElement;
  const { state, dispatch } = useEditor();

  // Get element dimensions - use actual values, don't default to 0
  // This ensures we use the correct dimensions when loading
  const elementWidth = element.width ?? 0;
  const elementHeight = element.height ?? 0;

  // Refs must be declared before they are used
  const textShapeRef = useRef<Konva.Shape>(null);
  const textRef = useRef<Konva.Rect>(null);
  const isTransformingRef = useRef(false);
  const transformStartDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // Local state for dimensions during transform (to update visually without dispatch)
  // ONLY used during active transform, NOT during initial load
  const [transformDimensions, setTransformDimensions] = useState<{ width: number; height: number } | null>(null);
  const transformDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // State to track if editor is open (to hide text during editing)
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Sync ref with state
  useEffect(() => {
    transformDimensionsRef.current = transformDimensions;
  }, [transformDimensions]);

  // Use transform dimensions during active transform OR if transformDimensions are set (waiting for element update)
  // Otherwise use element dimensions
  // This ensures we keep the visual state until element dimensions are actually updated
  const boxWidth = transformDimensions ? transformDimensions.width : elementWidth;
  const boxHeight = transformDimensions ? transformDimensions.height : elementHeight;

  const textShapeBoxRef = useRef<{ width: number; height: number }>({
    width: boxWidth,
    height: boxHeight
  });

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  // CRITICAL: Use element.theme if present (set during loadBook for pages that inherit book theme)
  // Otherwise fall back to page/book theme from state
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || state.currentBook?.themeId || state.currentBook?.bookTheme;
  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
  const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;
  
  const freeTextDefaults = useMemo(() => {
    // Use 'free_text' for free text elements
    const toolType = 'free_text';
    const activeTheme = pageTheme || bookTheme || 'default';
    const defaults = getGlobalThemeDefaults(activeTheme, toolType, undefined);
    return defaults;
  }, [
    pageTheme,
    bookTheme
  ]);

  const textStyle = useMemo(() => {
    // Use spread operator to set defaults first, then override with element settings
    const style = {
      ...freeTextDefaults.textSettings,
      ...freeTextElement.textSettings,
      fontSize: freeTextElement.textSettings?.fontSize ?? freeTextDefaults.textSettings?.fontSize ?? freeTextDefaults.fontSize ?? 50,
      fontFamily: freeTextElement.textSettings?.fontFamily || freeTextDefaults.textSettings?.fontFamily || freeTextDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: freeTextElement.textSettings?.fontBold ?? freeTextDefaults.textSettings?.fontBold ?? false,
      fontItalic: freeTextElement.textSettings?.fontItalic ?? freeTextDefaults.textSettings?.fontItalic ?? false,
      fontOpacity: freeTextElement.textSettings?.fontOpacity ?? freeTextDefaults.textSettings?.fontOpacity ?? 1,
      paragraphSpacing: freeTextElement.textSettings?.paragraphSpacing || freeTextDefaults.textSettings?.paragraphSpacing || element.paragraphSpacing || 'medium',
      align: freeTextElement.textSettings?.align || element.format?.textAlign || freeTextDefaults.textSettings?.align || freeTextDefaults.align || 'left'
    } as RichTextStyle;

    // Direct color override - element settings have absolute priority
    if (freeTextElement.textSettings?.fontColor) {
      style.fontColor = freeTextElement.textSettings.fontColor;
    }

    return style;
  }, [
    element.paragraphSpacing,
    element.format?.textAlign,
    freeTextDefaults,
    freeTextElement.textSettings?.fontSize,
    freeTextElement.textSettings?.fontFamily,
    freeTextElement.textSettings?.fontBold,
    freeTextElement.textSettings?.fontItalic,
    freeTextElement.textSettings?.fontColor,
    freeTextElement.textSettings?.fontOpacity,
    freeTextElement.textSettings?.paragraphSpacing,
    freeTextElement.textSettings?.align
  ]);

  const padding = element.textSettings?.padding ?? element.padding ?? freeTextDefaults.padding ?? 8;

  const textContent = useMemo(() => {
    if (freeTextElement.formattedText) {
      return freeTextElement.formattedText;
    }
    if (freeTextElement.text) {
      return freeTextElement.text;
    }
    return '';
  }, [freeTextElement.formattedText, freeTextElement.text]);

  // Create layout for free text
  const layout = useMemo(() => {
    const canvasContext = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    return createFreeTextLayout({
      text: textContent,
      textStyle: textStyle,
      width: boxWidth,
      height: boxHeight,
      padding,
      ctx: canvasContext
    });
  }, [textContent, textStyle, boxWidth, boxHeight, padding]);

  // Filter runs to show only text runs when editor is open
  const visibleRuns = useMemo(() => {
    if (isEditorOpen) {
      // When editor is open, show no runs (text is hidden)
      return [];
    }
    // When editor is closed, show all runs
    return layout.runs;
  }, [layout.runs, isEditorOpen]);

  // Generate ruled lines if enabled
  const ruledLines = freeTextElement.textSettings?.ruledLines ?? freeTextDefaults.textSettings?.ruledLines ?? false;
  const ruledLinesWidth = freeTextElement.textSettings?.ruledLinesWidth ?? freeTextDefaults.textSettings?.ruledLinesWidth ?? 0.8;
  // Use theme defaults from freeTextDefaults - prioritize element value, then theme defaults, then fallback
  const ruledLinesTheme = freeTextElement.textSettings?.ruledLinesTheme || freeTextDefaults.textSettings?.ruledLinesTheme || 'rough';
  const ruledLinesColor = freeTextElement.textSettings?.ruledLinesColor || freeTextDefaults.textSettings?.ruledLinesColor || '#1f2937';
  const ruledLinesOpacity = freeTextElement.textSettings?.ruledLinesOpacity ?? freeTextDefaults.textSettings?.ruledLinesOpacity ?? 1;

  const ruledLinesElements = useMemo(() => {
    if (!ruledLines || !layout.linePositions || layout.linePositions.length === 0) {
      return [];
    }

    const elements: React.ReactElement[] = [];

    const generateRuledLineElement = (y: number, startX: number, endX: number): React.ReactElement | null => {
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    // Ensure theme is one of the supported themes
    const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
      // Convert to string and check if it's a valid theme
      const themeString = String(ruledLinesTheme || 'default').toLowerCase().trim();
      const theme = (supportedThemes.includes(themeString as Theme) ? themeString : 'default') as Theme;
      
      return renderThemedBorder({
        width: ruledLinesWidth,
        color: ruledLinesColor,
        opacity: ruledLinesOpacity,
        path: createLinePath(startX, y, endX, y),
        theme: theme,
        themeSettings: {
      seed: seed + y,
          roughness: theme === 'rough' ? 2 : 1
        },
      strokeScaleEnabled: true,
      listening: false,
      key: `ruled-line-${y}`
    });
    };

    // For canvas display, show ruled lines for all text when enabled
    const targetLinePositions = layout.linePositions;

    // Render existing lines
    targetLinePositions.forEach((linePos: LinePosition) => {
      // For free text, use full width with padding
      const startX = padding;
      const endX = boxWidth - padding;
      
      // Only generate lines that are within the box dimensions (0 <= y <= boxHeight)
      // This ensures ruled lines only appear inside the visible border area
      if (linePos.y >= 0 && linePos.y <= boxHeight) {
        const lineElement = generateRuledLineElement(linePos.y, startX, endX);
    if (lineElement) {
          elements.push(lineElement);
        }
      }
    });

    return elements;
  }, [ruledLines, layout.linePositions, padding, boxWidth, boxHeight, ruledLinesWidth, ruledLinesTheme, ruledLinesColor, ruledLinesOpacity, element.id]);

  const showBackground = freeTextElement.textSettings?.backgroundEnabled && freeTextElement.textSettings?.backgroundColor;
  const showBorder = freeTextElement.textSettings?.borderEnabled && freeTextElement.textSettings?.borderColor && freeTextElement.textSettings?.borderWidth !== undefined;

  useEffect(() => {
    textShapeBoxRef.current = { width: boxWidth, height: boxHeight };
  }, [boxWidth, boxHeight]);

  // Track the last dispatched dimensions to detect when props are updated
  const lastDispatchedDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  // Track the last element ID to detect when element is reloaded
  const lastElementIdRef = useRef<string | null>(null);
  
  // Reset transform dimensions when element ID changes (element was reloaded)
  useEffect(() => {
    if (lastElementIdRef.current !== null && lastElementIdRef.current !== element.id) {
      // Element ID changed - this means the element was reloaded
      // Reset transform dimensions to use the new element dimensions
      setTransformDimensions(null);
      lastDispatchedDimensionsRef.current = null;
      transformStartDimensionsRef.current = null;
    }
    lastElementIdRef.current = element.id;
  }, [element.id]);
  
  // Reset transform dimensions when element dimensions change to match transform dimensions
  // This ensures we keep the visual state until the element is actually updated
  // ONLY reset after transform is complete AND element dimensions have been updated
  useEffect(() => {
    // Don't reset during active transform
    if (isTransformingRef.current) {
      return;
    }
    
    // Don't reset if element dimensions are invalid (0 or undefined)
    if (!elementWidth || !elementHeight || elementWidth <= 0 || elementHeight <= 0) {
      return;
    }
    
    if (transformDimensions) {
      // Only reset if element dimensions match transform dimensions (update was successful)
      // Use a small tolerance to account for floating point precision
      const widthMatch = Math.abs(elementWidth - transformDimensions.width) < 0.1;
      const heightMatch = Math.abs(elementHeight - transformDimensions.height) < 0.1;
      
      if (widthMatch && heightMatch) {
        // Reset transformDimensions after successful update
        // Use a small delay to ensure the element update has been processed
        const timeoutId = setTimeout(() => {
          if (!isTransformingRef.current) {
            setTransformDimensions(null);
            lastDispatchedDimensionsRef.current = null;
          }
        }, 50);
        
        return () => clearTimeout(timeoutId);
      } else {
        // Element dimensions don't match transform dimensions
        // Check if we're waiting for an update (element dimensions match dispatched dimensions)
        // AND transform dimensions match dispatched dimensions
        // If yes, we're waiting for the update to complete
        // Otherwise, element was reloaded - reset transformDimensions immediately
        let shouldReset = true;
        
        if (lastDispatchedDimensionsRef.current) {
          const dispatchedWidthMatch = Math.abs(elementWidth - lastDispatchedDimensionsRef.current.width) < 0.1;
          const dispatchedHeightMatch = Math.abs(elementHeight - lastDispatchedDimensionsRef.current.height) < 0.1;
          const transformWidthMatch = Math.abs(transformDimensions.width - lastDispatchedDimensionsRef.current.width) < 0.1;
          const transformHeightMatch = Math.abs(transformDimensions.height - lastDispatchedDimensionsRef.current.height) < 0.1;
          
          // Only keep transformDimensions if:
          // 1. Element dimensions match dispatched dimensions (update is in progress)
          // 2. AND transform dimensions match dispatched dimensions (transformDimensions are correct)
          if (dispatchedWidthMatch && dispatchedHeightMatch && transformWidthMatch && transformHeightMatch) {
            shouldReset = false; // Wait for update to complete
          }
        }
        
        if (shouldReset) {
          // Element was reloaded or dimensions changed unexpectedly - reset immediately
          setTransformDimensions(null);
          lastDispatchedDimensionsRef.current = null;
        }
      }
    }
  }, [elementWidth, elementHeight, transformDimensions, element.id, element.textType]);

  // Handle transform events to resize text properly (as per Konva documentation)
  // Reset scale to 1 and update width/height instead
  // We update dimensions only at transformEnd to avoid interrupting the transform process
  useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;

      isTransformingRef.current = true;

      // Use current transformDimensions if available, otherwise use element dimensions
      // This ensures we start from the correct visual state (prevents jumping)
      const currentTransformDims = transformDimensionsRef.current;
      const currentWidth = currentTransformDims?.width ?? elementWidth;
      const currentHeight = currentTransformDims?.height ?? elementHeight;

      // Store initial dimensions at transform start
      transformStartDimensionsRef.current = {
        width: currentWidth,
        height: currentHeight
      };

      // Initialize transformDimensions immediately to prevent visual jump
      // This ensures boxWidth/boxHeight use the correct values from the start
      setTransformDimensions({
        width: currentWidth,
        height: currentHeight
      });
    };

    const handleTransform = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      if (!isTransformingRef.current) return;

      // Get the Group node from the textRef (which is a child of the Group)
      const rectNode = textRef.current;
      if (!rectNode) return;

      const groupNode = rectNode.getParent();
      if (!groupNode || groupNode.getClassName() !== 'Group') return;

      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();

      // Only reset scale if it's not already 1 (to avoid unnecessary operations)
      if (scaleX !== 1 || scaleY !== 1) {
        // Get initial dimensions from when transform started
        const startDims = transformStartDimensionsRef.current || { width: elementWidth, height: elementHeight };

        // Calculate new dimensions based on initial dimensions and current scale
        const newWidth = Math.max(5, startDims.width * scaleX);
        const newHeight = Math.max(5, startDims.height * scaleY);

        // Reset scale to 1 immediately (this is the key part from Konva docs)
        // This allows the transform to continue smoothly
        groupNode.scaleX(1);
        groupNode.scaleY(1);

        // Update textShapeBoxRef for getClientRect calculations immediately
        // This ensures the selection rectangle stays correct during transform
        textShapeBoxRef.current = { width: newWidth, height: newHeight };

        // Update local state to visually update the component during transform
        // This updates the boxWidth/boxHeight used for rendering without dispatch
        setTransformDimensions({ width: newWidth, height: newHeight });

        // Store the new dimensions for update at transformEnd
        transformStartDimensionsRef.current = {
          width: newWidth,
          height: newHeight
        };
      }
    };

    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;

      // Apply the final dimensions update
      const finalDims = transformStartDimensionsRef.current;
      if (finalDims && (finalDims.width !== elementWidth || finalDims.height !== elementHeight)) {
        // Store the dispatched dimensions so we can track when props are updated
        lastDispatchedDimensionsRef.current = {
          width: finalDims.width,
          height: finalDims.height
        };
        dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
              width: finalDims.width,
              height: finalDims.height
            }
          }
        });

        // Keep transformDimensions until element dimensions are updated
        // The useEffect will reset it when element dimensions match
      } else {
        // If dimensions didn't change, reset immediately
        setTransformDimensions(null);
      }

      // Reset flags (but keep transformDimensions until element updates)
      isTransformingRef.current = false;
      transformStartDimensionsRef.current = null;
    };

    window.addEventListener('transformStart', handleTransformStart as EventListener);
    window.addEventListener('transform', handleTransform as EventListener);
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);

    return () => {
      window.removeEventListener('transformStart', handleTransformStart as EventListener);
      window.removeEventListener('transform', handleTransform as EventListener);
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id, elementWidth, elementHeight, dispatch]);

  useEffect(() => {
    const shape = textShapeRef.current;
    if (!shape) return;

    type ShapeWithOriginal = Konva.Shape & {
      __freeTextOriginalGetClientRect?: Konva.Shape['getClientRect'];
    };

    const shapeWithOriginal = shape as ShapeWithOriginal;

    if (!shapeWithOriginal.__freeTextOriginalGetClientRect) {
      shapeWithOriginal.__freeTextOriginalGetClientRect = shape.getClientRect.bind(shape);
    }

    const limitToTextbox = ((config?: Parameters<Konva.Shape['getClientRect']>[0]) => {
      // Always use box dimensions for getClientRect to ensure consistent resize behavior
      // The transformer needs consistent dimensions to calculate resize correctly
      // If we return the full text bounding box during resize, it causes incorrect calculations

      // Skip transform calculation if requested (for performance)
      if (config?.skipTransform && shapeWithOriginal.__freeTextOriginalGetClientRect) {
        return shapeWithOriginal.__freeTextOriginalGetClientRect(config);
      }

      const { width, height } = textShapeBoxRef.current;
      const safeWidth = Math.max(width, 0);
      const safeHeight = Math.max(height, 0);

      const transform = shape.getAbsoluteTransform().copy();
      const topLeft = transform.point({ x: 0, y: 0 });
      const bottomRight = transform.point({ x: safeWidth, y: safeHeight });

      let rect = {
        x: Math.min(topLeft.x, bottomRight.x),
        y: Math.min(topLeft.y, bottomRight.y),
        width: Math.abs(bottomRight.x - topLeft.x),
        height: Math.abs(bottomRight.y - topLeft.y)
      };

      if (config?.relativeTo) {
        const relativeTransform = config.relativeTo.getAbsoluteTransform().copy().invert();
        const relativeTopLeft = relativeTransform.point({ x: rect.x, y: rect.y });
        const relativeBottomRight = relativeTransform.point({ x: rect.x + rect.width, y: rect.y + rect.height });

        rect = {
          x: Math.min(relativeTopLeft.x, relativeBottomRight.x),
          y: Math.min(relativeTopLeft.y, relativeBottomRight.y),
          width: Math.abs(relativeBottomRight.x - relativeTopLeft.x),
          height: Math.abs(relativeBottomRight.y - relativeTopLeft.y)
        };
      }

      return rect;
    }) as typeof shape.getClientRect;

    shape.getClientRect = limitToTextbox;

    return () => {
      if (shapeWithOriginal.__freeTextOriginalGetClientRect) {
        shape.getClientRect = shapeWithOriginal.__freeTextOriginalGetClientRect;
        delete shapeWithOriginal.__freeTextOriginalGetClientRect;
      }
    };
  }, []);

  const enableInlineTextEditing = useCallback(() => {
    createInlineTextEditorForFreeText({
      element: freeTextElement,
      text: textContent,
      textStyle: textStyle,
      layout: layout,
      padding,
      boxWidth,
      boxHeight,
      textRef,
      setIsEditorOpen,
      dispatch,
      getLineHeight,
      measureText
    });
  }, [freeTextElement, textContent, textStyle, layout, padding, boxWidth, boxHeight, textRef, dispatch, getLineHeight, measureText]);

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false) return;
    if (state.activeTool !== 'select') return;
    if (e?.evt && e.evt.button !== 0) return;

    // Open inline text editor
    enableInlineTextEditing();
  };

  // Create a hit area that matches only the box dimensions (not the extended text)
  const hitArea = useMemo(() => ({
    x: 0,
    y: 0,
    width: boxWidth,
    height: boxHeight
  }), [boxWidth, boxHeight]);

  return (
    <>
      <BaseCanvasItem 
        {...props} 
        onDoubleClick={handleDoubleClick}
        hitArea={hitArea}
        >
          {/* Background */}
        {showBackground && (
                <Rect
            width={boxWidth}
            height={boxHeight}
            fill={freeTextElement.textSettings?.backgroundColor || freeTextDefaults.textSettings?.backgroundColor || '#ffffff'}
            opacity={freeTextElement.textSettings?.backgroundOpacity ?? freeTextDefaults.textSettings?.backgroundOpacity ?? 1}
            cornerRadius={freeTextElement.textSettings?.cornerRadius ?? freeTextElement.cornerRadius ?? freeTextDefaults.cornerRadius ?? 0}
                  listening={false}
                />
        )}

        {/* Ruled lines underneath each text row - render after background, before border and text */}
        {/* Wrap in Group to ensure they stay together with other body parts */}
        {ruledLines && ruledLinesElements.length > 0 && (
          <Group listening={false}>
            {ruledLinesElements}
          </Group>
        )}
          
          {/* Border */}
        {showBorder && (() => {
          const borderColor = freeTextElement.textSettings?.borderColor || freeTextDefaults.textSettings?.borderColor || '#000000';
          const borderWidth = freeTextElement.textSettings?.borderWidth ?? freeTextDefaults.textSettings?.borderWidth ?? 1;
          const borderOpacity = freeTextElement.textSettings?.borderOpacity ?? freeTextDefaults.textSettings?.borderOpacity ?? 1;
          const cornerRadius = freeTextElement.textSettings?.cornerRadius ?? freeTextElement.cornerRadius ?? freeTextDefaults.cornerRadius ?? 0;
          const themeValue = freeTextElement.textSettings?.borderTheme || freeTextDefaults.textSettings?.borderTheme || 'default';
          const theme = themeValue as Theme;

          const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;

          const borderElement = renderThemedBorder({
            width: borderWidth,
            color: borderColor,
            opacity: borderOpacity,
                  cornerRadius: cornerRadius,
            path: createRectPath(0, 0, boxWidth, boxHeight),
            theme: theme,
            themeSettings: {
              roughness: theme === 'rough' ? 8 : undefined,
              seed: seed
            },
            strokeScaleEnabled: true,
            listening: false
          });

          // Fallback to simple rect border if theme rendering fails
          if (!borderElement) {
              return (
                <Rect
                width={boxWidth}
                height={boxHeight}
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                  opacity={borderOpacity}
                  cornerRadius={cornerRadius}
                  listening={false}
                />
              );
            }

          return borderElement;
          })()}
          
        {/* Text that can extend beyond the box */}
        {/* When editor is open, only show no runs (text is hidden) */}
        <RichTextShape ref={textShapeRef} runs={visibleRuns} width={boxWidth} height={layout.contentHeight} />

        {/* Placeholder text when no content exists and editor is not open */}
        {!textContent && !isEditorOpen && (
          <KonvaText
                  x={padding}
                  y={padding}
            width={boxWidth - padding * 2}
            height={boxHeight - padding * 2}
                  text="Double-click to add text..."
            fontSize={Math.max(textStyle.fontSize * 0.8, 16)}
            fontFamily={textStyle.fontFamily}
                  fill="#9ca3af"
            opacity={0.4}
                  align="left"
                  verticalAlign="top"
                        listening={false}
                      />
        )}

        {/* Hit area for double-click detection - limited to box dimensions */}
              <Rect
                ref={textRef}
                x={0}
                y={0}
          width={boxWidth}
          height={boxHeight}
                fill="transparent"
                listening={true}
              />
      </BaseCanvasItem>
    </>
  );
}