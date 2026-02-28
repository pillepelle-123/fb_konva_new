import React, { useMemo } from 'react';
import { EditorContext } from '../../../../context/editor-context';
import { AbilityProvider } from '../../../../abilities/ability-context';
import type { PageTemplate } from '../../../../types/template-types';
import { mirrorTemplate } from '../../../../utils/layout-mirroring';
import type { BookOrientation, BookPageSize } from '../../../../constants/book-formats';
import { convertTemplateToElements } from '../../../../utils/template-to-elements';
import { calculatePageDimensions } from '../../../../utils/template-utils';
import type { CanvasElement } from '../../../../context/editor-context';

/** Dummy Q&A-Paare für Freundebuch-Vorschau – kreative Fragen und Antworten */
const SANDBOX_QNA_PAIRS: Array<{ question: string; answer: string }> = [
  { question: 'Dein Lieblingsessen?', answer: 'Pizza! Am liebsten mit viel Käse und Oliven.' },
  { question: 'Wie lautet dein Spitzname?', answer: 'Bei Freunden nenne ich mich "Sunny" – weil ich immer gut gelaunt bin!' },
  { question: 'Was ist dein größter Traum?', answer: 'Einen Tag um die Welt reisen und alle Freunde besuchen.' },
  { question: 'Deine Lieblingsfarbe?', answer: 'Blau – wie der Himmel und das Meer.' },
  { question: 'Womit verbringst du am liebsten deine Zeit?', answer: 'Mit Freunden lachen, Musik hören und draußen spielen.' },
  { question: 'Dein Lieblingstier?', answer: 'Hunde! Besonders unser Family Labrador Max.' },
  { question: 'Welche Superkraft hättest du gern?', answer: 'Fliegen können – dann wäre ich in Sekunden bei dir!' },
  { question: 'Dein Lieblingsbuch oder -film?', answer: 'Harry Potter! Ich habe alle Bücher schon dreimal gelesen.' },
  { question: 'Was machst du am liebsten in den Ferien?', answer: 'Ausschlafen, Freunde treffen und Eis essen.' },
  { question: 'Was möchtest du später mal werden?', answer: 'Astronautin oder Tierärztin – noch nicht ganz sicher!' },
];

function injectSandboxDummyQna(elements: CanvasElement[], startIndex = 0): CanvasElement[] {
  let pairIndex = startIndex;
  return elements.map((el) => {
    if (el.type !== 'text' || el.textType !== 'qna2') return el;
    const pair = SANDBOX_QNA_PAIRS[pairIndex % SANDBOX_QNA_PAIRS.length];
    pairIndex += 1;
    return {
      ...el,
      sandboxDummyQuestion: pair.question,
      sandboxDummyAnswer: pair.answer,
    } as CanvasElement & { sandboxDummyQuestion: string; sandboxDummyAnswer: string };
  });
}
import {
  applyThemeToElementConsistent,
  getGlobalTheme,
  getThemePageBackgroundColors,
} from '../../../../utils/global-themes';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';

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
    // Build background using same logic as selector-theme (getThemePageBackgroundColors + applyBackgroundImageTemplate)
    const theme = getGlobalTheme(themeId);
    const pageColors = getThemePageBackgroundColors(themeId, paletteId);
    const backgroundOpacity = theme?.pageSettings?.backgroundOpacity ?? 1;

    const buildBackground = () => {
      if (!theme) {
        return { type: 'color' as const, value: pageColors.backgroundColor, opacity: 1 };
      }

      const backgroundImageConfig = theme.pageSettings.backgroundImage;
      if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
        const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
          imageSize: backgroundImageConfig.size,
          imageRepeat: backgroundImageConfig.repeat,
          imagePosition: backgroundImageConfig.position,
          imageWidth: backgroundImageConfig.width,
          opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
          backgroundColor: pageColors.backgroundColor,
          backgroundColorOpacity: theme?.pageSettings?.backgroundOpacity ?? 1,
          applyPalette: backgroundImageConfig.applyPalette ?? true,
          paletteMode: backgroundImageConfig.paletteMode ?? 'palette',
        });
        if (imageBackground) return { ...imageBackground, pageTheme: themeId };
      }

      if (theme.pageSettings.backgroundPattern?.enabled) {
        return {
          type: 'pattern',
          value: theme.pageSettings.backgroundPattern.style || 'dots',
          opacity: backgroundOpacity,
          pageTheme: themeId,
          patternSize: theme.pageSettings.backgroundPattern.size ?? 20,
          patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth ?? 1,
          patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity ?? 0.3,
          patternForegroundColor: pageColors.backgroundColor,
          patternBackgroundColor: pageColors.patternBackgroundColor,
        };
      }

      return {
        type: 'color',
        value: pageColors.backgroundColor,
        opacity: backgroundOpacity,
        pageTheme: themeId,
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
    
    // Helper function to apply theme defaults to elements using centralized function
    const applyThemeToElements = (elements: CanvasElement[]): CanvasElement[] => {
      const activeTheme = themeId || 'default';
      return elements.map((element) =>
        applyThemeToElementConsistent(element, activeTheme, paletteId)
      );
    };
    
    // Verwende die zentrale convertTemplateToElements Funktion
    const leftElementsRaw = leftResolved 
      ? convertTemplateToElements(leftResolved, canvasSize)
      : [];
    const rightElementsRaw = rightResolved 
      ? convertTemplateToElements(rightResolved, canvasSize)
      : [];
    
    // Apply theme defaults to elements
    const leftElementsThemed = applyThemeToElements(leftElementsRaw);
    const rightElementsThemed = applyThemeToElements(rightElementsRaw);
    // Dummy Q&A für Freundebuch-Vorschau: qna2-Elemente mit Beispieltext füllen
    const leftElements = injectSandboxDummyQna(leftElementsThemed, 0);
    const rightStartIndex = leftElementsThemed.filter((e) => e.type === 'text' && e.textType === 'qna2').length;
    const rightElements = injectSandboxDummyQna(rightElementsThemed, rightStartIndex);

    // Minimal book for editor
    const book = {
      id: 'preview-book',
      name: 'Preview',
      pageSize,
      orientation,
      themeId,
      bookTheme: themeId,
      colorPaletteId: paletteId,
      layoutId: baseTemplate?.id ?? null,
      pages: [
        {
          id: 'preview-left',
          pageNumber: 2,
          pageType: 'content',
          pagePairId: 'preview-spread',
          layoutId: leftResolved?.id ?? null,
          colorPaletteId: paletteId,
          themeId,
          background: buildBackground(),
          elements: leftElements,
        },
        {
          id: 'preview-right',
          pageNumber: 3,
          pageType: 'content',
          pagePairId: 'preview-spread',
          layoutId: rightResolved?.id ?? null,
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
      // Index 1 = rechte Seite; mit pagePairId wird die linke Seite als Partner angezeigt → Doppelseite 2–3
      activePageIndex: 1,
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
      userRole: allowInteractions ? ('author' as const) : ('viewer' as const),
      pageAccessLevel: 'all_pages',
      editorInteractionLevel: allowInteractions ? ('answer_only' as const) : ('no_access' as const),
      assignedPages: [],
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
      <AbilityProvider>
        {children}
      </AbilityProvider>
    </EditorContext.Provider>
  );
}


