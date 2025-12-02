import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/auth-context';
import { Button } from '../../../ui/primitives/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { ColorPalette, PageTemplate, QuickTemplate } from '../../../../types/template-types';
import type { Page } from '../../../../context/editor-context';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { getGlobalTheme, getThemePageBackgroundColors } from '../../../../utils/global-themes';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { convertTemplateToElements } from '../../../../utils/template-to-elements';
import { getBackgroundImagesWithUrl } from '../../../../data/templates/background-images';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';
import { calculatePageDimensions } from '../../../../utils/template-utils';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import { mirrorTemplate } from '../../../../utils/layout-mirroring';
import { generateSequentialPairId } from '../../../../utils/book-structure';
import { applyMirroredLayout, applyRandomLayout } from '../../../../utils/layout-variations';
import { deriveLayoutStrategyFlags } from '../../../../utils/layout-strategy';
import { BasicInfoStep } from './steps/basic-info-step';
import { StartModeStep } from './steps/start-mode-step';
import { LayoutPickerStep } from './steps/layout-picker-step';
import { ThemeSelectionStep } from './steps/theme-selection-step';
import { PaletteSelectionStep } from './steps/palette-selection-step';
import { ConfirmationStep } from './steps/confirmation-step';
import { LayoutVariationStep } from './steps/layout-variation-step';
import { AssistedLayoutStep } from './steps/assisted-layout-step';
import { WizardFriendsStep } from './steps/friends-step';
import InviteUserDialog from '../invite-user-dialog';
import type { BookFriend, User } from '../book-manager-content';

const tempBooks = new Map();
const CONTENT_PAIR_COUNT = 11;
const MIN_TOTAL_PAGES = 24;
const MAX_TOTAL_PAGES = 96;

interface CreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type WizardMode = 'pre-designed' | 'assisted' | 'empty' | 'advanced' | null;

interface WizardState {
  name: string;
  pageSize: string;
  orientation: string;
  mode: WizardMode;
  selectedTemplate: PageTemplate | null;
  selectedTheme: string;
  selectedPalette: ColorPalette | null;
  layoutStrategy: 'same' | 'pair' | 'mirrored' | 'random';
  randomMode: 'single' | 'pair';
  assistedLayouts: {
    single: PageTemplate | null;
    left: PageTemplate | null;
    right: PageTemplate | null;
  };
}

export function CreationWizard({ open, onOpenChange, onSuccess }: CreationWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>({
    name: '',
    pageSize: 'A4',
    orientation: 'portrait',
    mode: null,
    selectedTemplate: null,
    selectedTheme: 'default',
    selectedPalette: colorPalettes[0],
    layoutStrategy: 'same',
    randomMode: 'single',
    assistedLayouts: {
      single: null,
      left: null,
      right: null
    }
  });
  const [wizardFriends, setWizardFriends] = useState<BookFriend[]>([]);
  const [wizardFriendInvites, setWizardFriendInvites] = useState<Array<{ name: string; email: string }>>([]);
  const [availableFriends, setAvailableFriends] = useState<User[]>([]);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [showFriendInviteDialog, setShowFriendInviteDialog] = useState(false);
  const [wizardInviteError, setWizardInviteError] = useState('');
  const [wizardGroupChatEnabled, setWizardGroupChatEnabled] = useState(false);

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (!open) return;
    const fetchFriends = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/friendships/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableFriends(data);
        }
      } catch (error) {
        console.warn('Failed to load available friends:', error);
      }
    };
    fetchFriends();
  }, [open]);

  useEffect(() => {
    if (open) return;
    setWizardFriends([]);
    setWizardFriendInvites([]);
    setWizardGroupChatEnabled(false);
    setShowFriendPicker(false);
    setShowFriendInviteDialog(false);
    setWizardInviteError('');
  }, [open]);

  const steps = useMemo(() => {
    switch (wizardState.mode) {
      case 'pre-designed':
        return ['basic', 'mode', 'layout', 'friends', 'confirm'];
      case 'empty':
        return ['basic', 'mode', 'friends', 'confirm'];
      case 'assisted': {
        const sequence = ['basic', 'mode', 'variation'];
        if (wizardState.layoutStrategy !== 'random') {
          sequence.push('assisted-layout');
        }
        sequence.push('theme', 'palette', 'friends', 'confirm');
        return sequence;
      }
      case 'advanced':
        return ['basic', 'mode', 'advanced-layout', 'theme', 'palette', 'friends', 'confirm'];
      case null:
      default:
        return ['basic', 'mode', 'advanced-layout', 'theme', 'palette', 'friends', 'confirm'];
    }
  }, [wizardState.mode, wizardState.layoutStrategy]);

  const totalSteps = steps.length;

  const resolveThemeDefaultPalette = (themeId: string) => {
    const theme = getGlobalTheme(themeId);
    const paletteId = (theme as { palette?: string } | undefined)?.palette;
    if (paletteId) {
      const palette = colorPalettes.find((candidate) => candidate.id === paletteId);
      if (palette) {
        return palette;
      }
    }
    return colorPalettes[0];
  };

  const handleModeSelect = (mode: WizardMode) => {
    if (mode === 'empty') {
      const defaultPalette = resolveThemeDefaultPalette('default');
      updateState({
        mode,
        selectedTemplate: null,
        selectedTheme: 'default',
        selectedPalette: defaultPalette,
        layoutStrategy: 'same',
        randomMode: 'single',
        assistedLayouts: { single: null, left: null, right: null }
      });
      return;
    }

    if (mode === 'assisted') {
      updateState({
        mode,
        selectedTemplate: null,
        layoutStrategy: 'same',
        randomMode: 'single',
        assistedLayouts: { single: null, left: null, right: null }
      });
      return;
    }

    if (mode === 'pre-designed') {
      updateState({
        mode,
        selectedTemplate: null,
        assistedLayouts: { single: null, left: null, right: null }
      });
      return;
    }

    updateState({ mode });
  };

  const normalizeFriend = (friend: User): BookFriend => ({
    id: friend.id,
    name: friend.name,
    email: friend.email,
    role: friend.role || 'author',
    book_role: 'author',
    pageAccessLevel: 'own_page',
    editorInteractionLevel: 'full_edit',
  });

  const handleWizardFriendSelect = (friend: User) => {
    setWizardFriends((prev) => {
      if (prev.some((f) => f.id === friend.id)) {
        return prev;
      }
      return [...prev, normalizeFriend(friend)];
    });
    setShowFriendPicker(false);
  };

  const handleWizardFriendRemove = (friendId: number) => {
    setWizardFriends((prev) => prev.filter((friend) => friend.id !== friendId));
  };

  const handleWizardInvite = (name: string, email: string) => {
    setWizardFriendInvites((prev) => [...prev, { name, email }]);
    setShowFriendInviteDialog(false);
    setWizardInviteError('');
  };

  useEffect(() => {
    setCurrentStep((prev) => Math.min(Math.max(prev, 1), steps.length));
  }, [steps.length]);

  const canProceed = () => {
    const stepId = steps[currentStep - 1];
    if (stepId === 'basic') {
      return wizardState.name.trim().length > 0;
    }
    if (stepId === 'mode') {
      return wizardState.mode !== null;
    }
    if (stepId === 'layout' || stepId === 'advanced-layout') {
      return Boolean(wizardState.selectedTemplate);
    }
    if (stepId === 'assisted-layout') {
      if (wizardState.layoutStrategy === 'pair') {
        return Boolean(wizardState.assistedLayouts.left && wizardState.assistedLayouts.right);
      }
      return Boolean(wizardState.assistedLayouts.single);
    }
    return true;
  };

  const handleFinish = async () => {
    const tempId = `temp_${Date.now()}`;

    const finalTheme = wizardState.selectedTheme || 'default';
    const finalPalette = wizardState.selectedPalette || colorPalettes[0];
    const template = wizardState.selectedTemplate;
    const quickTemplate = template as QuickTemplate;

    let paletteToUse: ColorPalette;
    let themeToUse: string;

    if (wizardState.mode === 'pre-designed') {
      paletteToUse = quickTemplate?.paletteId
        ? colorPalettes.find((p) => p.id === quickTemplate.paletteId) || finalPalette
        : finalPalette;
      themeToUse = finalTheme;
    } else {
      themeToUse = finalTheme;
      paletteToUse = finalPalette;
    }

    const canvasSize = calculatePageDimensions(wizardState.pageSize, wizardState.orientation);
    const activePaletteId = paletteToUse?.id || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const styleElementWithThemeAndPalette = (element: any, layoutId: string | null) => {
      type ToolArg = Parameters<typeof getToolDefaults>[0];
      const toolType = (element.textType || element.type) as ToolArg;
      const defaults = getToolDefaults(
        toolType,
        themeToUse || undefined,
        themeToUse || undefined,
        element,
        undefined,
        layoutId,
        layoutId,
        activePaletteId,
        activePaletteId
      );

      const preservedProps = {
        id: element.id,
        type: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        text: element.text,
        formattedText: element.formattedText,
        textType: element.textType,
        questionId: element.questionId,
        answerId: element.answerId,
        questionElementId: element.questionElementId,
        src: element.src,
        points: element.points
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedElement: any = {
        ...preservedProps,
        ...defaults,
        theme: themeToUse || defaults.theme || element.theme
      };

      if (element.textType === 'qna_inline') {
        updatedElement.questionSettings = {
          ...(defaults.questionSettings || {}),
          ...(element.questionSettings || {})
          // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
        };

        updatedElement.answerSettings = {
          ...(defaults.answerSettings || {}),
          ...(element.answerSettings || {})
          // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
        };
      }

      if (element.textType === 'free_text' && defaults.textSettings) {
        updatedElement.textSettings = {
          ...defaults.textSettings,
          ...(element.textSettings || {}),
          font: {
            ...(defaults.textSettings?.font || {}),
            ...(element.textSettings?.font || {})
          },
          border: {
            ...(defaults.textSettings?.border || {}),
            ...(element.textSettings?.border || {})
          },
          background: {
            ...(defaults.textSettings?.background || {}),
            ...(element.textSettings?.background || {})
          }
        };
      }

      if (['line', 'circle', 'rect', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
        if (defaults.strokeOpacity !== undefined) {
          updatedElement.strokeOpacity = defaults.strokeOpacity;
        } else if (element.strokeOpacity !== undefined) {
          updatedElement.strokeOpacity = element.strokeOpacity;
        }

        if (defaults.fillOpacity !== undefined) {
          updatedElement.fillOpacity = defaults.fillOpacity;
        } else if (element.fillOpacity !== undefined) {
          updatedElement.fillOpacity = element.fillOpacity;
        }
      }

      if (defaults.font) {
        updatedElement.font = {
          ...defaults.font,
          ...(element.font || {})
        };
      }

      if (defaults.border) {
        updatedElement.border = {
          ...defaults.border,
          ...(element.border || {})
        };
      }

      if (defaults.background) {
        updatedElement.background = {
          ...defaults.background,
          ...(element.background || {})
        };
      }

      if (defaults.ruledLines) {
        updatedElement.ruledLines = {
          ...defaults.ruledLines,
          ...(element.ruledLines || {})
        };
      }

      return updatedElement;
    };

    const buildElementsFromTemplate = (tpl: PageTemplate | null) => {
      if (!tpl) return [];
      const rawElements = convertTemplateToElements(tpl, canvasSize);
      return rawElements.map((element) => styleElementWithThemeAndPalette(element, tpl.id));
    };

    const themeConfig = themeToUse ? getGlobalTheme(themeToUse) : null;
    const themeBackgroundColors = themeToUse ? getThemePageBackgroundColors(themeToUse, paletteToUse) : null;

    let background: {
      type: 'color' | 'pattern' | 'image';
      value: string;
      opacity: number;
      pageTheme?: string;
      backgroundImageTemplateId?: string;
      imageSize?: string;
      patternSize?: number;
      patternStrokeWidth?: number;
      patternForegroundColor?: string;
      patternBackgroundColor?: string;
      patternBackgroundOpacity?: number;
    } = {
      type: 'color',
      value: paletteToUse.colors.background,
      opacity: 1,
      pageTheme: themeToUse
    };

    if (themeConfig) {
      if (themeConfig.pageSettings.backgroundPattern?.enabled) {
        background = {
          type: 'pattern',
          value: themeConfig.pageSettings.backgroundPattern.style,
          opacity: themeConfig.pageSettings.backgroundOpacity || 1,
          pageTheme: themeToUse,
          patternSize: themeConfig.pageSettings.backgroundPattern.size,
          patternStrokeWidth: themeConfig.pageSettings.backgroundPattern.strokeWidth,
          patternForegroundColor: themeBackgroundColors?.backgroundColor || paletteToUse.colors.background,
          patternBackgroundColor: themeBackgroundColors?.patternBackgroundColor || paletteToUse.colors.primary || paletteToUse.colors.background,
          patternBackgroundOpacity: themeConfig.pageSettings.backgroundPattern.patternBackgroundOpacity
        };
      } else {
        background = {
          type: 'color',
          value: themeBackgroundColors?.backgroundColor || paletteToUse.colors.background,
          opacity: themeConfig.pageSettings.backgroundOpacity || 1,
          pageTheme: themeToUse
        };
      }

      if (themeConfig.pageSettings.backgroundImage?.enabled && themeConfig.pageSettings.backgroundImage.templateId) {
        const imageConfig = themeConfig.pageSettings.backgroundImage;
        const templateId = imageConfig.templateId;
        if (!templateId) {
          console.warn('Background image enabled but templateId is missing');
        } else {
          const imageBackground = applyBackgroundImageTemplate(templateId, {
            imageSize: imageConfig.size,
            imageRepeat: imageConfig.repeat,
            imagePosition: imageConfig.position,
            imageWidth: imageConfig.width,
            opacity: imageConfig.opacity ?? background.opacity ?? 1,
            backgroundColor: themeBackgroundColors?.backgroundColor || paletteToUse.colors.background || '#ffffff'
          });

          if (imageBackground && imageBackground.value) {
            background = {
              ...imageBackground,
              opacity: imageBackground.opacity ?? imageConfig.opacity ?? background.opacity ?? 1,
              pageTheme: themeToUse
            };
          } else {
            console.warn('Failed to apply background image template:', templateId);
          }
        }
      }
    }

    if (quickTemplate?.backgroundImageId) {
      const allBackgroundImages = getBackgroundImagesWithUrl();
      const bgImage = allBackgroundImages.find((img) => img.id === quickTemplate.backgroundImageId);
      if (bgImage) {
        background = {
          type: 'image' as const,
          value: bgImage.url,
          opacity: 1,
          pageTheme: themeToUse,
          backgroundImageTemplateId: bgImage.id,
          imageSize: bgImage.defaultSize || 'cover'
        };
      }
    }

    const availableTemplates = builtinPageTemplates;
    const fallbackTemplate = availableTemplates[0] || template;

    const pickRandomTemplate = (pool: PageTemplate[]) =>
      pool[Math.floor(Math.random() * pool.length)] || fallbackTemplate;

    const buildPairPlan = () => {
      const plans: Array<{ left: PageTemplate | null; right: PageTemplate | null }> = [];
      const expandedRandomPool = [
        ...availableTemplates,
        ...availableTemplates.map((tpl) => mirrorTemplate(tpl))
      ];

      for (let index = 0; index < CONTENT_PAIR_COUNT; index++) {
        if (wizardState.mode === 'empty') {
          plans.push({ left: null, right: null });
          continue;
        }

        if (wizardState.mode === 'pre-designed' || wizardState.mode === 'advanced' || wizardState.mode === null) {
          const baseTemplate = wizardState.selectedTemplate || fallbackTemplate;
          plans.push({ left: baseTemplate, right: baseTemplate });
          continue;
        }

        if (wizardState.mode === 'assisted') {
          if (wizardState.layoutStrategy === 'pair') {
            plans.push({
              left: wizardState.assistedLayouts.left || fallbackTemplate,
              right: wizardState.assistedLayouts.right || fallbackTemplate
            });
            continue;
          }

          if (wizardState.layoutStrategy === 'mirrored') {
            const single = wizardState.assistedLayouts.single || fallbackTemplate;
            plans.push({
              left: single,
              right: single
            });
            continue;
          }

          if (wizardState.layoutStrategy === 'same') {
            const single = wizardState.assistedLayouts.single || fallbackTemplate;
            plans.push({ left: single, right: single });
            continue;
          }

          if (wizardState.layoutStrategy === 'random') {
            if (wizardState.randomMode === 'pair') {
              const baseTemplate = pickRandomTemplate(availableTemplates);
              plans.push({
                left: baseTemplate,
                right: baseTemplate
              });
            } else {
              plans.push({
                left: pickRandomTemplate(expandedRandomPool),
                right: pickRandomTemplate(expandedRandomPool)
              });
            }
            continue;
          }
        }

        plans.push({ left: fallbackTemplate, right: fallbackTemplate });
      }

      return plans;
    };

    const pairPlan = buildPairPlan();
    const cloneBackgroundForPage = () => (background ? JSON.parse(JSON.stringify(background)) : undefined);
    let pageIdSeed = Date.now();
    const nextPageId = () => pageIdSeed++;
    let pairCounter = 0;
    const nextPairId = () => generateSequentialPairId(pairCounter++);
    const strategyFlags = deriveLayoutStrategyFlags(wizardState.layoutStrategy, wizardState.randomMode);
    const shouldMirrorRightBackground = strategyFlags.mirrorRightBackground;
    const shouldRandomizeBackground = strategyFlags.randomizeBackground;
    const shouldMirrorRightLayouts = strategyFlags.mirrorRightLayouts;
    const shouldRandomizeLayouts = strategyFlags.randomizeLayouts;
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const createBackgroundTransform = (
      seed: number,
      options: { mirror?: boolean; randomize?: boolean }
    ): Page['backgroundTransform'] | undefined => {
      const transform: Page['backgroundTransform'] = {};
      if (options.mirror) {
        transform.mirror = true;
      }
      if (options.randomize) {
        transform.offsetRatioX = (seededRandom(seed) - 0.5) * 0.2;
        transform.offsetRatioY = (seededRandom(seed + 1) - 0.5) * 0.2;
        transform.scale = 0.85 + seededRandom(seed + 2) * 0.35;
      }
      return Object.keys(transform).length ? transform : undefined;
    };

    const buildBackgroundStyling = (
      seed: number,
      options: { mirror?: boolean; randomize?: boolean }
    ) => {
      const transform = createBackgroundTransform(seed, options);
      const variation: Page['backgroundVariation'] =
        options.randomize ? 'randomized' : options.mirror ? 'mirrored' : 'normal';
      return { transform, variation };
    };

    const createPageFromTemplate = (
      tpl: PageTemplate | null,
      overrides: Partial<Page> = {},
      variation?: { type?: 'normal' | 'mirrored' | 'randomized'; seed?: number }
    ): Page => {
      const baseElements = tpl ? buildElementsFromTemplate(tpl) : [];
      let finalElements = baseElements;

      if (variation?.type === 'mirrored') {
        finalElements = applyMirroredLayout(baseElements, canvasSize.width);
      } else if (variation?.type === 'randomized') {
        finalElements = applyRandomLayout(baseElements, {
          seed: variation.seed ?? Date.now(),
          pageWidth: canvasSize.width,
          pageHeight: canvasSize.height
        });
      }

      return {
        id: nextPageId(),
        pageNumber: 0,
        elements: finalElements,
        background: cloneBackgroundForPage(),
        layoutTemplateId: tpl?.id ?? undefined,
        database_id: undefined,
        pageType: 'content',
        isSpecialPage: false,
        isLocked: false,
        isPrintable: true,
        layoutVariation: variation?.type ?? 'normal',
        backgroundVariation: 'normal',
        ...overrides
      };
    };

    const createStaticPage = (pageType: Page['pageType'], isPrintable: boolean, pairId: string) =>
      createPageFromTemplate(null, {
        pageType,
        isPrintable,
        isSpecialPage: true,
        isLocked: true,
        pagePairId: pairId,
        elements: []
      });

    const resolvePair = (pair: { left: PageTemplate | null; right: PageTemplate | null } | undefined) =>
      pair ?? { left: fallbackTemplate, right: fallbackTemplate };

    const frontPlan = resolvePair(pairPlan.shift());
    const backPlan = resolvePair(pairPlan.pop() ?? frontPlan);

    const getBaseTemplate = (tpl: PageTemplate | null) => {
      if (!tpl) return null;
      const suffix = '__mirrored';
      if (tpl.id.endsWith(suffix)) {
        const originalId = tpl.id.slice(0, -suffix.length);
        return availableTemplates.find((candidate) => candidate.id === originalId) || tpl;
      }
      return tpl;
    };

    const baseFrontTemplate = frontPlan.right ?? frontPlan.left ?? fallbackTemplate;
    const baseBackTemplate = backPlan.left ?? backPlan.right ?? fallbackTemplate;

    let firstPageTemplate: PageTemplate | null = baseFrontTemplate;
    let lastPageTemplate: PageTemplate | null = baseBackTemplate;

    switch (wizardState.layoutStrategy) {
      case 'pair':
        firstPageTemplate = frontPlan.right ?? frontPlan.left ?? fallbackTemplate;
        lastPageTemplate = backPlan.left ?? backPlan.right ?? fallbackTemplate;
        break;
      case 'mirrored':
        firstPageTemplate = getBaseTemplate(frontPlan.left ?? frontPlan.right ?? fallbackTemplate);
        lastPageTemplate = getBaseTemplate(backPlan.left ?? backPlan.right ?? fallbackTemplate);
        break;
      case 'random':
        lastPageTemplate = getBaseTemplate(baseBackTemplate) ?? fallbackTemplate;
        firstPageTemplate = lastPageTemplate;
        break;
      default:
        firstPageTemplate = baseFrontTemplate;
        lastPageTemplate = baseBackTemplate;
        break;
    }

    const bodySpreads = pairPlan.map((pair, spreadIndex) => {
      const pairId = nextPairId();
      const baseSeed = 2000 + spreadIndex * 13;
      const leftStyle = buildBackgroundStyling(baseSeed, {
        randomize: shouldRandomizeBackground
      });
      const rightStyle = buildBackgroundStyling(baseSeed + 1, {
        mirror: shouldMirrorRightBackground,
        randomize: shouldRandomizeBackground
      });
      return {
        left: createPageFromTemplate(
          pair.left,
          {
            pagePairId: pairId,
            backgroundTransform: leftStyle.transform,
            backgroundVariation: leftStyle.variation
          },
          {
            type: shouldRandomizeLayouts ? 'randomized' : 'normal',
            seed: baseSeed
          }
        ),
        right: createPageFromTemplate(
          pair.right,
          {
            pagePairId: pairId,
            backgroundTransform: rightStyle.transform,
            backgroundVariation: rightStyle.variation
          },
          {
            type: shouldMirrorRightLayouts
              ? 'mirrored'
              : shouldRandomizeLayouts
                ? 'randomized'
                : 'normal',
            seed: baseSeed + 7
          }
        )
      };
    });

    const coverPairId = nextPairId();
    const introPairId = nextPairId();
    const outroPairId = nextPairId();

    const coverSpread = {
      left: createStaticPage('back-cover', false, coverPairId),
      right: createStaticPage('front-cover', false, coverPairId)
    };
    const firstPageVariationType =
      wizardState.layoutStrategy === 'mirrored' || wizardState.layoutStrategy === 'random'
        ? 'mirrored'
        : 'normal';
    const lastPageVariationType = shouldRandomizeLayouts ? 'randomized' : 'normal';
    const introSpread = {
      left: createStaticPage('inner-front', false, introPairId),
      right: createPageFromTemplate(
        firstPageTemplate,
        {
          pagePairId: introPairId,
          pageType: 'first-page',
          isSpecialPage: true,
          isLocked: true,
          isPrintable: true,
          backgroundTransform: buildBackgroundStyling(5000, {
            mirror: shouldMirrorRightBackground,
            randomize: shouldRandomizeBackground
          }).transform,
          backgroundVariation: shouldMirrorRightBackground
            ? 'mirrored'
            : shouldRandomizeBackground
              ? 'randomized'
              : 'normal'
        },
        {
          type: firstPageVariationType,
          seed: 5000
        }
      )
    };
    const outroSpread = {
      left: createPageFromTemplate(
        lastPageTemplate,
        {
          pagePairId: outroPairId,
          pageType: 'last-page',
          isSpecialPage: true,
          isLocked: true,
          isPrintable: true,
          backgroundTransform: buildBackgroundStyling(8000, {
            randomize: shouldRandomizeBackground
          }).transform,
          backgroundVariation: shouldRandomizeBackground ? 'randomized' : 'normal'
        },
        {
          type: lastPageVariationType,
          seed: 8000
        }
      ),
      right: createStaticPage('inner-back', false, outroPairId)
    };

    const orderedSpreads = [
      coverSpread,
      introSpread,
      ...bodySpreads,
      outroSpread
    ];

    const orderedPagesUnnumbered = orderedSpreads.flatMap((spread) => [spread.left, spread.right]);

    const pages = orderedPagesUnnumbered.map((page, index) => ({
      ...page,
      pageNumber: index + 1
    }));

    if (pages.length < MIN_TOTAL_PAGES || pages.length > MAX_TOTAL_PAGES) {
      console.warn('Generated book outside allowed page range', { count: pages.length });
    }

    const normalizedFriends = wizardFriends.map((friend) => ({
      ...friend,
      book_role: friend.book_role || friend.role || 'author',
      pageAccessLevel: friend.pageAccessLevel || 'own_page',
      editorInteractionLevel: friend.editorInteractionLevel || 'full_edit',
    }));

    const newBook = {
      id: tempId,
      name: wizardState.name,
      pageSize: wizardState.pageSize,
      orientation: wizardState.orientation,
      owner_id: user?.id,
      bookTheme: themeToUse,
      themeId: themeToUse,
      colorPaletteId: paletteToUse.id,
      layoutTemplateId: template?.id || null,
      pages,
      isTemporary: true,
      minPages: MIN_TOTAL_PAGES,
      maxPages: MAX_TOTAL_PAGES,
      pagePairingEnabled: true,
      specialPagesConfig: {
        cover: { locked: true, printable: false },
        innerFront: { locked: true, printable: false },
        introContent: { locked: true, printable: true },
        outroContent: { locked: true, printable: true },
        innerBack: { locked: true, printable: false }
      },
      layoutStrategy: wizardState.mode === 'assisted' ? wizardState.layoutStrategy : undefined,
      layoutRandomMode:
        wizardState.mode === 'assisted' && wizardState.layoutStrategy === 'random'
          ? wizardState.randomMode
          : undefined,
      assistedLayouts:
        wizardState.mode === 'assisted'
          ? {
              single: wizardState.assistedLayouts.single?.id ?? null,
              left: wizardState.assistedLayouts.left?.id ?? null,
              right: wizardState.assistedLayouts.right?.id ?? null
            }
          : undefined,
      wizardSelections: {
        template,
        theme: themeToUse,
        palette: paletteToUse,
        layoutStrategy: wizardState.layoutStrategy,
        randomMode: wizardState.randomMode,
        assistedLayouts: wizardState.assistedLayouts
      },
      bookFriends: normalizedFriends,
      wizardFriends: normalizedFriends,
      wizardFriendInvites,
      wizardGroupChatEnabled,
    };

    tempBooks.set(tempId, newBook);
    // @ts-expect-error - temporary storage for wizard
    window.tempBooks = tempBooks;

    onSuccess();
    onOpenChange(false);
    navigate(`/editor/${tempId}`);
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-between mb-6">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index + 1 < currentStep
                ? 'bg-blue-500 text-white'
                : index + 1 === currentStep
                ? 'bg-blue-100 text-blue-600 border-2 border-blue-500'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {index + 1 < currentStep ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div className={`w-12 h-0.5 mx-2 ${index + 1 < currentStep ? 'bg-blue-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderCurrentStep = () => {
    const stepId = steps[currentStep - 1];
    if (!stepId) return null;

    switch (stepId) {
      case 'basic':
        return (
          <BasicInfoStep
            name={wizardState.name}
            pageSize={wizardState.pageSize}
            orientation={wizardState.orientation}
            onChange={(updates) => updateState(updates as Partial<WizardState>)}
          />
        );
      case 'mode':
        return <StartModeStep mode={wizardState.mode} onSelect={(mode) => handleModeSelect(mode)} />;
      case 'layout':
        return (
          <LayoutPickerStep
            title="Pre-designed Templates"
            description="Choose a complete layout. Theme and palette are applied automatically (and can be changed later)."
            selectedLayout={wizardState.selectedTemplate}
            onSelect={(template) => updateState({ selectedTemplate: template })}
          />
        );
      case 'variation':
        return (
          <LayoutVariationStep
            layoutStrategy={wizardState.layoutStrategy}
            randomMode={wizardState.randomMode}
            onStrategyChange={(strategy) => {
              const clearedLayouts = { single: null, left: null, right: null };
              if (strategy === 'random') {
                updateState({ layoutStrategy: strategy, randomMode: wizardState.randomMode, assistedLayouts: clearedLayouts });
                return;
              }
              updateState({ layoutStrategy: strategy, assistedLayouts: clearedLayouts });
            }}
            onRandomModeChange={(mode) => updateState({ randomMode: mode })}
          />
        );
      case 'advanced-layout':
        return (
          <LayoutPickerStep
            title="Layout Template"
            description="Choose a layout template for your book."
            selectedLayout={wizardState.selectedTemplate}
            onSelect={(template) => updateState({ selectedTemplate: template })}
          />
        );
      case 'assisted-layout':
        return (
          <AssistedLayoutStep
            strategy={wizardState.layoutStrategy === 'random' ? 'same' : wizardState.layoutStrategy}
            layouts={wizardState.assistedLayouts}
            onSelectSingle={(template) =>
              updateState({
                assistedLayouts: { ...wizardState.assistedLayouts, single: template },
                selectedTemplate: template
              })
            }
            onSelectLeft={(template) =>
              updateState({
                assistedLayouts: { ...wizardState.assistedLayouts, left: template },
                selectedTemplate: template
              })
            }
            onSelectRight={(template) =>
              updateState({
                assistedLayouts: { ...wizardState.assistedLayouts, right: template },
                selectedTemplate: template
              })
            }
          />
        );
      case 'theme':
        return <ThemeSelectionStep selectedTheme={wizardState.selectedTheme} onSelect={(themeId) => updateState({ selectedTheme: themeId })} />;
      case 'palette':
        return (
          <PaletteSelectionStep
            selectedPalette={wizardState.selectedPalette}
            themeId={wizardState.selectedTheme}
            onSelect={(palette) => updateState({ selectedPalette: palette })}
          />
        );
      case 'friends':
        return (
          <>
            <WizardFriendsStep
              friends={wizardFriends}
              pendingInvites={wizardFriendInvites}
              availableFriends={availableFriends}
              showFriendPicker={showFriendPicker}
              onOpenFriendPicker={() => setShowFriendPicker(true)}
              onCloseFriendPicker={() => setShowFriendPicker(false)}
              onSelectFriend={handleWizardFriendSelect}
              onInviteFriend={() => setShowFriendInviteDialog(true)}
              onRemoveFriend={handleWizardFriendRemove}
              groupChatEnabled={wizardGroupChatEnabled}
              onGroupChatChange={(value) => setWizardGroupChatEnabled(value)}
            />
            <InviteUserDialog
              open={showFriendInviteDialog}
              onOpenChange={(open) => {
                setShowFriendInviteDialog(open);
                if (!open) setWizardInviteError('');
              }}
              onInvite={handleWizardInvite}
              errorMessage={wizardInviteError}
            />
          </>
        );
      case 'confirm':
        return (
          <ConfirmationStep
            name={wizardState.name}
            pageSize={wizardState.pageSize}
            orientation={wizardState.orientation}
            selectedTemplate={wizardState.selectedTemplate}
            selectedTheme={wizardState.selectedTheme}
            selectedPalette={wizardState.selectedPalette}
          />
        );
      default:
        return null;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep((step) => step + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Book</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          {renderProgressBar()}

          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">{renderCurrentStep()}</div>

          <div className="flex justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={currentStep === 1 ? () => onOpenChange(false) : prevStep}>
              {currentStep === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>

            <Button onClick={currentStep === steps.length ? handleFinish : nextStep} disabled={!canProceed()}>
              {currentStep === steps.length ? (
                'Create Book'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreationWizard;

