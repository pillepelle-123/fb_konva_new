import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, CheckCircle2, Palette, Layout, Sparkles, ChevronRight, Star, Info, Book, PaintbrushVertical, BookCheck, GalleryHorizontal, LayoutGrid } from 'lucide-react';
import { Button } from '../../components/ui/primitives/button';
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { FormField } from '../../components/ui/layout/form-field';
import { Badge } from '../../components/ui/composites/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../../components/ui/composites/carousel';
import { colorPalettes } from '../../data/templates/color-palettes';
import { pageTemplates as builtinPageTemplates } from '../../data/templates/page-templates';
import themesData from '../../data/templates/themes.json';
import { apiService } from '../../services/api';
import type { PageTemplate } from '../../types/template-types';
import { LayoutTemplatePreview } from '../../components/features/editor/templates/layout-selector';
import MiniEditorCanvas from '../../components/features/editor/preview/mini-editor-canvas';
import { mirrorTemplate } from '../../utils/layout-mirroring';
import { getThemePaletteId } from '../../utils/global-themes';

type Friend = {
  id: number;
  name: string;
  email?: string;
  role?: string;
};

type InviteDraft = {
  id: string;
  name: string;
  email: string;
};

type QuestionChoice = {
  id: string;
  text: string;
};

type CustomQuestion = {
  id: string;
  text: string;
};

type WizardState = {
  basic: {
    name: string;
    pageSize: 'A4' | 'A5';
    orientation: 'portrait' | 'landscape';
    presetId: string | null;
    startMode: 'preset' | 'assistant' | 'custom';
  };
  design: {
    layoutTemplate?: PageTemplate | null;
    leftLayoutTemplate?: PageTemplate | null;
    rightLayoutTemplate?: PageTemplate | null;
    mirrorLayout: boolean;
    pickLeftRight: boolean;
    randomizeLayout: boolean;
    themeId: string;
    paletteId: string | null; // null means "Theme's Default Palette"
  };
  team: {
    selectedFriends: Friend[];
    invites: InviteDraft[];
    enableGroupChat: boolean;
    pagesPerUser: 1 | 2 | 3;
  };
  questions: {
    selectedDefaults: string[];
    custom: CustomQuestion[];
  };
};

const curatedQuestions: QuestionChoice[] = [
  { id: 'nickname', text: 'What is your nickname?' },
  { id: 'favoriteColor', text: 'What is your favorite color?' },
  { id: 'dreamJob', text: 'What is your dream job?' },
  { id: 'bestMemory', text: 'Share your favorite memory with me.' },
  { id: 'hiddenTalent', text: 'Do you have a hidden talent?' },
];


const stepConfig = [
  { id: 'basic', label: 'Basic Info & Start', description: 'Name, size, and quick presets' },
  { id: 'design', label: 'Design', description: 'Layouts, toggles, themes & palettes' },
  { id: 'team', label: 'Team & Content', description: 'Collaborators and question pool', optional: true },
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
  const navigate = useNavigate();

  useEffect(() => {
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
          initialPageCount: 24,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create book');
      }

      const newBook = await response.json();
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
      // Calculate initial page count based on pagesPerUser and selected friends
      const numUsers = wizardState.team.selectedFriends.length;
      const specialPages = 4; // Front Cover, Back Cover, Inner Front, Inner Back
      const calculatedPages = (wizardState.team.pagesPerUser || 1) * numUsers - specialPages;
      const initialPageCount = Math.max(24, calculatedPages);

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

      // Helper: convert PageTemplate → elements (text + placeholders)
      const mapTemplateToElements = (tpl: PageTemplate | null) => {
        if (!tpl) return [] as Array<Record<string, unknown>>;
        type TB = {
          position?: { x: number; y: number };
          size?: { width: number; height: number };
          layoutVariant?: string;
          questionPosition?: string;
          questionWidth?: number;
          format?: { textAlign?: string; padding?: number };
          padding?: number;
          paragraphSpacing?: string;
          cornerRadius?: number;
        };
        const textEls =
          ((tpl.textboxes as unknown as TB[]) || []).map((tb, idx: number) => ({
            id: `tb-${idx}-${Math.random().toString(36).slice(2)}`,
            type: 'text',
            textType: 'qna_inline' as const,
            x: tb.position?.x ?? 0,
            y: tb.position?.y ?? 0,
            width: tb.size?.width ?? 0,
            height: tb.size?.height ?? 0,
            layoutVariant: tb.layoutVariant ?? 'inline',
            questionPosition: tb.questionPosition ?? 'left',
            questionWidth: tb.questionWidth ?? 40,
            padding: tb?.format?.padding ?? tb?.padding ?? 8,
            format: { textAlign: tb?.format?.textAlign ?? 'left', paragraphSpacing: tb?.paragraphSpacing ?? 'small' },
            paragraphSpacing: tb?.paragraphSpacing ?? 'small',
            cornerRadius: tb?.cornerRadius ?? 8,
          })) as Array<Record<string, unknown>>;
        type ImgEl = {
          type: string;
          position?: { x: number; y: number };
          size?: { width: number; height: number };
          style?: { cornerRadius?: number };
        };
        const imgEls =
          ((tpl.elements as unknown as ImgEl[]) || [])
            .filter((el) => el.type === 'image')
            .map((el, idx: number) => ({
              id: `ph-${idx}-${Math.random().toString(36).slice(2)}`,
              type: 'placeholder' as const,
              x: el.position?.x ?? 0,
              y: el.position?.y ?? 0,
              width: el.size?.width ?? 0,
              height: el.size?.height ?? 0,
              cornerRadius: el?.style?.cornerRadius ?? 0,
            })) as Array<Record<string, unknown>>;
        return [...textEls, ...imgEls];
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

        // Back Cover and Front Cover: NO layout template (no elements), but can have theme/background
        // Inner Front and Inner Back: NO layout, NO theme, NO background (plain white)
        // All other pages (including page 4): apply layout/theme/background
        const shouldHaveLayoutTemplate = !isBackCover && !isFrontCover && !isInnerFront && !isInnerBack;
        const shouldHaveThemeAndBackground = !isInnerFront && !isInnerBack;
        
        const isRightPage = i % 2 === 0 ? false : true; // odd pages right, even left (spread)
        const templateForPage = shouldHaveLayoutTemplate ? (isRightPage ? rightResolved : leftResolved) : null;

        pages.push({
          pageNumber: i,
          elements: shouldHaveLayoutTemplate ? mapTemplateToElements(templateForPage) : [],
          layoutTemplateId: templateForPage ? templateForPage.id : null,
          // Explicitly set themeId to null for Inner Front and Inner Back to prevent inheritance
          themeId: shouldHaveThemeAndBackground ? undefined : null,
          colorPaletteId: shouldHaveThemeAndBackground 
            ? wizardState.design.paletteId // null means "Theme's Default Palette"
            : null,
          pageType,
          pagePairId: getPagePairId(i, pageType),
          isPrintable: true,
          isLocked: false,
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

      // Attach collaborators
      await Promise.all(
        wizardState.team.selectedFriends.map(async (friend) => {
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
          } catch (error) {
            console.warn('Failed to add friend', friend.id, error);
          }
        }),
      );

      // Create curated questions
      for (const questionId of wizardState.questions.selectedDefaults) {
        const question = curatedQuestions.find((q) => q.id === questionId);
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
          <BasicStep
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
          <TeamContentStep
            wizardState={wizardState}
            onTeamChange={(data) => updateWizard('team', data)}
            onQuestionChange={(data) => updateWizard('questions', data)}
            availableFriends={availableFriends}
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

  return (
    <div className="w-full min-h-screen bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <StepNavigation
          steps={stepConfig}
          activeStepIndex={activeStepIndex}
          onStepClick={setActiveStepIndex}
          wizardState={wizardState}
        />

        {/* Hauptbereich unterhalb des Steppers: Layout abhängig vom aktuellen Schritt */}
        {currentStepId === 'design' || currentStepId === 'review' ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Controls (60%) */}
            <div className="lg:col-span-3">
              {currentStep}
            </div>

            {/* Right: Live mini editor canvas (40%) */}
            <div className="lg:col-span-2">
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
        ) : (
          <div className="mt-6">
            {currentStep}
          </div>
        )}
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
    if (index === 0) return true; // Basic step always accessible
    if (index === 1) return wizardState.basic.name.trim().length > 0; // Design step needs book name
    if (index === 2) return wizardState.basic.name.trim().length > 0 && wizardState.design.layoutTemplate !== null; // Team step needs basic + design
    if (index === 3) return wizardState.basic.name.trim().length > 0 && wizardState.design.layoutTemplate !== null; // Review step needs basic + design
    return false;
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl bg-white shadow-sm border p-4">
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
                  ${isAccessible ? 'hover:bg-muted' : 'opacity-50 cursor-not-allowed'}
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
                <div className="mt-5 flex flex-col items-center text-center">
                  <span className={`text-sm font-semibold transition lg:text-base ${isActive ? 'text-primary' : ''}`}>
                    {step.label}
                  </span>
                  {'optional' in step && step.optional && (
                    <span className={`text-xs transition ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      Optional
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DotIcon() {
  return <div className="h-1.5 w-1.5 rounded-full bg-current" />;
}

function BasicStep({
  wizardState,
  onChange,
  onBookWizard,
  onBlankCanvas,
  isSubmitting,
}: {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['basic']>) => void;
  onBookWizard: () => void;
  onBlankCanvas: () => void;
  isSubmitting: boolean;
}) {
  const hasBookName = wizardState.basic.name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow-sm border p-6 space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Basic setup</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Name your book, select size & orientation, then choose how to start.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Book name">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={wizardState.basic.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="E.g. Class of 2025"
            />
          </FormField>
          <FormField label="Orientation">
            <div className="flex gap-2">
              {['portrait', 'landscape'].map((option) => (
                <Button
                  key={option}
                  variant={wizardState.basic.orientation === option ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => onChange({ orientation: option as WizardState['basic']['orientation'] })}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Button>
              ))}
            </div>
          </FormField>
          <FormField label="Page size">
            <div className="flex gap-2">
              {['A4', 'A5'].map((size) => (
                <Button
                  key={size}
                  variant={wizardState.basic.pageSize === size ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => onChange({ pageSize: size as WizardState['basic']['pageSize'] })}
                >
                  {size}
                </Button>
              ))}
            </div>
          </FormField>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            onClick={onBookWizard}
            disabled={!hasBookName || isSubmitting}
            variant="highlight"
            size="lg"
            className="h-auto py-6 px-6 flex flex-col items-start text-left"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5" />
              <p className="font-semibold text-base">Book Wizard</p>
            </div>
            <p className="text-xs opacity-90">Continue through the wizard to customize your book</p>
          </Button>
          <Button
            onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            variant="outline"
            className="h-auto py-6 px-6 flex flex-col items-start text-left"
          >
            <p className="font-semibold mb-1">Blank Canvas</p>
            <p className="text-xs text-muted-foreground">Skip the wizard, create a book with blank pages and start editing</p>
          </Button>
        </div>
      </div>
    </div>
  );
}

function DesignStep({
  wizardState,
  onChange,
}: {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['design']>) => void;
}) {
  const [paletteCarouselApi, setPaletteCarouselApi] = useState<CarouselApi>();
  const [themeViewMode, setThemeViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [paletteViewMode, setPaletteViewMode] = useState<'carousel' | 'grid'>('carousel');

  const themeEntries = useMemo(() => {
    return Object.entries(themesData as Record<string, { name: string; description: string; palette?: string }>).map(([id, theme]) => ({
      id,
      name: theme.name ?? id,
      description: theme.description ?? 'Custom theme',
      paletteId: theme.palette ?? 'default',
    }));
  }, []);

  // Get theme's default palette ID for current theme
  const currentThemePaletteId = useMemo(() => {
    return getThemePaletteId(wizardState.design.themeId) ?? 'default';
  }, [wizardState.design.themeId]);

  // Build palette list with "Theme's Default Palette" as first entry
  const paletteEntries = useMemo(() => {
    const themePalette = colorPalettes.find(p => p.id === currentThemePaletteId);
    const otherPalettes = colorPalettes.filter(p => p.id !== currentThemePaletteId);
    
    // First entry: "Theme's Default Palette" (virtual entry)
    const themeDefaultEntry = {
      id: null as string | null, // null indicates "Theme's Default Palette"
      name: themePalette?.name || 'Default', // Show actual palette name
      subtitle: "Theme's Default Palette", // Show as subtitle
      colors: themePalette?.colors || colorPalettes[0].colors,
      isThemeDefault: true,
    };
    
    return [themeDefaultEntry, ...otherPalettes];
  }, [currentThemePaletteId]);

  // Function to select Theme's Default Palette and scroll to it
  const handleSelectThemeDefaultPalette = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent theme selection when clicking the palette button
    onChange({ paletteId: null });
    // Scroll to first item (Theme's Default Palette) - index 0
    if (paletteCarouselApi) {
      paletteCarouselApi.scrollTo(0);
    }
  };

  // Derived template/palette (previously used in Layout Preview; no longer rendered here)
  // Kept minimal for potential future validation, currently unused.

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left pane (replaces old Layout Preview) — Design workspace (1/3) */}
      <div className="w-full lg:w-1/3 flex-shrink-0">
        <div className="rounded-2xl bg-white shadow-sm border p-4 sticky lg:top-24 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Layout</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Choose layout templates and toggle mirrored/paired spreads.
            </p>
          </div>

          {/* Layout templates (compact grid) */}
          <div className="grid gap-3 grid-cols-2">
            {featuredTemplates.map((template) => {
              const isSelectedLeft = wizardState.design.leftLayoutTemplate?.id === template.id;
              const isSelectedRight = wizardState.design.rightLayoutTemplate?.id === template.id;
              const isSelected = !wizardState.design.pickLeftRight && wizardState.design.layoutTemplate?.id === template.id;
              
              const handleLeftCheckboxChange = (checked: boolean) => {
                if (checked) {
                  // Wenn bereits ein anderes Template für Left ausgewählt ist, wird es ersetzt
                  onChange({ leftLayoutTemplate: template });
                } else {
                  // Wenn dieses Template für Left deaktiviert wird
                  onChange({ leftLayoutTemplate: null });
                }
              };

              const handleRightCheckboxChange = (checked: boolean) => {
                if (checked) {
                  // Wenn bereits ein anderes Template für Right ausgewählt ist, wird es ersetzt
                  onChange({ rightLayoutTemplate: template });
                } else {
                  // Wenn dieses Template für Right deaktiviert wird
                  onChange({ rightLayoutTemplate: null });
                }
              };

              return (
                <div
                  key={template.id}
                  className={`rounded-xl border p-2 transition hover:shadow-sm aspect-[3/4] flex items-center justify-center relative ${
                    isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary' : 
                    isSelectedLeft || isSelectedRight ? 'border-primary/50 bg-primary/5' :
                    'border-border bg-card'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (!wizardState.design.pickLeftRight) {
                        onChange({ layoutTemplate: template, leftLayoutTemplate: null, rightLayoutTemplate: null });
                      }
                    }}
                    className="w-full h-full flex items-center justify-center"
                    title={template.name}
                  >
                    <div className="w-full max-w-[60px]">
                      <LayoutTemplatePreview 
                        template={template} 
                        showLegend={false}
                        showItemLabels={false}
                      />
                    </div>
                  </button>
                  
                  {/* Checkboxen nur anzeigen, wenn "Pick Left & Right" aktiv ist */}
                  {wizardState.design.pickLeftRight && (
                    <>
                      {/* L-Checkbox oben links */}
                      <div 
                        className="absolute top-1 left-1 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CheckboxPrimitive.Root
                          checked={isSelectedLeft}
                          onCheckedChange={handleLeftCheckboxChange}
                          className="h-5 w-5 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex items-center justify-center"
                        >
                          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current text-[10px] font-semibold">
                            L
                          </CheckboxPrimitive.Indicator>
                        </CheckboxPrimitive.Root>
                      </div>
                      {/* R-Checkbox oben rechts */}
                      <div 
                        className="absolute top-1 right-1 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CheckboxPrimitive.Root
                          checked={isSelectedRight}
                          onCheckedChange={handleRightCheckboxChange}
                          className="h-5 w-5 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex items-center justify-center"
                        >
                          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current text-[10px] font-semibold">
                            R
                          </CheckboxPrimitive.Indicator>
                        </CheckboxPrimitive.Root>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-2">
            <TogglePill
              active={wizardState.design.mirrorLayout && !wizardState.design.pickLeftRight}
              label="Mirror right page"
              onClick={() => {
                onChange({ 
                  mirrorLayout: !wizardState.design.mirrorLayout,
                  pickLeftRight: false,
                  leftLayoutTemplate: null,
                  rightLayoutTemplate: null,
                });
              }}
            />
            <TogglePill
              active={wizardState.design.pickLeftRight}
              label="Pick Left & Right"
              onClick={() => {
                const newPickLeftRight = !wizardState.design.pickLeftRight;
                onChange({ 
                  pickLeftRight: newPickLeftRight,
                  mirrorLayout: false,
                  leftLayoutTemplate: newPickLeftRight ? wizardState.design.layoutTemplate || null : null,
                  rightLayoutTemplate: newPickLeftRight ? null : null,
                });
              }}
            />
            <TogglePill
              active={wizardState.design.randomizeLayout}
              label="Randomize spreads"
              onClick={() => onChange({ randomizeLayout: !wizardState.design.randomizeLayout })}
            />
          </div>
        </div>
      </div>

      {/* Right pane (where Design workspace was) — Theme & Color Palette (2/3) */}
      <div className="w-full lg:w-2/3 min-w-0 rounded-2xl bg-white shadow-sm border p-6 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Theme & Color Palette
          </div>

          {/* Theme carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Themes</span>
              <Button
                type="button"
                variant="ghost"
                size="xxs"
                onClick={() => setThemeViewMode(themeViewMode === 'carousel' ? 'grid' : 'carousel')}
                className="h-6 w-6 p-0"
                title={themeViewMode === 'carousel' ? 'Show all Themes in Grid' : 'Themes Carousel'}
              >
                {themeViewMode === 'carousel' ? (
                  <LayoutGrid className="h-5 w-5" />
                ) : (
                  <GalleryHorizontal className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="relative">
              {themeViewMode === 'carousel' ? (
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {themeEntries.map((theme) => {
                      const isActive = wizardState.design.themeId === theme.id;
                      return (
                        <CarouselItem key={theme.id} className="pl-2 basis-full">
                          <button
                            type="button"
                            onClick={() => onChange({ themeId: theme.id })}
                            className={`w-full rounded-xl border p-4 pl-10 text-left transition hover:shadow-sm ${
                              isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                            }`}
                            title={theme.name}
                          >
                            <p className="font-semibold flex items-center gap-2">
                              <Palette className="h-4 w-4 text-primary" />
                              {theme.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{theme.description}</p>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">Default palette:</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="xxs"
                                onClick={handleSelectThemeDefaultPalette}
                                className="h-auto px-1.5 py-0.5 text-[11px] font-medium"
                                title="Select Theme's Default Palette"
                              >
                                {theme.paletteId}
                              </Button>
                            </div>
                          </button>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-thin pr-2">
                  {themeEntries.map((theme) => {
                    const isActive = wizardState.design.themeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onChange({ themeId: theme.id })}
                        className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${
                          isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        title={theme.name}
                      >
                        <p className="font-semibold text-xs flex items-center gap-1.5">
                          <Palette className="h-3 w-3 text-primary" />
                          {theme.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{theme.description}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground">Default:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="xxs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectThemeDefaultPalette(e);
                            }}
                            className="h-auto px-1 py-0.5 text-[10px] font-medium"
                          >
                            {theme.paletteId}
                          </Button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Palette carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Color Palettes</span>
              <Button
                type="button"
                variant="ghost"
                size="xxs"
                onClick={() => setPaletteViewMode(paletteViewMode === 'carousel' ? 'grid' : 'carousel')}
                className="h-6 w-6 p-0"
                title={paletteViewMode === 'carousel' ? 'Show all Color Palettes in Grid' : 'Color Palettes Carousel'}
              >
                {paletteViewMode === 'carousel' ? (
                  <LayoutGrid className="h-5 w-5" />
                ) : (
                  <GalleryHorizontal className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="relative">
              {paletteViewMode === 'carousel' ? (
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                  setApi={setPaletteCarouselApi}
                >
                  <CarouselContent className="-ml-2">
                    {paletteEntries.map((palette) => {
                      // Check if this is the active palette
                      // null paletteId means "Theme's Default Palette"
                      const isActive = palette.id === null 
                        ? wizardState.design.paletteId === null
                        : wizardState.design.paletteId === palette.id;
                      const colorValues = Object.values(palette.colors || {});
                      const hasSubtitle = 'subtitle' in palette && palette.subtitle;
                      return (
                        <CarouselItem key={palette.id ?? 'theme-default'} className="pl-2 basis-full">
                          <button
                            type="button"
                            onClick={() => onChange({ paletteId: palette.id })}
                            className={`w-full rounded-xl border p-4 pl-10 text-left transition hover:shadow-sm ${
                              isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                            }`}
                            title={palette.name}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <p className="font-semibold">{palette.name}</p>
                                {hasSubtitle && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{palette.subtitle}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1">
                              {colorValues.map((hex, idx) => (
                                <span
                                  key={`${palette.id ?? 'theme-default'}-${idx}`}
                                  className="inline-block h-4 w-4 rounded border"
                                  style={{ backgroundColor: hex as string }}
                                  title={hex as string}
                                />
                              ))}
                            </div>
                          </button>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-thin pr-2">
                  {paletteEntries.map((palette) => {
                    const isActive = palette.id === null 
                      ? wizardState.design.paletteId === null
                      : wizardState.design.paletteId === palette.id;
                    const colorValues = Object.values(palette.colors || {});
                    const hasSubtitle = 'subtitle' in palette && palette.subtitle;
                    return (
                      <button
                        key={palette.id ?? 'theme-default'}
                        type="button"
                        onClick={() => onChange({ paletteId: palette.id })}
                        className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${
                          isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        title={palette.name}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="font-semibold text-xs">{palette.name}</p>
                            {hasSubtitle && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{palette.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {colorValues.map((hex, idx) => (
                            <span
                              key={`${palette.id ?? 'theme-default'}-${idx}`}
                              className="inline-block h-3 w-3 rounded border"
                              style={{ backgroundColor: hex as string }}
                              title={hex as string}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs font-medium transition ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
      }`}
    >
      {label}
    </button>
  );
}

function TeamContentStep({
  wizardState,
  onTeamChange,
  onQuestionChange,
  availableFriends,
  openCustomQuestionModal,
}: {
  wizardState: WizardState;
  onTeamChange: (data: Partial<WizardState['team']>) => void;
  onQuestionChange: (data: Partial<WizardState['questions']>) => void;
  availableFriends: Friend[];
  openCustomQuestionModal: () => void;
}) {
  const selectedQuestionIds = wizardState.questions.selectedDefaults;

  const toggleQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      onQuestionChange({
        selectedDefaults: selectedQuestionIds.filter((q) => q !== id),
      });
    } else {
      onQuestionChange({
        selectedDefaults: [...selectedQuestionIds, id],
      });
    }
  };

  const addFriend = (friend: Friend) => {
    if (wizardState.team.selectedFriends.some((f) => f.id === friend.id)) return;
    onTeamChange({
      selectedFriends: [...wizardState.team.selectedFriends, friend],
    });
  };

  const removeFriend = (friendId: number) => {
    onTeamChange({
      selectedFriends: wizardState.team.selectedFriends.filter((friend) => friend.id !== friendId),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Team & Content (optional)</h2>
            <p className="text-sm text-muted-foreground">Invite collaborators and prep the questions they'll answer.</p>
          </div>
        </div>

        {/* Two columns side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Collaborators */}
          <div className="rounded-xl bg-white shadow-sm border p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              Collaborators
              <Badge variant="outline" className="text-[10px]">Optional</Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select friends to invite (they'll receive access after the book is created).</p>
              <div className="flex flex-wrap gap-2">
                {availableFriends.map((friend) => (
                  <Button
                    key={friend.id}
                    variant={wizardState.team.selectedFriends.some((f) => f.id === friend.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => addFriend(friend)}
                  >
                    {friend.name}
                  </Button>
                ))}
              </div>
              {wizardState.team.selectedFriends.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {wizardState.team.selectedFriends.map((friend) => (
                      <Badge key={friend.id} variant="secondary" className="flex items-center gap-2">
                        {friend.name}
                        <button onClick={() => removeFriend(friend.id)} className="text-xs text-muted-foreground hover:text-foreground">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="group-chat"
                  checked={wizardState.team.enableGroupChat}
                  onChange={(e) => onTeamChange({ enableGroupChat: e.target.checked })}
                />
                <label htmlFor="group-chat" className="text-sm text-muted-foreground">
                  Enable messenger group chat for collaborators
                </label>
              </div>

              <div className="mt-3">
                <p className="text-sm font-semibold">Number of pages per user</p>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3].map((n) => (
                    <Button
                      key={n}
                      variant={wizardState.team.pagesPerUser === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTeamChange({ pagesPerUser: n as 1 | 2 | 3 })}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total pages = pages per user × number of selected users − 4 special pages (min. 24)
                </p>
              </div>
            </div>
          </div>

          {/* Right: Question set */}
          <div className="rounded-xl bg-white shadow-sm border p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              Question set
              <Badge variant="outline" className="text-[10px]">Optional</Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select from our curated prompts or add your own.</p>
              <div className="space-y-2">
                {curatedQuestions.map((question) => (
                  <label key={question.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(question.id)}
                      onChange={() => toggleQuestion(question.id)}
                    />
                    <span>{question.text}</span>
                  </label>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={openCustomQuestionModal} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add custom question
              </Button>
              {wizardState.questions.custom.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Custom questions</p>
                  <ul className="text-sm text-muted-foreground list-disc pl-4">
                    {wizardState.questions.custom.map((question) => (
                      <li key={question.id}>{question.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  wizardState,
  onEdit,
  onSubmit,
  isSubmitting,
}: {
  wizardState: WizardState;
  onEdit: (id: typeof stepConfig[number]['id']) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Review & finalize</h2>
          <p className="text-sm text-muted-foreground">Make sure everything looks good before creating the book.</p>
        </div>
      </div>

      <ReviewSection
        title="Basics"
        description={`${wizardState.basic.name} • ${wizardState.basic.pageSize} • ${wizardState.basic.orientation}`}
        onEdit={() => onEdit('basic')}
      />
      <ReviewSection
        title="Design"
        description={`${wizardState.design.layoutTemplate?.name ?? 'Not selected'}, Theme ${wizardState.design.themeId}, Palette ${wizardState.design.paletteId}`}
        onEdit={() => onEdit('design')}
      />
      <ReviewSection
        title="Team & Content"
        description={`${wizardState.team.selectedFriends.length} collaborators • ${wizardState.questions.selectedDefaults.length + wizardState.questions.custom.length} questions`}
        onEdit={() => onEdit('team')}
        optional
      />

      <div className="rounded-xl border border-dashed p-4 flex items-center gap-3 bg-muted/40 text-sm text-muted-foreground">
        <Info className="h-4 w-4 text-primary" />
        You can still invite more friends or tweak questions later inside the editor.
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Creating book...' : 'Create book and open editor'}
      </Button>
    </div>
  );
}

function ReviewSection({
  title,
  description,
  onEdit,
  optional,
}: {
  title: string;
  description: string;
  onEdit: () => void;
  optional?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold flex items-center gap-2">
          {title}
          {optional && (
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Edit
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// BookSummaryCard removed in the new layout

