import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Book, PaintbrushVertical, BookCheck, Users, MessageCircleQuestionMark } from 'lucide-react';
import { Button } from '../../components/ui/primitives/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { FormField } from '../../components/ui/layout/form-field';
import { apiService } from '../../services/api';
import { pageTemplates as builtinPageTemplates } from '../../data/templates/page-templates';
import themesData from '../../data/templates/themes.json';
import MiniEditorCanvas from '../../components/features/editor/preview/mini-editor-canvas';
import { mirrorTemplate } from '../../utils/layout-mirroring';
import { getThemePaletteId } from '../../utils/global-themes';
import { BasicInfoStep } from '../../components/features/books/create/basic-info-step';
import { DesignStep } from '../../components/features/books/create/design-step';
import { TeamStep } from '../../components/features/books/create/team-step';
import { QuestionsStep } from '../../components/features/books/create/questions-step';
import { ReviewStep } from '../../components/features/books/create/review-step';
import type { WizardState, Friend } from '../../components/features/books/create/types';
import {
  curatedQuestions as curatedQuestionsList,
  getDefaultTeamAssignmentState,
  DEFAULT_ASSIGNMENT_PAGE_COUNT,
} from '../../components/features/books/create/types';
import { convertTemplateToElements } from '../../utils/template-to-elements';
import { calculatePageDimensions } from '../../utils/template-utils';

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
  },
  questions: {
    selectedDefaults: [],
    custom: [],
  },
};

export default function BookCreatePage() {
  const [wizardState, setWizardState] = useState<WizardState>(initialState);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [customQuestionDialogOpen, setCustomQuestionDialogOpen] = useState(false);
  const [customQuestionDraft, setCustomQuestionDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
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

  const currentStepId = stepConfig[activeStepIndex].id;

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
      
      // Generate pagePairId for pages (same logic as handleSubmit)
      const getPagePairId = (pageNumber: number, pageType: string) => {
        if (pageType === 'back-cover' || pageType === 'front-cover') {
          return 'spread-cover';
        }
        if (pageType === 'inner-front') {
          return 'spread-intro-0';
        }
        if (pageType === 'inner-back') {
          return 'spread-outro-last';
        }
        if (pageNumber === totalPages - 1) {
          return 'spread-outro-last';
        }
        if (pageNumber === 4) {
          return 'spread-intro-0';
        }
        const contentPageIndex = pageNumber - 4;
        const pairIndex = Math.floor((contentPageIndex - 1) / 2);
        return `spread-content-${pairIndex}`;
      };
      
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
          pagePairId: getPagePairId(i, pageType),
          isPrintable: isPrintedPage,
          isLocked: isInnerPage,
          isSpecialPage: pageType === 'back-cover' || pageType === 'front-cover' || pageType === 'inner-front' || pageType === 'inner-back',
          layoutVariation: 'normal',
          // Explicitly set background to null (not undefined) for Inner Front and Inner Back to prevent inheritance
          background: shouldHaveThemeAndBackground ? background : null,
          backgroundTransform: null,
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
    updateWizard('questions', {
      custom: [
        ...wizardState.questions.custom,
        { id: `custom-${Date.now()}`, text: customQuestionDraft.trim() },
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
      const numUsers = wizardState.team.selectedFriends.length;
      const specialPages = 4; // Front Cover, Back Cover, Inner Front, Inner Back
      const calculatedPages = (wizardState.team.pagesPerUser || 1) * numUsers - specialPages;
      const plannedPages = wizardState.team.assignmentState?.totalPages ?? DEFAULT_ASSIGNMENT_PAGE_COUNT;
      const normalizeToEven = (value: number) => (value % 2 === 0 ? value : value + 1);
      const initialPageCount = normalizeToEven(Math.max(DEFAULT_ASSIGNMENT_PAGE_COUNT, calculatedPages, plannedPages));

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
      
      // Generate pagePairId for pages
      // Pages are paired: (1,2), (3,4), (5,6), ..., (totalPages-1, totalPages)
      // Special pages get their own pair IDs based on their spread type
      const getPagePairId = (pageNumber: number, pageType: string) => {
        if (pageType === 'back-cover' || pageType === 'front-cover') {
          return 'spread-cover';
        }
        if (pageType === 'inner-front') {
          // Inner Front (page 3) pairs with the first content page (page 4)
          return 'spread-intro-0';
        }
        if (pageType === 'inner-back') {
          // Inner Back (last page) pairs with the last content page (totalPages - 1)
          return 'spread-outro-last';
        }
        // Regular content pages: pair them starting from page 4
        // Page 4-5: spread-content-0, Page 6-7: spread-content-1, etc.
        // But the last content page (totalPages - 1) pairs with Inner Back (totalPages)
        if (pageNumber === totalPages - 1) {
          // Last content page pairs with Inner Back
          return 'spread-outro-last';
        }
        // Content pages: pair them starting from page 4
        // Page 4-5: spread-content-0, Page 6-7: spread-content-1, etc.
        // But page 4 pairs with Inner Front (page 3)
        if (pageNumber === 4) {
          return 'spread-intro-0';
        }
        // For pages 5 onwards (except the last content page):
        // Page 5: spread-content-0 (pairs with page 6 if it exists, otherwise standalone)
        // Page 6-7: spread-content-1, Page 8-9: spread-content-2, etc.
        const contentPageIndex = pageNumber - 4; // Page 5 -> 1, Page 6 -> 2, Page 7 -> 3, etc.
        const pairIndex = Math.floor((contentPageIndex - 1) / 2); // Page 5-6 -> 0, Page 7-8 -> 1, etc.
        return `spread-content-${pairIndex}`;
      };
      
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

        pages.push({
          pageNumber: i,
          elements: shouldHaveLayoutTemplate ? convertTemplateToElements(templateForPage, canvasSize) : [],
          layoutTemplateId: templateForPage ? templateForPage.id : null,
          // Explicitly set themeId to null for Inner Front and Inner Back to prevent inheritance
          themeId: shouldHaveThemeAndBackground ? undefined : null,
          colorPaletteId: shouldHaveThemeAndBackground 
            ? wizardState.design.paletteId // null means "Theme's Default Palette"
            : null,
          pageType,
          pagePairId: getPagePairId(i, pageType),
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
                  book_role: 'author',
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
      } else if (validFriends.length > 0 && wizardState.team.pagesPerUser) {
        const pagesPerUser = wizardState.team.pagesPerUser;
        const assignments: Array<{ pageNumber: number; userId: number }> = [];

        const firstContentPage = 5;
        const lastContentPage = totalPages - 1;
        let currentPage = firstContentPage;

        const ensureOddStart = (page: number) => (page % 2 === 0 ? page + 1 : page);

        for (const friend of validFriends) {
          if (pagesPerUser === 1) {
            if (currentPage <= lastContentPage) {
              assignments.push({ pageNumber: currentPage, userId: friend.id });
              currentPage++;
            }
          } else if (pagesPerUser === 2) {
            if (currentPage <= lastContentPage) {
              const oddPage = ensureOddStart(currentPage);
              const evenPage = oddPage + 1;
              if (oddPage <= lastContentPage) assignments.push({ pageNumber: oddPage, userId: friend.id });
              if (evenPage <= lastContentPage) assignments.push({ pageNumber: evenPage, userId: friend.id });
              currentPage = evenPage + 1;
            }
          } else if (pagesPerUser === 3) {
            for (let i = 0; i < 3 && currentPage <= lastContentPage; i++) {
              assignments.push({ pageNumber: currentPage, userId: friend.id });
              currentPage++;
            }
          } else if (pagesPerUser === 4) {
            if (currentPage <= lastContentPage) {
              const startPage = ensureOddStart(currentPage);
              for (let i = 0; i < 4; i++) {
                const pageNumber = startPage + i;
                if (pageNumber <= lastContentPage) {
                  assignments.push({ pageNumber, userId: friend.id });
                }
              }
              currentPage = startPage + 4;
            }
          }
        }

        const filteredAssignments = assignments.filter(
          (assignment) => assignment.pageNumber > 2 && assignment.pageNumber < totalPages,
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

      // Create curated questions
      for (const questionId of wizardState.questions.selectedDefaults) {
        const question = curatedQuestionsList.find((q) => q.id === questionId);
        if (question) {
          await apiService.createQuestion(newBook.id, question.text);
        }
      }

      for (const custom of wizardState.questions.custom) {
        await apiService.createQuestion(newBook.id, custom.text);
      }

      navigate(`/editor/${newBook.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = (() => {
    switch (currentStepId) {
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
              if (idx >= 0) setActiveStepIndex(idx);
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
    }
  })();

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
    if (canGoBack) {
      setActiveStepIndex(activeStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setActiveStepIndex(activeStepIndex + 1);
    }
  };

  return (
    <div className="w-full h-screen bg-muted/20 flex flex-col overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 pt-0 lg:px-8">
          {/* Hauptbereich: Layout abhängig vom aktuellen Schritt */}
          {currentStepId === 'design' || currentStepId === 'review' ? (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Controls (60%) */}
              <div className="lg:col-span-3">
                {currentStep}
              </div>

              {/* Right: Live mini editor canvas (40%) */}
              <div className="lg:col-span-2">
                <div 
                  onClick={() => setPreviewModalOpen(true)}
                  className="cursor-pointer transition-opacity hover:opacity-90"
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
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {currentStep}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer - Fixed at bottom */}
      <div className="w-full border-t bg-background fixed bottom-0 left-0 right-0 z-10">
        <div className="mx-auto max-w-7xl px-4 pb-1 pt-2 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Back button - hidden on Basic Info step but retains width */}
            <div className="min-w-[100px]">
              {currentStepId !== 'basic' && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={!canGoBack}
                  className="w-full"
                >
                  Back
                </Button>
              )}
            </div>
            {/* Step Navigation - always visible, consistent width */}
            <div className="flex-1">
              <StepNavigation
                steps={stepConfig}
                activeStepIndex={activeStepIndex}
                onStepClick={setActiveStepIndex}
                wizardState={wizardState}
              />
            </div>
            {/* Next button / Create Book button - hidden on Basic Info step but retains width */}
            <div className="min-w-[100px]">
              {currentStepId !== 'basic' && (
                <Button
                  onClick={currentStepId === 'review' ? handleSubmit : handleNext}
                  disabled={currentStepId === 'review' ? isSubmitting : !canGoNext}
                  className="w-full"
                >
                  {currentStepId === 'review' ? (isSubmitting ? 'Creating...' : 'Create Book') : 'Next'}
                </Button>
              )}
            </div>
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
  );
}

function StepNavigation({
  steps,
  activeStepIndex,
  onStepClick,
  wizardState,
}: {
  steps: typeof stepConfig;
  activeStepIndex: number;
  onStepClick: (index: number) => void;
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
    <div className="w-full">
      {/* <div className="rounded-2xl bg-white shadow-sm border p-1 pt-2"> */}
        <div className="flex w-full items-start gap-2">
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

            const StepDot = () => (
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
            );

            const showSeparator = index !== steps.length - 1;

            return (
              <div key={step.id} className="relative flex w-full flex-col items-center justify-center">
                {/* Dot button */}
                <StepDot />

                {/* Separator line */}
                {showSeparator && (
                  <div className="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 h-0.5 rounded-full bg-muted" />
                )}

                {/* Labels */}
                <div className="mt-1 flex flex-col items-center text-center">
                  <span className={`text-sm font-semibold transition ${isActive ? 'text-primary' : ''}`}>
                    {step.label}
                  </span>
                  {/* {'optional' in step && step.optional && (
                    <span className={`text-xs transition ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      Optional
                    </span>
                  )} */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    // </div>
  );
}

function DotIcon() {
  return <div className="h-1.5 w-1.5 rounded-full bg-current" />;
}

// BookSummaryCard removed in the new layout

