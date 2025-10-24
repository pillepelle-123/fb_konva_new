import React, { useRef, useState, useEffect } from 'react';
import { Text, Rect, Path, Group } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getGlobalThemeDefaults, getQnAThemeDefaults } from '../../../../utils/global-themes';
import { getRuledLinesOpacity } from '../../../../utils/ruled-lines-utils';
import { getParagraphSpacing, getPadding } from '../../../../utils/format-utils';
import { getRuledLinesTheme } from '../../../../utils/theme-utils';
import { useSharedTextRenderer } from './shared-text-renderer';
import { getFontFamilyByName, FONT_GROUPS } from '../../../../utils/font-families';
import { getToolDefaults } from '../../../../utils/tool-defaults';



export default function TextboxQnA2(props: CanvasItemProps) {
  const { element } = props;
  const { state, dispatch, getQuestionText, getAnswerText } = useEditor();
  const { user } = useAuth();
  const textRef = useRef<Konva.Text>(null);



  const [hasOverflow, setHasOverflow] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Check if user is on assigned page
  const isOnAssignedPage = state.pageAssignments[state.activePageIndex + 1]?.id === user?.id;
  const shouldHighlightAnswer = isOnAssignedPage && element.textType === 'qna2';

  const fontSize = (() => {
    let size = element.font?.fontSize || element.fontSize;
    if (!size) {
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = state.currentBook?.bookTheme;
      const elementTheme = element.theme;
      const activeTheme = pageTheme || bookTheme || elementTheme;
      if (activeTheme) {
        const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || 'text');
        size = themeDefaults?.font?.fontSize || themeDefaults?.fontSize;
      }
      if (!size) {
        const { getToolDefaults } = require('../../../utils/tool-defaults');
        const toolDefaults = getToolDefaults(element.textType || 'text', pageTheme, bookTheme);
        size = toolDefaults.fontSize;
      }
    }
    return size || 58;
  })();
  
  const getLineHeight = () => {
    const spacing = getParagraphSpacing(element);
    
    if (element.ruledLines || (element.text && element.text.includes('data-ruled="true"'))) {
      const ruledSpacingMap = {
        small: 1.8,
        medium: 2.2,
        large: 2.8
      };
      return ruledSpacingMap[spacing as keyof typeof ruledSpacingMap] || 2.2;
    }
    
    const spacingMap = {
      small: 1.0,
      medium: 1.2,
      large: 1.5
    };
    
    return element.format?.lineHeight || element.lineHeight || spacingMap[spacing as keyof typeof spacingMap] || 1.2;
  };
  
  const lineHeight = getLineHeight();
  const align = element.format?.align || element.align || 'left';
  const fontFamily = element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif';
  
  // Use shared text renderer
  const { displayText, getDisplayText } = useSharedTextRenderer({
    element,
    getQuestionText,
    getAnswerText,
    state
  });
  
  // Get styles for rendering
  const getQuestionStyle = () => {
    const qStyle = element.questionSettings || {};
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const activeTheme = pageTheme || bookTheme;
    const qnaDefaults = activeTheme ? getQnAThemeDefaults(activeTheme, 'question') : {};
    
    // Fallback to tool defaults if no settings exist
    const toolDefaults = getToolDefaults('qna2', pageTheme, bookTheme);
    const questionDefaults = toolDefaults.questionSettings || {};
    
    return {
      fontSize: qStyle.fontSize || qnaDefaults?.fontSize || questionDefaults.fontSize || fontSize * 0.9,
      fontFamily: qStyle.fontFamily || qnaDefaults?.fontFamily || questionDefaults.fontFamily || fontFamily,
      fontColor: qStyle.fontColor || qnaDefaults?.fontColor || questionDefaults.fontColor || '#666666',
      fontBold: qStyle.fontBold ?? qnaDefaults?.fontBold ?? questionDefaults.fontBold ?? false,
      fontItalic: qStyle.fontItalic ?? qnaDefaults?.fontItalic ?? questionDefaults.fontItalic ?? false
    };
  };
  
  const getAnswerStyle = () => {
    const aStyle = element.answerSettings || {};
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const activeTheme = pageTheme || bookTheme;
    const qnaDefaults = activeTheme ? getQnAThemeDefaults(activeTheme, 'answer') : {};
    
    // Fallback to tool defaults if no settings exist
    const toolDefaults = getToolDefaults('qna2', pageTheme, bookTheme);
    const answerDefaults = toolDefaults.answerSettings || {};
    
    return {
      fontSize: aStyle.fontSize || qnaDefaults?.fontSize || answerDefaults.fontSize || fontSize,
      fontFamily: aStyle.fontFamily || qnaDefaults?.fontFamily || answerDefaults.fontFamily || fontFamily,
      fontColor: aStyle.fontColor || qnaDefaults?.fontColor || answerDefaults.fontColor || '#1f2937',
      fontBold: aStyle.fontBold ?? qnaDefaults?.fontBold ?? answerDefaults.fontBold ?? false,
      fontItalic: aStyle.fontItalic ?? qnaDefaults?.fontItalic ?? answerDefaults.fontItalic ?? false
    };
  };

  // Use answer style as base for the text component
  const answerStyle = getAnswerStyle();
  const questionStyle = getQuestionStyle();

  // Get effective font styles for rendering
  const getEffectiveFontFamily = (style: any) => {
    const { fontFamily, fontBold, fontItalic } = style;
    
    // Extract font name from family string (e.g., "'Century Gothic', sans-serif" -> "Century Gothic")
    let fontName = 'Arial';
    const familyMatch = fontFamily.match(/['"]?([^'"]+)['"]?/);
    if (familyMatch) {
      const extractedName = familyMatch[1].trim();
      // Find matching font in FONT_GROUPS
      for (const group of FONT_GROUPS) {
        const font = group.fonts.find(f => f.name === extractedName);
        if (font) {
          fontName = font.name;
          break;
        }
      }
    }
    
    // Get the appropriate font variant
    return getFontFamilyByName(fontName, fontBold, fontItalic);
  };
  
  const effectiveAnswerFontFamily = getEffectiveFontFamily(answerStyle);
  const effectiveQuestionFontFamily = getEffectiveFontFamily(questionStyle);

  // Trigger save process when question is selected to apply formatting immediately
  useEffect(() => {
    if (element.questionId && (!element.text || !element.text.includes('['))) {
      const questionText = getQuestionText(element.questionId);
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      const answerText = assignedUser ? getAnswerText(element.questionId, assignedUser.id) : '';
      
      if (questionText) {
        // Mimic the editor save process
        const fullText = `[${questionText}]${answerText ? ' ' + answerText : ''}`;
        let answerTextForStorage = answerText || '';
        
        // Store answer in temp answers if questionId exists
        if (assignedUser) {
          const answerId = element.answerId || uuidv4();
          dispatch({
            type: 'UPDATE_TEMP_ANSWER',
            payload: {
              questionId: element.questionId,
              text: answerTextForStorage,
              userId: assignedUser.id,
              answerId
            }
          });
          
          // Update element with the formatted text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { 
                answerId: element.answerId || answerId,
                text: fullText 
              }
            }
          });
        } else {
          // No assigned user, just update element text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { text: fullText }
            }
          });
        }
      }
    }
  }, [element.questionId, element.text, state.tempAnswers, state.pageAssignments]);
  
  // Handle transformations
  useEffect(() => {
    const handleTransform = () => {
      setIsTransforming(true);
    };
    
    const handleTransformEnd = () => {
      setIsTransforming(false);
    };
    
    const mainGroup = textRef.current?.getParent()?.getParent();
    if (mainGroup) {
      mainGroup.on('transform', handleTransform);
      mainGroup.on('transformend', handleTransformEnd);
      
      return () => {
        mainGroup.off('transform', handleTransform);
        mainGroup.off('transformend', handleTransformEnd);
      };
    }
  }, []);
  


  const handleDoubleClick = (e?: any) => {
    if (state.activeTool !== 'select') return;
    
    // For answer_only users, check if they can edit
    if (state.editorInteractionLevel === 'answer_only') {
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      if (!assignedUser || assignedUser.id !== user?.id) {
        window.dispatchEvent(new CustomEvent('showAlert', {
          detail: { 
            message: 'Only the person assigned to this page can edit text.',
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height
          }
        }));
        return;
      }
    }
    
    // Use inline editing instead of context menu
    enableInlineEditing();
  };

  const showQnA2ContextMenu = (e?: any) => {
    if (!e?.target) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    // Create context menu
    const menu = document.createElement('div');
    menu.style.cssText = `
      position: fixed;
      top: ${pointerPos.y}px;
      left: ${pointerPos.x}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      min-width: 160px;
      padding: 4px 0;
    `;
    
    // Remove menu function
    const removeMenu = (event?: MouseEvent) => {
      if (event && menu.contains(event.target as Node)) return;
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', removeMenu);
      }
    };
    
    const createMenuItem = (text: string, onClick: () => void) => {
      const item = document.createElement('div');
      item.textContent = text;
      item.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        color: #374151;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      `;
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f3f4f6';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
      item.addEventListener('click', () => {
        onClick();
        removeMenu();
      });
      return item;
    };
    
    // Add menu items
    if (!element.questionId) {
      menu.appendChild(createMenuItem('Add Question', () => {
        if (state.userRole === 'author') return;
        window.dispatchEvent(new CustomEvent('openQuestionModal', {
          detail: { elementId: element.id }
        }));
      }));
    } else {
      menu.appendChild(createMenuItem('Change Question', () => {
        if (state.userRole === 'author') return;
        window.dispatchEvent(new CustomEvent('openQuestionModal', {
          detail: { elementId: element.id }
        }));
      }));
      menu.appendChild(createMenuItem('Reset Question', () => {
        // Clear answer from temp answers if questionId exists
        if (element.questionId) {
          const assignedUser = state.pageAssignments[state.activePageIndex + 1];
          if (assignedUser) {
            dispatch({
              type: 'UPDATE_TEMP_ANSWER',
              payload: {
                questionId: element.questionId,
                text: '',
                userId: assignedUser.id,
                answerId: element.answerId || uuidv4()
              }
            });
          }
        }
        
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: element.id,
            updates: { questionId: undefined, text: '' }
          }
        });
      }));
    }
    
    menu.appendChild(createMenuItem('Edit Text', () => {
      // Check if user can edit
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      if (state.editorInteractionLevel === 'answer_only' && (!assignedUser || assignedUser.id !== user?.id)) {
        window.dispatchEvent(new CustomEvent('showAlert', {
          detail: { 
            message: 'Only the person assigned to this page can edit text.',
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height
          }
        }));
        return;
      }
      
      enableInlineEditing();
    }));
    
    document.body.appendChild(menu);
    
    // Add click listener to remove menu
    setTimeout(() => {
      document.addEventListener('click', removeMenu);
    }, 100);
  };

  const enableInlineEditing = () => {
    if (!textRef.current) return;
    
    const textNode = textRef.current;
    const stage = textNode.getStage();
    if (!stage) return;
    
    textNode.hide();
    
    const textarea = document.createElement('textarea');
    const toolbar = document.createElement('div');
    
    document.body.appendChild(textarea);
    document.body.appendChild(toolbar);
    
    const transform = textNode.getAbsoluteTransform();
    const pos = transform.point({ x: element.padding || 4, y: element.padding || 4 });
    const stageBox = stage.container().getBoundingClientRect();
    const scale = transform.m[0];
    
    const areaPosition = {
      x: stageBox.left + pos.x,
      y: stageBox.top + pos.y
    };
    
    // Set textarea content - get answer text from temp answers and show question in brackets
    let editorText = '';
    
    if (element.questionId) {
      const questionText = getQuestionText(element.questionId);
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      const answerText = assignedUser ? getAnswerText(element.questionId, assignedUser.id) : '';
      
      // Use stored answer text from temp answers, not element.text
      editorText = answerText || '';
      
      if (questionText) {
        const questionPlaceholder = `[${questionText}]`;
        if (!editorText.includes(questionPlaceholder) && !editorText.includes('[question]')) {
          // Add bracketed question if not present
          editorText = questionPlaceholder + ' ' + editorText;
        } else if (editorText.includes('[question]')) {
          // Replace generic placeholder with actual question
          editorText = editorText.replace('[question]', questionPlaceholder);
        }
      } else {
        // No question text available, use generic placeholder
        if (!editorText.includes('[question]')) {
          editorText = '[question] ' + editorText;
        }
      }
    } else {
      // No question assigned, show only generic placeholder (ignore element.text completely)
      editorText = '[question] ';
    }
    
    textarea.value = editorText;
    textarea.style.position = 'absolute';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';
    textarea.style.width = ((element.width - (element.padding || 4) * 2) * scale) + 'px';
    textarea.style.height = ((element.height - (element.padding || 4) * 2) * scale) + 'px';
    // Apply answer style as base, question style will be handled via CSS
    textarea.style.fontSize = ((answerStyle.fontSize) * scale) + 'px';
    textarea.style.fontFamily = effectiveAnswerFontFamily;
    textarea.style.color = answerStyle.fontColor;
    textarea.style.fontWeight = answerStyle.fontBold ? 'bold' : 'normal';
    textarea.style.fontStyle = answerStyle.fontItalic ? 'italic' : 'normal';
    textarea.style.background = 'transparent';
    textarea.style.border = '1px solid #ccc';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = lineHeight.toString();
    textarea.style.padding = '4px';
    textarea.style.borderRadius = '4px';
    textarea.placeholder = 'Type your answer here. Use [question] to insert the question.';
    
    // Add custom CSS for question text styling
    const styleId = 'qna2-editor-style';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // Create CSS to style bracketed text (question) differently
    const questionFontSize = (questionStyle.fontSize * scale) + 'px';
    const questionColor = questionStyle.fontColor;
    const questionFontWeight = questionStyle.fontBold ? 'bold' : 'normal';
    const questionFontStyle = questionStyle.fontItalic ? 'italic' : 'normal';
    
    styleElement.textContent = `
      .qna2-textarea {
        background: linear-gradient(transparent, transparent);
      }
    `;
    
    textarea.className = 'qna2-textarea';
    
    // Create toolbar
    const addQuestionBtn = document.createElement('button');
    const resetQuestionBtn = document.createElement('button');
    
    addQuestionBtn.textContent = element.questionId ? 'Change Question' : 'Add Question';
    addQuestionBtn.style.cssText = 'padding:6px 8px;background:#C79D0B;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;margin-right:4px';
    
    resetQuestionBtn.textContent = 'Reset Question';
    resetQuestionBtn.style.cssText = 'padding:6px 8px;color:#0f172a;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:12px';
    resetQuestionBtn.style.display = element.questionId ? 'inline-block' : 'none';
    
    toolbar.appendChild(addQuestionBtn);
    toolbar.appendChild(resetQuestionBtn);
    toolbar.style.cssText = `position:absolute;top:${areaPosition.y - 35}px;left:${areaPosition.x}px;background:white;border:1px solid #ccc;border-radius:4px;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:10000`;
    
    let showQuestionDialog = false;
    
    addQuestionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showQuestionDialog = true;
      // Hide toolbar when opening question dialog
      toolbar.style.display = 'none';
      window.dispatchEvent(new CustomEvent('openQuestionModal', {
        detail: { elementId: element.id }
      }));
    });
    
    resetQuestionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Clear answer from temp answers if questionId exists
      if (element.questionId) {
        const assignedUser = state.pageAssignments[state.activePageIndex + 1];
        if (assignedUser) {
          dispatch({
            type: 'UPDATE_TEMP_ANSWER',
            payload: {
              questionId: element.questionId,
              text: '',
              userId: assignedUser.id,
              answerId: element.answerId || uuidv4()
            }
          });
        }
      }
      
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: element.id,
          updates: { questionId: undefined, text: '' }
        }
      });
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 10);
      document.removeEventListener('click', handleClickOutside);
      removeElements();
    });
    
    textarea.focus();
    // Position cursor after [question] placeholder with space
    const questionMatch = textarea.value.match(/\[[^\]]+\]/);
    if (questionMatch) {
      const cursorPos = questionMatch.index! + questionMatch[0].length + 1; // +1 for space
      textarea.setSelectionRange(cursorPos, cursorPos);
    } else {
      textarea.select();
    }
    
    const removeElements = () => {
      document.body.removeChild(textarea);
      document.body.removeChild(toolbar);
      textNode.show();
      stage.draw();
      
      // Clean up custom styles
      const styleElement = document.getElementById('qna2-editor-style');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
    
    // Handle click outside to close editor
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!textarea.contains(target) && !toolbar.contains(target)) {
        // Extract answer text with [question] placeholder for storage
        const fullText = textarea.value;
        let answerText = fullText;
        
        // Replace actual question text with [question] placeholder for storage
        if (element.questionId) {
          const questionText = getQuestionText(element.questionId);
          if (questionText) {
            const questionPlaceholder = `[${questionText}]`;
            answerText = fullText.replace(questionPlaceholder, '[question]');
          }
        }
        
        // Store answer in temp answers if questionId exists
        if (element.questionId) {
          const assignedUser = state.pageAssignments[state.activePageIndex + 1];
          if (assignedUser) {
            const answerId = element.answerId || uuidv4();
            dispatch({
              type: 'UPDATE_TEMP_ANSWER',
              payload: {
                questionId: element.questionId,
                text: answerText,
                userId: assignedUser.id,
                answerId
              }
            });
            
            // Update element with answerId if missing
            if (!element.answerId) {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: { answerId, text: fullText }
                }
              });
            } else {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: { text: fullText }
                }
              });
            }
            
            window.dispatchEvent(new CustomEvent('answerSaved'));
          }
        } else {
          // No questionId, just update element text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { text: fullText }
            }
          });
        }
        
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);
        }, 10);
        removeElements();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    
    // Add click outside listener after a short delay to prevent immediate closure
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    const handleKeydown = (e: KeyboardEvent) => {
      // Prevent typing if no question is attached
      if (!element.questionId && e.key.length === 1) {
        e.preventDefault();
        // Show warning message
        const warningDiv = document.createElement('div');
        warningDiv.textContent = 'You need to select a question first';
        warningDiv.style.cssText = `
          position: absolute;
          top: ${areaPosition.y + 30}px;
          left: ${areaPosition.x}px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 12px;
          z-index: 10001;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(warningDiv);
        setTimeout(() => {
          if (document.body.contains(warningDiv)) {
            document.body.removeChild(warningDiv);
          }
        }, 2000);
        return;
      }
      
      if (e.key === 'Escape') {
        removeElements();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Extract answer text with [question] placeholder for storage
        const fullText = textarea.value;
        let answerText = fullText;
        
        // Replace actual question text with [question] placeholder for storage
        if (element.questionId) {
          const questionText = getQuestionText(element.questionId);
          if (questionText) {
            const questionPlaceholder = `[${questionText}]`;
            answerText = fullText.replace(questionPlaceholder, '[question]');
          }
        }
        
        // Store answer in temp answers if questionId exists
        if (element.questionId) {
          const assignedUser = state.pageAssignments[state.activePageIndex + 1];
          if (assignedUser) {
            const answerId = element.answerId || uuidv4();
            dispatch({
              type: 'UPDATE_TEMP_ANSWER',
              payload: {
                questionId: element.questionId,
                text: answerText,
                userId: assignedUser.id,
                answerId
              }
            });
            
            // Update element with answerId if missing
            if (!element.answerId) {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: { answerId, text: fullText }
                }
              });
            } else {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: { text: fullText }
                }
              });
            }
            
            window.dispatchEvent(new CustomEvent('answerSaved'));
          }
        } else {
          // No questionId, just update element text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { text: fullText }
            }
          });
        }
        
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);
        }, 10);
        document.removeEventListener('click', handleClickOutside);
        removeElements();
      }
      
      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      const bracketMatches = text.match(/\[[^\]]+\]/g) || [];
      
      // Check if cursor is inside bracketed content
      for (const match of bracketMatches) {
        const matchStart = text.indexOf(match);
        const matchEnd = matchStart + match.length;
        
        if (cursorPos > matchStart && cursorPos < matchEnd) {
          // Cursor is inside brackets - prevent most key inputs
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && 
              e.key !== 'Home' && e.key !== 'End' && e.key !== 'Tab' && !e.ctrlKey && !e.metaKey && e.key !== 'Escape') {
            e.preventDefault();
            return;
          }
        }
      }
      
      // Prevent deletion of question placeholder (both [question] and actual question text in brackets)
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
        
        // Check if selection includes any bracketed content
        if (selectedText && bracketMatches.some(match => selectedText.includes(match))) {
          e.preventDefault();
          return;
        }
        
        // Check if cursor is about to delete bracketed content
        for (const match of bracketMatches) {
          const matchStart = text.indexOf(match);
          const matchEnd = matchStart + match.length;
          
          if (e.key === 'Backspace' && cursorPos > matchStart && cursorPos <= matchEnd) {
            e.preventDefault();
            return;
          }
          if (e.key === 'Delete' && cursorPos >= matchStart && cursorPos < matchEnd) {
            e.preventDefault();
            return;
          }
        }
      }
    };
    
    textarea.addEventListener('keydown', handleKeydown);
    
    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (!showQuestionDialog && !toolbar.contains(document.activeElement)) {
          // Extract answer text with [question] placeholder for storage
          const fullText = textarea.value;
          let answerText = fullText;
          
          // Replace actual question text with [question] placeholder for storage
          if (element.questionId) {
            const questionText = getQuestionText(element.questionId);
            if (questionText) {
              const questionPlaceholder = `[${questionText}]`;
              answerText = fullText.replace(questionPlaceholder, '[question]');
            }
          }
          
          // Store answer in temp answers if questionId exists
          if (element.questionId) {
            const assignedUser = state.pageAssignments[state.activePageIndex + 1];
            if (assignedUser) {
              const answerId = element.answerId || uuidv4();
              dispatch({
                type: 'UPDATE_TEMP_ANSWER',
                payload: {
                  questionId: element.questionId,
                  text: answerText,
                  userId: assignedUser.id,
                  answerId
                }
              });
              
              // Update element with answerId if missing
              if (!element.answerId) {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: { answerId, text: fullText }
                  }
                });
              } else {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: { text: fullText }
                  }
                });
              }
              
              window.dispatchEvent(new CustomEvent('answerSaved'));
            }
          } else {
            // No questionId, just update element text
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: { text: fullText }
              }
            });
          }
          
          setTimeout(() => {
            setForceUpdate(prev => prev + 1);
          }, 10);
          document.removeEventListener('click', handleClickOutside);
          removeElements();
        }
      }, 100);
    });
  };

  return (
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick}>
      <Group>
        {/* Background */}
        <Rect
          width={element.width}
          height={element.height}
          fill={element.background?.backgroundColor || 'transparent'}
          stroke={element.border?.borderColor || 'transparent'}
          strokeWidth={element.border?.borderWidth || 0}
          cornerRadius={element.cornerRadius || 0}
        />
        
        {/* Text content */}
        <Text
          ref={textRef}
          x={element.padding || 4}
          y={element.padding || 4}
          width={element.width - (element.padding || 4) * 2}
          text={displayText}
          fontSize={answerStyle.fontSize}
          fontFamily={effectiveAnswerFontFamily}
          fontStyle={`${answerStyle.fontBold ? 'bold' : ''} ${answerStyle.fontItalic ? 'italic' : ''}`.trim() || 'normal'}
          fill={answerStyle.fontColor}
          align={align}
          verticalAlign="top"
          wrap="word"
          lineHeight={lineHeight}
          listening={false}
        />
        
        {/* Overflow indicator */}
        {hasOverflow && (
          <Rect
            x={element.width - 20}
            y={element.height - 20}
            width={15}
            height={15}
            fill="#ef4444"
            cornerRadius={2}
            listening={false}
          />
        )}
      </Group>
      

    </BaseCanvasItem>
  );
}