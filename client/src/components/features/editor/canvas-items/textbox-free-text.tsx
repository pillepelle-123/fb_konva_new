import { useRef, useState, useEffect } from 'react';
import { Text, Rect, Group, Path } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { getThemeRenderer } from '../../../../utils/themes';
import rough from 'roughjs';
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

  // Force refresh when element properties change
  useEffect(() => {
    setIsResizing(true);
    setTimeout(() => {
      setIsResizing(false);
      setRefreshKey(prev => prev + 1);
    }, 10);
  }, [element.textSettings, element.fontSize, element.fontFamily, element.fontColor, element.font, element.width, element.height]);

  // Force refresh when ruled lines settings change
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [element.textSettings?.ruledLinesColor, element.textSettings?.ruledLinesOpacity, element.textSettings?.ruledLinesTheme, element.textSettings?.ruledLinesWidth]);

  // Get current theme context
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.bookTheme;
  
  // Get tool defaults with theme applied
  const toolDefaults = getToolDefaults('free_text', pageTheme, bookTheme);
  
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
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme);
    
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
    
    const theme = element.textSettings?.ruledLinesTheme || textStyle.ruledLinesTheme || 'rough';
    const color = element.textSettings?.ruledLinesColor || textStyle.ruledLinesColor || '#1f2937';
    const width = element.textSettings?.ruledLinesWidth || textStyle.ruledLinesWidth || 0.8;
    const opacity = element.textSettings?.ruledLinesOpacity ?? textStyle.ruledLinesOpacity ?? 1;
    
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
    
    if (theme === 'rough') {
      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rc = rough.svg(svg);
      
      try {
        const roughLine = rc.line(startX, y, lineEndX, y, {
          roughness: 2,
          strokeWidth: ruledLineWidth,
          stroke: ruledLineColor,
          seed: seed + y
        });
        
        const paths = roughLine.querySelectorAll('path');
        let combinedPath = '';
        paths.forEach(path => {
          const d = path.getAttribute('d');
          if (d) combinedPath += d + ' ';
        });
        
        if (combinedPath) {
          lineElements.push(
            <Path
              key={y}
              data={combinedPath.trim()}
              stroke={ruledLineColor}
              strokeWidth={ruledLineWidth}
              opacity={ruledLineOpacity}
              listening={false}
            />
          );
        }
      } catch (error) {
        lineElements.push(
          <Path
            key={y}
            data={`M ${startX} ${y} L ${lineEndX} ${y}`}
            stroke={ruledLineColor}
            strokeWidth={ruledLineWidth}
            opacity={ruledLineOpacity}
            listening={false}
          />
        );
      }
    } else {
      lineElements.push(
        <Path
          key={y}
          data={`M ${startX} ${y} L ${lineEndX} ${y}`}
          stroke={ruledLineColor}
          strokeWidth={ruledLineWidth}
          opacity={ruledLineOpacity}
          listening={false}
        />
      );
    }
    
    return lineElements;
  };

  const handleDoubleClick = (e: any) => {
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
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.bookTheme;
            const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme);
            
            const textStyle = {
              ...freeTextDefaults.textSettings,
              ...element.textSettings
            };
            const showBackground = textStyle.backgroundEnabled;
            
            if (showBackground) {
              const backgroundColor = textStyle.backgroundColor || 'transparent';
              const backgroundOpacity = textStyle.backgroundOpacity ?? 1;
              const cornerRadius = textStyle.cornerRadius || 0;
              
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
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.bookTheme;
            const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme);
            
            const textStyle = {
              ...freeTextDefaults.textSettings,
              ...element.textSettings
            };
            const showBorder = textStyle.borderEnabled;
            
            if (showBorder) {
              const borderColor = textStyle.borderColor || '#000000';
              const borderWidth = textStyle.borderWidth || 1;
              const borderOpacity = textStyle.borderOpacity ?? 1;
              const cornerRadius = textStyle.cornerRadius || 0;
              const theme = textStyle.borderTheme || 'default';
              
              const themeRenderer = getThemeRenderer(theme);
              if (themeRenderer && theme !== 'default') {
                return themeRenderer.renderBorder({
                  width: element.width,
                  height: element.height,
                  borderWidth,
                  borderColor,
                  borderOpacity,
                  cornerRadius,
                  elementId: element.id
                });
              }
              
              return (
                <Rect
                  width={element.width}
                  height={element.height}
                  fill="transparent"
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                  opacity={borderOpacity}
                  cornerRadius={cornerRadius}
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
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.bookTheme;
            const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme);
            
            const textStyle = {
              ...freeTextDefaults.textSettings,
              ...element.textSettings
            };
            const padding = textStyle.padding || element.format?.padding || element.padding || 4;
            const textWidth = element.width - (padding * 2);
            const userText = getUserText();
            
            const align = textStyle.align || 'left';
            
            if (!userText) {
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
                />
              );
            }

            const elements = [];
            const textFontSize = textStyle.fontSize || fontSize;
            const textFontFamily = textStyle.fontFamily || fontFamily;
            const textFontColor = textStyle.fontColor || '#1f2937';
            const textFontBold = textStyle.fontBold || false;
            const textFontItalic = textStyle.fontItalic || false;
            const textFontOpacity = textStyle.fontOpacity ?? 1;
            
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