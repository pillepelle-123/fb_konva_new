import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Text, Rect, Group, Path } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getParagraphSpacing, getPadding } from '../../../../utils/format-utils';
import { getRuledLinesOpacity } from '../../../../utils/ruled-lines-utils';
import { getRuledLinesTheme } from '../../../../utils/theme-utils';
import { getThemeRenderer } from '../../../../utils/themes';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import rough from 'roughjs';
import { KonvaSkeleton } from '../../../ui/primitives/skeleton';


// Rich text formatting function for Quill HTML output
function formatRichText(text: string, fontSize: number, fontFamily: string, maxWidth: number, hasRuledLines: boolean = false, paragraphSpacing: string = 'medium', element?: CanvasElement, defaultColor?: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  const lineHeight = hasRuledLines ? fontSize * Math.max(2.5, (paragraphSpacing === 'small' ? 1.0 : paragraphSpacing === 'large' ? 3.0 : 1.5) * 1.5) : fontSize * 1.2;
  const textParts: any[] = [];
  
  // Create temporary div to parse Quill HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  
  let currentX = 0;
  let currentY = 0;
  
  // Process each paragraph/line
  const processElement = (element: Element, inheritedStyles: any = {}) => {
    const styles = { ...inheritedStyles };
    
    // Check element styles
    if (element.tagName === 'STRONG' || element.tagName === 'B') {
      styles.bold = true;
    }
    if (element.tagName === 'EM' || element.tagName === 'I') {
      styles.italic = true;
    }
    if (element.tagName === 'U') {
      styles.underline = true;
    }
    if (element.tagName === 'H1') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.8;
    }
    if (element.tagName === 'H2') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.5;
    }
    if (element.tagName === 'H3') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.2;
    }
    
    // Check for styles in style attribute
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      if (styleAttr.includes('color:')) {
        const colorMatch = styleAttr.match(/color:\s*([^;]+)/i);
        if (colorMatch) {
          styles.color = colorMatch[1].trim();
        }
      }
      if (styleAttr.includes('font-family:')) {
        const fontMatch = styleAttr.match(/font-family:\s*([^;]+)/i);
        if (fontMatch) {
          styles.fontFamily = fontMatch[1].trim().replace(/["']/g, '');
        }
      }
    }
    
    // Check for Quill font and size classes
    const className = element.getAttribute('class');
    if (className) {
      if (className.includes('ql-font-')) {
        const fontClass = className.match(/ql-font-([a-z]+)/);
        if (fontClass) {
          const fontMap: { [key: string]: string } = {
            'georgia': 'Georgia, serif',
            'helvetica': 'Helvetica, sans-serif',
            'arial': 'Arial, sans-serif',
            'courier': 'Courier New, monospace',
            'kalam': 'Kalam, cursive',
            'shadows': 'Shadows Into Light, cursive',
            'playwrite': 'Playwrite DE SAS, cursive',
            'msmadi': 'Ms Madi, cursive',
            'giveyouglory': 'Give You Glory, cursive',
            'meowscript': 'Meow Script, cursive'
          };
          styles.fontFamily = fontMap[fontClass[1]] || fontFamily;
        }
      }
      if (className.includes('ql-size-')) {
        const sizeClass = className.match(/ql-size-([a-z]+)/);
        if (sizeClass) {
          const sizeMap: { [key: string]: number } = {
            'small': fontSize * 0.75,
            'large': fontSize * 1.5,
            'huge': fontSize * 2.5
          };
          styles.fontSize = sizeMap[sizeClass[1]] || fontSize;
        }
      }
    }
    
    // Process child nodes
    element.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.trim()) {
          processText(text, styles);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        processElement(child as Element, styles);
      }
    });
    
    // Add line break after block elements
    if (['P', 'DIV', 'H1', 'H2', 'H3'].includes(element.tagName)) {
      currentX = 0;
      let elementLineHeight = lineHeight;
      if (element.tagName === 'H1') {
        elementLineHeight = fontSize * 1.8 * 1.2;
      } else if (element.tagName === 'H2') {
        elementLineHeight = fontSize * 1.5 * 1.2;
      } else if (element.tagName === 'H3') {
        elementLineHeight = fontSize * 1.2 * 1.2;
      }
      currentY += elementLineHeight;
    }
  };
  
  const processText = (text: string, styles: any) => {
    
    const words = text.split(' ');
    let currentLineMaxFontSize = fontSize;
    
    words.forEach((word, index) => {
      if (index > 0) word = ' ' + word;
      
      const currentFontSize = styles.fontSize || fontSize;
      const fontStyle = `${styles.bold ? 'bold ' : ''}${styles.italic ? 'italic ' : ''}${currentFontSize}px ${fontFamily}`;
      context.font = fontStyle;
      
      const wordWidth = context.measureText(word).width;
      
      if (currentX + wordWidth > maxWidth && currentX > 0) {
        // Move to next line with proper line height based on largest font in previous line
        const lineHeight = hasRuledLines ? currentLineMaxFontSize * 2.5 : currentLineMaxFontSize * 1.4;
        currentX = 0;
        currentY += lineHeight;
        currentLineMaxFontSize = currentFontSize; // Reset for new line
      } else {
        // Track largest font size in current line
        currentLineMaxFontSize = Math.max(currentLineMaxFontSize, currentFontSize);
      }
      
      // Calculate baseline offset for proper vertical alignment
      const baselineOffset = (currentFontSize - fontSize) * 1;
      
      textParts.push({
        text: word,
        x: currentX,
        y: currentY - baselineOffset,
        fontSize: currentFontSize,
        fontFamily: styles.fontFamily || fontFamily,
        fontStyle: `${styles.bold ? 'bold' : ''}${styles.italic ? ' italic' : ''}`.trim() || 'normal',
        textDecoration: styles.underline ? 'underline' : '',
        fill: styles.color || defaultColor || '#000000'
      });
      
      currentX += wordWidth;
    });
  };
  
  // Process all child elements
  tempDiv.childNodes.forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      processElement(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text.trim()) {
        processText(text, {});
      }
    }
  });
  
  return textParts;
}

export default function TextboxQnAInline(props: CanvasItemProps) {
  const { element } = props;
  const { state, dispatch } = useEditor();
  const { user } = useAuth();
  const textRef = useRef<Konva.Text>(null);
  const groupRef = useRef<Konva.Group>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get active section from editor state for visual indication
  const activeSection = state.qnaActiveSection;
  const individualSettings = element.qnaIndividualSettings ?? false;
  
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
  useEffect(() => {
    // Simulate the resize process to force proper re-calculation of ruled lines
    setIsResizing(true);
    setTimeout(() => {
      setIsResizing(false);
      setRefreshKey(prev => prev + 1);
    }, 10);
  }, [element.questionSettings?.font?.fontSize, element.answerSettings?.font?.fontSize, element.questionSettings?.fontSize, element.answerSettings?.fontSize, element.questionSettings?.fontColor, element.answerSettings?.fontColor, element.questionSettings?.fontOpacity, element.answerSettings?.fontOpacity, element.questionSettings, element.answerSettings, element.fontSize, element.fontFamily, element.fontColor, element.font, element.width, element.height, element.questionWidth]);

  // Force refresh when ruled lines settings change
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [element.answerSettings?.ruledLinesColor, element.answerSettings?.ruledLinesOpacity, element.answerSettings?.ruledLinesTheme, element.answerSettings?.ruledLinesWidth, element.questionSettings?.fontSize]);

  // Force refresh when active section or individual settings change
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [activeSection, individualSettings, state.selectedElementIds]);




  
  // Get current theme context
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.bookTheme;
  const elementTheme = element.theme;
  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
  const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;
  
  // Get theme-based defaults (includes palette colors automatically applied)
  const qnaInlineThemeDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, state.toolSettings?.qna_inline, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
  
  // Use theme defaults with tool settings fallback (prioritize: toolSettings > themeDefaults)
  const toolDefaults = {
    fontSize: qnaInlineThemeDefaults.fontSize || 50,
    fontFamily: qnaInlineThemeDefaults.fontFamily || 'Arial, sans-serif',
    questionSettings: {
      fontSize: qnaInlineThemeDefaults.questionSettings?.fontSize || 45,
      // Priority: toolSettings > themeDefaults.questionSettings > themeDefaults (top level)
      fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineThemeDefaults.questionSettings?.fontColor || qnaInlineThemeDefaults.questionSettings?.font?.fontColor || qnaInlineThemeDefaults.fontColor,
      fontOpacity: state.toolSettings?.qna_inline?.fontOpacity ?? qnaInlineThemeDefaults.questionSettings?.fontOpacity ?? qnaInlineThemeDefaults.questionSettings?.font?.fontOpacity ?? 1,
      borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineThemeDefaults.questionSettings?.borderColor || qnaInlineThemeDefaults.questionSettings?.border?.borderColor || qnaInlineThemeDefaults.borderColor,
      backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineThemeDefaults.questionSettings?.backgroundColor || qnaInlineThemeDefaults.questionSettings?.background?.backgroundColor || qnaInlineThemeDefaults.backgroundColor
    },
    answerSettings: {
      fontSize: qnaInlineThemeDefaults.answerSettings?.fontSize || 50,
      // Priority: toolSettings > themeDefaults.answerSettings > themeDefaults (top level)
      fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineThemeDefaults.answerSettings?.fontColor || qnaInlineThemeDefaults.answerSettings?.font?.fontColor || qnaInlineThemeDefaults.fontColor,
      fontOpacity: state.toolSettings?.qna_inline?.fontOpacity ?? qnaInlineThemeDefaults.answerSettings?.fontOpacity ?? qnaInlineThemeDefaults.answerSettings?.font?.fontOpacity ?? 1,
      borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineThemeDefaults.answerSettings?.borderColor || qnaInlineThemeDefaults.answerSettings?.border?.borderColor || qnaInlineThemeDefaults.borderColor,
      backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineThemeDefaults.answerSettings?.backgroundColor || qnaInlineThemeDefaults.answerSettings?.background?.backgroundColor || qnaInlineThemeDefaults.backgroundColor,
      ruledLines: { 
        lineColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineThemeDefaults.answerSettings?.ruledLines?.lineColor || qnaInlineThemeDefaults.answerSettings?.ruledLinesColor || qnaInlineThemeDefaults.ruledLinesColor || qnaInlineThemeDefaults.borderColor
      }
    }
  };
  
  const fontSize = element.font?.fontSize || element.fontSize || toolDefaults.fontSize || 50;
  const fontFamily = element.font?.fontFamily || element.fontFamily || toolDefaults.fontFamily || 'Arial, sans-serif';
  
  const getQuestionText = () => {
    if (!element.questionId) return '';
    const questionData = state.tempQuestions[element.questionId];
    if (!questionData) return 'Loading question...';
    
    // Parse if JSON (contains poolId), otherwise return as-is
    try {
      const parsed = JSON.parse(questionData);
      if (parsed && typeof parsed === 'object' && parsed.text) {
        return parsed.text;
      }
      return questionData;
    } catch {
      return questionData;
    }
  };

  const getUserText = () => {
    // First check element text (for immediate display after save)
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
    
    // Fallback to temp answers if no element text
    if (element.questionId) {
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      if (assignedUser) {
        return state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || '';
      }
    }
    
    return '';
  };

  // Calculate dynamic height based on text content
  const calculateDynamicHeight = () => {
    const questionText = getQuestionText();
    const userText = getUserText();
    
    if (!questionText && !userText) return element.height;
    
    const padding = 4;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    let totalLines = 0;
    const textWidth = element.width - padding * 2;
    
    if (questionText) {
      context.font = '45px Arial';
      const words = questionText.split(' ');
      let lines = 1;
      let currentWidth = 0;
      
      for (const word of words) {
        const wordWidth = context.measureText(word + ' ').width;
        if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
          lines++;
          currentWidth = wordWidth;
        } else {
          currentWidth += wordWidth;
        }
      }
      totalLines += lines;
    }
    
    if (userText) {
      context.font = '50px Arial';
      const lines = userText.split('\n');
      for (const line of lines) {
        if (!line.trim()) {
          totalLines++;
          continue;
        }
        const words = line.split(' ');
        let lineCount = 1;
        let currentWidth = 0;
        
        for (const word of words) {
          const wordWidth = context.measureText(word + ' ').width;
          if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
            lineCount++;
            currentWidth = wordWidth;
          } else {
            currentWidth += wordWidth;
          }
        }
        totalLines += lineCount;
      }
    }
    
    return Math.max(totalLines * 70 + padding * 4, element.height);
  };


  
  // Update element text when assigned user changes to show their answer
  useEffect(() => {
    if (element.questionId) {
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      const answerText = assignedUser ? (state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || '') : '';
      
      // Always update to show the assigned user's answer (or empty if no answer yet)
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: element.id,
          updates: {
            text: answerText,
            formattedText: answerText
          }
        }
      });
    }
  }, [element.questionId, state.pageAssignments, state.activePageIndex, state.tempAnswers, element.id, dispatch]);



  // Generate ruled lines with separate logic for Block and Inline layouts
  const generateRuledLines = () => {
    const lines = [];
    const qnaInlineDefaultsFromTheme = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, state.toolSettings?.qna_inline, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
    const qnaInlineDefaults = {
      questionSettings: {
        fontSize: qnaInlineDefaultsFromTheme.questionSettings?.fontSize || 45,
        // Priority: toolSettings > themeDefaults.questionSettings > themeDefaults (top level)
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.questionSettings?.fontColor || qnaInlineDefaultsFromTheme.questionSettings?.font?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
        borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.border?.borderColor || qnaInlineDefaultsFromTheme.borderColor,
        backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.background?.backgroundColor || qnaInlineDefaultsFromTheme.backgroundColor
      },
      answerSettings: {
        fontSize: qnaInlineDefaultsFromTheme.answerSettings?.fontSize || 50,
        // Priority: toolSettings > themeDefaults.answerSettings > themeDefaults (top level)
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.answerSettings?.fontColor || qnaInlineDefaultsFromTheme.answerSettings?.font?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
        borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.answerSettings?.borderColor || qnaInlineDefaultsFromTheme.answerSettings?.border?.borderColor || qnaInlineDefaultsFromTheme.borderColor,
        backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineDefaultsFromTheme.answerSettings?.backgroundColor || qnaInlineDefaultsFromTheme.answerSettings?.background?.backgroundColor || qnaInlineDefaultsFromTheme.backgroundColor,
        ruledLines: { 
          lineColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.answerSettings?.ruledLines?.lineColor || qnaInlineDefaultsFromTheme.answerSettings?.ruledLinesColor || qnaInlineDefaultsFromTheme.ruledLinesColor || qnaInlineDefaultsFromTheme.borderColor
        }
      }
    };
    
    const questionStyle = {
      ...qnaInlineDefaults.questionSettings,
      ...element.questionSettings
    };
    const answerStyle = {
      ...qnaInlineDefaults.answerSettings,
      ...element.answerSettings
    };
    const padding = questionStyle.padding || answerStyle.padding || element.format?.padding || element.padding || 4;
    const answerRuledLines = answerStyle.ruledLines ?? false;
    
    if (!answerRuledLines) return [];
    
    const layoutVariant = element.layoutVariant || 'inline';
    const questionPosition = element.questionPosition || 'left';
    const answerFontSize = answerStyle.fontSize || fontSize;
    const aSpacing = answerStyle.paragraphSpacing || 'small';
    const getLineHeightMultiplier = (spacing: string) => {
      switch (spacing) {
        case 'small': return 1.0;
        case 'medium': return 1.2;
        case 'large': return 1.5;
        default: return 1.0;
      }
    };
    
    const aTheme = element.answerSettings?.ruledLinesTheme || answerStyle.ruledLinesTheme || 'rough';
    const aColor = element.answerSettings?.ruledLines?.lineColor || element.answerSettings?.ruledLinesColor || answerStyle.ruledLines?.lineColor || answerStyle.ruledLinesColor || '#1f2937';
    const aWidth = element.answerSettings?.ruledLinesWidth || answerStyle.ruledLinesWidth || 0.8;
    const aOpacity = element.answerSettings?.ruledLinesOpacity ?? answerStyle.ruledLinesOpacity ?? 1;
    
    if (layoutVariant === 'block') {
      return generateBlockLayoutRuledLines(questionPosition, padding, answerFontSize, aSpacing, getLineHeightMultiplier, aTheme, aColor, aWidth, aOpacity);
    } else {
      return generateInlineLayoutRuledLines(questionStyle, answerStyle, padding, answerFontSize, aSpacing, getLineHeightMultiplier, aTheme, aColor, aWidth, aOpacity);
    }
  };
  
  // Block layout ruled lines generation
  const generateBlockLayoutRuledLines = (questionPosition: string, padding: number, answerFontSize: number, aSpacing: string, getLineHeightMultiplier: (spacing: string) => number, aTheme: string, aColor: string, aWidth: number, aOpacity: number) => {
    const lines = [];
    let answerArea = { x: padding, y: padding, width: element.width - padding * 2, height: element.height - padding * 2 };
    
    // Calculate answer area based on question position
    if (questionPosition === 'left' || questionPosition === 'right') {
      const questionWidthPercent = element.questionWidth || 40;
      const questionWidth = (element.width * questionWidthPercent) / 100;
      const answerWidth = element.width - questionWidth - padding * 3;
      
      if (questionPosition === 'left') {
        answerArea = { x: questionWidth + padding * 2, y: padding, width: answerWidth, height: element.height - padding * 2 };
      } else {
        answerArea = { x: padding, y: padding, width: answerWidth, height: element.height - padding * 2 };
      }
    } else {
      const questionHeight = answerFontSize + padding * 2;
      const answerHeight = element.height - questionHeight - padding * 3;
      
      if (questionPosition === 'top') {
        answerArea = { x: padding, y: questionHeight + padding * 2, width: element.width - padding * 2, height: answerHeight };
      } else {
        answerArea = { x: padding, y: padding, width: element.width - padding * 2, height: answerHeight };
      }
    }
    
    // Generate lines aligned with text baselines in answer area
    const aLineHeight = answerFontSize * getLineHeightMultiplier(aSpacing);
    const textBaselineY = answerArea.y + answerFontSize * 0.8; // Text baseline position
    let lineY = textBaselineY + answerFontSize * 0.2; // Position lines slightly below text baseline
    const endY = answerArea.y + answerArea.height;
    
    while (lineY < endY) {
      lines.push(...generateLineElement(lineY, aTheme, answerArea.x, aColor, aWidth, aOpacity, answerArea.x + answerArea.width));
      lineY += aLineHeight;
    }
    
    return lines;
  };
  
  // Inline layout ruled lines generation
  const generateInlineLayoutRuledLines = (questionStyle: any, answerStyle: any, padding: number, answerFontSize: number, aSpacing: string, getLineHeightMultiplier: (spacing: string) => number, aTheme: string, aColor: string, aWidth: number, aOpacity: number) => {
    const lines = [];
    const questionText = getQuestionText();
    const userText = getUserText();
    const qFontSize = questionStyle.fontSize || fontSize;
    const qSpacing = questionStyle.paragraphSpacing || 'small';
    const qLineHeight = qFontSize * getLineHeightMultiplier(qSpacing);
    const aLineHeight = answerFontSize * getLineHeightMultiplier(aSpacing);
    
    // Calculate text baseline offset to match text positioning
    const maxFontSizeUsed = Math.max(qFontSize, answerFontSize);
    const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qSpacing), getLineHeightMultiplier(aSpacing));
    const factor = answerFontSize >= 50 ? answerFontSize >= 96 ? answerFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1;
    const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
    
    if (questionText && userText) {
      // Calculate question line count to determine spacing
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      context.font = `${qFontSize}px ${questionStyle.fontFamily || fontFamily}`;
      
      const textWidth = element.width - (padding * 2);
      const questionWords = questionText.split(' ');
      let questionLineCount = 1;
      let currentLineWidth = 0;
      
      for (const word of questionWords) {
        const wordWidth = context.measureText(word + ' ').width;
        if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
          questionLineCount++;
          currentLineWidth = wordWidth;
        } else {
          currentLineWidth += wordWidth;
        }
      }
      
      // Calculate consistent line positions that match text baselines
      const maxFontSizeUsed = Math.max(qFontSize, answerFontSize);
      const effectivePadding = padding + (maxFontSizeUsed * 0.2);
      const combinedLineHeight = maxFontSizeUsed * Math.max(getLineHeightMultiplier(qSpacing), getLineHeightMultiplier(aSpacing));
      
      // Generate lines for each text line position - align with shared baseline
      for (let i = 0; i < questionLineCount; i++) {
        const sharedBaseline = effectivePadding + (i * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.8);
        const lineY = sharedBaseline + 4;
        lines.push(...generateLineElement(lineY, aTheme, padding, aColor, aWidth, aOpacity));
      }
      
      // Answer lines continue with same spacing - align with shared baseline
      let answerLineIndex = 0;
      let sharedBaseline = effectivePadding + (questionLineCount * combinedLineHeight) + (answerLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.8);
      let lineY = sharedBaseline + 4;
      const dynamicHeight = calculateDynamicHeight();
      while (lineY < dynamicHeight - padding - 10) {
        lines.push(...generateLineElement(lineY, aTheme, padding, aColor, aWidth, aOpacity));
        answerLineIndex++;
        sharedBaseline = effectivePadding + (questionLineCount * combinedLineHeight) + (answerLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.8);
        lineY = sharedBaseline + 4;
      }
    } else {
      // Single text - use appropriate font size + gap, adjust for baseline offset
      const activeFontSize = userText ? answerFontSize : (questionStyle.fontSize || fontSize);
      const maxFontSizeUsed = Math.max(qFontSize, answerFontSize);
      const effectivePadding = padding + (maxFontSizeUsed * 0.2);
      const combinedLineHeight = maxFontSizeUsed * Math.max(getLineHeightMultiplier(qSpacing), getLineHeightMultiplier(aSpacing));
      
      let lineIndex = 0;
      let sharedBaseline = effectivePadding + (lineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.8);
      let lineY = sharedBaseline + 4;
      const dynamicHeight = calculateDynamicHeight();
      while (lineY < dynamicHeight - padding - 10) {
        lines.push(...generateLineElement(lineY, aTheme, padding, aColor, aWidth, aOpacity));
        lineIndex++;
        sharedBaseline = effectivePadding + (lineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.8);
        lineY = sharedBaseline + 4;
      }
    }
    
    return lines;
  };
  
  const generateLineElement = (y: number, theme: string, startX: number, ruledLineColor: string, ruledLineWidth: number, ruledLineOpacity: number, endX?: number) => {
    const lineElements = [];
    const lineEndX = endX || (element.width - startX);
    
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

  // Generate visual indication border for active section
  const generateSectionIndicator = () => {
    // Only show indicator if element is selected and individual settings are enabled
    if (!state.selectedElementIds.includes(element.id) || !individualSettings) {
      return null;
    }

    const qnaInlineDefaultsFromTheme = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, state.toolSettings?.qna_inline, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
    const qnaInlineDefaults = {
      questionSettings: {
        fontSize: qnaInlineDefaultsFromTheme.questionSettings?.fontSize || 45,
        // Priority: toolSettings > themeDefaults.questionSettings > themeDefaults (top level)
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.questionSettings?.fontColor || qnaInlineDefaultsFromTheme.questionSettings?.font?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
        borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.border?.borderColor || qnaInlineDefaultsFromTheme.borderColor,
        backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.background?.backgroundColor || qnaInlineDefaultsFromTheme.backgroundColor
      },
      answerSettings: {
        fontSize: qnaInlineDefaultsFromTheme.answerSettings?.fontSize || 50,
        // Priority: toolSettings > themeDefaults.answerSettings > themeDefaults (top level)
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.answerSettings?.fontColor || qnaInlineDefaultsFromTheme.answerSettings?.font?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
        borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.answerSettings?.borderColor || qnaInlineDefaultsFromTheme.answerSettings?.border?.borderColor || qnaInlineDefaultsFromTheme.borderColor,
        backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineDefaultsFromTheme.answerSettings?.backgroundColor || qnaInlineDefaultsFromTheme.answerSettings?.background?.backgroundColor || qnaInlineDefaultsFromTheme.backgroundColor,
        ruledLines: { 
          lineColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.answerSettings?.ruledLines?.lineColor || qnaInlineDefaultsFromTheme.answerSettings?.ruledLinesColor || qnaInlineDefaultsFromTheme.ruledLinesColor || qnaInlineDefaultsFromTheme.borderColor
        }
      }
    };
    
    const questionStyle = {
      ...qnaInlineDefaults.questionSettings,
      ...element.questionSettings
    };
    const answerStyle = {
      ...qnaInlineDefaults.answerSettings,
      ...element.answerSettings
    };
    const padding = questionStyle.padding || answerStyle.padding || element.format?.padding || element.padding || 4;
    
    const layoutVariant = element.layoutVariant || 'inline';
    const questionPosition = element.questionPosition || 'left';
    const questionText = getQuestionText();
    const userText = getUserText();
    
    if (layoutVariant === 'block') {
      // Block layout: highlight question or answer area
      let targetArea = { x: padding, y: padding, width: element.width - padding * 2, height: element.height - padding * 2 };
      
      if (questionPosition === 'left' || questionPosition === 'right') {
        const questionWidthPercent = element.questionWidth || 40;
        const questionWidth = (element.width * questionWidthPercent) / 100;
        const answerWidth = element.width - questionWidth - padding * 3;
        
        if (activeSection === 'question') {
          if (questionPosition === 'left') {
            targetArea = { x: padding, y: padding, width: questionWidth, height: element.height - padding * 2 };
          } else {
            targetArea = { x: answerWidth + padding * 2, y: padding, width: questionWidth, height: element.height - padding * 2 };
          }
        } else {
          if (questionPosition === 'left') {
            targetArea = { x: questionWidth + padding * 2, y: padding, width: answerWidth, height: element.height - padding * 2 };
          } else {
            targetArea = { x: padding, y: padding, width: answerWidth, height: element.height - padding * 2 };
          }
        }
      } else {
        const qFontSize = questionStyle.fontSize || fontSize;
        const questionHeight = qFontSize + padding * 2;
        const answerHeight = element.height - questionHeight - padding * 3;
        
        if (activeSection === 'question') {
          if (questionPosition === 'top') {
            targetArea = { x: padding, y: padding, width: element.width - padding * 2, height: questionHeight };
          } else {
            targetArea = { x: padding, y: answerHeight + padding * 2, width: element.width - padding * 2, height: questionHeight };
          }
        } else {
          if (questionPosition === 'top') {
            targetArea = { x: padding, y: questionHeight + padding * 2, width: element.width - padding * 2, height: answerHeight };
          } else {
            targetArea = { x: padding, y: padding, width: element.width - padding * 2, height: answerHeight };
          }
        }
      }
      
      return (
        <Rect
          x={targetArea.x}
          y={targetArea.y}
          width={targetArea.width}
          height={targetArea.height}
          fill="transparent"
          stroke="#d0d7e0ff"
          strokeWidth={2}
          dash={[6, 6]}
          cornerRadius={8}
          strokeScaleEnabled={false}
          listening={false}
          name="no-print"
        />
      );
    } else {
      // Inline layout: highlight based on text content and active section
      if (questionText && userText) {
        // Both question and answer present
        const qFontSize = questionStyle.fontSize || fontSize;
        const aFontSize = answerStyle.fontSize || fontSize;
        
        // Calculate question lines
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.font = `${qFontSize}px ${questionStyle.fontFamily || fontFamily}`;
        
        const textWidth = element.width - (padding * 2);
        const questionWords = questionText.split(' ');
        let questionLineCount = 1;
        let currentLineWidth = 0;
        
        for (const word of questionWords) {
          const wordWidth = context.measureText(word + ' ').width;
          if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
            questionLineCount++;
            currentLineWidth = wordWidth;
          } else {
            currentLineWidth += wordWidth;
          }
        }
        
        const qSpacing = questionStyle.paragraphSpacing || 'small';
        const aSpacing = answerStyle.paragraphSpacing || 'small';
        const getLineHeightMultiplier = (spacing: string) => {
          switch (spacing) {
            case 'small': return 1.0;
            case 'medium': return 1.2;
            case 'large': return 1.5;
            default: return 1.0;
          }
        };
        
        const qLineHeight = qFontSize * getLineHeightMultiplier(qSpacing);
        const aLineHeight = aFontSize * getLineHeightMultiplier(aSpacing);
        
        if (activeSection === 'question') {
          // Highlight question area
          const questionHeight = questionLineCount * qLineHeight;
          return (
            <Rect
              x={padding}
              y={padding}
              width={element.width - padding * 2}
              height={questionHeight + padding}
              fill="transparent"
              stroke="#d0d7e0ff"
              strokeWidth={2}
              dash={[6, 6]}
              cornerRadius={8}
              strokeScaleEnabled={false}
              listening={false}
              name="no-print"
            />
          );
        } else {
          // Highlight answer area (rest of the textbox)
          const questionHeight = questionLineCount * qLineHeight;
          const answerY = padding + questionHeight + padding;
          const answerHeight = element.height - answerY - padding;
          
          return (
            <Rect
              x={padding}
              y={answerY}
              width={element.width - padding * 2}
              height={answerHeight}
              fill="transparent"
              stroke="#d0d7e0ff"
              strokeWidth={2}
              dash={[6, 6]}
              cornerRadius={8}
              strokeScaleEnabled={false}
              listening={false}
              name="no-print"
            />
          );
        }
      } else {
        // Only one type of text - highlight entire textbox
        return (
          <Rect
            x={padding}
            y={padding}
            width={element.width - padding * 2}
            height={element.height - padding * 2}
            fill="transparent"
            stroke="#d0d7e0ff"
            strokeWidth={2}
            dash={[6, 6]}
            cornerRadius={8}
            strokeScaleEnabled={false}
            listening={false}
            name="no-print"
          />
        );
      }
    }
  };

  const handleDoubleClick = (e: any) => {
    if (state.activeTool !== 'select') return;
    if (e.evt.button !== 0) return; // Only left button (0)
    enableQuillEditing();
  };

  // Auto-size functionality using actual rendered bounds
  const handleAutoSize = useCallback(() => {
    if (!groupRef.current) return;
    
    // Get all child nodes (text, borders, backgrounds, etc.)
    const group = groupRef.current;
    const children = group.getChildren();
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    // Calculate bounds of all visible children
    children.forEach(child => {
      if (child.visible() && child.getClassName() !== 'Rect' || child.attrs.stroke || child.attrs.fill !== 'transparent') {
        const box = child.getClientRect();
        minX = Math.min(minX, box.x);
        maxX = Math.max(maxX, box.x + box.width);
        minY = Math.min(minY, box.y);
        maxY = Math.max(maxY, box.y + box.height);
      }
    });
    
    if (minX === Infinity) return;
    
    const newWidth = Math.max(50, maxX - minX + 8); // Add small margin
    const newHeight = Math.max(20, maxY - minY + 8);
    
    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: { width: newWidth, height: newHeight }
      }
    });
  }, [element.id, dispatch]);

  // Listen for auto-size trigger
  useEffect(() => {
    const handleAutoSizeTrigger = (event: CustomEvent) => {
      if (event.detail.elementId === element.id) {
        handleAutoSize();
      }
    };
    
    window.addEventListener('triggerAutoSize', handleAutoSizeTrigger as EventListener);
    return () => window.removeEventListener('triggerAutoSize', handleAutoSizeTrigger as EventListener);
  }, [handleAutoSize, element.id]);

  const enableQuillEditing = () => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    
    // Load Quill.js if not already loaded
    if (!window.Quill) {
      const quillCSS = document.createElement('link');
      quillCSS.rel = 'stylesheet';
      quillCSS.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(quillCSS);
      
      const quillJS = document.createElement('script');
      quillJS.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
      document.head.appendChild(quillJS);
      
      quillJS.onload = () => initQuillForQnAInline();
      return;
    } else {
      initQuillForQnAInline();
    }
    
    function initQuillForQnAInline() {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255, 255, 255, 0.5);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';
      
      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:80vw;max-width:800px;min-width:400px;box-shadow:0 3px 6px rgba(0,0,0,0.1)';
      
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:16px;padding-bottom:12px';
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Frage Antwort</h2>';
      
      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:4px';
      
      const questionText = document.createElement('div');
      const hasExistingQuestion = element.questionId;
      questionText.textContent = hasExistingQuestion ? getQuestionText() : 'No question selected';
      questionText.style.cssText = 'font-size:0.875rem;color:#374151;font-weight:500;flex:1';
      
      const insertQuestionBtn = document.createElement('button');
      insertQuestionBtn.textContent = hasExistingQuestion ? 'Change Question' : 'Insert Question';
      insertQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem';
      insertQuestionBtn.onmouseover = () => insertQuestionBtn.style.background = '#f1f5f9';
      insertQuestionBtn.onmouseout = () => insertQuestionBtn.style.background = 'white';
      insertQuestionBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('openQuestionDialog', {
          detail: { elementId: element.id }
        }));
      };
      
      toolbar.appendChild(questionText);
      toolbar.appendChild(insertQuestionBtn);
      
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
      container.appendChild(toolbar);
      container.appendChild(editorContainer);
      container.appendChild(buttonContainer);
      modal.appendChild(container);
      document.body.appendChild(modal);
      
      setTimeout(() => {
        const quill = new window.Quill(editorContainer, {
          theme: 'snow'
        });
        
        // Hide toolbar and style container with fixed height
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
        
        // Load existing answer content
        const assignedUser = state.pageAssignments[state.activePageIndex + 1];
        let contentToLoad = '';
        
        if (element.questionId && assignedUser) {
          contentToLoad = state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || element.formattedText || element.text || '';
        } else {
          contentToLoad = element.formattedText || element.text || '';
        }
        
        if (contentToLoad) {
          if (contentToLoad.includes('<')) {
            quill.root.innerHTML = contentToLoad;
          } else {
            quill.setText(contentToLoad);
          }
        }
        
        // Track current question ID (can change when user selects new question)
        let currentQuestionId = element.questionId;
        
        // No need to protect placeholder since it's not in the editor
        
        // No need to block deletion since there's no placeholder
        
        saveBtn.onclick = () => {
          const htmlContent = quill.root.innerHTML;
          const plainText = quill.getText().trim();
          
          // Always update element text first
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
          
          // Save to answer system using current question ID (not element.questionId which might be stale)
          if (currentQuestionId && user?.id) {
            dispatch({
              type: 'UPDATE_TEMP_ANSWER',
              payload: {
                questionId: currentQuestionId,
                text: plainText,
                userId: user.id,
                answerId: element.answerId || uuidv4()
              }
            });
          }
          
          closeModal();
        };
        
        // Create unique event name for this element
        const uniqueEventName = `questionSelected-${element.id}`;
        
        // Listen for question selection events specific to this element
        const handleQuestionSelected = (event: CustomEvent) => {
          const { questionId, questionText: selectedQuestionText } = event.detail;
          
          // Update current question ID
          currentQuestionId = questionId;
          
          // Update button text and question display
          insertQuestionBtn.textContent = 'Change Question';
          questionText.textContent = selectedQuestionText || 'No question selected';
          
          // Update element with questionId and load question text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { questionId }
            }
          });
          
          // Store question text in temp questions only if it doesn't exist yet
          if (!state.tempQuestions[questionId]) {
            dispatch({
              type: 'UPDATE_TEMP_QUESTION',
              payload: {
                questionId,
                text: selectedQuestionText
              }
            });
          }
          
          // Load assigned user's answer for the new question
          if (assignedUser) {
            const existingAnswer = state.tempAnswers[questionId]?.[assignedUser.id]?.text || '';
            quill.setText(existingAnswer);
            
            // Update element text to show the answer
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  text: existingAnswer,
                  formattedText: existingAnswer
                }
              }
            });
          } else {
            quill.setText('');
            
            // Clear element text if no assigned user
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  text: '',
                  formattedText: ''
                }
              }
            });
          }
          
          // Check if user can edit after question change
          const canEdit = assignedUser && assignedUser.id === user?.id;
          
          if (!assignedUser) {
            quill.disable();
            quill.root.setAttribute('data-placeholder', 'No user assigned to this page');
            quill.root.style.backgroundColor = '#f9fafb';
            quill.root.style.color = '#9ca3af';
          } else if (!canEdit) {
            quill.disable();
            quill.root.setAttribute('data-placeholder', `${assignedUser?.name || 'User'} can answer here`);
            quill.root.style.backgroundColor = '#f9fafb';
            quill.root.style.color = '#9ca3af';
          } else {
            quill.enable();
            quill.root.removeAttribute('data-placeholder');
            quill.root.style.backgroundColor = '';
            quill.root.style.color = '';
            quill.focus();
          }
        };
        
        window.addEventListener(uniqueEventName, handleQuestionSelected);
        
        // Cleanup function to remove the event listener when modal closes
        const originalCloseModal = closeModal;
        closeModal = () => {
          window.removeEventListener(uniqueEventName, handleQuestionSelected);
          originalCloseModal();
        };
        
        // Update cancel button to use new closeModal
        cancelBtn.onclick = closeModal;
        

        

        
        // Handle paste to insert unformatted text
        quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
          const plaintext = node.innerText || node.textContent || '';
          const Delta = window.Quill.import('delta');
          return new Delta().insert(plaintext);
        });
        
        // Check if user can edit
        const canEdit = assignedUser && assignedUser.id === user?.id;
        
        if (!assignedUser) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'No user assigned to this page');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else if (!canEdit) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', `${assignedUser?.name || 'User'} can answer here`);
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else if (!hasExistingQuestion) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'Add a question');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else {
          quill.focus();
        }
        
        // Block keyboard events from reaching canvas
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
          // Handle right-click to exit Style Painter mode
          if (e?.evt?.button === 2 && state.stylePainterActive) {
            e.evt.preventDefault();
            dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
            return;
          }
          // Call original onSelect if provided
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
          ref={groupRef}
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
            const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const questionStyle = {
              ...qnaInlineDefaults.questionSettings,
              ...element.questionSettings
            };
            const answerStyle = {
              ...qnaInlineDefaults.answerSettings,
              ...element.answerSettings
            };
            const showBackground = questionStyle.background?.enabled || answerStyle.background?.enabled;
            
            if (showBackground) {
              const backgroundColor = questionStyle.background?.backgroundColor || answerStyle.background?.backgroundColor || 'transparent';
              const backgroundOpacity = questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1;
              const cornerRadius = questionStyle.cornerRadius || answerStyle.cornerRadius || 0;
              
              const dynamicHeight = calculateDynamicHeight();
              
              return (
                <Rect
                  width={element.width}
                  height={dynamicHeight}
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
            const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const questionStyle = {
              ...qnaInlineDefaults.questionSettings,
              ...element.questionSettings
            };
            const answerStyle = {
              ...qnaInlineDefaults.answerSettings,
              ...element.answerSettings
            };
            const showBorder = questionStyle.border?.enabled || answerStyle.border?.enabled;
            
            if (showBorder) {
              const borderColor = questionStyle.border?.borderColor || answerStyle.border?.borderColor || '#000000';
              const borderWidth = questionStyle.borderWidth || answerStyle.borderWidth || 1;
              const borderOpacity = questionStyle.borderOpacity ?? answerStyle.borderOpacity ?? 1;
              const cornerRadius = questionStyle.cornerRadius || answerStyle.cornerRadius || 0;
              const theme = questionStyle.borderTheme || answerStyle.borderTheme || 'default';
              
              // Use theme renderer for consistent border rendering
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
              
              const dynamicHeight = calculateDynamicHeight();
              
              return (
                <Rect
                  width={element.width}
                  height={dynamicHeight}
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
          
          {/* Visual indication for active section */}
          {generateSectionIndicator()}
          
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
            const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const questionStyle = {
              ...qnaInlineDefaults.questionSettings,
              ...element.questionSettings,
              fontFamily: element.questionSettings?.fontFamily || element.font?.fontFamily || element.fontFamily || qnaInlineDefaults.questionSettings?.fontFamily || fontFamily
            };
            const answerStyle = {
              ...qnaInlineDefaults.answerSettings,
              ...element.answerSettings,
              fontFamily: element.answerSettings?.fontFamily || element.font?.fontFamily || element.fontFamily || qnaInlineDefaults.answerSettings?.fontFamily || fontFamily
            };
            
            // Direct color override - element settings have absolute priority
            if (element.questionSettings?.fontColor) {
              questionStyle.fontColor = element.questionSettings.fontColor;
            }
            if (element.answerSettings?.fontColor) {
              answerStyle.fontColor = element.answerSettings.fontColor;
            }
            const padding = questionStyle.padding || answerStyle.padding || element.format?.padding || element.padding || 4;
            const textWidth = element.width - (padding * 2);
            const questionText = getQuestionText();
            const userText = getUserText();
            
            // Get alignment settings
            const questionAlign = questionStyle.align || 'left';
            const answerAlign = answerStyle.align || 'left';
            
            // Get layout variant
            const layoutVariant = element.layoutVariant || 'inline';
            const questionPosition = element.questionPosition || 'left';
            
            if (!questionText && !userText) {
              return (
                <Text
                  ref={textRef}
                  x={padding}
                  y={padding}
                  text="Double-click to add text..."
                  fontSize={Math.max(fontSize * 1, 54)}
                  fontFamily={fontFamily}
                  fill="#9ca3af"
                  opacity={0.7}
                  align="left"
                  verticalAlign="top"
                  listening={true}
                />
              );
            }

            
            let currentY = padding;
            const elements = [];
            
            // Calculate baseline alignment for question and user text
            const qFontSize = questionStyle.fontSize || fontSize;
            const aFontSize = answerStyle.fontSize || fontSize;
            const maxFontSize = Math.max(qFontSize, aFontSize);
            // Ensure sufficient top padding to prevent overlap with textbox edge
            const effectivePadding = layoutVariant === 'inline' ? padding + (maxFontSize * 0.2) : padding;
            const baselineY = effectivePadding + maxFontSize * 0.8; // Baseline position
            
            // Get paragraph spacing settings
            const qParagraphSpacing = questionStyle.paragraphSpacing || 'small';
            const aParagraphSpacing = answerStyle.paragraphSpacing || 'small';
            
            // Calculate line heights based on paragraph spacing
            const getLineHeightMultiplier = (spacing: string) => {
              switch (spacing) {
                case 'small': return 1.0;
                case 'medium': return 1.2;
                case 'large': return 1.5;
                default: return 1.0;
              }
            };
            
            // For inline layout, use combined line height based on largest font
            const combinedLineHeight = layoutVariant === 'inline' ? 
              maxFontSize * Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing)) :
              qFontSize * getLineHeightMultiplier(qParagraphSpacing);
            const qLineHeight = layoutVariant === 'inline' ? combinedLineHeight : qFontSize * getLineHeightMultiplier(qParagraphSpacing);
            const aLineHeight = layoutVariant === 'inline' ? combinedLineHeight : aFontSize * getLineHeightMultiplier(aParagraphSpacing);
            
            // Text baseline offset to float above ruled lines - accounts for font size and paragraph spacing
            const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
            const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing));
            const factor = aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1;
            const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor); 
            
            // Render based on layout variant
            if (layoutVariant === 'block') {
              // Block layout: question and answer in separate areas
              const qFontFamily = questionStyle.fontFamily || element.font?.fontFamily || element.fontFamily || toolDefaults.questionSettings?.fontFamily || fontFamily;
              const qFontColor = questionStyle.fontColor || questionStyle.font?.fontColor || element.font?.fontColor || element.fontColor || toolDefaults.questionSettings?.fontColor || '#666666';
              const qFontBold = questionStyle.fontBold || toolDefaults.questionSettings?.fontBold || false;
              const qFontItalic = questionStyle.fontItalic || toolDefaults.questionSettings?.fontItalic || false;
              const qFontOpacity = questionStyle.fontOpacity ?? toolDefaults.questionSettings?.fontOpacity ?? 1;
              
              const aFontFamily = answerStyle.fontFamily || element.font?.fontFamily || element.fontFamily || toolDefaults.answerSettings?.fontFamily || fontFamily;
              const aFontColor = answerStyle.fontColor || answerStyle.font?.fontColor || element.font?.fontColor || element.fontColor || toolDefaults.answerSettings?.fontColor || '#1f2937';
              const aFontBold = answerStyle.fontBold || toolDefaults.answerSettings?.fontBold || false;
              const aFontItalic = answerStyle.fontItalic || toolDefaults.answerSettings?.fontItalic || false;
              const aFontOpacity = answerStyle.fontOpacity ?? toolDefaults.answerSettings?.fontOpacity ?? 1;
              
              let questionArea = { x: padding, y: padding, width: textWidth, height: element.height - padding * 2 };
              let answerArea = { x: padding, y: padding, width: textWidth, height: element.height - padding * 2 };
              
              // Calculate dynamic question area size based on text content
              let questionWidth = 0;
              let questionHeight = 0;
              
              if (questionText) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
                
                // Calculate required width and height for question text
                const words = questionText.split(' ');
                let maxLineWidth = 0;
                let currentLineWidth = 0;
                let lineCount = 1;
                
                for (const word of words) {
                  const wordWidth = context.measureText(word + ' ').width;
                  if (currentLineWidth + wordWidth > element.width * 0.6 && currentLineWidth > 0) {
                    maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
                    currentLineWidth = wordWidth;
                    lineCount++;
                  } else {
                    currentLineWidth += wordWidth;
                  }
                }
                maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
                
                questionWidth = Math.min(maxLineWidth + padding * 2, element.width * 0.6);
                questionHeight = lineCount * qLineHeight + padding * 2;
              }
              
              // Calculate areas based on position
              if (questionPosition === 'left' || questionPosition === 'right') {
                const questionWidthPercent = element.questionWidth || 40;
                const finalQuestionWidth = (element.width * questionWidthPercent) / 100;
                const answerWidth = element.width - finalQuestionWidth - padding * 3;
                
                if (questionPosition === 'left') {
                  questionArea = { x: padding, y: padding, width: finalQuestionWidth, height: element.height - padding * 2 };
                  answerArea = { x: finalQuestionWidth + padding * 2, y: padding, width: answerWidth, height: element.height - padding * 2 };
                } else {
                  answerArea = { x: padding, y: padding, width: answerWidth, height: element.height - padding * 2 };
                  questionArea = { x: answerWidth + padding * 2, y: padding, width: finalQuestionWidth, height: element.height - padding * 2 };
                }
              } else {
                const finalQuestionHeight = Math.max(questionHeight, qFontSize + padding * 2);
                const answerHeight = element.height - finalQuestionHeight - padding * 3;
                
                if (questionPosition === 'top') {
                  questionArea = { x: padding, y: padding, width: textWidth, height: finalQuestionHeight };
                  answerArea = { x: padding, y: finalQuestionHeight + padding * 2, width: textWidth, height: answerHeight };
                } else {
                  answerArea = { x: padding, y: padding, width: textWidth, height: answerHeight };
                  questionArea = { x: padding, y: answerHeight + padding * 2, width: textWidth, height: finalQuestionHeight };
                }
              }
              
              // Render question in its area
              if (questionText) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
                
                const words = questionText.split(' ');
                let currentLine = '';
                let currentY = questionArea.y;
                
                words.forEach((word, index) => {
                  const testLine = currentLine ? currentLine + ' ' + word : word;
                  const testWidth = context.measureText(testLine).width;
                  
                  if (testWidth > questionArea.width && currentLine) {
                    elements.push(
                      <Text
                        key={`q-${currentY}`}
                        x={questionArea.x}
                        y={currentY}
                        text={currentLine}
                        fontSize={qFontSize}
                        fontFamily={qFontFamily}
                        fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                        fill={qFontColor}
                        opacity={qFontOpacity}
                        align={questionAlign}
                        width={questionArea.width}
                        listening={false}
                      />
                    );
                    currentLine = word;
                    currentY += qLineHeight;
                  } else {
                    currentLine = testLine;
                  }
                });
                
                if (currentLine) {
                  elements.push(
                    <Text
                      key={`q-${currentY}`}
                      x={questionArea.x}
                      y={currentY}
                      text={currentLine}
                      fontSize={qFontSize}
                      fontFamily={qFontFamily}
                      fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                      fill={qFontColor}
                      opacity={qFontOpacity}
                      align={questionAlign}
                      width={questionArea.width}
                      listening={false}
                    />
                  );
                }
              }
              
              // Render answer in its area
              if (userText) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
                
                const lines = userText.split('\n');
                // PST: Layout = Block: Adjust Y position for subsequent ruled lines, before it was >> let currentY = answerArea.y + aFontSize * 0.2;
                let currentY = answerArea.y ; 
                
                lines.forEach((line) => {
                  if (!line.trim()) {
                    currentY += aLineHeight;
                    return;
                  }
                  
                  const words = line.split(' ');
                  let currentLine = '';
                  
                  words.forEach((word) => {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const testWidth = context.measureText(testLine).width;
                    
                    if (testWidth > answerArea.width && currentLine) {
                      elements.push(
                        <Text
                          key={`a-${currentY}`}
                          x={answerArea.x}
                          y={currentY}
                          text={currentLine}
                          fontSize={aFontSize}
                          fontFamily={aFontFamily}
                          fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                          fill={aFontColor}
                          opacity={aFontOpacity}
                          align={answerAlign}
                          width={answerArea.width}
                          listening={false}
                        />
                      );
                      currentLine = word;
                      currentY += aLineHeight;
                    } else {
                      currentLine = testLine;
                    }
                  });
                  
                  if (currentLine) {
                    elements.push(
                      <Text
                        key={`a-${currentY}`}
                        x={answerArea.x}
                        y={currentY}
                        text={currentLine}
                        fontSize={aFontSize}
                        fontFamily={aFontFamily}
                        fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                        fill={aFontColor}
                        opacity={aFontOpacity}
                        align={answerAlign}
                        width={answerArea.width}
                        listening={false}
                      />
                    );
                    currentY += aLineHeight;
                  }
                });
              }
            } else {
              // Inline layout: original implementation
              // Render question text first
              if (questionText) {
              const qFontFamily = questionStyle.fontFamily || element.font?.fontFamily || element.fontFamily || toolDefaults.questionSettings?.fontFamily || fontFamily;
              const qFontColor = questionStyle.fontColor || questionStyle.font?.fontColor || element.font?.fontColor || element.fontColor || toolDefaults.questionSettings?.fontColor || '#666666';
              const qFontBold = questionStyle.fontBold || toolDefaults.questionSettings?.fontBold || false;
              const qFontItalic = questionStyle.fontItalic || toolDefaults.questionSettings?.fontItalic || false;
              const qFontOpacity = questionStyle.fontOpacity ?? toolDefaults.questionSettings?.fontOpacity ?? 1;
              
              // Calculate question text width and handle wrapping
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
              
              const questionWords = questionText.split(' ');
              let questionLines = [];
              let currentLine = '';
              let currentLineWidth = 0;
              
              // Build question lines
              for (const word of questionWords) {
                const wordWithSpace = currentLine ? ' ' + word : word;
                const wordWidth = context.measureText(wordWithSpace).width;
                
                if (currentLineWidth + wordWidth <= textWidth) {
                  currentLine += wordWithSpace;
                  currentLineWidth += wordWidth;
                } else {
                  if (currentLine) questionLines.push(currentLine);
                  currentLine = word;
                  currentLineWidth = context.measureText(word).width;
                }
              }
              if (currentLine) questionLines.push(currentLine);
              
              // Render all question lines with shared baseline alignment
              // PST: Layout = Inline: Adjust Y position for question text in both combined question-answer line and question-only lines
              questionLines.forEach((line, index) => {
                const sharedBaseline = effectivePadding + (index * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                const questionY = sharedBaseline - (qFontSize * 0.8);
                
                elements.push(
                  <Text
                    key={`question-${index}`}
                    x={padding}
                    y={questionY}
                    text={line}
                    fontSize={qFontSize}
                    fontFamily={qFontFamily}
                    fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                    fill={qFontColor}
                    opacity={qFontOpacity}
                    align={questionAlign}
                    width={textWidth}
                    listening={false}
                  />
                );
              });
              
              // Calculate where question ends for user text positioning
              const lastQuestionLine = questionLines[questionLines.length - 1] || '';
              const questionTextWidth = context.measureText(lastQuestionLine).width;
              const questionEndY = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset;
              
              // Render user text with custom wrapping logic
              if (userText) {
                const aFontFamily = answerStyle.fontFamily || element.font?.fontFamily || element.fontFamily || toolDefaults.answerSettings?.fontFamily || fontFamily;
                const aFontColor = answerStyle.fontColor || answerStyle.font?.fontColor || element.font?.fontColor || element.fontColor || toolDefaults.answerSettings?.fontColor || '#1f2937';
                const aFontBold = answerStyle.fontBold || toolDefaults.answerSettings?.fontBold || false;
                const aFontItalic = answerStyle.fontItalic || toolDefaults.answerSettings?.fontItalic || false;
                const aFontOpacity = answerStyle.fontOpacity ?? toolDefaults.answerSettings?.fontOpacity ?? 1;
                
                context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
                
                // Handle line breaks in user text first
                const userLines = userText.split('\n');
                let currentLineY = questionEndY;
                let isFirstLine = true;
                
                userLines.forEach((line) => {
                  if (!line.trim() && !isFirstLine) {
                    currentLineY += aLineHeight;
                    return;
                  }
                  
                  const words = line.split(' ');
                  let wordIndex = 0;
                  
                  while (wordIndex < words.length) {
                    let lineText = '';
                    let lineWidth = 0;
                    let currentX = padding;
                    let availableWidth = textWidth;
                    
                    // For first line only, start after question
                    if (isFirstLine) {
                      const gap = 40;
                      currentX = padding + questionTextWidth + gap;
                      availableWidth = textWidth - questionTextWidth - gap;
                    }
                    
                    // Build line with as many words as fit
                    while (wordIndex < words.length) {
                      const word = words[wordIndex];
                      const wordWithSpace = lineText ? ' ' + word : word;
                      const wordWidth = context.measureText(wordWithSpace).width;
                      
                      if (lineWidth + wordWidth <= availableWidth) {
                        lineText += wordWithSpace;
                        lineWidth += wordWidth;
                        wordIndex++;
                      } else {
                        break;
                      }
                    }
                    
                    // Store answer line for combined alignment
                    if (lineText) {
                      if (isFirstLine) {
                        // Calculate combined positioning for first line
                        const lastQuestionLine = questionLines[questionLines.length - 1] || '';
                        
                        // Use question font context for accurate measurement
                        const qContext = document.createElement('canvas').getContext('2d')!;
                        qContext.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
                        const qWidth = qContext.measureText(lastQuestionLine).width;
                        
                        const gap = Math.max(10, qFontSize * .5); // Dynamic gap based on font size
                        const aWidth = context.measureText(lineText).width;
                        const combinedWidth = qWidth + gap + aWidth;
                        
                        let startX = padding;
                        if (answerAlign === 'center') {
                          startX = (element.width - combinedWidth) / 2;
                        } else if (answerAlign === 'right') {
                          startX = element.width - padding - combinedWidth;
                        }
                        
                        // Question already rendered above, no need to render again
                        
                        // Calculate shared baseline for both question and answer text
                        // PST: Layout = Inline: Adjust Y position for answer text in combined question-answer line
                        const sharedBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                        const answerY = sharedBaseline - (aFontSize * 0.8);
                        
                        // Render answer after question with shared baseline alignment
                        elements.push(
                          <Text
                            key={`user-line-${currentLineY}-${currentX}`}
                            x={padding + qWidth + gap}
                            y={answerY}
                            text={lineText}
                            fontSize={aFontSize}
                            fontFamily={aFontFamily}
                            fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                            fill={aFontColor}
                            opacity={aFontOpacity}
                            align="left"
                            listening={false}
                          />
                        );
                      } else {
                        // Calculate consistent Y position for subsequent lines with shared baseline
                        const lineIndex = Math.round((currentLineY - questionEndY - combinedLineHeight) / combinedLineHeight);
                        // PST: Layout = Inline: Adjust Y position answer text in answer-only lines
                        const sharedBaseline = effectivePadding + (questionLines.length * combinedLineHeight) + (lineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                        const answerY = sharedBaseline - (aFontSize * 0.8);
                        
                        elements.push(
                          <Text
                            key={`user-line-${currentLineY}-${currentX}`}
                            x={padding}
                            y={answerY}
                            text={lineText}
                            fontSize={aFontSize}
                            fontFamily={aFontFamily}
                            fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                            fill={aFontColor}
                            opacity={aFontOpacity}
                            align={answerAlign}
                            width={textWidth}
                            listening={false}
                          />
                        );
                      }
                    }
                    
                    // Move to next line
                    currentLineY += combinedLineHeight;
                    isFirstLine = false;
                  }
                });
              }
            } else if (userText) {
              // Only user text, no question - handle line breaks manually
              const aFontFamily = answerStyle.fontFamily || element.font?.fontFamily || element.fontFamily || toolDefaults.answerSettings?.fontFamily || fontFamily;
              const aFontColor = answerStyle.fontColor || answerStyle.font?.fontColor || element.font?.fontColor || element.fontColor || toolDefaults.answerSettings?.fontColor || '#1f2937';
              const aFontBold = answerStyle.fontBold || toolDefaults.answerSettings?.fontBold || false;
              const aFontItalic = answerStyle.fontItalic || toolDefaults.answerSettings?.fontItalic || false;
              const aFontOpacity = answerStyle.fontOpacity ?? toolDefaults.answerSettings?.fontOpacity ?? 1;
              
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
              
              const lines = userText.split('\n');
              let currentLineIndex = 0;
              
              lines.forEach((line) => {
                if (!line.trim()) {
                  // Empty line - just increment line index
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
                      let xPos = padding;
                      if (answerAlign === 'center') {
                        xPos = element.width / 2;
                      } else if (answerAlign === 'right') {
                        xPos = element.width - padding;
                      }
                      
                      const sharedBaseline = effectivePadding + (currentLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8);
                      const answerY = sharedBaseline - (aFontSize * 0.8);
                      
                      elements.push(
                        <Text
                          key={`user-line-${currentLineIndex}`}
                          x={padding}
                          y={answerY}
                          text={currentLine}
                          fontSize={aFontSize}
                          fontFamily={aFontFamily}
                          fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                          fill={aFontColor}
                          opacity={aFontOpacity}
                          align={answerAlign}
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
                  let xPos = padding;
                  if (answerAlign === 'center') {
                    xPos = element.width / 2;
                  } else if (answerAlign === 'right') {
                    xPos = element.width - padding;
                  }
                  
                  const sharedBaseline = effectivePadding + (currentLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8);
                  const answerY = sharedBaseline - (aFontSize * 0.8);
                  
                  elements.push(
                    <Text
                      key={`user-line-${currentLineIndex}`}
                      x={padding}
                      y={answerY}
                      text={currentLine}
                      fontSize={aFontSize}
                      fontFamily={aFontFamily}
                      fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                      fill={aFontColor}
                      opacity={aFontOpacity}
                      align={answerAlign}
                      width={textWidth}
                      listening={false}
                    />
                  );
                  currentLineIndex++;
                }
              });
            }
            } // End of inline layout
            
            // Add invisible overlay for double-click detection
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