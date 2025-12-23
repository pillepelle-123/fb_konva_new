import React, { useMemo } from 'react';
import { EditorContext } from '../../../../context/editor-context';
import type { PageTemplate } from '../../../../types/template-types';
import themesData from '../../../../data/templates/themes';
import { mirrorTemplate } from '../../../../utils/layout-mirroring';
import type { BookOrientation, BookPageSize } from '../../../../constants/book-formats';
import { convertTemplateToElements } from '../../../../utils/template-to-elements';
import { calculatePageDimensions } from '../../../../utils/template-utils';
import type { CanvasElement } from '../../../../context/editor-context';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';

type PreviewProviderProps = {
  children: React.ReactNode;
  pageSize: BookPageSize;
  orientation: BookOrientation;
  themeId: string;
  paletteId: string;
  baseTemplate: PageTemplate | null;
  pickLeftRight: boolean;
  leftTemplate?: PageTemplate | null;
  rightTemplate?: PageTemplate | null;
  mirrorRight: boolean;
  allowInteractions?: boolean;
};

export function EditorPreviewProvider({
  children,
  pageSize,
  orientation,
  themeId,
  paletteId,
  baseTemplate,
  pickLeftRight,
  leftTemplate,
  rightTemplate,
  mirrorRight,
  allowInteractions = false,
}: PreviewProviderProps) {
  const state = useMemo(() => {
    // Resolve theme background for pages
    const theme = (themesData as any)[themeId] || (themesData as any).default;
    const pageSettings = theme?.pageSettings || {};
    const backgroundImageCfg = pageSettings.backgroundImage || { enabled: false };
    const backgroundPatternCfg = pageSettings.backgroundPattern || { enabled: false };

    const buildBackground = () => {
      if (backgroundImageCfg?.enabled) {
        return {
          type: 'image',
          opacity: pageSettings.backgroundOpacity ?? 1,
          value: undefined,
          // map editor background fields
          backgroundImageTemplateId: backgroundImageCfg.templateId,
          imageSize: backgroundImageCfg.size === 'contain' ? 'contain' : backgroundImageCfg.size === 'cover' ? 'cover' : 'cover',
          imageRepeat: Boolean(backgroundImageCfg.repeat),
          imagePosition: backgroundImageCfg.position || 'top-left',
          imageContainWidthPercent: backgroundImageCfg.width || 100,
          applyPalette: true,
        };
      }
      if (backgroundPatternCfg?.enabled) {
        return {
          type: 'pattern',
          value: backgroundPatternCfg.style || 'dots',
          opacity: pageSettings.backgroundOpacity ?? 1,
          patternBackgroundColor: undefined,
          patternForegroundColor: undefined,
          patternSize: backgroundPatternCfg.size ?? 20,
          patternStrokeWidth: backgroundPatternCfg.strokeWidth ?? 1,
          patternBackgroundOpacity: backgroundPatternCfg.patternBackgroundOpacity ?? 0.3,
        };
      }
      // fallback solid based on palette later
      return {
        type: 'color',
        value: '#ffffff',
        opacity: pageSettings.backgroundOpacity ?? 1,
      };
    };

    const leftResolved = leftTemplate ?? baseTemplate ?? null;
    const rightResolved = (() => {
      if (pickLeftRight) return rightTemplate ?? baseTemplate ?? null;
      if (mirrorRight && baseTemplate) {
        // mirror the base template so elements reflect mirroring in preview
        try {
          return mirrorTemplate(baseTemplate);
        } catch {
          return baseTemplate;
        }
      }
      return baseTemplate ?? null;
    })();

    // Berechne Canvas-Größe für die Preview
    const canvasSize = calculatePageDimensions(pageSize, orientation);
    
    // Helper function to apply theme defaults to elements
    const applyThemeToElements = (elements: CanvasElement[]): CanvasElement[] => {
      return elements.map((element) => {
        const toolType = (element.textType || element.type) as any;
        const activeTheme = themeId || 'default';
        const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType);
        
        // Merge theme defaults into element
        const updatedElement: any = {
          ...element,
          ...themeDefaults,
          theme: themeId,
          // Preserve element-specific properties
          id: element.id,
          type: element.type,
          textType: element.textType,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        };
        
        // Handle nested settings for qna
        if (element.textType === 'qna' && themeDefaults.questionSettings) {
          updatedElement.questionSettings = {
            ...(element.questionSettings || {}),
            ...themeDefaults.questionSettings,
          };
        }
        if (element.textType === 'qna' && themeDefaults.answerSettings) {
          updatedElement.answerSettings = {
            ...(element.answerSettings || {}),
            ...themeDefaults.answerSettings,
          };
        }
        
        // Handle nested settings for free_text
        if (element.textType === 'free_text' && themeDefaults.textSettings) {
          updatedElement.textSettings = {
            ...(element.textSettings || {}),
            ...themeDefaults.textSettings,
          };
        }
        
        return updatedElement;
      });
    };
    
    // Verwende die zentrale convertTemplateToElements Funktion
    const leftElementsRaw = leftResolved 
      ? convertTemplateToElements(leftResolved, canvasSize)
      : [];
    const rightElementsRaw = rightResolved 
      ? convertTemplateToElements(rightResolved, canvasSize)
      : [];
    
    // Apply theme defaults to elements
    const leftElements = applyThemeToElements(leftElementsRaw);
    const rightElements = applyThemeToElements(rightElementsRaw);

    // Minimal book for editor
    const book = {
      id: 'preview-book',
      name: 'Preview',
      pageSize,
      orientation,
      themeId,
      bookTheme: themeId,
      colorPaletteId: paletteId,
      layoutTemplateId: baseTemplate?.id ?? null,
      pages: [
        {
          id: 'preview-left',
          pageNumber: 1,
          pageType: 'content',
          layoutTemplateId: leftResolved?.id ?? null,
          colorPaletteId: paletteId,
          themeId,
          background: buildBackground(),
          elements: leftElements,
        },
        {
          id: 'preview-right',
          pageNumber: 2,
          pageType: 'content',
          layoutTemplateId: rightResolved?.id ?? null,
          colorPaletteId: paletteId,
          themeId,
          background: buildBackground(),
          backgroundTransform: mirrorRight && !pickLeftRight ? { mirror: true } : undefined,
          elements: rightElements,
        },
      ],
    };

    return {
      // Editor state subset needed by Canvas
      currentBook: book as any,
      activePageIndex: 0,
      selectedElementIds: [] as string[],
      isMiniPreview: true,
      hoveredElementId: null as string | null,
      // Allow pan/zoom in modal, block all interactions in regular preview
      editorInteractionLevel: allowInteractions ? 'answer_only' as const : 'no_access' as const,
      magneticSnapping: false,
      toolSettings: {},
      pageAssignments: {} as Record<number, any>,
      tempQuestions: {} as Record<string, string>,
      tempAnswers: {} as Record<string, Record<string, { text: string }>>,
      userRole: 'viewer',
      // Allow access for pan/zoom in modal, block for regular preview
      canAccessEditor: () => allowInteractions,
      canEditCanvas: () => false,
      getAnswerText: (_qid: string, _uid: string) => '',
    };
  }, [pageSize, orientation, themeId, paletteId, baseTemplate, pickLeftRight, leftTemplate, rightTemplate, mirrorRight, allowInteractions]);

  // No-op dispatch
  const dispatch = () => {};
  const undo = () => {};
  const redo = () => {};

  return (
    <EditorContext.Provider value={{ state: state as any, dispatch: dispatch as any, undo, redo, getAnswerText: state.getAnswerText, getQuestionAssignmentsForUser: () => new Set(), canAccessEditor: state.canAccessEditor, canEditCanvas: state.canEditCanvas }}>
      {children}
    </EditorContext.Provider>
  );
}


