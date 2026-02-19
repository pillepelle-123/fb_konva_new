/**
 * Rich text inline editor using contenteditable div overlay.
 * Used by textbox-qna2 for editing mixed-format text.
 * Layout inspired by inline-text-editor: centered modal with header, formatting toolbar, and footer.
 */

import type React from 'react';
import type Konva from 'konva';
import type { RichTextStyle, TextSegment } from '../../../../../../shared/types/text-layout';
import type { CanvasElement } from '../../../../context/editor-context';
import {
  segmentsToHtml,
  parseHtmlToSegments
} from '../../../../../../shared/utils/rich-text-layout';

let activeRichTextEditorInstance: {
  cleanup: () => void;
  editableDiv: HTMLDivElement;
} | null = null;

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const PRESET_COLORS = [
  '#000000',
  '#1f2937',
  '#4b5563',
  '#6b7280',
  '#9ca3af',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899'
];

function createSvgIcon(
  pathD: string,
  viewBox = '0 0 24 24'
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  svg.appendChild(path);
  return svg;
}

function applyFormat(command: string, value?: string) {
  document.execCommand(command, false, value ?? '');
}

function applyFontSize(_editableDiv: HTMLDivElement, size: number) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const selectedText = sel.toString();
  const selectedHtml = range.cloneContents();
  const wrapper = document.createElement('div');
  wrapper.appendChild(selectedHtml);
  const html = wrapper.innerHTML || (selectedText ? selectedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
  const wrapped = `<span style="font-size: ${size}px">${html || '&#8203;'}</span>`;
  document.execCommand('insertHTML', false, wrapped);
}

function applyFontColor(color: string) {
  document.execCommand('foreColor', false, color);
}

const FONT_FAMILIES = [
  'Arial, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Verdana, sans-serif',
  'Inter, system-ui, sans-serif',
  'Comic Sans MS, cursive'
];

function applyFontFamily(_editableDiv: HTMLDivElement, fontFamily: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const selectedHtml = range.cloneContents();
  const wrapper = document.createElement('div');
  wrapper.appendChild(selectedHtml);
  const html = wrapper.innerHTML || (sel.toString() ? sel.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
  const wrapped = `<span style="font-family: ${fontFamily}">${html || '&#8203;'}</span>`;
  document.execCommand('insertHTML', false, wrapped);
}

export interface RichTextInlineEditorParams {
  element: CanvasElement;
  richTextSegments: TextSegment[];
  defaultStyle: RichTextStyle;
  textRef: React.RefObject<Konva.Rect>;
  setIsEditing: (open: boolean) => void;
  dispatch: (action: { type: string; payload?: unknown }) => void;
  boxWidth: number;
  boxHeight: number;
  padding: number;
  /** Optional question text shown as non-editable prefix (QnA2 mode). Only answer is saved. */
  questionPrefix?: string;
}

/**
 * Creates a contenteditable overlay for editing rich text.
 * Returns a cleanup function.
 */
export function createRichTextInlineEditor(params: RichTextInlineEditorParams): () => void {
  const {
    element,
    richTextSegments,
    defaultStyle,
    textRef,
    setIsEditing,
    dispatch,
    questionPrefix
  } = params;

  const groupNode = textRef.current?.getParent();
  const stage = textRef.current?.getStage();
  if (!groupNode || !stage) {
    return () => {};
  }

  if (activeRichTextEditorInstance) {
    activeRichTextEditorInstance.cleanup();
    activeRichTextEditorInstance = null;
  }

  const existingOverlays = document.querySelectorAll('[id="rich-text-editor-overlay-container"]');
  existingOverlays.forEach((overlay) => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });

  setIsEditing(true);

  // Centered layout like inline-text-editor
  const editorWidth = window.innerWidth * 0.8;
  const editorMinHeight = window.innerHeight * 0.5;
  const editorLeft = (window.innerWidth - editorWidth) / 2;
  const editorTop = (window.innerHeight - editorMinHeight) / 2;

  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'rich-text-editor-overlay-container';
  overlayContainer.style.position = 'fixed';
  overlayContainer.style.top = '0';
  overlayContainer.style.left = '0';
  overlayContainer.style.width = '100vw';
  overlayContainer.style.height = '100vh';
  overlayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlayContainer.style.zIndex = '9999';
  overlayContainer.style.pointerEvents = 'auto';
  document.body.appendChild(overlayContainer);

  // Header bar
  const headerBar = document.createElement('div');
  headerBar.style.position = 'fixed';
  headerBar.style.left = editorLeft + 'px';
  headerBar.style.top = (editorTop - 50) + 'px';
  headerBar.style.width = editorWidth + 'px';
  headerBar.style.height = '50px';
  headerBar.style.backgroundColor = '#fff';
  headerBar.style.borderRadius = '8px 8px 0 0';
  headerBar.style.padding = '12px 16px';
  headerBar.style.fontSize = '18px';
  headerBar.style.fontWeight = '600';
  headerBar.style.fontFamily = defaultStyle.fontFamily;
  headerBar.style.color = defaultStyle.fontColor || '#1f2937';
  headerBar.style.display = 'flex';
  headerBar.style.alignItems = 'center';
  headerBar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
  headerBar.style.zIndex = '10001';
  headerBar.textContent = questionPrefix ? questionPrefix.trim() : 'Rich Text';
  document.body.appendChild(headerBar);

  // Formatting toolbar
  const toolbar = document.createElement('div');
  toolbar.style.position = 'fixed';
  toolbar.style.left = editorLeft + 'px';
  toolbar.style.top = editorTop + 'px';
  toolbar.style.width = editorWidth + 'px';
  toolbar.style.height = '44px';
  toolbar.style.backgroundColor = '#f9fafb';
  toolbar.style.borderBottom = '1px solid #e5e7eb';
  toolbar.style.padding = '6px 12px';
  toolbar.style.display = 'flex';
  toolbar.style.alignItems = 'center';
  toolbar.style.gap = '4px';
  toolbar.style.zIndex = '10001';

  const toolbarButton = (icon: SVGSVGElement, label: string, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.width = '32px';
    btn.style.height = '32px';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.background = 'transparent';
    btn.style.cursor = 'pointer';
    btn.style.color = '#374151';
    btn.appendChild(icon);
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
      editableDiv.focus();
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#e5e7eb';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent';
    });
    return btn;
  };

  const boldBtn = toolbarButton(
    createSvgIcon('M6 4h8v4H6V4z M6 12h8v4H6v-4z'),
    'Fett',
    () => applyFormat('bold')
  );
  toolbar.appendChild(boldBtn);

  const italicBtn = toolbarButton(
    createSvgIcon('M19 4h-9M14 20H5M15 4l-4 16'),
    'Kursiv',
    () => applyFormat('italic')
  );
  toolbar.appendChild(italicBtn);

  toolbar.appendChild(document.createElement('span')).style.cssText =
    'width:1px;height:20px;background:#d1d5db;margin:0 4px';

  const fontFamilySelect = document.createElement('select');
  fontFamilySelect.style.padding = '4px 8px';
  fontFamilySelect.style.borderRadius = '6px';
  fontFamilySelect.style.border = '1px solid #d1d5db';
  fontFamilySelect.style.fontSize = '13px';
  fontFamilySelect.style.minWidth = '140px';
  fontFamilySelect.style.cursor = 'pointer';
  fontFamilySelect.style.background = '#fff';
  const defaultFont = defaultStyle.fontFamily || 'Arial, sans-serif';
  let fontSelected = false;
  FONT_FAMILIES.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f.split(',')[0];
    if (!fontSelected && (f === defaultFont || defaultFont.includes(f.split(',')[0]))) {
      opt.selected = true;
      fontSelected = true;
    }
    fontFamilySelect.appendChild(opt);
  });
  fontFamilySelect.addEventListener('mousedown', (e) => e.stopPropagation());
  fontFamilySelect.addEventListener('change', () => {
    applyFontFamily(editableDiv, fontFamilySelect.value);
    editableDiv.focus();
  });
  toolbar.appendChild(fontFamilySelect);

  const fontSizeSelect = document.createElement('select');
  fontSizeSelect.style.padding = '4px 8px';
  fontSizeSelect.style.borderRadius = '6px';
  fontSizeSelect.style.border = '1px solid #d1d5db';
  fontSizeSelect.style.fontSize = '13px';
  fontSizeSelect.style.minWidth = '60px';
  fontSizeSelect.style.cursor = 'pointer';
  fontSizeSelect.style.background = '#fff';
  FONT_SIZES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = String(s);
    opt.textContent = `${s}px`;
    if (s === defaultStyle.fontSize) opt.selected = true;
    fontSizeSelect.appendChild(opt);
  });
  fontSizeSelect.addEventListener('mousedown', (e) => e.stopPropagation());
  fontSizeSelect.addEventListener('change', () => {
    const size = parseInt(fontSizeSelect.value, 10);
    applyFontSize(editableDiv, size);
    editableDiv.focus();
  });
  toolbar.appendChild(fontSizeSelect);

  const colorBtn = document.createElement('button');
  colorBtn.type = 'button';
  colorBtn.setAttribute('aria-label', 'Textfarbe');
  colorBtn.style.display = 'inline-flex';
  colorBtn.style.alignItems = 'center';
  colorBtn.style.gap = '6px';
  colorBtn.style.padding = '4px 10px';
  colorBtn.style.border = '1px solid #d1d5db';
  colorBtn.style.borderRadius = '6px';
  colorBtn.style.background = '#fff';
  colorBtn.style.cursor = 'pointer';
  colorBtn.style.fontSize = '12px';
  colorBtn.innerHTML = `
    <span style="width:16px;height:16px;border-radius:4px;background:${defaultStyle.fontColor || '#000'};border:1px solid #d1d5db"></span>
    <span style="color:#374151">Farbe</span>
  `;
  colorBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = defaultStyle.fontColor || '#000000';
    colorPicker.style.position = 'fixed';
    colorPicker.style.left = '-9999px';
    document.body.appendChild(colorPicker);
    colorPicker.click();
    colorPicker.addEventListener('change', () => {
      applyFontColor(colorPicker.value);
      editableDiv.focus();
      document.body.removeChild(colorPicker);
    });
    colorPicker.addEventListener('blur', () => {
      if (colorPicker.parentNode) document.body.removeChild(colorPicker);
    });
  });
  toolbar.appendChild(colorBtn);

  const colorPresets = document.createElement('div');
  colorPresets.style.display = 'flex';
  colorPresets.style.gap = '4px';
  colorPresets.style.marginLeft = '8px';
  PRESET_COLORS.forEach((color) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.style.width = '20px';
    chip.style.height = '20px';
    chip.style.borderRadius = '4px';
    chip.style.border = '1px solid #e5e7eb';
    chip.style.background = color;
    chip.style.cursor = 'pointer';
    chip.style.padding = '0';
    chip.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyFontColor(color);
      editableDiv.focus();
    });
    colorPresets.appendChild(chip);
  });
  toolbar.appendChild(colorPresets);

  document.body.appendChild(toolbar);

  // Contenteditable area
  const contentTop = editorTop + 44;
  const contentWrapper = document.createElement('div');
  contentWrapper.style.position = 'fixed';
  contentWrapper.style.left = editorLeft + 'px';
  contentWrapper.style.top = contentTop + 'px';
  contentWrapper.style.width = editorWidth + 'px';
  contentWrapper.style.minHeight = (editorMinHeight - 44 - 60) + 'px';
  contentWrapper.style.maxHeight = (window.innerHeight - contentTop - 70) + 'px';
  contentWrapper.style.overflow = 'auto';
  contentWrapper.style.padding = '16px';
  contentWrapper.style.boxSizing = 'border-box';
  contentWrapper.style.backgroundColor = '#fff';
  contentWrapper.style.zIndex = '10001';

  const editableDiv = document.createElement('div');
  editableDiv.contentEditable = 'true';
  editableDiv.style.border = 'none';
  editableDiv.style.outline = 'none';
  editableDiv.style.whiteSpace = 'pre-wrap';
  editableDiv.style.wordWrap = 'break-word';
  editableDiv.style.fontSize = `${defaultStyle.fontSize}px`;
  editableDiv.style.fontFamily = defaultStyle.fontFamily;
  editableDiv.style.color = defaultStyle.fontColor || '#000000';
  editableDiv.style.fontWeight = defaultStyle.fontBold ? 'bold' : 'normal';
  editableDiv.style.fontStyle = defaultStyle.fontItalic ? 'italic' : 'normal';

  editableDiv.innerHTML = segmentsToHtml(richTextSegments);
  contentWrapper.appendChild(editableDiv);
  document.body.appendChild(contentWrapper);
  editableDiv.focus();

  // Footer with Discard / Save
  const buttonFooter = document.createElement('div');
  buttonFooter.style.position = 'fixed';
  buttonFooter.style.left = editorLeft + 'px';
  buttonFooter.style.top = (contentTop + editorMinHeight - 44 - 60 + 1) + 'px';
  buttonFooter.style.width = editorWidth + 'px';
  buttonFooter.style.backgroundColor = '#fff';
  buttonFooter.style.borderRadius = '0 0 8px 8px';
  buttonFooter.style.padding = '12px 16px';
  buttonFooter.style.display = 'flex';
  buttonFooter.style.alignItems = 'center';
  buttonFooter.style.justifyContent = 'flex-end';
  buttonFooter.style.gap = '8px';
  buttonFooter.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
  buttonFooter.style.zIndex = '10001';

  const updateFooterPosition = () => {
    const contentHeight = Math.max(120, contentWrapper.scrollHeight + 32);
    buttonFooter.style.top = (contentTop + contentHeight + 1) + 'px';
    buttonFooter.style.left = editorLeft + 'px';
    buttonFooter.style.width = editorWidth + 'px';
  };

  const saveAndClose = () => {
    const html = editableDiv.innerHTML;
    const newSegments = parseHtmlToSegments(html, defaultStyle);
    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: { richTextSegments: newSegments }
      }
    });
    dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Update Rich Text' });
    removeEditor();
  };

  const discardAndClose = () => {
    removeEditor();
  };

  function removeEditor() {
    resizeObserver.disconnect();
    window.removeEventListener('resize', updateEditorSize);
    if (contentWrapper.parentNode) contentWrapper.parentNode.removeChild(contentWrapper);
    if (headerBar.parentNode) headerBar.parentNode.removeChild(headerBar);
    if (toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
    if (buttonFooter.parentNode) buttonFooter.parentNode.removeChild(buttonFooter);
    const container = document.getElementById('rich-text-editor-overlay-container');
    if (container?.parentNode) container.parentNode.removeChild(container);
    setIsEditing(false);
    stage?.draw();
    if (activeRichTextEditorInstance?.editableDiv === editableDiv) {
      activeRichTextEditorInstance = null;
    }
  }

  let closed = false;
  const safeSaveAndClose = () => {
    if (closed) return;
    closed = true;
    saveAndClose();
  };
  const safeDiscardAndClose = () => {
    if (closed) return;
    closed = true;
    discardAndClose();
  };

  const discardButton = document.createElement('button');
  discardButton.textContent = 'Verwerfen';
  discardButton.style.padding = '8px 16px';
  discardButton.style.borderRadius = '6px';
  discardButton.style.border = '1px solid hsl(var(--input))';
  discardButton.style.background = 'hsl(var(--background))';
  discardButton.style.color = 'hsl(var(--foreground))';
  discardButton.style.cursor = 'pointer';
  discardButton.style.fontSize = '14px';
  discardButton.addEventListener('click', (e) => {
    e.stopPropagation();
    safeDiscardAndClose();
  });
  buttonFooter.appendChild(discardButton);

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Speichern';
  saveButton.style.padding = '8px 16px';
  saveButton.style.borderRadius = '6px';
  saveButton.style.border = '1px solid hsl(var(--primary))';
  saveButton.style.background = 'hsl(var(--primary))';
  saveButton.style.color = 'hsl(var(--primary-foreground))';
  saveButton.style.cursor = 'pointer';
  saveButton.style.fontSize = '14px';
  saveButton.addEventListener('click', (e) => {
    e.stopPropagation();
    safeSaveAndClose();
  });
  buttonFooter.appendChild(saveButton);

  document.body.appendChild(buttonFooter);

  const resizeObserver = new ResizeObserver(updateFooterPosition);
  resizeObserver.observe(contentWrapper);
  updateFooterPosition();

  const updateEditorSize = () => {
    const newWidth = window.innerWidth * 0.8;
    const newMinHeight = window.innerHeight * 0.5;
    const newLeft = (window.innerWidth - newWidth) / 2;
    const newTop = (window.innerHeight - newMinHeight) / 2;

    headerBar.style.left = newLeft + 'px';
    headerBar.style.top = (newTop - 50) + 'px';
    headerBar.style.width = newWidth + 'px';

    toolbar.style.left = newLeft + 'px';
    toolbar.style.top = newTop + 'px';
    toolbar.style.width = newWidth + 'px';

    contentWrapper.style.left = newLeft + 'px';
    contentWrapper.style.top = (newTop + 44) + 'px';
    contentWrapper.style.width = newWidth + 'px';
    contentWrapper.style.minHeight = (newMinHeight - 44 - 60) + 'px';

    updateFooterPosition();
  };
  window.addEventListener('resize', updateEditorSize);

  editableDiv.addEventListener('blur', () => {
    setTimeout(() => {
      const active = document.activeElement;
      const inEditor =
        active === editableDiv ||
        contentWrapper.contains(active) ||
        toolbar.contains(active) ||
        buttonFooter.contains(active) ||
        headerBar.contains(active);
      if (!closed && !inEditor) {
        safeSaveAndClose();
      }
    }, 100);
  });

  overlayContainer.addEventListener('click', (e) => {
    if (e.target === overlayContainer) {
      safeSaveAndClose();
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      safeDiscardAndClose();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      safeSaveAndClose();
    }
    // Use insertLineBreak for consistent <br> output (Chrome otherwise uses <div>)
    if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };
  editableDiv.addEventListener('keydown', handleKeyDown);

  activeRichTextEditorInstance = {
    cleanup: removeEditor,
    editableDiv
  };

  return removeEditor;
}
