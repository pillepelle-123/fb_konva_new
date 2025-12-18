import { useRef, useState, useEffect } from 'react';
import { Text, Rect, Group, Path } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { getThemeRenderer, type Theme, generateLinePath } from '../../../../utils/themes-client';
import type { CanvasElement } from '../../../../context/editor-context';
import { KonvaSkeleton } from '../../../ui/primitives/skeleton';

export default function TextboxFreeText(props: CanvasItemProps) {
  const { element } = props;
  const { state, dispatch } = useEditor();
  const textRef = useRef<Konva.Text>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Listen for transformer events from the canvas
  useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail.elementId === element.id) {
        setIsResizing(true);
      }
    };
    
    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail.elementId === element.id) {
        setIsResizing(false);
      }
    };
    
    window.addEventListener('transformStart', handleTransformStart as EventListener);
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);
    
    return () => {
      window.removeEventListener('transformStart', handleTransformStart as EventListener);
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id]);

  // Force refresh when element properties change (e.g., from Style Painter)
  // Extract primitive values to prevent infinite re-renders from object references
  const textSettingsFontSize = element.textSettings?.fontSize;
  const textSettingsFontColor = element.textSettings?.fontColor;
  const textSettingsFontOpacity = element.textSettings?.fontOpacity;
  const textSettingsBorderEnabled = element.textSettings?.border?.enabled;
  const textSettingsBackgroundEnabled = element.textSettings?.background?.enabled;
  const elementFontSize = element.fontSize;
  const elementFontFamily = element.fontFamily;
  const elementFontColor = element.fontColor;
  const elementWidth = element.width;
  const elementHeight = element.height;
  
  useEffect(() => {
    // Simulate the resize process to force proper re-calculation of ruled lines
    setIsResizing(true);
    const timeoutId = setTimeout(() => {
      setIsResizing(false);
      setRefreshKey(prev => prev + 1);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [textSettingsFontSize, textSettingsFontColor, textSettingsFontOpacity, textSettingsBorderEnabled, textSettingsBackgroundEnabled, elementFontSize, elementFontFamily, elementFontColor, elementWidth, elementHeight]);

  // Force refresh when ruled lines settings change
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [element.textSettings?.ruledLinesColor, element.textSettings?.ruledLinesOpacity, element.textSettings?.ruledLinesTheme, element.textSettings?.ruledLinesWidth]);

  // Get current theme context
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
  const elementTheme = element.theme;
  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
  const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;
  
  // Get theme-based defaults (includes palette colors automatically applied)
  const freeTextThemeDefaults = getToolDefaults('free_text', pageTheme, bookTheme, element, state.toolSettings?.free_text, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
  
  // Use theme defaults with tool settings fallback (prioritize: toolSettings > themeDefaults)
  const toolDefaults = {
    fontSize: freeTextThemeDefaults.fontSize || 50,
    fontFamily: freeTextThemeDefaults.fontFamily || 'Arial, sans-serif',
    textSettings: {
      fontSize: freeTextThemeDefaults.textSettings?.fontSize || 50,
      // Priority: toolSettings > themeDefaults.textSettings > themeDefaults (top level)
      fontColor: state.toolSettings?.free_text?.fontColor || freeTextThemeDefaults.textSettings?.fontColor || freeTextThemeDefaults.textSettings?.font?.fontColor || freeTextThemeDefaults.fontColor,
      fontOpacity: state.toolSettings?.free_text?.fontOpacity ?? freeTextThemeDefaults.textSettings?.fontOpacity ?? freeTextThemeDefaults.textSettings?.font?.fontOpacity ?? 1,
      borderColor: state.toolSettings?.free_text?.borderColor || freeTextThemeDefaults.textSettings?.borderColor || freeTextThemeDefaults.textSettings?.border?.borderColor || freeTextThemeDefaults.borderColor,
      backgroundColor: state.toolSettings?.free_text?.backgroundColor || freeTextThemeDefaults.textSettings?.backgroundColor || freeTextThemeDefaults.textSettings?.background?.backgroundColor || freeTextThemeDefaults.backgroundColor
    }
  };
  
  const fontSize = element.font?.fontSize || element.fontSize || toolDefaults.fontSize || 50;
  const fontFamily = element.font?.fontFamily || element.fontFamily || toolDefaults.fontFamily || 'Arial, sans-serif';

  const getUserText = () => {
    let text = element.formattedText || element.text || '';
    if (text) {
      if (text.includes('<')) {
        text = text.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        text = tempDiv.textContent || tempDiv.innerText || '';
      }
      return text;
    }
    return '';
  };

  // Generate ruled lines
  const generateRuledLines = () => {
    const lines = [];
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
    const pageLayoutTemplateId = currentPage?.layoutTemplateId;
    const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
    const pageColorPaletteId = currentPage?.colorPaletteId;
    const bookColorPaletteId = state.currentBook?.colorPaletteId;
    const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme, element, state.toolSettings?.free_text, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
    
    const textStyle = {
      ...freeTextDefaults.textSettings,
      ...element.textSettings
    };
    const padding = textStyle.padding || element.format?.padding || element.padding || 4;
    const ruledLines = textStyle.ruledLines ?? false;
    
    if (!ruledLines) return [];
    
    const textFontSize = textStyle.fontSize || fontSize;
    const spacing = textStyle.paragraphSpacing || 'medium';
    const getLineHeightMultiplier = (spacing: string) => {
      switch (spacing) {
        case 'small': return 1.0;
        case 'medium': return 1.2;
        case 'large': return 1.5;
        default: return 1.0;
      }
    };
    const lineHeight = textFontSize * getLineHeightMultiplier(spacing);
    
    // Priority: element.textSettings > toolSettings > themeDefaults
    const theme = element.textSettings?.ruledLinesTheme || freeTextDefaults.textSettings?.ruledLinesTheme || 'rough';
    const color = element.textSettings?.ruledLinesColor || 
                  freeTextDefaults.textSettings?.ruledLinesColor || 
                  (state.toolSettings?.free_text?.borderColor || '#1f2937');
    const width = element.textSettings?.ruledLinesWidth || freeTextDefaults.textSettings?.ruledLinesWidth || 0.8;
    const opacity = element.textSettings?.ruledLinesOpacity ?? freeTextDefaults.textSettings?.ruledLinesOpacity ?? 1;
    
    // Calculate text baseline offset
    const factor = textFontSize >= 50 ? textFontSize >= 96 ? textFontSize >= 145 ? -0.07 : 0.01 : 0.07 : 0.1;
    const textBaselineOffset = -(textFontSize * getLineHeightMultiplier(spacing) * 0.15) + (textFontSize * factor);
    
    let lineY = padding + textFontSize * 0.2 + textBaselineOffset;
    while (lineY < element.height - padding - 10) {
      lines.push(...generateLineElement(lineY, theme, padding, color, width, opacity));
      lineY += lineHeight;
    }
    
    return lines;
  };
  
  const generateLineElement = (y: number, theme: string, startX: number, ruledLineColor: string, ruledLineWidth: number, ruledLineOpacity: number) => {
    const lineElements = [];
    const lineEndX = element.width - startX;
    
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    // Ensure theme is one of the supported themes
    const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
    const themeValue = (supportedThemes.includes(theme as Theme) ? theme : 'default') as Theme;
    
    // Create a temporary element for theme-specific settings
    const tempElement: CanvasElement = {
      ...element,
      type: 'line',
      id: element.id + '-ruled-line',
      x: 0,
      y: 0,
      width: Math.abs(lineEndX - startX),
      height: 0,
      strokeWidth: ruledLineWidth,
      stroke: ruledLineColor,
      theme: themeValue
    };
    
    const lineElement = renderThemedLine({
      x1: startX,
      y1: y,
      x2: lineEndX,
      y2: y,
      strokeWidth: ruledLineWidth,
      stroke: ruledLineColor,
      opacity: ruledLineOpacity,
      theme: themeValue,
      seed: seed + y,
      roughness: themeValue === 'rough' ? 2 : 1,
      strokeScaleEnabled: true,
      listening: false,
      element: tempElement,
      key: `ruled-line-${y}`
    });
    
    if (lineElement) {
      lineElements.push(lineElement);
    }
    
    return lineElements;
  };

  const handleDoubleClick = (e: any) => {
    // Don't open modals in non-interactive mode (e.g., PDF export)
    if (props.interactive === false) return;
    if (state.activeTool !== 'select') return;
    if (e.evt.button !== 0) return;
    enableQuillEditing();
  };

  const enableQuillEditing = () => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    
    if (!window.Quill) {
      const quillCSS = document.createElement('link');
      quillCSS.rel = 'stylesheet';
      quillCSS.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(quillCSS);
      
      const quillJS = document.createElement('script');
      quillJS.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
      document.head.appendChild(quillJS);
      
      quillJS.onload = () => initQuillForFreeText();
      return;
    } else {
      initQuillForFreeText();
    }
    
    function initQuillForFreeText() {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255, 255, 255, 0.5);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';
      
      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:80vw;max-width:800px;min-width:400px;box-shadow:0 3px 6px rgba(0,0,0,0.1)';
      
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:16px;padding-bottom:12px';
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Free Text</h2>';
      
      const editorContainer = document.createElement('div');
      editorContainer.style.cssText = 'min-height:90px;margin-bottom:0px;border:1px solid #e2e8f0;border-radius:4px';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:4px 16px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:white;font-size:0.875rem';
      cancelBtn.onmouseover = () => cancelBtn.style.background = '#f1f5f9';
      cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';
      
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.cssText = 'padding:8px 16px;border:none;border-radius:6px;background:#304050;color:white;cursor:pointer;font-size:0.875rem';
      saveBtn.onmouseover = () => saveBtn.style.background = '#303a50e6';
      saveBtn.onmouseout = () => saveBtn.style.background = '#304050';
      
      let closeModal = () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        stage.draw();
      };
      
      // Listen for closeQuillEditor event
      const handleCloseQuillEditor = () => {
        closeModal();
      };
      window.addEventListener('closeQuillEditor', handleCloseQuillEditor);
      
      // Update closeModal to also remove the event listener
      const originalCloseModal = closeModal;
      closeModal = () => {
        window.removeEventListener('closeQuillEditor', handleCloseQuillEditor);
        originalCloseModal();
      };
      
      cancelBtn.onclick = closeModal;
      
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);
      
      container.appendChild(header);
      container.appendChild(editorContainer);
      container.appendChild(buttonContainer);
      modal.appendChild(container);
      document.body.appendChild(modal);
      
      setTimeout(() => {
        const quill = new window.Quill(editorContainer, {
          theme: 'snow'
        });
        
        const style = document.createElement('style');
        style.textContent = `
          .ql-toolbar { display: none !important; }
          .ql-container { 
            border: 2px solid #3b82f6 !important; 
            border-radius: 4px;
            height: 144px !important;
          }
          .ql-container.ql-disabled {
            border: 1px solid #e5e7eb !important;
          }
          .ql-editor {
            height: 144px !important;
            overflow-y: auto !important;
            line-height: 24px !important;
          }
        `;
        document.head.appendChild(style);
        
        const contentToLoad = element.formattedText || element.text || '';
        
        if (contentToLoad) {
          if (contentToLoad.includes('<')) {
            quill.root.innerHTML = contentToLoad;
          } else {
            quill.setText(contentToLoad);
          }
        }
        
        saveBtn.onclick = () => {
          const htmlContent = quill.root.innerHTML;
          const plainText = quill.getText().trim();
          
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                text: plainText,
                formattedText: htmlContent
              }
            }
          });
          
          closeModal();
        };
        
        quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
          const plaintext = node.innerText || node.textContent || '';
          const Delta = window.Quill.import('delta');
          return new Delta().insert(plaintext);
        });
        
        quill.focus();
        
        modal.addEventListener('keydown', (e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.key === 'Escape') closeModal();
        }, true);
        modal.addEventListener('keyup', (e: KeyboardEvent) => {
          e.stopPropagation();
        }, true);
      }, 100);
    }
  };

  return (
    <>
      <BaseCanvasItem 
        {...props} 
        onSelect={(e) => {
          if (e?.evt?.button === 2 && state.stylePainterActive) {
            e.evt.preventDefault();
            dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
            return;
          }
          if (props.onSelect) {
            props.onSelect(e);
          }
        }}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTransformStart={() => setIsResizing(true)}
        onTransformEnd={() => setIsResizing(false)}
      >
        <Group 
          key={refreshKey}
          onContextMenu={(e) => {
            if (state.stylePainterActive) {
              e.evt.preventDefault();
              e.evt.stopPropagation();
              dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
            }
          }}
        >
          {/* Background */}
          {(() => {
            // Get default settings from tool defaults if not present
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
            const pageLayoutTemplateId = currentPage?.layoutTemplateId;
            const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
            const pageColorPaletteId = currentPage?.colorPaletteId;
            const bookColorPaletteId = state.currentBook?.colorPaletteId;
            const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme, element, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const textStyle = {
              ...freeTextDefaults.textSettings,
              ...element.textSettings
            };
            const showBackground = textStyle.background?.enabled || textStyle.backgroundEnabled;
            
            if (showBackground) {
              const backgroundColor = textStyle.background?.backgroundColor || textStyle.backgroundColor || 'transparent';
              const backgroundOpacity = textStyle.backgroundOpacity ?? textStyle.background?.backgroundOpacity ?? 1;
              const cornerRadius = element.cornerRadius ?? freeTextDefaults.cornerRadius ?? 0;
              
              return (
                <Rect
                  width={element.width}
                  height={element.height}
                  fill={backgroundColor}
                  opacity={backgroundOpacity}
                  cornerRadius={cornerRadius}
                  listening={false}
                />
              );
            }
            return null;
          })()}
          
          {/* Border */}
          {(() => {
            // Get default settings from tool defaults if not present
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
            const pageLayoutTemplateId = currentPage?.layoutTemplateId;
            const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
            const pageColorPaletteId = currentPage?.colorPaletteId;
            const bookColorPaletteId = state.currentBook?.colorPaletteId;
            const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme, element, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const textStyle = {
              ...freeTextDefaults.textSettings,
              ...element.textSettings
            };
            const showBorder = textStyle.border?.enabled || textStyle.borderEnabled;
            
            if (showBorder) {
              const borderColor = textStyle.border?.borderColor || textStyle.borderColor || '#000000';
              const borderWidth = textStyle.borderWidth || textStyle.border?.borderWidth || 1;
              const borderOpacity = textStyle.borderOpacity ?? textStyle.border?.borderOpacity ?? 1;
              const cornerRadius = element.cornerRadius ?? freeTextDefaults.cornerRadius ?? 0;
              const theme = textStyle.borderTheme || textStyle.border?.borderTheme || 'default';
              
              // Page-Content-Element: Free text borders scale with zoom and are printed in PDF
              const themeRenderer = getThemeRenderer(theme);
              if (themeRenderer && theme !== 'default') {
                // Create a temporary element-like object for generatePath
                const borderElement = {
                  type: 'rect' as const,
                  id: element.id + '-border',
                  x: 0,
                  y: 0,
                  width: element.width,
                  height: element.height,
                  cornerRadius: cornerRadius,
                  stroke: borderColor,
                  strokeWidth: borderWidth,
                  fill: 'transparent'
                } as any;
                
                const pathData = themeRenderer.generatePath(borderElement);
                
                if (pathData) {
                  return (
                    <Path
                      data={pathData}
                      stroke={borderColor}
                      strokeWidth={borderWidth}
                      opacity={borderOpacity}
                      fill="transparent"
                      strokeScaleEnabled={true}
                      listening={false}
                      lineCap="round"
                      lineJoin="round"
                    />
                  );
                }
              }
              
              // Fallback to simple Rect for default theme
              // Page-Content-Element: Border scales with zoom via strokeScaleEnabled
              return (
                <Rect
                  width={element.width}
                  height={element.height}
                  fill="transparent"
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                  opacity={borderOpacity}
                  cornerRadius={cornerRadius}
                  strokeScaleEnabled={true}
                  listening={false}
                />
              );
            }
            return null;
          })()}
          
          {/* Ruled lines */}
          {!isResizing && (
            <Group>
              {generateRuledLines()}
            </Group>
          )}
          
          {/* Show skeleton during resize, otherwise show text content */}
          {isResizing ? (
            <KonvaSkeleton width={element.width} height={element.height} />
          ) : (() => {
            // Get default settings from tool defaults if not present
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
            const pageLayoutTemplateId = currentPage?.layoutTemplateId;
            const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
            const pageColorPaletteId = currentPage?.colorPaletteId;
            const bookColorPaletteId = state.currentBook?.colorPaletteId;
            const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme, element, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const textStyle = {
              ...freeTextDefaults.textSettings,
              ...element.textSettings,
              fontFamily: element.textSettings?.fontFamily || element.font?.fontFamily || element.fontFamily || freeTextDefaults.textSettings?.fontFamily || fontFamily
            };
            
            // Direct color override - element settings have absolute priority
            if (element.textSettings?.fontColor) {
              textStyle.fontColor = element.textSettings.fontColor;
            }
            
            const padding = textStyle.padding || element.format?.padding || element.padding || 4;
            const textWidth = element.width - (padding * 2);
            const userText = getUserText();
            
            const align = textStyle.align || element.format?.textAlign || 'left';
            
            if (!userText) {
              // UI-Helper-Element: Placeholder text does NOT scale with zoom and is NOT printed in PDF
              // Rule: UI-Helper-Elemente must have name="no-print"
              return (
                <Text
                  ref={textRef}
                  x={padding}
                  y={padding}
                  width={textWidth}
                  text="Double-click to add text..."
                  fontSize={Math.max(fontSize * 0.8, 16)}
                  fontFamily={fontFamily}
                  fill="#9ca3af"
                  opacity={0.7}
                  align="left"
                  verticalAlign="top"
                  wrap="word"
                  lineHeight={1.2}
                  listening={true}
                  name="no-print"
                />
              );
            }

            const elements = [];
            const textFontSize = textStyle.fontSize || fontSize;
            const textFontFamily = textStyle.fontFamily || fontFamily;
            const textFontColor = textStyle.fontColor || textStyle.font?.fontColor || element.font?.fontColor || element.fontColor || toolDefaults.textSettings?.fontColor || '#1f2937';
            const textFontBold = textStyle.fontBold ?? toolDefaults.textSettings?.fontBold ?? false;
            const textFontItalic = textStyle.fontItalic ?? toolDefaults.textSettings?.fontItalic ?? false;
            const textFontOpacity = textStyle.fontOpacity ?? toolDefaults.textSettings?.fontOpacity ?? 1;
            
            const spacing = textStyle.paragraphSpacing || 'medium';
            const getLineHeightMultiplier = (spacing: string) => {
              switch (spacing) {
                case 'small': return 1.0;
                case 'medium': return 1.2;
                case 'large': return 1.5;
                default: return 1.0;
              }
            };
            const lineHeight = textFontSize * getLineHeightMultiplier(spacing);
            
            const factor = textFontSize >= 50 ? textFontSize >= 96 ? textFontSize >= 145 ? -0.07 : 0.01 : 0.07 : 0.1;
            const textBaselineOffset = -(textFontSize * getLineHeightMultiplier(spacing) * 0.15) + (textFontSize * factor);
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            context.font = `${textFontBold ? 'bold ' : ''}${textFontItalic ? 'italic ' : ''}${textFontSize}px ${textFontFamily}`;
            
            const lines = userText.split('\n');
            let currentLineIndex = 0;
            
            lines.forEach((line) => {
              if (!line.trim()) {
                currentLineIndex++;
                return;
              }
              
              const words = line.split(' ');
              let currentLine = '';
              let currentLineWidth = 0;
              
              words.forEach((word) => {
                const wordWithSpace = currentLine ? ' ' + word : word;
                const wordWidth = context.measureText(wordWithSpace).width;
                
                if (currentLineWidth + wordWidth <= textWidth) {
                  currentLine += wordWithSpace;
                  currentLineWidth += wordWidth;
                } else {
                  if (currentLine) {
                    elements.push(
                      <Text
                        key={`line-${currentLineIndex}`}
                        x={padding}
                        y={padding + textFontSize * 0.2 + (currentLineIndex * lineHeight) + textBaselineOffset}
                        text={currentLine}
                        fontSize={textFontSize}
                        fontFamily={textFontFamily}
                        fontStyle={`${textFontBold ? 'bold' : ''} ${textFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                        fill={textFontColor}
                        opacity={textFontOpacity}
                        align={align}
                        width={textWidth}
                        listening={false}
                      />
                    );
                    currentLineIndex++;
                  }
                  currentLine = word;
                  currentLineWidth = context.measureText(word).width;
                }
              });
              
              if (currentLine) {
                elements.push(
                  <Text
                    key={`line-${currentLineIndex}`}
                    x={padding}
                    y={padding + textFontSize * 0.2 + (currentLineIndex * lineHeight) + textBaselineOffset}
                    text={currentLine}
                    fontSize={textFontSize}
                    fontFamily={textFontFamily}
                    fontStyle={`${textFontBold ? 'bold' : ''} ${textFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                    fill={textFontColor}
                    opacity={textFontOpacity}
                    align={align}
                    width={textWidth}
                    listening={false}
                  />
                );
                currentLineIndex++;
              }
            });
            
            elements.push(
              <Rect
                key="overlay"
                ref={textRef}
                x={0}
                y={0}
                width={element.width}
                height={element.height}
                fill="transparent"
                listening={true}
              />
            );
            
            return elements;
          })()}
        </Group>
      </BaseCanvasItem>
    </>
  );
}