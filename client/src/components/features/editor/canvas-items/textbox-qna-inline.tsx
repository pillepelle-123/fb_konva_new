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
import { getThemeRenderer, type Theme, generateLinePath } from '../../../../utils/themes-client';
import { getToolDefaults } from '../../../../utils/tool-defaults';
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
  // Extract primitive values to prevent infinite re-renders from object references
  // Font properties are now only directly in questionSettings/answerSettings
  const questionSettingsFontSize = element.questionSettings?.fontSize;
  const answerSettingsFontSize = element.answerSettings?.fontSize;
  const questionSettingsFontColor = element.questionSettings?.fontColor;
  const answerSettingsFontColor = element.answerSettings?.fontColor;
  const questionSettingsFontOpacity = element.questionSettings?.fontOpacity;
  const answerSettingsFontOpacity = element.answerSettings?.fontOpacity;
  // Font properties for qna_inline are only in questionSettings/answerSettings, not on element level
  const elementWidth = element.width;
  const elementHeight = element.height;
  const elementQuestionWidth = element.questionWidth;
  
  // Get current question text to detect changes - use useMemo to make it reactive
  // Access the specific question from tempQuestions to ensure reactivity
  // Stabilize tempQuestions object reference to prevent infinite loops
  const tempQuestionsString = useMemo(() => JSON.stringify(state.tempQuestions), [state.tempQuestions]);
  const questionTextFromState = useMemo(() => {
    return element.questionId ? state.tempQuestions[element.questionId] : null;
  }, [element.questionId, tempQuestionsString]);
  
  const currentQuestionText = useMemo(() => {
    if (!element.questionId) return null;
    return questionTextFromState || null;
  }, [element.questionId, questionTextFromState]);
  
  // Use ref to track previous font values to prevent unnecessary re-renders
  const previousFontValuesRef = useRef<string>('');
  useEffect(() => {
    // Create a stable string representation of all font-related values
    const currentFontValues = JSON.stringify({
      questionSettingsFontSize,
      answerSettingsFontSize,
      questionSettingsFontColor,
      answerSettingsFontColor,
      questionSettingsFontOpacity,
      answerSettingsFontOpacity,
      elementWidth,
      elementHeight,
      elementQuestionWidth
    });
    
    // Only trigger if values actually changed
    if (currentFontValues !== previousFontValuesRef.current) {
      previousFontValuesRef.current = currentFontValues;
      setIsResizing(true);
      const timeoutId = setTimeout(() => {
        setIsResizing(false);
        setRefreshKey(prev => prev + 1);
      }, 10);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [questionSettingsFontSize, answerSettingsFontSize, questionSettingsFontColor, answerSettingsFontColor, questionSettingsFontOpacity, answerSettingsFontOpacity, elementWidth, elementHeight, elementQuestionWidth]);

  // Force refresh when ruled lines settings change
  // Extract values to prevent object reference changes from triggering infinite loops
  const ruledLinesColor = element.ruledLinesColor;
  const ruledLinesOpacity = element.ruledLinesOpacity;
  const ruledLinesTheme = element.ruledLinesTheme;
  const ruledLinesWidth = element.ruledLinesWidth;
  const questionSettingsFontSizeForRuledLines = element.questionSettings?.fontSize;
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [ruledLinesColor, ruledLinesOpacity, ruledLinesTheme, ruledLinesWidth, questionSettingsFontSizeForRuledLines]);

  // Force refresh when active section or individual settings change
  // Use JSON.stringify to compare arrays/objects to prevent infinite loops
  const selectedElementIdsString = JSON.stringify(state.selectedElementIds);
  
  // Use ref to track previous values to prevent unnecessary re-renders
  const previousSectionValuesRef = useRef<string>('');
  useEffect(() => {
    const currentSectionValues = JSON.stringify({
      activeSection,
      individualSettings,
      selectedElementIdsString
    });
    
    if (currentSectionValues !== previousSectionValuesRef.current) {
      previousSectionValuesRef.current = currentSectionValues;
      setRefreshKey(prev => prev + 1);
    }
  }, [activeSection, individualSettings, selectedElementIdsString]);
  
  // Force refresh when question text changes (e.g., after editing in book-manager or when questions are loaded)
  // Only trigger if questionText actually changed (not just reference)
  const previousQuestionTextRef = useRef<string | null>(null);
  useEffect(() => {
    if (element.questionId && currentQuestionText !== previousQuestionTextRef.current) {
      previousQuestionTextRef.current = currentQuestionText;
      setRefreshKey(prev => prev + 1);
    }
  }, [element.questionId, currentQuestionText]);

  // Force refresh when active page changes to ensure questions are re-rendered for different users
  // Use ref to track previous page index to prevent unnecessary refreshes
  const previousPageIndexRef = useRef<number>(state.activePageIndex);
  const pageAssignmentsStringForRefresh = useMemo(() => JSON.stringify(state.pageAssignments), [state.pageAssignments]);
  
  useEffect(() => {
    if (element.questionId && (state.activePageIndex !== previousPageIndexRef.current)) {
      previousPageIndexRef.current = state.activePageIndex;
      setRefreshKey(prev => prev + 1);
    }
  }, [element.questionId, state.activePageIndex, pageAssignmentsStringForRefresh]);

  // Store a global function that can be called directly from the button
  useEffect(() => {
    // Store a function on the window object that can be called from the Quill editor button
    (window as any)[`openQuestionSelector_${element.id}`] = () => {
      // Dispatch event to open modal in Canvas component
      window.dispatchEvent(new CustomEvent('openQuestionDialog', {
        detail: { elementId: element.id }
      }));
    };
    
    return () => {
      delete (window as any)[`openQuestionSelector_${element.id}`];
    };
  }, [element.id]);




  
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
  const qnaInlineThemeDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, state.toolSettings?.qna_inline, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
  
  // Use theme defaults with tool settings fallback (prioritize: toolSettings > themeDefaults)
  const toolDefaults = {
    fontSize: qnaInlineThemeDefaults.fontSize || 50,
    fontFamily: qnaInlineThemeDefaults.fontFamily || 'Arial, sans-serif',
    questionSettings: {
      fontSize: qnaInlineThemeDefaults.questionSettings?.fontSize || 45,
      // Priority: toolSettings > themeDefaults.questionSettings > themeDefaults (top level)
      fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineThemeDefaults.questionSettings?.fontColor || qnaInlineThemeDefaults.fontColor,
      fontOpacity: state.toolSettings?.qna_inline?.fontOpacity ?? qnaInlineThemeDefaults.questionSettings?.fontOpacity ?? 1,
      borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineThemeDefaults.questionSettings?.borderColor || qnaInlineThemeDefaults.questionSettings?.border?.borderColor || qnaInlineThemeDefaults.borderColor,
      backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineThemeDefaults.questionSettings?.backgroundColor || qnaInlineThemeDefaults.questionSettings?.background?.backgroundColor || qnaInlineThemeDefaults.backgroundColor
    },
    answerSettings: {
      fontSize: qnaInlineThemeDefaults.answerSettings?.fontSize || 50,
      // Priority: toolSettings > themeDefaults.answerSettings > themeDefaults (top level)
      fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineThemeDefaults.answerSettings?.fontColor || qnaInlineThemeDefaults.fontColor,
      fontOpacity: state.toolSettings?.qna_inline?.fontOpacity ?? qnaInlineThemeDefaults.answerSettings?.fontOpacity ?? 1,
      borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineThemeDefaults.answerSettings?.borderColor || qnaInlineThemeDefaults.answerSettings?.border?.borderColor || qnaInlineThemeDefaults.borderColor,
      backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineThemeDefaults.answerSettings?.backgroundColor || qnaInlineThemeDefaults.answerSettings?.background?.backgroundColor || qnaInlineThemeDefaults.backgroundColor,
      ruledLines: { 
        lineColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineThemeDefaults.answerSettings?.ruledLines?.lineColor || qnaInlineThemeDefaults.answerSettings?.ruledLinesColor || qnaInlineThemeDefaults.ruledLinesColor || qnaInlineThemeDefaults.borderColor
      }
    }
  };
  
  // Font properties for qna_inline are only in questionSettings/answerSettings
  // These defaults are only used as fallback for theme defaults
  const fontSize = toolDefaults.fontSize || 50;
  const fontFamily = toolDefaults.fontFamily || 'Arial, sans-serif';
  
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
  // Stabilize object references to prevent infinite loops
  const pageAssignmentsString = useMemo(() => JSON.stringify(state.pageAssignments), [state.pageAssignments]);
  const tempAnswersString = useMemo(() => JSON.stringify(state.tempAnswers), [state.tempAnswers]);
  
  const assignedUser = useMemo(() => {
    return state.pageAssignments[state.activePageIndex + 1];
  }, [pageAssignmentsString, state.activePageIndex]);
  
  const answerText = useMemo(() => {
    if (!element.questionId || !assignedUser) return '';
    return state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || '';
  }, [element.questionId, assignedUser, tempAnswersString]);
  
  // Use ref to track previous values and prevent unnecessary updates
  const previousAnswerTextRef = useRef<string>('');
  const previousElementTextRef = useRef<string>('');
  const previousElementFormattedTextRef = useRef<string>('');
  
  useEffect(() => {
    if (element.questionId) {
      // Only update if the answerText has changed AND element text doesn't match
      // Don't include element.text/formattedText in dependencies to prevent infinite loops
      const answerTextChanged = answerText !== previousAnswerTextRef.current;
      const elementTextMismatch = element.text !== answerText || element.formattedText !== answerText;
      
      if (answerTextChanged && elementTextMismatch) {
        previousAnswerTextRef.current = answerText;
        previousElementTextRef.current = element.text;
        previousElementFormattedTextRef.current = element.formattedText;
        
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
      } else {
        // Update refs even if we don't dispatch to track current state
        previousElementTextRef.current = element.text;
        previousElementFormattedTextRef.current = element.formattedText;
      }
    }
  }, [element.questionId, answerText, element.id, dispatch]);



  // Generate ruled lines with separate logic for Block and Inline layouts
  const generateRuledLines = () => {
    const lines = [];
    const qnaInlineDefaultsFromTheme = getToolDefaults('qna_inline', pageTheme, bookTheme, undefined, state.toolSettings?.qna_inline, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
    const qnaInlineDefaults = {
      questionSettings: {
        fontSize: qnaInlineDefaultsFromTheme.questionSettings?.fontSize || 45,
        // Priority: toolSettings > themeDefaults.questionSettings > themeDefaults (top level)
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.questionSettings?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
        borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.border?.borderColor || qnaInlineDefaultsFromTheme.borderColor,
        backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.background?.backgroundColor || qnaInlineDefaultsFromTheme.backgroundColor
      },
      answerSettings: {
        fontSize: qnaInlineDefaultsFromTheme.answerSettings?.fontSize || 50,
        // Priority: toolSettings > themeDefaults.answerSettings > themeDefaults (top level)
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.answerSettings?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
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
    const padding = element.padding || questionStyle.padding || answerStyle.padding || element.format?.padding || 4;
    const answerRuledLines = element.ruledLines ?? false;
    
    if (!answerRuledLines) return [];
    
    const layoutVariant = element.layoutVariant || 'inline';
    const questionPosition = element.questionPosition || 'left';
    const answerFontSize = answerStyle.fontSize || fontSize;
    const aSpacing = answerStyle.paragraphSpacing || element.paragraphSpacing || 'small';
    const getLineHeightMultiplier = (spacing: string) => {
      switch (spacing) {
        case 'small': return 1.0;
        case 'medium': return 1.2;
        case 'large': return 1.5;
        default: return 1.0;
      }
    };
    
    const aTheme = element.ruledLinesTheme || 'rough';
    const aColor = element.ruledLinesColor || '#1f2937';
    const aWidth = element.ruledLinesWidth || 0.8;
    const aOpacity = element.ruledLinesOpacity ?? 1;
    
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
    const qSpacing = questionStyle.paragraphSpacing || element.paragraphSpacing || 'small';
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
      
      // Ruled lines should appear under answer text
      // When question spans multiple lines, we need to generate ruled lines for all question lines
      // that are part of the answer area, not just the last question line
      const answerBaselineOffset = -(answerFontSize * getLineHeightMultiplier(aSpacing) * 0.15) + (answerFontSize * (answerFontSize >= 50 ? answerFontSize >= 96 ? answerFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
      
      // Calculate question baseline offset for ruled lines under question text
      // This should use question font size, not answer font size
      const questionBaselineOffset = -(qFontSize * getLineHeightMultiplier(qSpacing) * 0.15) + (qFontSize * (qFontSize >= 50 ? qFontSize >= 96 ? qFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
      
      // Generate lines for answer text
      // This must match exactly the text positioning logic:
      // - Combined line answer text: answerY = sharedBaseline - (aFontSize * 0.8)
      //   where sharedBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7)
      // - Subsequent answer lines (wrapped segments): answerY = answerBaseline - (aFontSize * 0.8)
      //   where answerBaseline = combinedLineBaseline + (lineIndex * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6)
      // Ruled lines are positioned slightly below the text baseline
      if (userText && userText.trim()) {
        const dynamicHeight = calculateDynamicHeight();
        const maxLines = 1000; // Safety limit to prevent infinite loops
        let iterationCount = 0;
        
        // Check if answer can fit on same line as last question line
        const lastQuestionLine = questionText.split(' ').reduce((acc, word) => {
          const testLine = acc ? acc + ' ' + word : word;
          const testWidth = context.measureText(testLine).width;
          if (testWidth > textWidth && acc) {
            return word;
          }
          return testLine;
        }, '');
        const lastQuestionLineWidth = context.measureText(lastQuestionLine).width;
        const gap = 40;
        const availableWidthAfterQuestion = textWidth - lastQuestionLineWidth - gap;
        
        // Check if first word of answer fits after last question line
        const aFontFamily = answerStyle.fontFamily || fontFamily;
        const aFontBold = answerStyle.fontBold ?? false;
        const aFontItalic = answerStyle.fontItalic ?? false;
        const answerContext = document.createElement('canvas').getContext('2d')!;
        answerContext.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${answerFontSize}px ${aFontFamily}`;
        const firstAnswerLine = userText.split('\n')[0] || '';
        const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
        const canFitOnSameLine = firstAnswerWord && availableWidthAfterQuestion > 0 && answerContext.measureText(firstAnswerWord).width <= availableWidthAfterQuestion;
        
        // Calculate baseline for the combined line (last question line with answer)
        // This matches the text rendering logic: effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6)
        const combinedLineBaseline = effectivePadding + ((questionLineCount - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.6);
        
        // Always generate ruled lines for all question lines when question spans multiple lines
        // OR when answer starts on a new line (even if question is single line)
        // This ensures that all question lines have ruled lines underneath them
        // BUT: Skip the last question line if answer fits on same line (to avoid duplicate ruled line)
        if (questionLineCount > 1 || !canFitOnSameLine) {
          // Generate ruled lines for all question lines (starting from first question line)
          // Each question line should have a ruled line underneath it
          // IMPORTANT: Use question font size and question baseline offset for question lines
          // If answer fits on same line as last question, skip the last question line (it will get a ruled line from answer section)
          const maxQuestionLineIndex = (questionLineCount > 1 && canFitOnSameLine) 
            ? questionLineCount - 1  // Skip last line if answer fits on same line
            : questionLineCount;     // Include all lines if answer starts on new line
          
          for (let questionLineIndex = 0; questionLineIndex < maxQuestionLineIndex; questionLineIndex++) {
            // Calculate baseline for question line using question font size
            // This matches the question text positioning: questionY = sharedBaseline - (qFontSize * 0.8)
            // where sharedBaseline = effectivePadding + (questionLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7)
            // For ruled lines under question text, we need to position them based on question text size
            // The question text Y position is: sharedBaseline - (qFontSize * 0.8)
            // The ruled line should be positioned slightly below the question text baseline
            const number = qFontSize - answerFontSize;
            const sharedBaseline = effectivePadding + (questionLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.8) - (number / 7);
            const questionTextY = sharedBaseline - (qFontSize * 0.8);
            // Position ruled line slightly below the question text (same logic as answer ruled lines)
            const lineY = questionTextY + qFontSize + (qFontSize * 0.15);
            
            // Safety check: ensure lineY is a valid number
            if (isFinite(lineY) && !isNaN(lineY) && lineY < dynamicHeight - padding - 10) {
              lines.push(...generateLineElement(lineY, aTheme, padding, aColor, aWidth, aOpacity));
            }
          }
        }
        
        // Generate ruled lines for answer lines
        // If answer fits on same line as last question, it starts on the combined line (index = 0)
        // Otherwise, it starts on the next line (index = 1)
        let answerLineIndex = 0;
        
        // If answer doesn't fit on same line, it starts on next line after question
        if (!canFitOnSameLine) {
          answerLineIndex = 1; // Start from next line after question
        }
        
        // Additional safety checks before entering loop
        if (aLineHeight <= 0 || !isFinite(aLineHeight) || isNaN(aLineHeight)) {
          // If aLineHeight is invalid, generate just one line at the starting position
          const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (answerFontSize * 0.6);
          const lineY = answerBaseline + (answerFontSize * 0.15);
          if (isFinite(lineY) && !isNaN(lineY)) {
            lines.push(...generateLineElement(lineY, aTheme, padding, aColor, aWidth, aOpacity));
          }
        } else {
          // Generate ruled lines for all answer lines
          // Start from the line where answer begins and continue until the end of the textbox
          while (iterationCount < maxLines) {
            // Calculate answer baseline (same formula as text rendering)
            // The answerBaseline represents the actual text baseline position
            // Text Y position is: answerBaseline - (aFontSize * 0.8)
            // For combined line (answerLineIndex = 0): answerBaseline = combinedLineBaseline + answerBaselineOffset + (answerFontSize * 0.6)
            // For subsequent lines: answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (answerFontSize * 0.6)
            const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (answerFontSize * 0.6);
            
            // Position ruled line slightly below the baseline so it sits under the text
            // Text sits on the baseline (at answerBaseline), so the line should be: baseline + offset
            // Using fontSize * 0.15 ensures the line is positioned so descenders (g, j, p, q, y) extend slightly above it
            // This creates the "flex-end" effect where text floats slightly above the line
            const lineY = answerBaseline + (answerFontSize * 0.15);
            
            // Safety check: ensure lineY is a valid number
            if (!isFinite(lineY) || lineY === Infinity || isNaN(lineY)) break;
            
            if (lineY >= dynamicHeight - padding - 10) break;
            lines.push(...generateLineElement(lineY, aTheme, padding, aColor, aWidth, aOpacity));
            answerLineIndex++;
            iterationCount++;
          }
        }
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
      const maxLines = 1000; // Safety limit to prevent infinite loops
      let iterationCount = 0;
      
      // Additional safety check: if combinedLineHeight is 0 or negative, don't loop
      if (combinedLineHeight <= 0) {
        // Fallback: generate just one line at the starting position
        lines.push(...generateLineElement(sharedBaseline + 4, aTheme, padding, aColor, aWidth, aOpacity));
      } else {
        while (lineY < dynamicHeight - padding - 10 && iterationCount < maxLines) {
          lines.push(...generateLineElement(lineY, aTheme, padding, aColor, aWidth, aOpacity));
          lineIndex++;
          iterationCount++;
          sharedBaseline = effectivePadding + (lineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.8);
          lineY = sharedBaseline + 4;
          
          // Safety check: if lineY is not increasing (NaN or stuck), break
          if (!isFinite(lineY) || lineY === Infinity || isNaN(lineY)) break;
        }
      }
    }
    
    return lines;
  };
  
  const generateLineElement = (y: number, theme: string, startX: number, ruledLineColor: string, ruledLineWidth: number, ruledLineOpacity: number, endX?: number) => {
    const lineElements = [];
    const lineEndX = endX || (element.width - startX);
    
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

  // Generate visual indication border for active section
  // UI-Helper-Element: This indicator does NOT scale with zoom and is NOT printed in PDF
  // Rule: UI-Helper-Elemente must have name="no-print" AND strokeScaleEnabled={false}
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
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.questionSettings?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
        borderColor: state.toolSettings?.qna_inline?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.borderColor || qnaInlineDefaultsFromTheme.questionSettings?.border?.borderColor || qnaInlineDefaultsFromTheme.borderColor,
        backgroundColor: state.toolSettings?.qna_inline?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.backgroundColor || qnaInlineDefaultsFromTheme.questionSettings?.background?.backgroundColor || qnaInlineDefaultsFromTheme.backgroundColor
      },
      answerSettings: {
        fontSize: qnaInlineDefaultsFromTheme.answerSettings?.fontSize || 50,
        // Priority: toolSettings > themeDefaults.answerSettings > themeDefaults (top level)
        fontColor: state.toolSettings?.qna_inline?.fontColor || qnaInlineDefaultsFromTheme.answerSettings?.fontColor || qnaInlineDefaultsFromTheme.fontColor,
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
        
        const qSpacing = questionStyle.paragraphSpacing || element.paragraphSpacing || 'small';
        const aSpacing = answerStyle.paragraphSpacing || element.paragraphSpacing || 'small';
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
    // Don't open modals in non-interactive mode (e.g., PDF export)
    if (props.interactive === false) return;
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
      
      const toolbarButtonContainer = document.createElement('div');
      toolbarButtonContainer.style.cssText = 'display:flex;gap:8px;align-items:center';
      
      const insertQuestionBtn = document.createElement('button');
      insertQuestionBtn.textContent = hasExistingQuestion ? 'Change Question' : 'Insert Question';
      insertQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem';
      insertQuestionBtn.onmouseover = () => insertQuestionBtn.style.background = '#f1f5f9';
      insertQuestionBtn.onmouseout = () => insertQuestionBtn.style.background = 'white';
      insertQuestionBtn.onclick = () => {
        // Close Quill editor modal first
        window.dispatchEvent(new CustomEvent('closeQuillEditor'));
        
        // Small delay to ensure Quill modal is closed
        setTimeout(() => {
          // Try direct function call first, then fallback to event
          const directFn = (window as any)[`openQuestionSelector_${element.id}`];
          if (directFn) {
            directFn();
          } else {
            window.dispatchEvent(new CustomEvent('openQuestionDialog', {
              detail: { elementId: element.id }
            }));
          }
        }, 100);
      };
      
      const resetQuestionBtn = document.createElement('button');
      resetQuestionBtn.textContent = 'Reset Question';
      resetQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem;color:#dc2626';
      resetQuestionBtn.style.display = hasExistingQuestion ? 'block' : 'none';
      resetQuestionBtn.onmouseover = () => resetQuestionBtn.style.background = '#fef2f2';
      resetQuestionBtn.onmouseout = () => resetQuestionBtn.style.background = 'white';
      
      toolbarButtonContainer.appendChild(insertQuestionBtn);
      if (hasExistingQuestion) {
        toolbarButtonContainer.appendChild(resetQuestionBtn);
      }
      
      toolbar.appendChild(questionText);
      toolbar.appendChild(toolbarButtonContainer);
      
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
      
      // Listen for closeQuillEditor event - defined here so it's in scope for later cleanup
      const handleCloseQuillEditor = () => {
        closeModal();
      };
      window.addEventListener('closeQuillEditor', handleCloseQuillEditor);
      
      // Store reference to handler for later cleanup
      (modal as any).__closeQuillEditorHandler = handleCloseQuillEditor;
      
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
        
        // Reset question handler - removes question from this element
        resetQuestionBtn.onclick = () => {
          // Reset element: remove questionId and clear text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                questionId: undefined,
                text: '',
                formattedText: ''
              }
            }
          });
          
          // Update UI in Quill editor
          insertQuestionBtn.textContent = 'Insert Question';
          questionText.textContent = 'No question selected';
          resetQuestionBtn.style.display = 'none';
          
          // Clear Quill editor content
          quill.setText('');
          
          // Disable editor since no question is selected
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'Add a question');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
          
          // Update current question ID
          currentQuestionId = undefined;
        };
        
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
          
          // Show reset button if it's not already visible
          if (resetQuestionBtn.style.display === 'none' || !toolbarButtonContainer.contains(resetQuestionBtn)) {
            resetQuestionBtn.style.display = 'block';
            if (!toolbarButtonContainer.contains(resetQuestionBtn)) {
              toolbarButtonContainer.appendChild(resetQuestionBtn);
            }
          }
          
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
        const previousCloseModal = closeModal;
        closeModal = () => {
          window.removeEventListener(uniqueEventName, handleQuestionSelected);
          // Also remove closeQuillEditor listener
          const closeQuillEditorHandler = (modal as any).__closeQuillEditorHandler;
          if (closeQuillEditorHandler) {
            window.removeEventListener('closeQuillEditor', closeQuillEditorHandler);
          }
          // Remove openQuestionDialog listener
          const openQuestionDialogHandler = (modal as any).__openQuestionDialogHandler;
          if (openQuestionDialogHandler) {
            window.removeEventListener('openQuestionDialog', openQuestionDialogHandler);
          }
          previousCloseModal();
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
          // Don't add onClick or onMouseDown handlers here - let events propagate to BaseCanvasItem Group
          // This ensures selection works even when lockElements is enabled
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
            // Border/Background are shared properties - only check top-level element.borderEnabled/element.backgroundEnabled
            // Fallback to questionSettings/answerSettings for backward compatibility with old data
            const showBackground = element.backgroundEnabled ?? (questionStyle.background?.enabled || answerStyle.background?.enabled) ?? false;
            
            if (showBackground) {
              const backgroundColor = element.backgroundColor || questionStyle.background?.backgroundColor || answerStyle.background?.backgroundColor || 'transparent';
              const backgroundOpacity = element.backgroundOpacity ?? questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1;
              const cornerRadius = element.cornerRadius ?? qnaInlineDefaults.cornerRadius ?? 0;
              
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
          {/* Page-Content-Element: QNA borders scale with zoom (strokeScaleEnabled={true}) and are printed in PDF */}
          {(() => {
            // Get default settings from tool defaults if not present
            // CRITICAL: Use element.theme if present (set during loadBook for pages that inherit book theme)
            // Otherwise fall back to page/book theme from state
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const elementTheme = element.theme; // Use element.theme if it was set during loadBook
            const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
            const bookTheme = elementTheme || state.currentBook?.themeId || state.currentBook?.bookTheme;
            const pageLayoutTemplateId = currentPage?.layoutTemplateId;
            const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
            const pageColorPaletteId = currentPage?.colorPaletteId;
            const bookColorPaletteId = state.currentBook?.colorPaletteId;
            const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme, element, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const questionStyle = {
              ...qnaInlineDefaults.questionSettings,
              ...element.questionSettings
            };
            const answerStyle = {
              ...qnaInlineDefaults.answerSettings,
              ...element.answerSettings
            };
            // Border/Background are shared properties - only check top-level element.borderEnabled/element.backgroundEnabled
            // Fallback to questionSettings/answerSettings for backward compatibility with old data
            const showBorder = element.borderEnabled ?? (questionStyle.border?.enabled || answerStyle.border?.enabled) ?? false;
            
            if (showBorder) {
              const borderColor = element.borderColor || questionStyle.border?.borderColor || answerStyle.border?.borderColor || '#000000';
              const borderWidth = element.borderWidth || questionStyle.borderWidth || answerStyle.borderWidth || 1;
              const borderOpacity = element.borderOpacity ?? questionStyle.borderOpacity ?? answerStyle.borderOpacity ?? 1;
              const cornerRadius = element.cornerRadius ?? qnaInlineDefaults.cornerRadius ?? 0;
              const theme = element.borderTheme || questionStyle.borderTheme || answerStyle.borderTheme || 'default';
              
              const dynamicHeight = calculateDynamicHeight();
              
              // Use theme renderer for consistent border rendering
              const themeRenderer = getThemeRenderer(theme);
              if (themeRenderer && theme !== 'default') {
                // Create a temporary element-like object for generatePath
                // Set roughness to 8 for 'rough' theme to match client-side rendering
                const borderElement = {
                  type: 'rect' as const,
                  id: element.id + '-border',
                  x: 0,
                  y: 0,
                  width: element.width,
                  height: dynamicHeight,
                  cornerRadius: cornerRadius,
                  stroke: borderColor,
                  strokeWidth: borderWidth,
                  fill: 'transparent',
                  roughness: theme === 'rough' ? 8 : undefined
                } as CanvasElement;
                
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
              
              return (
                <Rect
                  width={element.width}
                  height={dynamicHeight}
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
          
          {/* Visual indication for active section */}
          {generateSectionIndicator()}
          
          {/* Show skeleton during resize, otherwise show text content */}
          {isResizing ? (
            <KonvaSkeleton width={element.width} height={element.height} />
          ) : (() => {
            // Get default settings from tool defaults if not present
            // CRITICAL: Use element.theme if present (set during loadBook for pages that inherit book theme)
            // Otherwise fall back to page/book theme from state
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const elementTheme = element.theme; // Use element.theme if it was set during loadBook
            const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
            const bookTheme = elementTheme || state.currentBook?.themeId || state.currentBook?.bookTheme;
            const pageLayoutTemplateId = currentPage?.layoutTemplateId;
            const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
            const pageColorPaletteId = currentPage?.colorPaletteId;
            const bookColorPaletteId = state.currentBook?.colorPaletteId;
            const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme, element, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
            
            const questionStyle = {
              ...qnaInlineDefaults.questionSettings,
              ...element.questionSettings,
              fontFamily: element.questionSettings?.fontFamily || qnaInlineDefaults.questionSettings?.fontFamily || fontFamily,
              align: element.questionSettings?.align || element.format?.textAlign || element.align || qnaInlineDefaults.questionSettings?.align
            };
            const answerStyle = {
              ...qnaInlineDefaults.answerSettings,
              ...element.answerSettings,
              fontFamily: element.answerSettings?.fontFamily || qnaInlineDefaults.answerSettings?.fontFamily || fontFamily,
              align: element.answerSettings?.align || element.format?.textAlign || element.align || qnaInlineDefaults.answerSettings?.align
            };
            
            // Direct color override - element settings have absolute priority
            if (element.questionSettings?.fontColor) {
              questionStyle.fontColor = element.questionSettings.fontColor;
            }
            if (element.answerSettings?.fontColor) {
              answerStyle.fontColor = element.answerSettings.fontColor;
            }
            
            // When individualSettings is false, use answer font properties for question as well
            if (!individualSettings) {
              // Override question font properties with answer font properties
              // Use ?? to handle false values correctly (false || something would always return something)
              questionStyle.fontSize = answerStyle.fontSize ?? questionStyle.fontSize;
              questionStyle.fontFamily = answerStyle.fontFamily ?? questionStyle.fontFamily;
              questionStyle.fontBold = answerStyle.fontBold ?? questionStyle.fontBold ?? false;
              questionStyle.fontItalic = answerStyle.fontItalic ?? questionStyle.fontItalic ?? false;
              questionStyle.fontColor = answerStyle.fontColor ?? questionStyle.fontColor;
              questionStyle.fontOpacity = answerStyle.fontOpacity ?? questionStyle.fontOpacity ?? 1;
            }
            const padding = element.padding || questionStyle.padding || answerStyle.padding || element.format?.padding || 4;
            const textWidth = element.width - (padding * 2);
            const questionText = getQuestionText();
            const userText = getUserText();
            
            // Get alignment settings - Priority: element.align > element.format?.textAlign > questionSettings/answerSettings > default
            const questionAlign = element.align || element.format?.textAlign || questionStyle.align || 'left';
            const answerAlign = element.align || element.format?.textAlign || answerStyle.align || 'left';
            
            // Get layout variant
            const layoutVariant = element.layoutVariant || 'inline';
            const questionPosition = element.questionPosition || 'left';
            
            if (!questionText && !userText) {
              // Use question font properties for placeholder text
              const qFontFamily = questionStyle.fontFamily || qnaInlineDefaults.questionSettings?.fontFamily || fontFamily;
              const qFontSize = questionStyle.fontSize || fontSize;
              const qFontColor = questionStyle.fontColor || qnaInlineDefaults.questionSettings?.fontColor || '#666666';
              const qFontOpacity = questionStyle.fontOpacity ?? qnaInlineDefaults.questionSettings?.fontOpacity ?? 1;
              const qFontBold = questionStyle.fontBold ?? qnaInlineDefaults.questionSettings?.fontBold ?? false;
              const qFontItalic = questionStyle.fontItalic ?? qnaInlineDefaults.questionSettings?.fontItalic ?? false;
              
              // Calculate available width for text wrapping
              const availableWidth = element.width - (2 * padding);
              
              return (
                <Text
                  ref={textRef}
                  x={padding}
                  y={padding}
                  text="[Double-click to add a question...]"
                  fontSize={qFontSize}
                  fontFamily={qFontFamily}
                  fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                  fill={qFontColor}
                  opacity={qFontOpacity}
                  align="left"
                  verticalAlign="top"
                  width={availableWidth}
                  wrap="word"
                  listening={true}
                  name="no-print"
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
            
            // Get paragraph spacing settings - Priority: element.paragraphSpacing > questionSettings/answerSettings > default
            const qParagraphSpacing = element.paragraphSpacing || questionStyle.paragraphSpacing || 'small';
            const aParagraphSpacing = element.paragraphSpacing || answerStyle.paragraphSpacing || 'small';
            
            // Calculate line heights based on paragraph spacing
            const getLineHeightMultiplier = (spacing: string) => {
              switch (spacing) {
                case 'small': return 1.0;
                case 'medium': return 1.2;
                case 'large': return 1.5;
                default: return 1.0;
              }
            };
            
            // For inline layout, use combined line height based on largest font for question lines (and combined lines)
            // Answer-only lines use independent line height (aLineHeight) to be unaffected by question font size
            const combinedLineHeight = layoutVariant === 'inline' ? 
              maxFontSize * Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing)) :
              qFontSize * getLineHeightMultiplier(qParagraphSpacing);
            const qLineHeight = layoutVariant === 'inline' ? combinedLineHeight : qFontSize * getLineHeightMultiplier(qParagraphSpacing);
            // Answer line height is always independent of question font size, even for inline layout
            const aLineHeight = aFontSize * getLineHeightMultiplier(aParagraphSpacing);
            
            // Text baseline offset to float above ruled lines - accounts for font size and paragraph spacing
            const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
            const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing));
            const factor = aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1;
            const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor); 
            
            // Render based on layout variant
            if (layoutVariant === 'block') {
              // Block layout: question and answer in separate areas
              const qFontFamily = questionStyle.fontFamily || qnaInlineDefaults.questionSettings?.fontFamily || fontFamily;
              const qFontColor = questionStyle.fontColor || qnaInlineDefaults.questionSettings?.fontColor || '#666666';
              const qFontBold = questionStyle.fontBold ?? qnaInlineDefaults.questionSettings?.fontBold ?? false;
              const qFontItalic = questionStyle.fontItalic ?? qnaInlineDefaults.questionSettings?.fontItalic ?? false;
              const qFontOpacity = questionStyle.fontOpacity ?? qnaInlineDefaults.questionSettings?.fontOpacity ?? 1;
              
              const aFontFamily = answerStyle.fontFamily || qnaInlineDefaults.answerSettings?.fontFamily || fontFamily;
              const aFontColor = answerStyle.fontColor || qnaInlineDefaults.answerSettings?.fontColor || '#1f2937';
              const aFontBold = answerStyle.fontBold ?? qnaInlineDefaults.answerSettings?.fontBold ?? false;
              const aFontItalic = answerStyle.fontItalic ?? qnaInlineDefaults.answerSettings?.fontItalic ?? false;
              const aFontOpacity = answerStyle.fontOpacity ?? qnaInlineDefaults.answerSettings?.fontOpacity ?? 1;
              
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
              const qFontFamily = questionStyle.fontFamily || qnaInlineDefaults.questionSettings?.fontFamily || fontFamily;
              const qFontColor = questionStyle.fontColor || qnaInlineDefaults.questionSettings?.fontColor || '#666666';
              const qFontBold = questionStyle.fontBold ?? qnaInlineDefaults.questionSettings?.fontBold ?? false;
              const qFontItalic = questionStyle.fontItalic ?? qnaInlineDefaults.questionSettings?.fontItalic ?? false;
              const qFontOpacity = questionStyle.fontOpacity ?? qnaInlineDefaults.questionSettings?.fontOpacity ?? 1;
              
              // Calculate question text width and handle wrapping
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
              
              // Helper function to break long words into multiple lines
              const breakWordIntoLines = (word: string, maxWidth: number, context: CanvasRenderingContext2D): string[] => {
                const lines: string[] = [];
                let currentLine = '';
                
                for (let i = 0; i < word.length; i++) {
                  const char = word[i];
                  const testLine = currentLine + char;
                  const testWidth = context.measureText(testLine).width;
                  
                  if (testWidth > maxWidth && currentLine.length > 0) {
                    // Current line is full, start a new line
                    lines.push(currentLine);
                    currentLine = char;
                  } else {
                    currentLine = testLine;
                  }
                }
                
                if (currentLine.length > 0) {
                  lines.push(currentLine);
                }
                
                return lines.length > 0 ? lines : [word]; // Fallback to original word if empty
              };
              
              const questionWords = questionText.split(' ');
              let questionLines = [];
              let currentLine = '';
              let currentLineWidth = 0;
              
              // Build question lines with word breaking support
              for (const word of questionWords) {
                const wordAloneWidth = context.measureText(word).width;
                
                // Check if word is too long and needs to be broken
                if (wordAloneWidth > textWidth) {
                  // Word is too long, break it into multiple lines
                  if (currentLine) {
                    // Save current line before breaking the word
                    questionLines.push(currentLine);
                    currentLine = '';
                    currentLineWidth = 0;
                  }
                  
                  // Break the word and add all parts as separate lines
                  const brokenWordLines = breakWordIntoLines(word, textWidth, context);
                  questionLines.push(...brokenWordLines);
                  // Reset for next word
                  currentLine = '';
                  currentLineWidth = 0;
                } else {
                  // Word fits, try to add it to current line
                  const wordWithSpace = currentLine ? ' ' + word : word;
                  const wordWidth = context.measureText(wordWithSpace).width;
                  
                  if (currentLineWidth + wordWidth <= textWidth) {
                    currentLine += wordWithSpace;
                    currentLineWidth += wordWidth;
                  } else {
                    if (currentLine) questionLines.push(currentLine);
                    currentLine = word;
                    currentLineWidth = wordAloneWidth;
                  }
                }
              }
              if (currentLine) questionLines.push(currentLine);
              
              // Render all question lines with shared baseline alignment
              // PST: Layout = Inline: Adjust Y position for question text in both combined question-answer line and question-only lines
              const number = qFontSize - aFontSize;
              questionLines.forEach((line, index) => {
                const sharedBaseline = effectivePadding + (index * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7);
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
                const aFontFamily = answerStyle.fontFamily || qnaInlineDefaults.answerSettings?.fontFamily || fontFamily;
                const aFontColor = answerStyle.fontColor || qnaInlineDefaults.answerSettings?.fontColor || '#1f2937';
                const aFontBold = answerStyle.fontBold ?? qnaInlineDefaults.answerSettings?.fontBold ?? false;
                const aFontItalic = answerStyle.fontItalic ?? qnaInlineDefaults.answerSettings?.fontItalic ?? false;
                const aFontOpacity = answerStyle.fontOpacity ?? qnaInlineDefaults.answerSettings?.fontOpacity ?? 1;
                
                context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
                
                // Helper function to break long words into multiple lines
                const breakWordIntoLines = (word: string, maxWidth: number, context: CanvasRenderingContext2D): string[] => {
                  const lines: string[] = [];
                  let currentLine = '';
                  
                  for (let i = 0; i < word.length; i++) {
                    const char = word[i];
                    const testLine = currentLine + char;
                    const testWidth = context.measureText(testLine).width;
                    
                    if (testWidth > maxWidth && currentLine.length > 0) {
                      // Current line is full, start a new line
                      lines.push(currentLine);
                      currentLine = char;
                    } else {
                      currentLine = testLine;
                    }
                  }
                  
                  if (currentLine.length > 0) {
                    lines.push(currentLine);
                  }
                  
                  return lines.length > 0 ? lines : [word]; // Fallback to original word if empty
                };
                
                // Check if there's enough space after the question to render answer on the same line
                // IMPORTANT: If the last question line is full (width >= textWidth), the answer must start on a new line
                // This ensures that even if the question contains a long word that spans multiple lines,
                // the answer will always start directly after the last question line
                const gap = 40;
                const lastQuestionLineWidth = context.measureText(lastQuestionLine).width;
                const isLastQuestionLineFull = lastQuestionLineWidth >= textWidth - 1; // Allow 1px tolerance for rounding
                const availableWidthAfterQuestion = textWidth - lastQuestionLineWidth - gap;
                let canFitOnSameLine = false;
                
                // Only check if there's positive space available AND the last question line is not full
                if (!isLastQuestionLineFull && availableWidthAfterQuestion > 0) {
                  // Get the first word of the answer to check if it fits
                  const firstAnswerLine = userText.split('\n')[0] || '';
                  const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
                  if (firstAnswerWord) {
                    const firstWordWidth = context.measureText(firstAnswerWord).width;
                    // Check if at least part of the first word fits in the available space
                    // Even if the word is longer, we can break it, so we allow it if there's any space
                    canFitOnSameLine = availableWidthAfterQuestion > 0;
                  } else {
                    // Empty answer text - can fit anywhere
                    canFitOnSameLine = true;
                  }
                }
                // If isLastQuestionLineFull is true, canFitOnSameLine remains false, 
                // ensuring answer starts on a new line after the last question line
                
                // Handle line breaks in user text first
                const userLines = userText.split('\n');
                let currentLineY = questionEndY;
                // Only treat as first line if answer can fit on same line as question
                // If canFitOnSameLine is false, we should start on a new line after the question
                let isFirstLine = canFitOnSameLine;
                let wrappedSegmentsCount = 0; // Track how many wrapped segments from first line
                // If answer doesn't fit on same line, start counting from 1 (first answer line after question)
                let totalAnswerLineCount = canFitOnSameLine ? 0 : 1;
                
                userLines.forEach((line) => {
                  if (!line.trim() && !isFirstLine) {
                    // Empty lines in answer-only section use independent answer line height
                    currentLineY += aLineHeight;
                    return;
                  }
                  
                  const words = line.split(' ');
                  let wordIndex = 0;
                  let firstLineSegmentCount = 0;
                  
                  // Safety limit to prevent infinite loops with malformed data
                  const maxWords = Math.min(words.length, 10000);
                  let outerIterationCount = 0;
                  
                  while (wordIndex < words.length && outerIterationCount < maxWords) {
                    let lineText = '';
                    let lineWidth = 0;
                    let currentX = padding;
                    let availableWidth = textWidth;
                    
                    // For first line only, start after question (if there's space)
                    if (isFirstLine && canFitOnSameLine) {
                      currentX = padding + questionTextWidth + gap;
                      availableWidth = textWidth - questionTextWidth - gap;
                    }
                    
                    // Safety check: ensure availableWidth is valid
                    if (availableWidth <= 0 || !isFinite(availableWidth)) {
                      availableWidth = Math.max(textWidth, 100); // Fallback to reasonable width
                    }
                    
                    // Build line with as many words as fit
                    let innerIterationCount = 0;
                    const maxInnerIterations = 1000;
                    while (wordIndex < words.length && innerIterationCount < maxInnerIterations) {
                      const word = words[wordIndex];
                      if (!word || word.length === 0) {
                        wordIndex++;
                        continue;
                      }
                      
                      const wordWithSpace = lineText ? ' ' + word : word;
                      const wordWidth = context.measureText(wordWithSpace).width;
                      
                      // Safety check: ensure wordWidth is valid
                      if (!isFinite(wordWidth) || wordWidth === Infinity || isNaN(wordWidth)) {
                        wordIndex++;
                        innerIterationCount++;
                        continue;
                      }
                      
                      // Check if the word fits on the current line
                      if (lineWidth + wordWidth <= availableWidth) {
                        // Word fits, add it to the line
                        lineText += wordWithSpace;
                        lineWidth += wordWidth;
                        wordIndex++;
                        innerIterationCount++;
                      } else {
                        // Word doesn't fit
                        // If we already have text on this line, break and start a new line
                        if (lineText.length > 0) {
                          break;
                        }
                        
                        // If the line is empty and the word doesn't fit even alone,
                        // we need to break the word character by character
                        const wordAloneWidth = context.measureText(word).width;
                        if (wordAloneWidth > availableWidth) {
                          // Word is too long, break it into multiple lines
                          const brokenWordLines = breakWordIntoLines(word, availableWidth, context);
                          
                          if (brokenWordLines.length > 0) {
                            // Add the first part to current line
                            lineText = brokenWordLines[0];
                            lineWidth = context.measureText(brokenWordLines[0]).width;
                            
                            // Store remaining parts to render immediately after current line
                            // This ensures consistent line spacing for all parts of the broken word
                            if (brokenWordLines.length > 1) {
                              // Store remaining parts - we'll render them after the current line
                              const remainingParts = brokenWordLines.slice(1);
                              // Remove the original word and insert remaining parts
                              words.splice(wordIndex, 1, ...remainingParts);
                              // Don't increment wordIndex, process the next part in next iteration
                            } else {
                              wordIndex++;
                            }
                            innerIterationCount++;
                            break; // Break to render current line
                          } else {
                            // Fallback: skip the word if breaking failed
                            wordIndex++;
                            innerIterationCount++;
                            break;
                          }
                        } else {
                          // Word fits alone but not with space, add it anyway
                          lineText = word;
                          lineWidth = wordAloneWidth;
                          wordIndex++;
                          innerIterationCount++;
                          break;
                        }
                      }
                    }
                    
                    // Safety: break if we're stuck
                    if (innerIterationCount >= maxInnerIterations) {
                      break;
                    }
                    
                    // Safety: prevent infinite loops
                    if (outerIterationCount >= maxWords) {
                      break;
                    }
                    outerIterationCount++;
                    
                    // Store answer line for combined alignment
                    if (lineText) {
                      if (isFirstLine && canFitOnSameLine) {
                        firstLineSegmentCount++;
                        // Only the first segment of the first line uses combined positioning
                        // Subsequent segments (wrapped parts) should use answer-only line height
                        if (firstLineSegmentCount === 1) {
                          // Calculate combined positioning for first segment
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
                          const number = qFontSize - aFontSize;
                          // console.log('q: ' + qFontSize + ' a: ' + aFontSize + ' q - a: ' + number);
                          const sharedBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7);
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
                          // Wrapped segments of first line should use answer-only line height
                          // These segments appear on separate lines without question text
                          wrappedSegmentsCount++;
                          
                          // Calculate Y position starting from the combined line's baseline
                          // The combined line's baseline is at: effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6)
                          // The wrapped segments should follow with aLineHeight spacing
                          const combinedLineBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                          const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * (aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
                          // Calculate line index: wrappedSegmentsCount - 1 (first wrapped segment is at index 0)
                          totalAnswerLineCount = wrappedSegmentsCount;
                          const answerLineIndex = totalAnswerLineCount - 1;
                          // Start from combined line baseline and add aLineHeight for each wrapped segment
                          const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
                          const answerY = answerBaseline - (aFontSize * 0.8);
                          
                          elements.push(
                            <Text
                              key={`user-line-wrapped-${wrappedSegmentsCount}-${currentX}`}
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
                      } else {
                        // Calculate consistent Y position for answer-only lines using independent answer line height
                        // Answer-only lines should be independent of question font size
                        // Start from the combined line's baseline for consistent spacing
                        const combinedLineBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                        // Calculate answer-specific baseline offset based only on answer font size
                        const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * (aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
                        // Increment total answer line count for subsequent lines
                        // If answer starts on a new line (because question filled the line), this will be the first answer line (count = 1)
                        totalAnswerLineCount++;
                        // Start from combined line baseline and add aLineHeight for each answer line
                        // When question filled the line, first answer line (count = 1) starts in next line after question
                        const answerBaseline = combinedLineBaseline + (totalAnswerLineCount * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
                        const answerY = answerBaseline - (aFontSize * 0.8);
                        
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
                    // For answer-only lines (after first line), use independent answer line height
                    if (isFirstLine && canFitOnSameLine && firstLineSegmentCount === 1) {
                      // First segment of first line is on same line as question - it's a combined line
                      currentLineY += combinedLineHeight;
                      // After first segment, wrapped parts use answer-only line height
                      isFirstLine = false;
                      // totalAnswerLineCount remains 0 here since first segment is on combined line
                    } else if (isFirstLine && canFitOnSameLine && firstLineSegmentCount > 1) {
                      // Wrapped segments of first line use answer-only line height
                      // totalAnswerLineCount is already updated in the wrapped segment rendering above
                      // Don't update currentLineY here as positioning is handled by combinedLineBaseline calculation
                      isFirstLine = false; // Mark first line as complete after first wrapped segment
                    } else {
                      // Subsequent answer-only lines (after first line is complete) use independent answer line height
                      // totalAnswerLineCount is already incremented in the rendering above
                      currentLineY += aLineHeight;
                      // If this was the first line but couldn't fit on same line, mark it as complete
                      if (isFirstLine) {
                        isFirstLine = false;
                      }
                    }
                  }
                });
              }
            } else if (userText) {
              // Only user text, no question - handle line breaks manually
              const aFontFamily = answerStyle.fontFamily || qnaInlineDefaults.answerSettings?.fontFamily || fontFamily;
              const aFontColor = answerStyle.fontColor || qnaInlineDefaults.answerSettings?.fontColor || '#1f2937';
              const aFontBold = answerStyle.fontBold ?? qnaInlineDefaults.answerSettings?.fontBold ?? false;
              const aFontItalic = answerStyle.fontItalic ?? qnaInlineDefaults.answerSettings?.fontItalic ?? false;
              const aFontOpacity = answerStyle.fontOpacity ?? qnaInlineDefaults.answerSettings?.fontOpacity ?? 1;
              
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
              
              // Helper function to break long words into multiple lines
              const breakWordIntoLines = (word: string, maxWidth: number, context: CanvasRenderingContext2D): string[] => {
                const lines: string[] = [];
                let currentLine = '';
                
                for (let i = 0; i < word.length; i++) {
                  const char = word[i];
                  const testLine = currentLine + char;
                  const testWidth = context.measureText(testLine).width;
                  
                  if (testWidth > maxWidth && currentLine.length > 0) {
                    // Current line is full, start a new line
                    lines.push(currentLine);
                    currentLine = char;
                  } else {
                    currentLine = testLine;
                  }
                }
                
                if (currentLine.length > 0) {
                  lines.push(currentLine);
                }
                
                return lines.length > 0 ? lines : [word]; // Fallback to original word if empty
              };
              
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
                    // Current word doesn't fit
                    if (currentLine) {
                      // Render the current line
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
                      currentLine = '';
                      currentLineWidth = 0;
                    }
                    
                    // Check if the word alone fits or needs to be broken
                    const wordAloneWidth = context.measureText(word).width;
                    if (wordAloneWidth > textWidth) {
                      // Word is too long, break it into multiple lines
                      const brokenWordLines = breakWordIntoLines(word, textWidth, context);
                      
                      // Render each broken part on a separate line
                      brokenWordLines.forEach((brokenPart, partIndex) => {
                        const sharedBaseline = effectivePadding + (currentLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8);
                        const answerY = sharedBaseline - (aFontSize * 0.8);
                        
                        elements.push(
                          <Text
                            key={`user-line-${currentLineIndex}-${partIndex}`}
                            x={padding}
                            y={answerY}
                            text={brokenPart}
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
                        if (partIndex < brokenWordLines.length - 1) {
                          currentLineIndex++;
                        }
                      });
                      
                      // After breaking, currentLine should be empty
                      currentLine = '';
                      currentLineWidth = 0;
                    } else {
                      // Word fits alone, add it to new line
                      currentLine = word;
                      currentLineWidth = wordAloneWidth;
                    }
                  }
                });
                
                // Render any remaining line
                if (currentLine) {
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
            // IMPORTANT: Set listening to false so it doesn't intercept events
            // Events will pass through to BaseCanvasItem Group which handles selection
            // Double-click is handled by BaseCanvasItem's onDblClick handler
            elements.push(
              <Rect
                key="overlay"
                ref={textRef}
                x={0}
                y={0}
                width={element.width}
                height={element.height}
                fill="transparent"
                listening={false}
              />
            );
            
            return elements;
          })()}
        </Group>
      </BaseCanvasItem>
      

    </>
  );
}