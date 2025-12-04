import { useMemo, useRef, useEffect } from 'react';
import { Shape, Rect } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import type { CanvasElement } from '../../../../context/editor-context';
import type Konva from 'konva';

type ParagraphSpacing = 'small' | 'medium' | 'large';

interface RichTextStyle {
  fontSize: number;
  fontFamily: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor: string;
  fontOpacity?: number;
  paragraphSpacing?: ParagraphSpacing;
}

interface TextRun {
  text: string;
  x: number;
  y: number;
  style: RichTextStyle;
}

interface LayoutResult {
  runs: TextRun[];
  contentHeight: number;
}

type QnaSettings = {
  fontSize?: number;
  fontFamily?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor?: string;
  fontOpacity?: number;
  paragraphSpacing?: ParagraphSpacing;
};

interface QnaCanvasElement extends CanvasElement {
  questionSettings?: QnaSettings;
  answerSettings?: QnaSettings;
  qnaIndividualSettings?: boolean;
  backgroundEnabled?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  borderEnabled?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderOpacity?: number;
  cornerRadius?: number;
}

type TempAnswerEntry = {
  text?: string;
};

type QuillDelta = {
  insert: (text: string) => QuillDelta;
};

type QuillDeltaConstructor = {
  new (): QuillDelta;
};

type QuillInstance = {
  root: HTMLElement;
  clipboard: {
    addMatcher: (selector: number | string, matcher: (node: Node, delta: unknown) => QuillDelta) => void;
  };
  setText: (text: string) => void;
  getText: () => string;
  disable: () => void;
  enable: () => void;
  focus: () => void;
};

type QuillConstructor = {
  new (container: HTMLElement, options: { theme: string }): QuillInstance;
  import: (moduleName: string) => QuillDeltaConstructor;
};

type QuillModalElement = HTMLDivElement & {
  __closeQuillEditorHandler?: EventListener;
  __openQuestionDialogHandler?: EventListener;
};

type ExtendedWindow = Window &
  typeof globalThis &
  Record<string, unknown> & {
    Quill?: QuillConstructor;
  };

const LINE_HEIGHT: Record<ParagraphSpacing, number> = {
  small: 1,
  medium: 1.2,
  large: 1.5
};

function buildFont(style: RichTextStyle) {
  const weight = style.fontBold ? 'bold ' : '';
  const italic = style.fontItalic ? 'italic ' : '';
  return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
}

function getLineHeight(style: RichTextStyle) {
  const spacing = style.paragraphSpacing || 'medium';
  return style.fontSize * (LINE_HEIGHT[spacing] ?? 1.2);
}

function stripHtml(text: string) {
  if (!text) return '';
  if (typeof document === 'undefined') {
    return text.replace(/<[^>]+>/g, '');
  }
  const temp = document.createElement('div');
  temp.innerHTML = text;
  return temp.textContent || temp.innerText || '';
}

function parseQuestionPayload(payload: string | undefined | null) {
  if (!payload) return '';
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && parsed.text) {
      return parsed.text as string;
    }
  } catch {
    // ignore
  }
  return payload;
}

function measureText(text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null) {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function wrapText(text: string, style: RichTextStyle, maxWidth: number, ctx: CanvasRenderingContext2D | null) {
  const lines: { text: string; width: number }[] = [];
  if (!text) return lines;
  const paragraphs = text.split('\n');
  paragraphs.forEach((paragraph, paragraphIdx) => {
    const words = paragraph.split(' ').filter(Boolean);
    if (words.length === 0) {
      lines.push({ text: '', width: 0 });
    } else {
      let currentLine = words[0];
      for (let i = 1; i < words.length; i += 1) {
        const word = words[i];
        const testLine = `${currentLine} ${word}`;
        const testWidth = measureText(testLine, style, ctx);
        if (testWidth > maxWidth && currentLine) {
          lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
    }
    if (paragraphIdx < paragraphs.length - 1) {
      lines.push({ text: '', width: 0 });
    }
  });
  return lines;
}

function createLayout(params: {
  questionText: string;
  answerText: string;
  questionStyle: RichTextStyle;
  answerStyle: RichTextStyle;
  width: number;
  height: number;
  padding: number;
  ctx: CanvasRenderingContext2D | null;
}): LayoutResult {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx } = params;
  const availableWidth = Math.max(10, width - padding * 2);
  const runs: TextRun[] = [];
  let cursorY = padding;

  const questionLines = wrapText(questionText, questionStyle, availableWidth, ctx);
  const questionLineHeight = getLineHeight(questionStyle);

  questionLines.forEach((line) => {
    if (line.text) {
      runs.push({
        text: line.text,
        x: padding,
        y: cursorY,
        style: questionStyle
      });
    }
    cursorY += questionLineHeight;
  });

  const lastQuestionLineWidth = questionLines.length ? questionLines[questionLines.length - 1].width : 0;
  const lastQuestionLineY = questionLines.length ? cursorY - questionLineHeight : padding;

  const answerLines = wrapText(answerText, answerStyle, availableWidth, ctx);
  const answerLineHeight = getLineHeight(answerStyle);
  const inlineGap = Math.min(32, answerStyle.fontSize * 0.5);
  let contentHeight = cursorY;

  let startAtSameLine = false;
  let remainingAnswerLines = answerLines;

  if (questionLines.length > 0 && answerLines.length > 0) {
    const inlineAvailable = availableWidth - lastQuestionLineWidth - inlineGap;
    
    // Check if question line is full (with tolerance for rounding errors)
    const isQuestionLineFull = lastQuestionLineWidth >= availableWidth - 2; // 2px tolerance
    
    // Only try to place answer on same line if question line is NOT full and there's minimum space
    if (!isQuestionLineFull && inlineAvailable > 5) {
      // Get words from first answer line and try to fit them into inlineAvailable
      const firstAnswerLineText = answerLines[0].text;
      const words = firstAnswerLineText.split(' ').filter(Boolean);
      
      if (words.length > 0) {
        const wordsThatFit: string[] = [];
        
        for (const word of words) {
          const wordWidth = measureText(word, answerStyle, ctx);
          const testLine = wordsThatFit.length > 0 ? `${wordsThatFit.join(' ')} ${word}` : word;
          const testWidth = measureText(testLine, answerStyle, ctx);
          
          // Check if word fits (either alone or with previous words)
          if (testWidth <= inlineAvailable) {
            wordsThatFit.push(word);
          } else {
            // Word doesn't fit in inlineAvailable
            // IMPORTANT: Only break word if it's too long for a FULL line (availableWidth)
            // If word fits in a full line but not in inlineAvailable, move entire word to next line
            if (wordsThatFit.length === 0) {
              // This is the first word - check if we should break it or move it
              if (wordWidth > availableWidth) {
                // Word is too long for even a full line - need to break it character by character
                // Break using availableWidth (full line width), not inlineAvailable
                let charLine = '';
                for (let i = 0; i < word.length; i++) {
                  const testChar = charLine + word[i];
                  const charWidth = measureText(testChar, answerStyle, ctx);
                  if (charWidth <= availableWidth) {
                    charLine = testChar;
                  } else {
                    break;
                  }
                }
                if (charLine.length > 0) {
                  // Only place broken part on same line if it fits in inlineAvailable
                  const charLineWidth = measureText(charLine, answerStyle, ctx);
                  if (charLineWidth <= inlineAvailable) {
                    wordsThatFit.push(charLine);
                    // Remaining part goes to next line
                    const remainingPart = word.substring(charLine.length);
                    if (remainingPart.length > 0) {
                      const remainingText = remainingPart + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
                      const remainingLine = {
                        text: remainingText,
                        width: measureText(remainingText, answerStyle, ctx)
                      };
                      remainingAnswerLines = [remainingLine, ...answerLines.slice(1)];
                    } else {
                      if (words.length > 1) {
                        const remainingText = words.slice(1).join(' ');
                        const remainingLine = {
                          text: remainingText,
                          width: measureText(remainingText, answerStyle, ctx)
                        };
                        remainingAnswerLines = [remainingLine, ...answerLines.slice(1)];
                      } else {
                        remainingAnswerLines = answerLines.slice(1);
                      }
                    }
                  } else {
                    // Broken part doesn't fit in inlineAvailable - move entire word to next line
                    // Don't break it, just move the whole word
                    break;
                  }
                } else {
                  // Can't even fit first character in full line - move entire word to next line
                  break;
                }
              } else {
                // Word fits in a full line but not in inlineAvailable
                // Move entire word (and all remaining words) to next line - don't break it
                break;
              }
            } else {
              // We already have some words that fit - remaining words go to next line
              const remainingWords = words.slice(wordsThatFit.length);
              const remainingText = remainingWords.join(' ');
              const remainingLine = {
                text: remainingText,
                width: measureText(remainingText, answerStyle, ctx)
              };
              remainingAnswerLines = [remainingLine, ...answerLines.slice(1)];
              break;
            }
          }
        }
        
        // If we have words that fit, place them on the same line
        if (wordsThatFit.length > 0) {
          const firstAnswerTextOnSameLine = wordsThatFit.join(' ');
          startAtSameLine = true;
          
          runs.push({
            text: firstAnswerTextOnSameLine,
            x: padding + lastQuestionLineWidth + inlineGap,
            y: lastQuestionLineY,
            style: answerStyle
          });
          
          // If we used all words from first line, remove it from remaining lines
          if (wordsThatFit.length === words.length && !remainingAnswerLines.some(line => line.text === firstAnswerLineText)) {
            remainingAnswerLines = answerLines.slice(1);
          }
          // Otherwise, remainingAnswerLines was already set correctly in the loop above
        } else {
          // No words fit - ensure we don't skip a line
          // Keep the original first answer line intact for next line
          // This ensures the first answer line appears on the next line, not skipped
          remainingAnswerLines = answerLines;
        }
      }
    }
  }

  let answerCursorY = startAtSameLine ? cursorY : cursorY + (questionLines.length ? answerLineHeight * 0.2 : 0);

  remainingAnswerLines.forEach((line) => {
    if (line.text) {
      runs.push({
        text: line.text,
        x: padding,
        y: answerCursorY,
        style: answerStyle
      });
    }
    answerCursorY += answerLineHeight;
  });

  contentHeight = Math.max(contentHeight, answerCursorY, height);

  return {
    runs,
    contentHeight
  };
}

const RichTextShape = ({
  runs,
  width,
  height
}: {
  runs: TextRun[];
  width: number;
  height: number;
}) => {
  return (
    <Shape
      listening={false}
      width={width}
      height={height}
      sceneFunc={(ctx, shape) => {
        ctx.save();
        ctx.textBaseline = 'top';
        runs.forEach((run) => {
          ctx.font = buildFont(run.style);
          ctx.fillStyle = run.style.fontColor;
          ctx.globalAlpha = run.style.fontOpacity ?? 1;
          ctx.fillText(run.text, run.x, run.y);
        });
        ctx.restore();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
};

export default function TextboxQna(props: CanvasItemProps) {
  const { element } = props;
  const qnaElement = element as QnaCanvasElement;
  const { state, dispatch } = useEditor();
  const { user } = useAuth();
  const textRef = useRef<Konva.Rect>(null);
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
  const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;

  const qnaDefaults = useMemo(() => {
    return getToolDefaults(
      'qna_inline',
      pageTheme,
      bookTheme,
      element,
      state.toolSettings,
      pageLayoutTemplateId,
      bookLayoutTemplateId,
      pageColorPaletteId,
      bookColorPaletteId
    );
  }, [
    bookLayoutTemplateId,
    bookTheme,
    bookColorPaletteId,
    element,
    pageLayoutTemplateId,
    pageTheme,
    pageColorPaletteId,
    state.toolSettings
  ]);

  const questionStyle = useMemo(() => {
    const style = {
      fontSize: qnaDefaults.questionSettings?.fontSize || qnaElement.questionSettings?.fontSize || qnaDefaults.fontSize || 42,
      fontFamily: qnaElement.questionSettings?.fontFamily || qnaDefaults.questionSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.questionSettings?.fontBold ?? qnaDefaults.questionSettings?.fontBold ?? false,
      fontItalic: qnaElement.questionSettings?.fontItalic ?? qnaDefaults.questionSettings?.fontItalic ?? false,
      fontColor: qnaElement.questionSettings?.fontColor || qnaDefaults.questionSettings?.fontColor || '#666666',
      fontOpacity: qnaElement.questionSettings?.fontOpacity ?? qnaDefaults.questionSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.questionSettings?.paragraphSpacing || qnaDefaults.questionSettings?.paragraphSpacing || element.paragraphSpacing || 'small'
    } as RichTextStyle;
    return style;
  }, [element.paragraphSpacing, qnaDefaults, qnaElement.questionSettings]);

  const answerStyle = useMemo(() => {
    const style = {
      fontSize: qnaElement.answerSettings?.fontSize || qnaDefaults.answerSettings?.fontSize || qnaDefaults.fontSize || 48,
      fontFamily: qnaElement.answerSettings?.fontFamily || qnaDefaults.answerSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.answerSettings?.fontBold ?? qnaDefaults.answerSettings?.fontBold ?? false,
      fontItalic: qnaElement.answerSettings?.fontItalic ?? qnaDefaults.answerSettings?.fontItalic ?? false,
      fontColor: qnaElement.answerSettings?.fontColor || qnaDefaults.answerSettings?.fontColor || '#1f2937',
      fontOpacity: qnaElement.answerSettings?.fontOpacity ?? qnaDefaults.answerSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.answerSettings?.paragraphSpacing || qnaDefaults.answerSettings?.paragraphSpacing || element.paragraphSpacing || 'medium'
    } as RichTextStyle;
    return style;
  }, [element.paragraphSpacing, qnaDefaults, qnaElement.answerSettings]);

  const individualSettings = qnaElement.qnaIndividualSettings ?? false;
  const effectiveQuestionStyle = useMemo(
    () => (individualSettings ? questionStyle : { ...questionStyle, ...answerStyle }),
    [individualSettings, questionStyle, answerStyle]
  );

  const padding = element.padding ?? qnaDefaults.padding ?? 8;

  const questionText = useMemo(() => {
    if (!element.questionId) {
      return 'Doppelklick, um eine Frage zu wählen...';
    }
    const questionData = state.tempQuestions[element.questionId];
    if (!questionData) {
      return 'Frage wird geladen...';
    }
    return parseQuestionPayload(questionData);
  }, [element.questionId, state.tempQuestions]);

  const assignedUser = useMemo(() => state.pageAssignments[state.activePageIndex + 1], [state.activePageIndex, state.pageAssignments]);

  const answerText = useMemo(() => {
    if (element.formattedText) {
      return stripHtml(element.formattedText);
    }
    if (element.text) {
      return element.text;
    }
    if (!element.questionId) {
      return '';
    }
    if (assignedUser) {
      const answerEntry = state.tempAnswers[element.questionId]?.[assignedUser.id] as TempAnswerEntry | undefined;
      return answerEntry?.text || '';
    }
    if (user?.id) {
      const answerEntry = state.tempAnswers[element.questionId]?.[user.id] as TempAnswerEntry | undefined;
      return answerEntry?.text || '';
    }
    return '';
  }, [assignedUser, element.formattedText, element.questionId, element.text, state.tempAnswers, user?.id]);

  const sanitizedAnswer = answerText ? stripHtml(answerText) : '';
  const answerContent = sanitizedAnswer || 'Antwort hinzufügen...';

  const preparedQuestionText = questionText ? stripHtml(questionText) : questionText;

  const getQuestionText = () => preparedQuestionText || '';

  const layout = useMemo(() => {
    const canvasContext = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    return createLayout({
      questionText: preparedQuestionText,
      answerText: answerContent,
      questionStyle: effectiveQuestionStyle,
      answerStyle,
      width: element.width,
      height: element.height,
      padding,
      ctx: canvasContext
    });
  }, [answerContent, answerStyle, effectiveQuestionStyle, element.height, element.width, padding, preparedQuestionText]);

  const showBackground = qnaElement.backgroundEnabled && qnaElement.backgroundColor;
  const showBorder = qnaElement.borderEnabled && qnaElement.borderColor && qnaElement.borderWidth !== undefined;

  useEffect(() => {
    const globalWindow = window as ExtendedWindow;
    globalWindow[`openQuestionSelector_${element.id}`] = () => {
      globalWindow.dispatchEvent(new CustomEvent('openQuestionDialog', {
        detail: { elementId: element.id }
      }));
    };
    return () => {
      delete globalWindow[`openQuestionSelector_${element.id}`];
    };
  }, [element.id]);

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false) return;
    if (state.activeTool !== 'select') return;
    if (e?.evt && e.evt.button !== 0) return;
    enableQuillEditing();
  };

  const enableQuillEditing = () => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    const stageInstance: Konva.Stage = stage;

    const globalWindow = window as ExtendedWindow;

    if (!globalWindow.Quill) {
      const quillCSS = document.createElement('link');
      quillCSS.rel = 'stylesheet';
      quillCSS.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(quillCSS);

      const quillJS = document.createElement('script');
      quillJS.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
      document.head.appendChild(quillJS);

      quillJS.onload = () => initQuillForQnA();
      return;
    } else {
      initQuillForQnA();
    }

    function initQuillForQnA() {
      const modal = document.createElement('div') as QuillModalElement;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255, 255, 255, 0.5);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';

      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:80vw;max-width:800px;min-width:400px;box-shadow:0 3px 6px rgba(0,0,0,0.1)';

      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:16px;padding-bottom:12px';
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Frage Antwort</h2>';

      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:4px';

      const questionTextEl = document.createElement('div');
      const hasExistingQuestion = element.questionId;
      questionTextEl.textContent = hasExistingQuestion ? getQuestionText() : 'No question selected';
      questionTextEl.style.cssText = 'font-size:0.875rem;color:#374151;font-weight:500;flex:1';

      const toolbarButtonContainer = document.createElement('div');
      toolbarButtonContainer.style.cssText = 'display:flex;gap:8px;align-items:center';

      const insertQuestionBtn = document.createElement('button');
      insertQuestionBtn.textContent = hasExistingQuestion ? 'Change Question' : 'Insert Question';
      insertQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem';
      insertQuestionBtn.onmouseover = () => insertQuestionBtn.style.background = '#f1f5f9';
      insertQuestionBtn.onmouseout = () => insertQuestionBtn.style.background = 'white';
      insertQuestionBtn.onclick = () => {
        globalWindow.dispatchEvent(new CustomEvent('closeQuillEditor'));
        setTimeout(() => {
          const directFn = globalWindow[`openQuestionSelector_${element.id}`];
          if (typeof directFn === 'function') {
            (directFn as () => void)();
          } else {
            globalWindow.dispatchEvent(new CustomEvent('openQuestionDialog', {
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

      toolbar.appendChild(questionTextEl);
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
        stageInstance.draw();
      };

      const handleCloseQuillEditor = () => {
        closeModal();
      };
      window.addEventListener('closeQuillEditor', handleCloseQuillEditor);
      modal.__closeQuillEditorHandler = handleCloseQuillEditor;

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
        const quillConstructor = globalWindow.Quill;
        if (!quillConstructor) {
          return;
        }
        const quill = new quillConstructor(editorContainer, {
          theme: 'snow'
        });

        const styleEl = document.createElement('style');
        styleEl.textContent = `
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
        document.head.appendChild(styleEl);

        const assignedUser = state.pageAssignments[state.activePageIndex + 1];
        let contentToLoad = '';

        if (element.questionId && assignedUser) {
          const answerEntry = state.tempAnswers[element.questionId]?.[assignedUser.id] as TempAnswerEntry | undefined;
          contentToLoad = answerEntry?.text || element.formattedText || element.text || '';
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

        let currentQuestionId = element.questionId;

        resetQuestionBtn.onclick = () => {
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

          insertQuestionBtn.textContent = 'Insert Question';
          questionTextEl.textContent = 'No question selected';
          resetQuestionBtn.style.display = 'none';

          quill.setText('');
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'Add a question');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';

          currentQuestionId = undefined;
        };

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

        const uniqueEventName = `questionSelected-${element.id}`;
        const handleQuestionSelected = (event: CustomEvent) => {
          const { questionId, questionText: selectedQuestionText } = event.detail;

          currentQuestionId = questionId;
          insertQuestionBtn.textContent = 'Change Question';
          questionTextEl.textContent = selectedQuestionText || 'No question selected';

          if (resetQuestionBtn.style.display === 'none' || !toolbarButtonContainer.contains(resetQuestionBtn)) {
            resetQuestionBtn.style.display = 'block';
            if (!toolbarButtonContainer.contains(resetQuestionBtn)) {
              toolbarButtonContainer.appendChild(resetQuestionBtn);
            }
          }

          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { questionId }
            }
          });

          if (questionId && !state.tempQuestions[questionId]) {
            dispatch({
              type: 'UPDATE_TEMP_QUESTION',
              payload: {
                questionId,
                text: selectedQuestionText
              }
            });
          }

          if (assignedUser) {
            const existingAnswerEntry = state.tempAnswers[questionId]?.[assignedUser.id] as TempAnswerEntry | undefined;
            const existingAnswer = existingAnswerEntry?.text || '';
            quill.setText(existingAnswer);

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

        window.addEventListener(uniqueEventName, handleQuestionSelected as EventListener);

        const previousCloseModal = closeModal;
        closeModal = () => {
          window.removeEventListener(uniqueEventName, handleQuestionSelected as EventListener);
          const closeQuillEditorHandler = modal.__closeQuillEditorHandler;
          if (closeQuillEditorHandler) {
            window.removeEventListener('closeQuillEditor', closeQuillEditorHandler);
          }
          const openQuestionDialogHandler = modal.__openQuestionDialogHandler;
          if (openQuestionDialogHandler) {
            window.removeEventListener('openQuestionDialog', openQuestionDialogHandler);
          }
          previousCloseModal();
        };

        cancelBtn.onclick = closeModal;

        quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node: Node) => {
          const elementNode = node as HTMLElement;
          const plaintext = elementNode.innerText || elementNode.textContent || '';
          const DeltaConstructor = quillConstructor.import('delta');
          const deltaInstance = new DeltaConstructor();
          return deltaInstance.insert(plaintext);
        });

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

        modal.addEventListener('keydown', (evt: KeyboardEvent) => {
          evt.stopPropagation();
          if (evt.key === 'Escape') closeModal();
        }, true);
        modal.addEventListener('keyup', (evt: KeyboardEvent) => {
          evt.stopPropagation();
        }, true);
      }, 100);
    }
  };

  return (
    <BaseCanvasItem
      {...props}
      onDoubleClick={handleDoubleClick}
    >
      {showBackground && (
        <Rect
          width={element.width}
          height={element.height}
          fill={qnaElement.backgroundColor}
          opacity={qnaElement.backgroundOpacity ?? 1}
          cornerRadius={qnaElement.cornerRadius ?? qnaDefaults.cornerRadius ?? 0}
          listening={false}
        />
      )}

      {showBorder && (
        <Rect
          width={element.width}
          height={element.height}
          stroke={qnaElement.borderColor}
          strokeWidth={qnaElement.borderWidth}
          opacity={qnaElement.borderOpacity ?? 1}
          cornerRadius={qnaElement.cornerRadius ?? qnaDefaults.cornerRadius ?? 0}
          listening={false}
        />
      )}

      <RichTextShape runs={layout.runs} width={element.width} height={layout.contentHeight} />
      <Rect
        ref={textRef}
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        fill="transparent"
        listening={false}
      />
    </BaseCanvasItem>
  );
}

