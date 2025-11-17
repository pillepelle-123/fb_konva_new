import React, { useMemo } from 'react';
import { EditorContext } from '../../../../context/editor-context';
import type { PageTemplate } from '../../../../types/template-types';
import themesData from '../../../../data/templates/themes.json';
import { mirrorTemplate } from '../../../../utils/layout-mirroring';
import type { BookOrientation, BookPageSize } from '../../../../constants/book-formats';

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
};

// Helper: map PageTemplate -> editor page elements (simplified)
function mapTemplateToElements(template: PageTemplate | null) {
  if (!template) return [];
  const PAGE_WIDTH = 2480;
  const PAGE_HEIGHT = 3508;

  const textboxes =
    template.textboxes?.map((tb, i) => {
      const x = tb.position.x ?? 0;
      const y = tb.position.y ?? 0;
      const w = tb.size.width ?? 0;
      const h = tb.size.height ?? 0;
      return {
        id: `tb-${i}`,
        type: 'text',
        textType: tb.type || 'qna_inline',
        x,
        y,
        width: w,
        height: h,
        // layout/meta
        layoutVariant: tb.layoutVariant ?? 'inline',
        questionPosition: tb.questionPosition ?? 'left',
        questionWidth: tb.questionWidth ?? 40,
        padding: tb.padding ?? tb.format?.padding ?? 8,
        format: { textAlign: tb.format?.textAlign ?? 'left' },
        paragraphSpacing: tb.paragraphSpacing ?? 'small',
        cornerRadius: tb.cornerRadius ?? 8,
      };
    }) ?? [];

  const images =
    template.elements
      ?.filter((el) => el.type === 'image')
      .map((el, i) => ({
        id: `img-${i}`,
        type: 'placeholder',
        x: el.position.x ?? 0,
        y: el.position.y ?? 0,
        width: el.size.width ?? 0,
        height: el.size.height ?? 0,
      })) ?? [];

  // Clamp within page bounds
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const clampRect = (x: number, y: number, w: number, h: number) => ({
    x: clamp(x, 0, PAGE_WIDTH - 1),
    y: clamp(y, 0, PAGE_HEIGHT - 1),
    width: clamp(w, 1, PAGE_WIDTH),
    height: clamp(h, 1, PAGE_HEIGHT),
  });

  return [...textboxes, ...images].map((el) => {
    const rect = clampRect(el.x, el.y, el.width, el.height);
    return { ...el, ...rect };
  });
}

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

    const leftElements = mapTemplateToElements(leftResolved);
    const rightElements = mapTemplateToElements(rightResolved);

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
      editorInteractionLevel: 'no_access' as const,
      magneticSnapping: false,
      toolSettings: {},
      pageAssignments: {} as Record<number, any>,
      tempQuestions: {} as Record<string, string>,
      tempAnswers: {} as Record<string, Record<string, { text: string }>>,
      userRole: 'viewer',
      // no-op helpers used by Canvas
      canAccessEditor: () => false,
      canEditCanvas: () => false,
      getAnswerText: (_qid: string, _uid: string) => '',
    };
  }, [pageSize, orientation, themeId, paletteId, baseTemplate, pickLeftRight, leftTemplate, rightTemplate, mirrorRight]);

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


