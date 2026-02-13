import { useEffect, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Book, PaintbrushVertical, BookCheck, Users, MessageCircleQuestionMark } from 'lucide-react';
import { Button } from '../../components/ui/primitives/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { FormField } from '../../components/ui/layout/form-field';
import { apiService } from '../../services/api';
import { pageTemplates as builtinPageTemplates } from '../../data/templates/page-templates';
import themesData from '../../data/templates/themes';
import MiniEditorCanvas from '../../components/features/editor/preview/mini-editor-canvas';
import { mirrorTemplate } from '../../utils/layout-mirroring';
import { getThemePaletteId } from '../../utils/global-themes';
import { BasicInfoStep } from '../../components/features/books/create/basic-info-step';
import { DesignStep } from '../../components/features/books/create/design-step';
import { TeamStep } from '../../components/features/books/create/team-step';
import { TeamInviteMessageStep } from '../../components/features/books/create/team-invite-message-step';
import { QuestionsStep } from '../../components/features/books/create/questions-step';
import { ReviewStep } from '../../components/features/books/create/review-step';
import type { WizardState, Friend } from '../../components/features/books/create/types';
import {
  getDefaultTeamAssignmentState,
  DEFAULT_ASSIGNMENT_PAGE_COUNT,
} from '../../components/features/books/create/types';
import { convertTemplateToElements } from '../../utils/template-to-elements';
import { calculatePageDimensions } from '../../utils/template-utils';
import { addPageNumbersToPages } from '../../utils/page-number-utils';
import { calculatePagePairId } from '../../utils/book-structure';
import { useAuth } from '../../context/auth-context';

const stepConfig = [
  { id: 'basic', label: 'Basic Info & Start', description: 'Name, size, and quick presets' },
  { id: 'design', label: 'Design', description: 'Layouts, toggles, themes & palettes' },
  { id: 'team', label: 'Team', description: 'Collaborators & assignments', optional: true },
  { id: 'questions', label: 'Questions', description: 'Curated prompts', optional: true },
  { id: 'review', label: 'Review', description: 'Double-check and create' },
] as const;

const featuredTemplates = builtinPageTemplates.slice(0, 6);

const initialState: WizardState = {
  basic: {
    name: '',
    pageSize: 'A4',
    orientation: 'portrait',
    presetId: null,
    startMode: 'custom',
    showPageNumbers: false,
  },
  design: {
    layoutTemplate: featuredTemplates[0],
    leftLayoutTemplate: null,
    rightLayoutTemplate: null,
    mirrorLayout: false,
    pickLeftRight: false,
    randomizeLayout: false,
    themeId: 'default',
    paletteId: null, // null = "Theme's Default Palette"
  },
  team: {
    selectedFriends: [],
    invites: [],
    enableGroupChat: false,
    pagesPerUser: 1,
    friendFacingPages: false,
    autoAssign: false,
    assignmentState: getDefaultTeamAssignmentState(),
    inviteMessage: undefined,
  },
    questions: {
      selectedDefaults: [],
      custom: [],
      orderedQuestions: [],
    },
};

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: (direction: number) => ({
    y: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  }),
};

export default function BookCreatePage() {
  const { user } = useAuth();
  const [wizardState, setWizardState] = useState<WizardState>(initialState);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for forward, -1 for backward
  const [activeHalfStep, setActiveHalfStep] = useState<string | null>(null);
  const initialStepId = stepConfig[0]?.id as string | undefined;
  const [showCanvas, setShowCanvas] = useState(initialStepId === 'design' || initialStepId === 'review');
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [customQuestionDialogOpen, setCustomQuestionDialogOpen] = useState(false);
  const [customQuestionDraft, setCustomQuestionDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friendships/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const friends = await response.json();
        setAvailableFriends(friends);
      }
    } catch (error) {
      console.warn('Failed to load friends:', error);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const currentStepId = stepConfig[activeStepIndex]?.id ?? stepConfig[0].id;
  
  // Calculate animation direction based on step change or half-step change
  // For half-steps: going to a half-step is forward (1), returning to main step is backward (-1)
  const getDirection = (newIndex: number, newHalfStep?: string | null) => {
    if (newIndex !== activeStepIndex) {
      return newIndex > activeStepIndex ? 1 : -1;
    }
    // Same step index, check half-step
    if (newHalfStep !== undefined) {
      if (newHalfStep && !activeHalfStep) {
        return 1; // Going to half-step is forward
      }
      if (!newHalfStep && activeHalfStep) {
        return -1; // Returning to main step is backward
      }
    }
    return direction; // Keep current direction if no change
  };

  // Reset canvas loaded state when step changes
  useEffect(() => {
    const needsCanvas = currentStepId === 'design' || currentStepId === 'review';
    if (needsCanvas && showCanvas) {
      setCanvasLoaded(false);
      // Load canvas after animation delay
      const timer = setTimeout(() => {
        setCanvasLoaded(true);
      }, 600); // Wait for animation to complete (spring animation ~500ms)
      return () => clearTimeout(timer);
    } else {
      setCanvasLoaded(false);
    }
  }, [activeStepIndex, currentStepId, showCanvas]);

  const updateWizard = <K extends keyof WizardState>(key: K, value: Partial<WizardState[K]>) => {
    setWizardState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...value,
      },
    }));
  };

  // summaryData previously fed a side card; no longer used in the new layout

  const handleBookWizard = () => {
    if (!wizardState.basic.name.trim()) return;
    setDirection(1); // Forward direction for animation
    setShowCanvas(true); // Design step needs canvas
    setActiveStepIndex(1); // Jump to Design step
  };

  const handleBlankCanvas = async () => {
    if (!wizardState.basic.name.trim()) return;
    setIsSubmitting(true);
    try {
      const initialPageCount = 24;

      // Helper: background object from theme pageSettings
      const buildBackground = (themeKey: string) => {
        const themeDict = themesData as unknown as Record<string, unknown>;
        const themeEntry = (themeDict[themeKey] ?? themeDict['default']) as Record<string, unknown>;
        const pageSettings = (themeEntry?.pageSettings as Record<string, unknown>) || {};
        const bgImage = pageSettings?.['backgroundImage'] as Record<string, unknown> | undefined;
        const bgPattern = pageSettings?.['backgroundPattern'] as Record<string, unknown> | undefined;
        if ((bgImage?.['enabled'] as boolean) === true) {
          return {
            type: 'image',
            opacity: (pageSettings['backgroundOpacity'] as number) ?? 1,
            value: undefined,
            backgroundImageTemplateId: bgImage?.['templateId'],
            imageSize: (bgImage?.['size'] === 'contain') ? 'contain' : (bgImage?.['size'] === 'cover' ? 'cover' : 'cover'),
            imageRepeat: Boolean(bgImage?.['repeat']),
            imagePosition: (bgImage?.['position'] as string) || 'top-left',
            imageContainWidthPercent: (bgImage?.['width'] as number) || 100,
            applyPalette: true,
          };
        }
        if ((bgPattern?.['enabled'] as boolean) === true) {
          return {
            type: 'pattern',
            value: (bgPattern?.['style'] as string) || 'dots',
            opacity: (pageSettings['backgroundOpacity'] as number) ?? 1,
            patternBackgroundColor: undefined,
            patternForegroundColor: undefined,
            patternSize: (bgPattern?.['size'] as number) ?? 20,
            patternStrokeWidth: (bgPattern?.['strokeWidth'] as number) ?? 1,
            patternBackgroundOpacity: (bgPattern?.['patternBackgroundOpacity'] as number) ?? 0.3,
          };
        }
        return {
          type: 'color',
          value: '#ffffff',
          opacity: (pageSettings['backgroundOpacity'] as number) ?? 1,
        };
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: wizardState.basic.name,
          pageSize: wizardState.basic.pageSize,
          orientation: wizardState.basic.orientation,
          bookTheme: 'default',
          themeId: 'default',
          colorPaletteId: 'default',
          layoutTemplateId: null,
          pagePairingEnabled: true,
          specialPagesConfig: {
            cover: { locked: true, printable: false },
          },
          layoutStrategy: 'same',
          initialPageCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create book');
      }

      const newBook = await response.json();

      // Build full set of pages: 24 pages total
      // 1: Back Cover, 2: Front Cover, 3: Inner Front, 4-23: Content, 24: Inner Back
      const totalPages = initialPageCount;
      const background = buildBackground('default');
      const pages: Array<Record<string, unknown>> = [];
      
      for (let i = 1; i <= totalPages; i++) {
        const isBackCover = i === 1;
        const isFrontCover = i === 2;
        const isInnerFront = i === 3;
        const isInnerBack = i === totalPages;

        const pageType = isBackCover
          ? 'back-cover'
          : isFrontCover
            ? 'front-cover'
            : isInnerFront
              ? 'inner-front'
              : isInnerBack
                ? 'inner-back'
                : 'content';

        const isInnerPage = isInnerFront || isInnerBack;
        const isPrintedPage = !isInnerPage;

        // Blank Canvas: NO layout template for ANY page (all pages are blank)
        // Back Cover and Front Cover: can have theme/background
        // Inner Front and Inner Back: NO theme, NO background (plain white)
        // Content pages: can have theme/background, but NO layout template
        const shouldHaveThemeAndBackground = !isInnerFront && !isInnerBack;

        pages.push({
          pageNumber: i,
          elements: [], // No elements for Blank Canvas
          layoutTemplateId: null,
          // Explicitly set themeId to null for Inner Front and Inner Back to prevent inheritance
          themeId: shouldHaveThemeAndBackground ? undefined : null,
          colorPaletteId: shouldHaveThemeAndBackground ? 'default' : null,
          pageType,
          pagePairId: calculatePagePairId(i, totalPages, pageType),
          isPrintable: isPrintedPage,
          isLocked: isInnerPage,
          isSpecialPage: pageType === 'back-cover' || pageType === 'front-cover' || pageType === 'inner-front' || pageType === 'inner-back',
          layoutVariation: 'normal',
          // Explicitly set background to null (not undefined) for Inner Front and Inner Back to prevent inheritance
          background: shouldHaveThemeAndBackground ? background : null,
          backgroundTransform: null,
        });
      }

      if (wizardState.basic.showPageNumbers) {
        const canvasSize = calculatePageDimensions(wizardState.basic.pageSize, wizardState.basic.orientation);
        addPageNumbersToPages(pages as Array<{ pageNumber: number; elements: unknown[]; [key: string]: unknown }>, canvasSize);
      }

      // Persist full book including generated pages
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books/${newBook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: wizardState.basic.name,
          pageSize: wizardState.basic.pageSize,
          orientation: wizardState.basic.orientation,
          bookTheme: 'default',
          themeId: 'default',
          colorPaletteId: 'default',
          layoutTemplateId: null,
          pagePairingEnabled: true,
          specialPagesConfig: {
            cover: { locked: true, printable: false },
          },
          layoutStrategy: 'same',
          pages,
          onlyModifiedPages: false,
        }),
      });

      navigate(`/editor/${newBook.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestionDraft.trim()) return;
    const customQuestionId = uuidv4(); // Use UUID instead of timestamp-based ID
    const customQuestionText = customQuestionDraft.trim();
    
    // Add to orderedQuestions list
    const newQuestion = {
      id: customQuestionId,
      text: customQuestionText,
      type: 'custom' as const,
      questionPoolId: null,
    };
    
    updateWizard('questions', {
      orderedQuestions: [
        ...(wizardState.questions.orderedQuestions || []),
        newQuestion,
      ],
      custom: [
        ...wizardState.questions.custom,
        { id: customQuestionId, text: customQuestionText },
      ],
    });
    setCustomQuestionDraft('');
    setCustomQuestionDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!wizardState.basic.name) return;
    setIsSubmitting(true);
    try {
      // Berechne Canvas-Größe für die Template-Konvertierung
      const canvasSize = calculatePageDimensions(wizardState.basic.pageSize, wizardState.basic.orientation);
      
      // Calculate initial page count based on pagesPerUser and selected friends
      // Use assignmentState.totalPages directly (already ensured to be even in team-step.tsx)
      // but ensure it's at least the calculated minimum
      const numUsers = wizardState.team.selectedFriends.length;
      const specialPages = 4; // Front Cover, Back Cover, Inner Front, Inner Back
      const calculatedPages = (wizardState.team.pagesPerUser || 1) * numUsers - specialPages;
      // Use assignmentState.totalPages directly - it's already ensured to be even in team-step.tsx
      // and represents the actual totalPages value shown to the user
      // Apply the same logic as team-step.tsx: ensureEvenTotalPages(Math.max(assignmentState.totalPages, DEFAULT_ASSIGNMENT_PAGE_COUNT))
      const normalizeToEven = (value: number) => (value % 2 === 0 ? value : value + 1);
      const ensureEvenTotalPages = (value: number) => (value % 2 === 0 ? value : value + 1);
      const plannedPages = wizardState.team.assignmentState?.totalPages ?? DEFAULT_ASSIGNMENT_PAGE_COUNT;
      // Apply the same calculation as team-step.tsx to ensure consistency
      const totalPagesFromTeamStep = ensureEvenTotalPages(Math.max(plannedPages, DEFAULT_ASSIGNMENT_PAGE_COUNT));
      // Ensure it's at least the calculated minimum
      const minRequiredPages = Math.max(DEFAULT_ASSIGNMENT_PAGE_COUNT, normalizeToEven(calculatedPages));
      // Use the same calculation as team-step.tsx to ensure consistency
      const initialPageCount = Math.max(totalPagesFromTeamStep, minRequiredPages);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: wizardState.basic.name,
          pageSize: wizardState.basic.pageSize,
          orientation: wizardState.basic.orientation,
          bookTheme: wizardState.design.themeId,
          themeId: wizardState.design.themeId,
          colorPaletteId: wizardState.design.paletteId, // null means "Theme's Default Palette"
          layoutTemplateId: wizardState.design.pickLeftRight 
            ? (wizardState.design.leftLayoutTemplate?.id ?? wizardState.design.layoutTemplate?.id ?? null)
            : (wizardState.design.layoutTemplate?.id ?? null),
          leftLayoutTemplateId: wizardState.design.pickLeftRight ? wizardState.design.leftLayoutTemplate?.id ?? null : null,
          rightLayoutTemplateId: wizardState.design.pickLeftRight ? wizardState.design.rightLayoutTemplate?.id ?? null : null,
          pagePairingEnabled: true,
          specialPagesConfig: {
            cover: { locked: true, printable: false },
          },
          layoutStrategy: wizardState.design.pickLeftRight 
            ? 'paired' 
            : wizardState.design.mirrorLayout 
              ? 'mirrored' 
              : wizardState.design.randomizeLayout 
                ? 'random' 
                : 'same',
          initialPageCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create book');
      }

      const newBook = await response.json();

      // Build full set of pages according to totalPages and selected layout/theme/palette
      const totalPages = initialPageCount;

      const baseTemplate = wizardState.design.layoutTemplate || null;
      const leftResolved = wizardState.design.pickLeftRight
        ? (wizardState.design.leftLayoutTemplate || baseTemplate)
        : (baseTemplate || null);
      const rightResolved = wizardState.design.pickLeftRight
        ? (wizardState.design.rightLayoutTemplate || baseTemplate)
        : (wizardState.design.mirrorLayout && baseTemplate ? mirrorTemplate(baseTemplate) : baseTemplate || null);

      // Helper: background object from theme pageSettings
      const buildBackground = (themeKey: string) => {
        const themeDict = themesData as unknown as Record<string, unknown>;
        const themeEntry = (themeDict[themeKey] ?? themeDict['default']) as Record<string, unknown>;
        const pageSettings = (themeEntry?.pageSettings as Record<string, unknown>) || {};
        const bgImage = pageSettings?.['backgroundImage'] as Record<string, unknown> | undefined;
        const bgPattern = pageSettings?.['backgroundPattern'] as Record<string, unknown> | undefined;
        if ((bgImage?.['enabled'] as boolean) === true) {
          return {
            type: 'image',
            opacity: (pageSettings['backgroundOpacity'] as number) ?? 1,
            value: undefined,
            backgroundImageTemplateId: bgImage?.['templateId'],
            imageSize: (bgImage?.['size'] === 'contain') ? 'contain' : (bgImage?.['size'] === 'cover' ? 'cover' : 'cover'),
            imageRepeat: Boolean(bgImage?.['repeat']),
            imagePosition: (bgImage?.['position'] as string) || 'top-left',
            imageContainWidthPercent: (bgImage?.['width'] as number) || 100,
            applyPalette: true,
          };
        }
        if ((bgPattern?.['enabled'] as boolean) === true) {
          return {
            type: 'pattern',
            value: (bgPattern?.['style'] as string) || 'dots',
            opacity: (pageSettings['backgroundOpacity'] as number) ?? 1,
            patternBackgroundColor: undefined,
            patternForegroundColor: undefined,
            patternSize: (bgPattern?.['size'] as number) ?? 20,
            patternStrokeWidth: (bgPattern?.['strokeWidth'] as number) ?? 1,
            patternBackgroundOpacity: (bgPattern?.['patternBackgroundOpacity'] as number) ?? 0.3,
          };
        }
        return {
          type: 'color',
          value: '#ffffff',
          opacity: (pageSettings['backgroundOpacity'] as number) ?? 1,
        };
      };

      const background = buildBackground(wizardState.design.themeId);
      const pages: Array<Record<string, unknown>> = [];
      
      for (let i = 1; i <= totalPages; i++) {
        // Page mapping per requirement:
        // 1: Back Cover (NO layout template, but can have theme/background)
        // 2: Front Cover (NO layout template, but can have theme/background)
        // 3: Inner Front (NO layout/theme/background - plain white)
        // 4..(totalPages-1): Content (apply layout/theme/background)
        // totalPages: Inner Back (NO layout/theme/background - plain white)
        const isBackCover = i === 1;
        const isFrontCover = i === 2;
        const isInnerFront = i === 3;
        const isInnerBack = i === totalPages;

        const pageType = isBackCover
          ? 'back-cover'
          : isFrontCover
            ? 'front-cover'
            : isInnerFront
              ? 'inner-front'
              : isInnerBack
                ? 'inner-back'
                : 'content';

        const isInnerPage = isInnerFront || isInnerBack;
        const isPrintedPage = !isInnerPage;

        // Back Cover and Front Cover: NO layout template (no elements), but can have theme/background
        // Inner Front and Inner Back: NO layout, NO theme, NO background (plain white)
        // All other pages (including page 4): apply layout/theme/background
        const shouldHaveLayoutTemplate = !isBackCover && !isFrontCover && !isInnerFront && !isInnerBack;
        const shouldHaveThemeAndBackground = !isInnerFront && !isInnerBack;
        
        // In the editor UI odd-numbered pages render on the left, even on the right.
        // Mirror logic must therefore treat even pages as right-hand pages.
        const isRightPage = i % 2 === 0;
        const templateForPage = shouldHaveLayoutTemplate ? (isRightPage ? rightResolved : leftResolved) : null;

        const pageElements = shouldHaveLayoutTemplate ? convertTemplateToElements(templateForPage, canvasSize) : [];
        
        pages.push({
          pageNumber: i,
          elements: pageElements,
          layoutTemplateId: templateForPage ? templateForPage.id : null,
          // Explicitly set themeId to null for Inner Front and Inner Back to prevent inheritance
          themeId: shouldHaveThemeAndBackground ? undefined : null,
          colorPaletteId: shouldHaveThemeAndBackground 
            ? wizardState.design.paletteId // null means "Theme's Default Palette"
            : null,
          pageType,
          pagePairId: calculatePagePairId(i, totalPages, pageType),
          isPrintable: isPrintedPage,
          isLocked: isInnerPage,
          // Only mark back-cover, front-cover, inner-front, inner-back as special
          // "content" pages (including page 4) are NOT special
          isSpecialPage: pageType === 'back-cover' || pageType === 'front-cover' || pageType === 'inner-front' || pageType === 'inner-back',
          layoutVariation: shouldHaveLayoutTemplate && (wizardState.design.mirrorLayout && isRightPage && !wizardState.design.pickLeftRight) ? 'mirrored' : 'normal',
          // Explicitly set background to null (not undefined) for Inner Front and Inner Back to prevent inheritance
          background: shouldHaveThemeAndBackground ? background : null,
          backgroundTransform: shouldHaveLayoutTemplate && (wizardState.design.mirrorLayout && isRightPage && !wizardState.design.pickLeftRight) ? { mirror: true } : null,
        });
      }

      if (wizardState.basic.showPageNumbers) {
        addPageNumbersToPages(pages as Array<{ pageNumber: number; elements: unknown[]; [key: string]: unknown }>, canvasSize);
      }

      // Assign questions to qna textboxes in order
      const questionsToAssign = wizardState.questions.orderedQuestions || [];
      if (questionsToAssign.length > 0) {
        // Collect all qna textboxes from content pages (page 4 to totalPages-1)
        const qnaInlineTextboxes: Array<{ pageIndex: number; elementIndex: number; pageNumber: number }> = [];
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as { pageNumber: number; elements: Array<{ textType?: string; questionId?: string }> };
          // Only process content pages (page 4 to totalPages-1)
          if (page.pageNumber >= 4 && page.pageNumber < totalPages) {
            page.elements.forEach((element, elementIndex) => {
              if (element.textType === 'qna') {
                qnaInlineTextboxes.push({
                  pageIndex: i,
                  elementIndex,
                  pageNumber: page.pageNumber ?? (i + 1),
                });
              }
            });
          }
        }

        const pageAssignments = wizardState.team.assignmentState?.pageAssignments || {};
        let currentAssignedUserId: number | undefined = undefined;
        let questionIndexForUser = 0;
        let fallbackQuestionIndex = 0;

        // Assign questions per collaborator so each user gets the same set
        qnaInlineTextboxes
          .sort((a, b) => a.pageNumber - b.pageNumber)
          .forEach(({ pageIndex, elementIndex, pageNumber }) => {
            const page = pages[pageIndex] as { elements: Array<{ textType?: string; questionId?: string }> };
            const assignedUserId = pageAssignments?.[pageNumber];

            if (!page.elements[elementIndex]) {
              return;
            }

            let questionToAssign;

            if (assignedUserId) {
              if (assignedUserId !== currentAssignedUserId) {
                currentAssignedUserId = assignedUserId;
                questionIndexForUser = 0;
              }
              questionToAssign = questionsToAssign[questionIndexForUser % questionsToAssign.length];
              questionIndexForUser += 1;
            } else {
              // Fallback: keep sequential assignment for unassigned pages
              questionToAssign = questionsToAssign[fallbackQuestionIndex % questionsToAssign.length];
              fallbackQuestionIndex += 1;
            }

            if (questionToAssign) {
              page.elements[elementIndex].questionId = questionToAssign.id;
              // Set questionOrder based on the question's position
              if (questionToAssign.position !== undefined && questionToAssign.position !== null) {
                page.elements[elementIndex].questionOrder = questionToAssign.position;
              }
            }
          });
      }

      // Persist full book including generated pages
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books/${newBook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: wizardState.basic.name,
          pageSize: wizardState.basic.pageSize,
          orientation: wizardState.basic.orientation,
          bookTheme: wizardState.design.themeId,
          themeId: wizardState.design.themeId,
          colorPaletteId: wizardState.design.paletteId, // null means "Theme's Default Palette"
          layoutTemplateId: wizardState.design.layoutTemplate?.id ?? null,
          pagePairingEnabled: true,
          specialPagesConfig: {
            cover: { locked: true, printable: false },
          },
          layoutStrategy: wizardState.design.pickLeftRight
            ? 'paired'
            : wizardState.design.mirrorLayout
              ? 'mirrored'
              : wizardState.design.randomizeLayout
                ? 'random'
                : 'same',
          pages,
          onlyModifiedPages: false,
          inviteMessage: wizardState.team.inviteMessage || null,
        }),
      });

      // Attach collaborators (existing friends)
      const addedFriends = await Promise.all(
        wizardState.team.selectedFriends
          .filter((friend) => friend.id > 0) // Only add existing friends (id > 0), not temporary invites (id === -1)
          .map(async (friend) => {
            try {
              await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books/${newBook.id}/friends`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                  friendId: friend.id,
                  book_role: friend.book_role || 'author',
                  page_access_level: 'own_page',
                  editor_interaction_level: 'full_edit',
                }),
              });
              return friend;
            } catch (error) {
              console.warn('Failed to add friend', friend.id, error);
              return null;
            }
          }),
      );

      // Create page assignments based on wizard configuration
      const validFriends = addedFriends.filter((f): f is Friend => f !== null);
      const validFriendIds = new Set(validFriends.map((friend) => friend.id));
      const existingAssignments = Object.entries(wizardState.team.assignmentState?.pageAssignments ?? {}).map(
        ([page, userId]) => ({
          pageNumber: Number(page),
          userId: Number(userId),
        }),
      );

      const hasManualAssignments = existingAssignments.length > 0;

      // Only create page assignments if they were manually assigned in the wizard
      if (hasManualAssignments) {
        const filteredAssignments = existingAssignments.filter(
          (assignment) =>
            assignment.pageNumber > 2 &&
            assignment.pageNumber < totalPages &&
            validFriendIds.has(assignment.userId),
        );

        if (filteredAssignments.length > 0) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/page-assignments/book/${newBook.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                assignments: filteredAssignments,
              }),
            });
          } catch (error) {
            console.warn('Failed to create page assignments:', error);
          }
        }
      }
      // Removed automatic assignment logic - users must explicitly assign pages or use "Auto-assign" button

      // Send invitations for new users (these will generate invitation URLs with tokens)
      await Promise.all(
        wizardState.team.invites.map(async (invite) => {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/invitations/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                name: invite.name,
                email: invite.email,
                bookId: newBook.id,
              }),
            });
          } catch (error) {
            console.warn('Failed to send invitation', invite.email, error);
          }
        }),
      );

      // Create questions in order from orderedQuestions
      const orderedQuestions = wizardState.questions.orderedQuestions || [];
      
      for (let i = 0; i < orderedQuestions.length; i++) {
        const question = orderedQuestions[i];
        // Use position from question if available, otherwise use array index
        const displayOrder = question.position !== undefined ? question.position : i;
        await apiService.createQuestion(
          newBook.id,
          question.text,
          question.id,
          question.questionPoolId || null,
          displayOrder // Use position from question, or fallback to array index
        );
      }

      // Ensure questions are saved in database before navigating
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      // Log invite messages to console
      const inviteMessage = wizardState.team.inviteMessage;
      const defaultMessage = `Hey [friend name],

I've created a new book called "${wizardState.basic.name}" and I'd love for you to be part of it! Would you like to collaborate?

Best,
${user?.name || '[user name]'}`;

      const messageToUse = inviteMessage || defaultMessage;
      const allCollaborators = [
        ...wizardState.team.selectedFriends.filter(f => f.id > 0),
        ...wizardState.team.invites.map(invite => ({ id: -1, name: invite.name, email: invite.email }))
      ];

      allCollaborators.forEach((collaborator) => {
        const personalizedMessage = messageToUse
          .replace(/\[friend name\]/g, collaborator.name)
          .replace(/\[book name\]/g, wizardState.basic.name)
          .replace(/\[user name\]/g, user?.name || '[user name]');
        
        console.log('Invite to:', collaborator.email || collaborator.name, 'Message:', personalizedMessage);
      });

      navigate(`/editor/${newBook.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAccessStep = (index: number) => {
    const hasBasic = wizardState.basic.name.trim().length > 0;
    const hasDesign = hasBasic && wizardState.design.layoutTemplate !== null;
    if (index === 0) return true;
    if (index === 1) return hasBasic;
    const step = stepConfig[index];
    if (!step) return false;
    if (['team', 'questions', 'review'].includes(step.id)) {
      return hasDesign;
    }
    return false;
  };

  const canGoBack = activeStepIndex > 0;
  const canGoNext = activeStepIndex < stepConfig.length - 1 && canAccessStep(activeStepIndex + 1);

  const handleBack = () => {
    // If in a half step, go back to the previous main step
    if (activeHalfStep) {
      setActiveHalfStep(null);
      setDirection(getDirection(activeStepIndex, null));
      return;
    }
    
    if (canGoBack) {
      const newIndex = activeStepIndex - 1;
      const newStepId = stepConfig[newIndex]?.id;
      const needsCanvas = newStepId === 'design' || newStepId === 'review';
      
      // If going back to Team step and friends are selected, activate half step
      const newHalfStep = (newStepId === 'team' && wizardState.team.selectedFriends.length > 0) 
        ? 'team-invite-message' 
        : null;
      
      setDirection(getDirection(newIndex, newHalfStep));
      setActiveStepIndex(newIndex);
      setActiveHalfStep(newHalfStep);
      
      // Update showCanvas immediately based on new step
      setShowCanvas(needsCanvas);
    }
  };

  const handleNext = () => {
    // If in a half step, go to the next main step
    if (activeHalfStep) {
      setActiveHalfStep(null);
      if (canGoNext) {
        const newIndex = activeStepIndex + 1;
        const newStepId = stepConfig[newIndex]?.id;
        const needsCanvas = newStepId === 'design' || newStepId === 'review';
        
        setDirection(getDirection(newIndex, null));
        setActiveStepIndex(newIndex);
        setShowCanvas(needsCanvas);
      }
      return;
    }
    
    // If in Team step and friends are selected, navigate to half step
    if (currentStepId === 'team' && wizardState.team.selectedFriends.length > 0) {
      setActiveHalfStep('team-invite-message');
      setDirection(getDirection(activeStepIndex, 'team-invite-message'));
      return;
    }
    
    if (canGoNext) {
      const newIndex = activeStepIndex + 1;
      const newStepId = stepConfig[newIndex]?.id;
      const needsCanvas = newStepId === 'design' || newStepId === 'review';
      
      setDirection(getDirection(newIndex, null));
      setActiveStepIndex(newIndex);
      
      // Update showCanvas immediately based on new step
      setShowCanvas(needsCanvas);
    }
  };

  const handleStepClick = (index: number) => {
    if (index !== activeStepIndex) {
      const newStepId = stepConfig[index]?.id;
      const needsCanvas = newStepId === 'design' || newStepId === 'review';
      
      setDirection(getDirection(index, null));
      setActiveStepIndex(index);
      setActiveHalfStep(null); // Clear half step when clicking main step
      
      // Update showCanvas immediately based on new step
      setShowCanvas(needsCanvas);
    } else if (activeHalfStep !== null) {
      // If clicking the same step but we're in a half step, return to main step
      setActiveHalfStep(null);
      setDirection(getDirection(activeStepIndex, null));
    }
  };

  const handleHalfStepClick = (halfStepId: string) => {
    // Check if half step is available (e.g., friends must be selected for team-invite-message)
    if (halfStepId === 'team-invite-message' && wizardState.team.selectedFriends.length === 0) {
      return; // Don't navigate if prerequisites not met
    }
    
    setActiveHalfStep(halfStepId);
    setDirection(getDirection(activeStepIndex, halfStepId));
  };

  // Helper function to get step component by index
  const getStepComponent = (index: number) => {
    // If in a half step, render the half step component
    if (activeHalfStep === 'team-invite-message' && stepConfig[index]?.id === 'team') {
      return (
        <TeamInviteMessageStep
          wizardState={wizardState}
          onChange={(data) => updateWizard('team', data)}
        />
      );
    }
    
    const stepId = stepConfig[index]?.id;
    if (!stepId) return null;
    
    switch (stepId) {
      case 'basic':
        return (
          <BasicInfoStep
            wizardState={wizardState}
            onChange={(data) => updateWizard('basic', data)}
            onBookWizard={handleBookWizard}
            onBlankCanvas={handleBlankCanvas}
            isSubmitting={isSubmitting}
          />
        );
      case 'design':
        return (
          <DesignStep
            wizardState={wizardState}
            onChange={(data) => updateWizard('design', data)}
          />
        );
      case 'team':
        return (
          <TeamStep
            wizardState={wizardState}
            onTeamChange={(data) => updateWizard('team', data)}
            availableFriends={availableFriends}
          />
        );
      case 'questions':
        return (
          <QuestionsStep
            wizardState={wizardState}
            onQuestionChange={(data) => updateWizard('questions', data)}
            openCustomQuestionModal={() => setCustomQuestionDialogOpen(true)}
          />
        );
      case 'review':
      default:
        return (
          <ReviewStep
            wizardState={wizardState}
            onEdit={(targetId) => {
              const idx = stepConfig.findIndex((step) => step.id === targetId);
              if (idx >= 0) handleStepClick(idx);
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
    }
  };


  return (
    <>
      <style>{`
        @keyframes pulse-button {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 hsl(45 92% 42% / 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px hsl(45 92% 42% / 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 hsl(45 92% 42% / 0);
          }
        }
        
        .animate-pulse-button {
          animation: pulse-button 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div className="w-full h-full bg-muted/20 flex overflow-hidden relative">
        {/* Mobile Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className={`lg:hidden fixed bottom-4 right-4 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full transition shadow-lg ring-2 ring-ring ring-offset-2 ring-offset-background ${
            activeHalfStep === 'team-invite-message'
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
          aria-label="Toggle navigation"
        >
          {(() => {
            // Check if we're on a half-step
            if (activeHalfStep === 'team-invite-message') {
              return <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />;
            }
            
            const currentStep = stepConfig[activeStepIndex];
            if (!currentStep) return <DotIcon />;
            
            // Show the current step icon
            switch (currentStep.id) {
              case 'basic': return <Book className="h-4 w-4" />;
              case 'design': return <PaintbrushVertical className="h-4 w-4" />;
              case 'team': return <Users className="h-4 w-4" />;
              case 'questions': return <MessageCircleQuestionMark className="h-4 w-4" />;
              case 'review': return <BookCheck className="h-4 w-4" />;
              default: return <DotIcon />;
            }
          })()}
        </button>

        {/* Mobile Overlay */}
        {isMobileNavOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileNavOpen(false)}
          />
        )}

        {/* Left Sidebar - Navigation */}
      <div className={`${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static top-0 left-0 w-64 lg:w-40 h-full flex-shrink-0 border-r bg-background flex flex-col h-full z-50 transition-transform duration-300 ease-in-out`}>
        <div className="flex-1 overflow-y-scroll overscroll-contain" style={{ minHeight: 0 }}>
          <div className="py-4 px-2 pt-6">
            <div className="space-y-2 pb-5">
              <StepNavigation
                steps={stepConfig}
                activeStepIndex={activeStepIndex}
                activeHalfStep={activeHalfStep}
                onStepClick={(index) => {
                  handleStepClick(index);
                  setIsMobileNavOpen(false);
                }}
                onHalfStepClick={(halfStepId) => {
                  handleHalfStepClick(halfStepId);
                  setIsMobileNavOpen(false);
                }}
                wizardState={wizardState}
              />
            </div>
            <div className="border-t p-2 space-y-2">
              {(currentStepId !== 'basic' || activeHalfStep !== null) && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={activeHalfStep === null && !canGoBack}
                  className="w-full"
                  size="sm"
                >
                  Back
                </Button>
              )}
              {((currentStepId !== 'basic' && currentStepId !== 'review') || activeHalfStep !== null || wizardState.basic.name.trim().length >= 3) && (
                <Button
                  onClick={currentStepId === 'review' && !activeHalfStep ? handleSubmit : handleNext}
                  disabled={
                    currentStepId === 'review' && !activeHalfStep
                      ? isSubmitting 
                      : currentStepId === 'basic' && !activeHalfStep
                        ? wizardState.basic.name.trim().length < 3 || !canGoNext
                        : activeHalfStep !== null
                          ? false // Half steps always allow navigation
                          : !canGoNext
                  }
                  className={`w-full ${currentStepId === 'review' && !activeHalfStep && !isSubmitting ? 'animate-pulse-button' : ''}`}
                  size="sm"
                  variant={currentStepId === 'review' && !activeHalfStep ? 'highlight' : 'outline'}
                >
                  {currentStepId === 'review' && !activeHalfStep ? (isSubmitting ? 'Creating...' : 'Create') : 'Next'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar relative min-h-0">
        <div className="mx-auto max-w-7xl px-4 py-8 pt-0 lg:px-8 flex flex-col relative h-full">
          {/* Hauptbereich: Layout abhängig vom aktuellen Schritt */}
          <div className="mt-6 relative overflow-hidden h-full">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={`${activeStepIndex}-${activeHalfStep || 'main'}`}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative h-full"
              >
                {currentStepId === 'design' || currentStepId === 'review' ? (
                  <div className="mb-6 grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch h-full">
                    {/* Left: Controls (60%) */}
                    <div className="lg:col-span-3 flex flex-col min-h-0 h-full">
                      {getStepComponent(activeStepIndex)}
                    </div>

                    {/* Right: Live mini editor canvas (40%) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0 relative overflow-hidden h-full">
                      <div className="h-full">
                        {showCanvas && canvasLoaded ? (
                          <motion.div
                            key={`canvas-content-${activeStepIndex}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setPreviewModalOpen(true)}
                            className="cursor-pointer transition-opacity hover:opacity-90 h-full"
                            title="Click to view larger preview"
                          >
                            <MiniEditorCanvas
                              pageSize={wizardState.basic.pageSize}
                              orientation={wizardState.basic.orientation}
                              themeId={wizardState.design.themeId}
                              paletteId={wizardState.design.paletteId ?? getThemePaletteId(wizardState.design.themeId) ?? 'default'}
                              baseTemplate={wizardState.design.layoutTemplate ?? null}
                              pickLeftRight={wizardState.design.pickLeftRight}
                              leftTemplate={wizardState.design.leftLayoutTemplate ?? null}
                              rightTemplate={wizardState.design.rightLayoutTemplate ?? null}
                              mirrorRight={wizardState.design.mirrorLayout && !wizardState.design.pickLeftRight}
                            />
                          </motion.div>
                        ) : showCanvas && !canvasLoaded ? (
                          <div className="h-full flex items-center justify-center bg-muted/20 rounded-2xl">
                            <div className="text-sm text-muted-foreground">Loading preview...</div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center bg-muted/20 rounded-2xl">
                            <div className="text-sm text-muted-foreground opacity-0">Placeholder</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 h-full">
                    {getStepComponent(activeStepIndex)}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Dialog open={customQuestionDialogOpen} onOpenChange={setCustomQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Question text">
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={customQuestionDraft}
                onChange={(e) => setCustomQuestionDraft(e.target.value)}
                placeholder="What would you like to ask?"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCustomQuestionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomQuestion}>
                Add question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-6 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Live Preview</DialogTitle>
          </DialogHeader>
          <div className="w-full  mt-4 flex-1 min-h-0" style={{ overflow: 'auto', position: 'relative' }}>
            <div
              className="w-full h-full rounded-lg"
              style={{
                position: 'relative',
              }}
            >
              <style>
                {`
                  .preview-modal div.absolute.z-20 { display: none !important; }
                  .preview-modal .pointer-events-none.absolute.z-20 { display: none !important; }
                  .preview-modal .mini-editor-preview { height: 100% !important; }
                `}
              </style>
              <div className="preview-modal w-full h-full">
                <MiniEditorCanvas
                  pageSize={wizardState.basic.pageSize}
                  orientation={wizardState.basic.orientation}
                  themeId={wizardState.design.themeId}
                  paletteId={wizardState.design.paletteId ?? getThemePaletteId(wizardState.design.themeId) ?? 'default'}
                  baseTemplate={wizardState.design.layoutTemplate ?? null}
                  pickLeftRight={wizardState.design.pickLeftRight}
                  leftTemplate={wizardState.design.leftLayoutTemplate ?? null}
                  rightTemplate={wizardState.design.rightLayoutTemplate ?? null}
                  mirrorRight={wizardState.design.mirrorLayout && !wizardState.design.pickLeftRight}
                  className="border-0 shadow-none p-0 h-full"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}

function StepNavigation({
  steps,
  activeStepIndex,
  activeHalfStep,
  onStepClick,
  onHalfStepClick,
  wizardState,
}: {
  steps: typeof stepConfig;
  activeStepIndex: number;
  activeHalfStep: string | null;
  onStepClick: (index: number) => void;
  onHalfStepClick: (halfStepId: string) => void;
  wizardState: WizardState;
}) {
  const canAccessStep = (index: number) => {
    const hasBasic = wizardState.basic.name.trim().length > 0;
    const hasDesign = hasBasic && wizardState.design.layoutTemplate !== null;
    if (index === 0) return true;
    if (index === 1) return hasBasic;
    const step = steps[index];
    if (!step) return false;
    if (['team', 'questions', 'review'].includes(step.id)) {
    return hasDesign;
    }
    return false;
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {steps.map((step, index) => {
        const isActive = index === activeStepIndex;
        const isCompleted = index < activeStepIndex;
        const isAccessible = canAccessStep(index);

        const icon = (() => {
          switch (step.id) {
            case 'basic': return <Book className="h-4 w-4" />;
            case 'design': return <PaintbrushVertical className="h-4 w-4" />;
            case 'team': return <Users className="h-4 w-4" />;
            case 'questions': return <MessageCircleQuestionMark className="h-4 w-4" />;
            case 'review': return <BookCheck className="h-4 w-4" />;
            default: return <DotIcon />;
          }
        })();

        const showSeparator = index !== steps.length - 1;

        return (
          <div key={step.id} className="relative flex flex-col items-center w-full">
            {/* Dot button */}
            <button
              type="button"
              onClick={() => isAccessible && onStepClick(index)}
              disabled={!isAccessible}
              className={`z-10 inline-flex h-9 w-9 items-center justify-center rounded-full transition
                ${isActive || isCompleted ? 'bg-primary text-primary-foreground' : 'border border-input bg-background text-foreground'}
                ${isAccessible 
                  ? (isActive || isCompleted ? 'hover:bg-primary/80' : 'hover:bg-muted')
                  : 'opacity-50 cursor-not-allowed'}
                ${isActive ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''}
              `}
              aria-label={step.label}
              title={step.label}
            >
              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : icon}
            </button>



            {/* Labels */}
            <div className="mt-1 flex flex-row justify-center items-center text-center w-full">
              <span className={`text-xs font-semibold transition leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {/* {'optional' in step && step.optional && (
                <span className={`text-[10px] transition mt-0.5 ml-1 ${isActive ? 'text-primary/70' : 'text-muted-foreground'}`}>
                  Opt
                </span>
              )} */}
            </div>
            {/* Separator circle */}
            {showSeparator && (
              <div className="mt-2 mb-2">
                {step.id === 'team' && wizardState.team.selectedFriends.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onHalfStepClick('team-invite-message')}
                    className={`h-2.5 w-2.5 rounded-full border transition p-0 m-0 ${
                      activeHalfStep === 'team-invite-message'
                        ? 'bg-primary border-primary ring-2 ring-ring ring-offset-2 ring-offset-background'
                        : index < activeStepIndex
                          ? 'bg-primary border-muted-foreground/30'
                          : 'bg-white border-muted-foreground/30'
                    } hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background`}
                    title="Invite message"
                    style={{ display: 'block', margin: 0, padding: 0 }}
                  />
                ) : (
                  <div className={`h-2.5 w-2.5 rounded-full border border-muted-foreground/30 ${
                    index < activeStepIndex ? 'bg-primary' : 'bg-white'
                  }`} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DotIcon() {
  return <div className="h-1.5 w-1.5 rounded-full bg-current" />;
}

// BookSummaryCard removed in the new layout

