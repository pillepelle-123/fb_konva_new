import { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { applyPatches, enableMapSet, enablePatches, produceWithPatches, type Patch } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { subject } from '@casl/ability';
import { useAbility } from '../abilities/ability-context';
import { MIN_TOTAL_PAGES, MAX_TOTAL_PAGES } from '../constants/book-limits';
import { getGlobalThemeDefaults, applyThemeToElementConsistent } from '../utils/global-themes';
import type { TextSegment } from '../../../../shared/types/text-layout';

enablePatches();
enableMapSet();

type LoadBookOptions = {
  pageOffset?: number;
  pageLimit?: number;
  pagesOnly?: boolean;
};

// Load real book data from API
const apiService = {
  loadBook: async (bookId: number | string, options: LoadBookOptions = {}) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');
    
    try {
      const params = new URLSearchParams();
      if (typeof options.pageOffset === 'number') {
        params.set('pageOffset', String(Math.max(0, options.pageOffset)));
      }
      if (typeof options.pageLimit === 'number' && options.pageLimit > 0) {
        params.set('pageLimit', String(options.pageLimit));
      }
      if (options.pagesOnly) {
        params.set('pagesOnly', 'true');
      }
      const query = params.toString();

      // Load book data
      const bookResponse = await fetch(`${apiUrl}/books/${bookId}${query ? `?${query}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!bookResponse.ok) throw new Error('Failed to load book');
      const responseData = await bookResponse.json();
      const {
        pagination = null,
        questions: responseQuestions,
        answers: responseAnswers,
        userRole: responseUserRole,
        userAdminRole: responseUserAdminRole,
        pageAssignments: responseAssignments,
        ...book
      } = responseData;

      const shouldFetchDetails = !options.pagesOnly;

      let questions = Array.isArray(responseQuestions) ? responseQuestions : [];
      if (shouldFetchDetails && questions.length === 0) {
        const questionsResponse = await fetch(`${apiUrl}/books/${bookId}/questions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        questions = questionsResponse.ok ? await questionsResponse.json() : [];
      }
      
      let answers = Array.isArray(responseAnswers) ? responseAnswers : [];
      if (shouldFetchDetails && answers.length === 0) {
        try {
          const answersResponse = await fetch(`${apiUrl}/answers/book/${bookId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (answersResponse.ok) {
            const answersData = await answersResponse.json();
            answers = Array.isArray(answersData) ? answersData : answersData.answers || [];
          }
        } catch (error) {
          // Ignore answer load errors during pagination
        }
      }
      
      let userRole = responseUserRole || null;
      if (!userRole && shouldFetchDetails) {
        const roleResponse = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        userRole = roleResponse.ok ? await roleResponse.json() : null;
      }
      
      let pageAssignments = Array.isArray(responseAssignments) ? responseAssignments : [];
      if (pageAssignments.length === 0 && shouldFetchDetails) {
        const assignmentsResponse = await fetch(`${apiUrl}/page-assignments/book/${bookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        pageAssignments = assignmentsResponse.ok ? await assignmentsResponse.json() : [];
      }
      
      return {
        book,
        questions,
        answers,
        userRole,
        pageAssignments,
        pagination
      };
    } catch (error) {
      // Fallback to empty book
      return {
        book: {
          id: bookId,
          name: 'Book',
          pageSize: 'A4',
          orientation: 'portrait',
          pages: [{ id: 1, pageNumber: 1, elements: [] }]
        },
        questions: [],
        answers: [],
        userRole: null,
        pageAssignments: [],
        pagination: null
      };
    }
  }
};
import { actualToCommon } from '../utils/font-size-converter';
import { actualToCommonStrokeWidth, commonToActualStrokeWidth, THEME_STROKE_RANGES } from '../utils/stroke-width-converter';
import { actualToCommonRadius } from '../utils/corner-radius-converter';
import { getRuledLinesOpacity } from '../utils/ruled-lines-utils';
import { getBorderTheme } from '../utils/theme-utils';
import { convertTemplateToElements } from '../utils/template-to-elements';
import { applyLayoutTemplateWithPreservation, validateTemplateCompatibility } from '../utils/content-preservation';
import { calculatePageDimensions } from '../utils/template-utils';
import { createPageNumberElement, type PageNumberingSettings } from '../utils/page-number-utils';
import { pageTemplates } from '../data/templates/page-templates';
import { colorPalettes, getPalettePartColor } from '../data/templates/color-palettes';
import { getGlobalTheme, getThemePageBackgroundColors, getThemePaletteId } from '../utils/global-themes';
import { getElementPaletteColors } from '../utils/global-palettes';
import type { PageTemplate, ColorPalette } from '../types/template-types';
import { applyBackgroundImageTemplate } from '../utils/background-image-utils';
import { generatePagePreview } from '../utils/page-preview-generator';
import type { PageMetadata } from '../utils/book-structure';
import {
  buildPageMetadataMap,
  computePageMetadataEntry,
  cloneCanvasElements,
  clonePageBackground,
  ensureSpecialPages,
  getPairBounds,
  calculatePagePairId,
  recalculatePagePairIds
} from '../utils/book-structure';
import { applyMirroredLayout, applyRandomLayout, createSeededRNG } from '../utils/layout-variations';
import { deriveLayoutStrategyFlags, derivePageLayoutVariation } from '../utils/layout-strategy';

// Function to extract theme structure from current book state
function logThemeStructure(book: Book | null) {
  if (!book) return;
  
  const currentPage = book.pages[0]; // Use first page as reference
  if (!currentPage) return;
  
  // Extract page settings
  const pageSettings = {
    backgroundColor: currentPage.background?.type === 'color' ? currentPage.background.value : 'green',
    backgroundOpacity: currentPage.background?.opacity || 1,
    backgroundPattern: currentPage.background?.type === 'pattern' ? {
      enabled: true,
      style: currentPage.background.value as 'dots' | 'grid' | 'lines' | 'cross',
      size: currentPage.background.patternSize || 20,
      strokeWidth: 12,
      patternBackgroundColor: currentPage.background.patternBackgroundColor || '#f0f0f0',
      patternBackgroundOpacity: currentPage.background.patternBackgroundOpacity || 0.3
    } : {
      enabled: false,
      style: 'dots' as const,
      size: 20,
      strokeWidth: 1,
      patternBackgroundColor: '#f0f0f0',
      patternBackgroundOpacity: 0.3
    }
  };
  
  // Extract element defaults from canvas elements
  const elementDefaults = {
    text: {},
    question: {},
    answer: {},
    shape: {},
    brush: {},
    line: {}
  };
  
  // Process all elements from all pages to find examples of each type
  book.pages.forEach(page => {
    page.elements.forEach(element => {
      const elementType = element.textType || element.type;
      let category: keyof typeof elementDefaults;
      
      switch (elementType) {
        case 'text':
          category = 'text';
          break;
        case 'question':
          category = 'question';
          break;
        case 'answer':
          category = 'answer';
          break;
        case 'image':
        case 'placeholder':
          // Skip image elements - not included in themes.json
          return;
          break;
        case 'brush':
          category = 'brush';
          break;
        case 'line':
          category = 'line';
          break;
        default:
          category = 'shape';
          break;
      }
      
      // Extract relevant properties for theme
      const themeElement: any = {};
      
      // Add text-specific properties
      if (category === 'text' || category === 'question' || category === 'answer') {
        themeElement.cornerRadius = element.cornerRadius ? actualToCommonRadius(element.cornerRadius) : 0;
        
        // Use actual element font size, converted to common scale
        let actualFontSize = element.font?.fontSize || element.fontSize;
        let commonFontSize = actualFontSize ? Math.round(actualFontSize * 12 / 50) : undefined;
        
        if (commonFontSize) {
          themeElement.font = {
            fontSize: commonFontSize,
            fontFamily: element.font?.fontFamily || element.fontFamily,
            fontColor: element.font?.fontColor || element.fontColor || element.fill,
            fontOpacity: element.font?.fontOpacity || element.fillOpacity,
            fontBold: element.font?.fontBold || (element.fontWeight === 'bold'),
            fontItalic: element.font?.fontItalic || (element.fontStyle === 'italic')
          };
        }
        
        const borderWidth = element.border?.borderWidth || element.borderWidth;
        if (borderWidth) {
          themeElement.border = {
            enabled: element.border?.enabled !== false && borderWidth > 0,
            borderWidth: actualToCommonStrokeWidth(borderWidth, element.border?.borderTheme || element.theme || 'default'),
            borderColor: element.border?.borderColor || element.borderColor,
            borderOpacity: element.border?.borderOpacity || element.borderOpacity,
            borderTheme: getBorderTheme(element)
          };
        }
        
        const textAlign = element.format?.textAlign || element.align;
        const paragraphSpacing = element.format?.paragraphSpacing || element.paragraphSpacing;
        const padding = element.format?.padding || element.padding;
        if (textAlign || paragraphSpacing || padding) {
          themeElement.format = {
            textAlign: textAlign,
            paragraphSpacing: paragraphSpacing,
            padding: padding
          };
        }
        
        const backgroundColor = element.background?.backgroundColor || element.backgroundColor;
        const backgroundOpacity = element.background?.backgroundOpacity || element.backgroundOpacity;
        if (backgroundColor && backgroundColor !== 'transparent') {
          themeElement.background = {
            enabled: element.background?.enabled !== false,
            backgroundColor: backgroundColor,
            backgroundOpacity: backgroundOpacity
          };
        }
        
        const ruledLinesEnabled = element.ruledLines?.enabled;
        const ruledLinesWidth = element.ruledLinesWidth;
        const ruledLinesColor = element.ruledLines?.lineColor || element.ruledLinesColor;
        if (ruledLinesEnabled || ruledLinesWidth || ruledLinesColor) {
          themeElement.ruledLines = {
            enabled: ruledLinesEnabled,
            lineWidth: ruledLinesWidth,
            lineColor: ruledLinesColor,
            lineOpacity: getRuledLinesOpacity(element),
            ruledLinesTheme: element.ruledLines?.ruledLinesTheme || element.ruledLines?.inheritTheme || element.ruledLinesTheme
          };
        }
      }
      

      
      // Add shape-specific properties
      if (category === 'shape') {
        if (element.cornerRadius) themeElement.cornerRadius = actualToCommonRadius(element.cornerRadius);
        if (element.borderWidth || element.strokeWidth) {
          const width = element.borderWidth || element.strokeWidth || 0;
          themeElement.borderWidth = actualToCommonStrokeWidth(width, element.theme || 'default');
        }
        if (element.stroke) themeElement.stroke = element.stroke;
        if (element.fill) themeElement.fill = element.fill;
        if (element.opacity) themeElement.opacity = element.opacity;
        if (element.inheritTheme || element.theme) themeElement.inheritTheme = element.inheritTheme || element.theme;
        if (element.borderEnabled !== undefined) themeElement.borderEnabled = element.borderEnabled;
        if (element.backgroundEnabled !== undefined) themeElement.backgroundEnabled = element.backgroundEnabled;
      }
      
      // Add brush/line-specific properties
      if (category === 'brush' || category === 'line') {
        if (element.strokeWidth) themeElement.strokeWidth = actualToCommonStrokeWidth(element.strokeWidth, element.theme || 'default');
        if (element.stroke) themeElement.stroke = element.stroke;
        if (element.strokeOpacity) themeElement.strokeOpacity = element.strokeOpacity;
        if (element.inheritTheme || element.theme) themeElement.inheritTheme = element.inheritTheme || element.theme;
      }
      
      // Only update if we don't have this element type yet or if this element has more properties
      if (!elementDefaults[category] || Object.keys(themeElement).length > Object.keys(elementDefaults[category]).length) {
        elementDefaults[category] = themeElement;
      }
    });
  });
  
  // Create the complete theme structure and convert values to common scale
  const convertedElementDefaults = {};
  Object.entries(elementDefaults).forEach(([key, element]: [string, any]) => {
    if (!element || Object.keys(element).length === 0) {
      convertedElementDefaults[key] = {};
      return;
    }
    
    const converted = { ...element };
    
    // Convert strokeWidth
    if (converted.strokeWidth) {
      converted.strokeWidth = actualToCommonStrokeWidth(converted.strokeWidth, converted.theme || 'custom');
    }
    
    // Convert cornerRadius
    // if (converted.cornerRadius) {
    //   converted.cornerRadius = actualToCommonRadius(converted.cornerRadius);
    // }
    
    // Font fontSize is already in common scale, no conversion needed
    
    // Convert border borderWidth
    if (converted.border?.borderWidth) {
      converted.border.borderWidth = actualToCommonStrokeWidth(converted.border.borderWidth, converted.theme || 'custom');
    }
    
    convertedElementDefaults[key] = converted;
  });
  
  const themeStructure = {
    name: 'Custom Theme',
    description: 'Theme created from canvas elements',
    palette: 'custom-palette',
    pageSettings,
    elementDefaults: convertedElementDefaults
  };
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'placeholder' | 'line' | 'circle' | 'rect' | 'brush' | 'brush-multicolor' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley' | 'triangle' | 'polygon' | 'group' | 'sticker' | 'qr_code';
  polygonSides?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  text?: string;
  formattedText?: string;
  fontSize?: number;
  paragraphSpacing?: 'small' | 'medium' | 'large';
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  fontColor?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontOpacity?: number;
  textType?: 'question' | 'answer' | 'text' | 'qna' | 'free_text' | 'qna2';
  isPageNumber?: boolean; // Page number elements are not selectable/transformable
  questionId?: string; // UUID - for both question and answer elements
  answerId?: string; // UUID - for answer elements
  questionElementId?: string; // Legacy - for linking answer to question element
  questionOrder?: number; // Order/position of the question in orderedQuestions (for maintaining question order)
  src?: string;
  imageOpacity?: number;
  imageClipPosition?: 'left-top' | 'left-middle' | 'left-bottom' | 'center-top' | 'center-middle' | 'center-bottom' | 'right-top' | 'right-middle' | 'right-bottom';
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  stickerId?: string;
  stickerFormat?: 'vector' | 'pixel';
  stickerFilePath?: string;
  stickerOriginalUrl?: string;
  stickerColor?: string;
  stickerText?: string;
  stickerTextEnabled?: boolean;
  stickerTextSettings?: {
    fontFamily?: string;
    fontSize?: number;
    fontBold?: boolean;
    fontItalic?: boolean;
    fontColor?: string;
    fontOpacity?: number;
  };
  stickerTextOffset?: {
    x: number;
    y: number;
  };
  qrValue?: string;
  qrForegroundColor?: string;
  qrBackgroundColor?: string;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  qrMargin?: number;
  qrDotsStyle?: 'square' | 'dots' | 'rounded' | 'extra-rounded';
  qrCornerStyle?: 'default' | 'square-square' | 'dot-dot' | 'extra-rounded-dot';
  qrDataUrl?: string;
  points?: number[];
  roughness?: number;
  strokeWidth?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  cornerRadius?: number;
  padding?: number;
  theme?: 'rough' | 'default' | 'chalk' | 'watercolor' | 'crayon' | 'candy' | 'zigzag' | 'multi-strokes' | 'glow';
  candyRandomness?: number;
  candyIntensity?: number;
  // Backward compatibility
  fill?: string; // @deprecated - use fontColor instead
  // Group properties
  groupedElements?: CanvasElement[];
  // Brush-multicolor properties
  brushStrokes?: Array<{ points: number[]; strokeColor: string; strokeWidth: number }>;
  // Color override tracking
  colorOverrides?: {
    stroke?: boolean;
    fill?: boolean;
    fontColor?: boolean;
    borderColor?: boolean;
    backgroundColor?: boolean;
    [key: string]: boolean | undefined;
  };
  // Brush-multicolor specific properties
  brushStrokes?: Array<{ points: number[]; strokeColor: string; strokeWidth: number }>;
  // Rich text segments (textbox-qna2)
  richTextSegments?: TextSegment[];
}

export interface BackgroundTransform {
  mirror?: boolean;
  offsetRatioX?: number;
  offsetRatioY?: number;
  scale?: number;
}

export interface PageBackground {
  type: 'color' | 'pattern' | 'image';
  value: string; // color hex, pattern name, or image URL
  opacity?: number;
  applyPalette?: boolean;
  imageSize?: 'cover' | 'contain' | 'stretch';
  imageRepeat?: boolean; // for contain mode
  imagePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; // for contain mode without repeat
  imageContainWidthPercent?: number; // width in % of page width for contain mode without repeat
  patternSize?: number; // 1-10 scale for pattern size
  patternStrokeWidth?: number; // stroke width for pattern
  patternForegroundColor?: string; // color of the space between patterns
  patternBackgroundColor?: string; // color of the pattern itself (dots, lines)
  patternBackgroundOpacity?: number; // opacity of the pattern itself (dots, lines)
  pageTheme?: string; // page-specific theme ID
  backgroundImageTemplateId?: string; // Reference to background image template
  ruledLines?: {
    enabled: boolean;
    theme: 'notebook' | 'college' | 'graph' | 'dotted';
    lineWidth: number;
    lineColor: string;
    lineOpacity: number;
  };
}

export interface Page {
  id: number;
  pageNumber: number;
  elements: CanvasElement[];
  background?: PageBackground;
  database_id?: number; // Database pages.id
  layoutTemplateId?: string; // page-level layout template ID
  themeId?: string; // page-level theme ID (in addition to background.pageTheme for compatibility)
  colorPaletteId?: string; // page-level color palette ID
  isPreview?: boolean; // Flag für temporäre Preview-Seiten (werden nicht in UI angezeigt)
  isPlaceholder?: boolean; // Flag für Platzhalter-Seiten, die noch geladen werden müssen
  pageType?: 'content' | 'front-cover' | 'back-cover' | 'inner-front' | 'inner-back' | 'first-page' | 'last-page';
  pagePairId?: string;
  isSpecialPage?: boolean;
  isLocked?: boolean;
  isPrintable?: boolean;
  layoutVariation?: 'normal' | 'mirrored' | 'randomized';
  backgroundVariation?: 'normal' | 'mirrored' | 'randomized';
  backgroundTransform?: BackgroundTransform;
}


export interface Book {
  id: number | string;
  name: string;
  pageSize: string;
  orientation: string;
  pages: Page[];
  bookTheme?: string; // book-level theme ID (kept for backward compatibility)
  layoutTemplateId?: string; // book-level layout template ID
  themeId?: string; // book-level theme ID
  colorPaletteId?: string; // book-level color palette ID
  owner_id?: number; // book owner ID
  isTemporary?: boolean; // temporary book flag
  minPages?: number;
  maxPages?: number;
  pagePairingEnabled?: boolean;
  specialPagesConfig?: Record<
    string,
    {
      locked: boolean;
      printable: boolean;
    }
  >;
  layoutStrategy?: 'same' | 'pair' | 'mirrored' | 'random';
  layoutRandomMode?: 'single' | 'pair';
  assistedLayouts?: {
    single?: string | null;
    left?: string | null;
    right?: string | null;
  };
}

type PageKey = string | number;
type BookMetadataSnapshot = Omit<Book, 'pages'>;

export type HistoryCommand =
  | 'ADD_PAGE_PAIR'
  | 'DELETE_PAGE'
  | 'DUPLICATE_PAGE'
  | 'CANVAS_DRAG'
  | 'CANVAS_BATCH'
  | 'CHANGE_THEME'
  | 'CHANGE_LAYOUT'
  | 'CHANGE_PALETTE'
  | 'APPLY_TEMPLATE'
  | 'UPDATE_ELEMENT'
  | 'ADD_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'SET_PAGE_ASSIGNMENTS'
  | 'OTHER';


function cloneData<T>(value: T): T {
  try {
    const structuredCloneFn = (globalThis as typeof globalThis & { structuredClone?: typeof structuredClone }).structuredClone;
    if (typeof structuredCloneFn === 'function') {
      return structuredCloneFn(value);
    }
  } catch {
    // Ignore structuredClone errors and fall back to JSON clone
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function clonePage(page: Page): Page {
  return cloneData(page);
}

function parseJsonField<T = unknown>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

type LayoutVariationKind = NonNullable<Page['layoutVariation']>;
type BackgroundStylePlan = {
  variation: NonNullable<Page['backgroundVariation']>;
  transform?: Page['backgroundTransform'];
};

interface SpreadPlanPage {
  template: PageTemplate | null;
  variation: LayoutVariationKind;
  seed: number;
  background: BackgroundStylePlan;
}

function resolveTemplateReference(templateRef?: string | PageTemplate | null): PageTemplate | null {
  if (!templateRef) return null;
  if (typeof templateRef === 'string') {
    return pageTemplates.find((template) => template.id === templateRef) ?? null;
  }
  return templateRef;
}

function pickRandomTemplateFromPool(
  pool: PageTemplate[],
  rng: () => number,
  fallback: PageTemplate | null
): PageTemplate | null {
  if (!pool.length) return fallback;
  const index = Math.floor(rng() * pool.length);
  return pool[index] ?? fallback;
}

function buildBackgroundStylingFromSeed(
  seed: number,
  options: { mirror?: boolean; randomize?: boolean }
): BackgroundStylePlan {
  const rng = createSeededRNG(Math.max(1, seed));
  const transform: Page['backgroundTransform'] = {};
  if (options.mirror) {
    transform.mirror = true;
  }
  if (options.randomize) {
    transform.offsetRatioX = (rng() - 0.5) * 0.2;
    transform.offsetRatioY = (rng() - 0.5) * 0.2;
    transform.scale = 0.85 + rng() * 0.35;
  }
  const variation: NonNullable<Page['backgroundVariation']> = options.randomize
    ? 'randomized'
    : options.mirror
      ? 'mirrored'
      : 'normal';
  return {
    variation,
    transform: Object.keys(transform).length ? transform : undefined
  };
}

function applyVariationToElements(
  template: PageTemplate | null,
  variation: LayoutVariationKind,
  canvasSize: { width: number; height: number },
  seed: number
): CanvasElement[] {
  if (!template) return [];
  let elements = convertTemplateToElements(template, canvasSize);
  if (variation === 'mirrored') {
    elements = applyMirroredLayout(elements, canvasSize.width);
  } else if (variation === 'randomized') {
    elements = applyRandomLayout(elements, {
      seed: Math.max(1, seed),
      pageWidth: canvasSize.width,
      pageHeight: canvasSize.height
    });
  }
  return elements;
}

function buildSpreadPlanForBook(book: Book, canvasSize: { width: number; height: number }): {
  left: SpreadPlanPage;
  right: SpreadPlanPage;
} {
  const fallbackTemplate = resolveTemplateReference(book.layoutTemplateId) ?? pageTemplates[0] ?? null;
  const assistedLayouts = {
    single: resolveTemplateReference(book.assistedLayouts?.single),
    left: resolveTemplateReference(book.assistedLayouts?.left),
    right: resolveTemplateReference(book.assistedLayouts?.right)
  };
  const layoutStrategy = book.layoutStrategy ?? 'same';
  const randomMode = book.layoutRandomMode ?? 'single';
  const strategyFlags = deriveLayoutStrategyFlags(layoutStrategy, randomMode);
  const rng = createSeededRNG(Math.max(1, Date.now()));

  const templatePool = pageTemplates.length ? pageTemplates : fallbackTemplate ? [fallbackTemplate] : [];
  const pickRandomTemplate = () => pickRandomTemplateFromPool(templatePool, rng, fallbackTemplate);

  let leftTemplate = assistedLayouts.single ?? fallbackTemplate;
  let rightTemplate = leftTemplate;

  switch (layoutStrategy) {
    case 'pair':
      leftTemplate = assistedLayouts.left ?? fallbackTemplate;
      rightTemplate = assistedLayouts.right ?? fallbackTemplate;
      break;
    case 'mirrored':
      leftTemplate = assistedLayouts.single ?? fallbackTemplate;
      rightTemplate = leftTemplate;
      break;
    case 'random':
      if (randomMode === 'pair') {
        const randomTemplate = pickRandomTemplate() ?? fallbackTemplate;
        leftTemplate = randomTemplate;
        rightTemplate = randomTemplate;
      } else {
        leftTemplate = pickRandomTemplate() ?? fallbackTemplate;
        rightTemplate = pickRandomTemplate() ?? fallbackTemplate;
      }
      break;
    case 'same':
    default:
      leftTemplate = assistedLayouts.single ?? fallbackTemplate;
      rightTemplate = leftTemplate;
      break;
  }

  const shouldRandomizeLayouts = strategyFlags.randomizeLayouts;
  const shouldMirrorRightLayouts = strategyFlags.mirrorRightLayouts;
  const shouldRandomizeBackground = strategyFlags.randomizeBackground;
  const shouldMirrorRightBackground = strategyFlags.mirrorRightBackground;

  const leftVariation: LayoutVariationKind = derivePageLayoutVariation(strategyFlags, 'left');
  const rightVariation: LayoutVariationKind = derivePageLayoutVariation(strategyFlags, 'right');

  const baseSeed = Math.max(1, Math.floor(rng() * 1_000_000));
  const leftSeed = baseSeed;
  const rightSeed = Math.max(1, Math.floor(rng() * 1_000_000));

  const leftBackground = buildBackgroundStylingFromSeed(leftSeed, {
    randomize: shouldRandomizeBackground
  });
  const rightBackground = buildBackgroundStylingFromSeed(rightSeed, {
    mirror: shouldMirrorRightBackground,
    randomize: shouldRandomizeBackground
  });

  return {
    left: {
      template: leftTemplate,
      variation: leftVariation,
      seed: leftSeed,
      background: leftBackground
    },
    right: {
      template: rightTemplate,
      variation: rightVariation,
      seed: rightSeed,
      background: rightBackground
    }
  };
}

function extractBookMetadata(book: Book): BookMetadataSnapshot {
  const { pages, ...metadata } = book;
  return cloneData(metadata);
}

function rebuildBookFromSnapshot(snapshot: HistorySnapshot): Book | null {
  if (!snapshot.bookMeta || !snapshot.pageOrder) {
    return null;
  }

  const pages = snapshot.pageOrder
    .map((key) => {
      const page = snapshot.pageSnapshots.get(key);
      return page ? clonePage(page) : null;
    })
    .filter((page): page is Page => page !== null);

  return {
    ...cloneData(snapshot.bookMeta),
    pages
  };
}

function getPageKey(page: Page, index: number): PageKey {
  return page.id ?? page.database_id ?? `page-${index}`;
}

export interface HistorySnapshot {
  bookMeta: BookMetadataSnapshot | null;
  pageOrder: PageKey[];
  pageSnapshots: Map<PageKey, Page>;
  activePageIndex: number;
  selectedElementIds: string[];
  toolSettings: Record<string, Record<string, any>>;
  editorSettings: Record<string, Record<string, any>>;
  pagePagination?: PagePaginationState;
  pageAssignments: Record<number, any>;
}

export interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
  command?: HistoryCommand;
  timestamp?: number;
}

export interface WizardTemplateSelection {
  selectedTemplateId: string | null;
  selectedPaletteId: string | null;
  templateCustomizations?: any;
}

export interface EditorState {
  currentBook: Book | null;
  activePageIndex: number;
  activeTool: 'select' | 'text' | 'question' | 'answer' | 'qna' | 'qna2' | 'free_text' | 'image' | 'line' | 'circle' | 'rect' | 'brush' | 'pan' | 'zoom' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley' | 'triangle' | 'polygon' | 'pipette' | 'qr_code';
  selectedElementIds: string[];
  isMiniPreview?: boolean;
  selectedGroupedElement?: { groupId: string; elementId: string };
  user?: { id: number; role: string } | null;
  userRole?: 'author' | 'publisher' | null;
  assignedPages: number[];
  pageAccessLevel?: 'form_only' | 'own_page' | 'all_pages';
  editorInteractionLevel?: 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings';
  pageAssignments: Record<number, any>;
  bookFriends?: any[];
  editorBarVisible: boolean;
  toolbarVisible: boolean;
  settingsPanelVisible: boolean;
  toolSettings: Record<string, Record<string, any>>;
  editorSettings: Record<string, Record<string, any>>;
  history: HistoryEntry[];
  historyIndex: number;
  historyBase: HistorySnapshot | null;
  historyActions: string[];
  hasUnsavedChanges: boolean;
  selectedTemplate?: PageTemplate | null;
  availableTemplates?: PageTemplate[];
  colorPalettes?: ColorPalette[];
  selectedPaletteId?: string | null;
  selectedThemeId?: string | null;
  pageColorOverrides: Record<number, Record<string, boolean>>;
  canvasBackgroundImage?: string | null;
  canvasBackgroundPattern?: string | null;
  wizardTemplateSelection: WizardTemplateSelection;
  wizardSetupApplied?: boolean;
  pagePagination?: PagePaginationState;
  pagePreviewCache: Record<number, { dataUrl: string | null; version: number }>;
  pagePreviewVersions: Record<number, number>;
  modifiedPageIds: Set<number>; // Track which pages have been modified since last save
  tempQuestions: Record<string, string>;
  tempAnswers: Record<string, string>;
  /** Live preview for page numbering settings (reverted on Cancel or click outside) */
  pageNumberingPreview: PageNumberingSettings | null;
}

type EditorAction =
  | { type: 'SET_BOOK'; payload: Book; pagination?: PagePaginationState }
  | { type: 'SET_ACTIVE_PAGE'; payload: number }
  | { type: 'SET_ACTIVE_TOOL'; payload: EditorState['activeTool'] }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: string[] }
  | { type: 'SELECT_GROUPED_ELEMENT'; payload: { groupId: string; elementId: string } }
  | { type: 'SET_USER'; payload: { id: number; role: string } | null }
  | { type: 'SET_USER_ROLE'; payload: { role: 'author' | 'publisher' | null; assignedPages: number[] } }
  | { type: 'SET_USER_PERMISSIONS'; payload: { pageAccessLevel: 'form_only' | 'own_page' | 'all_pages'; editorInteractionLevel: 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings' } }
  | { type: 'ADD_ELEMENT'; payload: CanvasElement; skipHistory?: boolean }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_ELEMENT_PRESERVE_SELECTION'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_ELEMENT_ALL_PAGES'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_GROUPED_ELEMENT'; payload: { groupId: string; elementId: string; updates: Partial<CanvasElement> } }
  | { type: 'START_CANVAS_BATCH'; payload: { command: HistoryCommand } }
  | { type: 'BATCH_UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'END_CANVAS_BATCH'; payload: { actionName: string } }
  | { type: 'DELETE_ELEMENT'; payload: string; skipHistory?: boolean }
  | { type: 'MOVE_ELEMENT_TO_FRONT'; payload: string }
  | { type: 'MOVE_ELEMENT_TO_BACK'; payload: string }
  | { type: 'MOVE_ELEMENT_UP'; payload: string }
  | { type: 'MOVE_ELEMENT_DOWN'; payload: string }
  | { type: 'ADD_PAGE' }
  | { type: 'ADD_PAGE_PAIR_AT_INDEX'; payload: { insertionIndex: number } }
  | { type: 'ADD_EMPTY_PAGE_PAIR_AT_INDEX'; payload: { insertionIndex: number } }
  | { type: 'DELETE_PAGE'; payload: number }
  | { type: 'DUPLICATE_PAGE'; payload: number }
  | { type: 'CREATE_PREVIEW_PAGE'; payload: number } // pageIndex to duplicate
  | { type: 'DELETE_PREVIEW_PAGE' } // Deletes all preview pages
  | { type: 'TOGGLE_EDITOR_BAR' }
  | { type: 'TOGGLE_TOOLBAR' }
  | { type: 'TOGGLE_SETTINGS_PANEL' }
  | { type: 'MARK_SAVED' }
  | { type: 'UPDATE_TOOL_SETTINGS'; payload: { tool: string; settings: Record<string, any> } }
  | { type: 'SET_EDITOR_SETTINGS'; payload: Record<string, Record<string, any>> }
  | { type: 'UPDATE_EDITOR_SETTINGS'; payload: { category: string; settings: Record<string, any> } }
  | { type: 'UPDATE_TEMP_QUESTION'; payload: { questionId: string; text: string; questionPoolId?: number } }
  | { type: 'DELETE_TEMP_QUESTION'; payload: { questionId: string } }
  | { type: 'UPDATE_TEMP_ANSWER'; payload: { questionId: string; text: string; userId?: number; answerId?: string } }
  | { type: 'UPDATE_BOOK_NAME'; payload: string }
  | { type: 'UPDATE_PAGE_NUMBERING'; payload: { enabled: boolean; settings: PageNumberingSettings } }
  | { type: 'SET_PAGE_NUMBERING_PREVIEW'; payload: PageNumberingSettings | null }
  | { type: 'CLEAR_PAGE_NUMBERING_PREVIEW' }
  | { type: 'CLEAR_TEMP_DATA' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'GO_TO_HISTORY_STEP'; payload: number }
  | { type: 'SAVE_TO_HISTORY'; payload: string }
  | { type: 'UPDATE_PAGE_NUMBERS'; payload: { pageId: number; newPageNumber: number }[] }
  | { type: 'SET_PAGE_ASSIGNMENTS'; payload: Record<number, any> }
  | { type: 'UPDATE_PAGE_ASSIGNMENTS'; payload: { assignments: Record<number, any>; actionName?: string; skipHistory?: boolean } }
  | { type: 'SET_BOOK_FRIENDS'; payload: any[] }
  | { type: 'UPDATE_PAGE_BACKGROUND'; payload: { pageIndex: number; background: PageBackground; skipHistory?: boolean } }
  | { type: 'SET_BOOK_THEME'; payload: string; skipHistory?: boolean }
  | { type: 'SET_PAGE_THEME'; payload: { pageIndex: number; themeId: string; skipHistory?: boolean } }
  | { type: 'SET_BOOK_LAYOUT_TEMPLATE'; payload: string | null }
  | { type: 'SET_BOOK_COLOR_PALETTE'; payload: string | null; skipHistory?: boolean }
  | { type: 'SET_PAGE_LAYOUT_TEMPLATE'; payload: { pageIndex: number; layoutTemplateId: string | null } }
  | { type: 'SET_PAGE_COLOR_PALETTE'; payload: { pageIndex: number; colorPaletteId: string | null; skipHistory?: boolean } }
  | { type: 'APPLY_THEME_TO_ELEMENTS'; payload: { pageIndex: number; themeId: string; elementType?: string; applyToAllPages?: boolean; skipHistory?: boolean; preserveColors?: boolean } }
  | { type: 'REORDER_PAGES'; payload: { fromIndex: number; toIndex: number; count?: number } }
  | { type: 'REORDER_PAGES_TO_ORDER'; payload: { pageOrder: number[] } }
  | { type: 'TOGGLE_MAGNETIC_SNAPPING' }
  | { type: 'SET_QNA_ACTIVE_SECTION'; payload: 'question' | 'answer' }
  | { type: 'TOGGLE_STYLE_PAINTER' }
  | { type: 'APPLY_COPIED_STYLE'; payload: string }
  | { type: 'UPDATE_BOOK_SETTINGS'; payload: { pageSize: string; orientation: string } }
  | { type: 'SET_HOVERED_ELEMENT'; payload: string | null }
  | { type: 'SET_SELECTED_TEMPLATE'; payload: PageTemplate | null }
  | { type: 'LOAD_TEMPLATES'; payload: PageTemplate[] }
  | { type: 'LOAD_COLOR_PALETTES'; payload: ColorPalette[] }
  | { type: 'APPLY_TEMPLATE_TO_PAGE'; payload: { pageIndex: number; template: PageTemplate; skipHistory?: boolean } }
  | { type: 'APPLY_TEMPLATE'; payload: { template: PageTemplate; pageIndex?: number; applyToAllPages?: boolean } }
  | { type: 'APPLY_LAYOUT_TEMPLATE'; payload: { template: PageTemplate; pageIndex?: number; applyToAllPages?: boolean; skipHistory?: boolean } }
  | { type: 'APPLY_THEME_ONLY'; payload: { themeId: string; pageIndex?: number; applyToAllPages?: boolean } }
  | { type: 'APPLY_COLOR_PALETTE'; payload: { palette: ColorPalette; pageIndex?: number; applyToAllPages?: boolean; skipHistory?: boolean } }
  | { type: 'APPLY_COMPLETE_TEMPLATE'; payload: { layoutId?: string; themeId?: string; paletteId?: string; scope: 'current-page' | 'entire-book' } }
  | { type: 'SET_WIZARD_TEMPLATE_SELECTION'; payload: WizardTemplateSelection }
  | { type: 'MARK_COLOR_OVERRIDE'; payload: { elementIds: string[]; colorProperty: string } }
  | { type: 'RESET_COLOR_OVERRIDES'; payload: { elementIds: string[]; colorProperties?: string[]; pageIndex?: number } }
  | { type: 'SET_PAGE_PAGINATION'; payload: PagePaginationState | undefined }
  | { type: 'MERGE_BOOK_PAGES'; payload: { pages: Page[]; pagination?: PagePaginationState } }
  | { type: 'SET_PAGE_PREVIEW'; payload: { pageId: number; dataUrl: string | null; version: number } }
  | { type: 'MARK_WIZARD_SETUP_APPLIED' }
  | { type: 'CLEAR_MODIFIED_PAGES' }
  | { type: 'RESTORE_PAGE_STATE'; payload: { pageIndex: number; pageState: Page } }
  | { type: 'RESTORE_ELEMENT_STATE'; payload: { elementId: string; elementState: CanvasElement } };

const initialState: EditorState = {
  currentBook: null,
  activePageIndex: 0,
  activeTool: 'select',
  selectedElementIds: [],
  user: null,
  userRole: null,
  assignedPages: [],
  pageAssignments: {},
  bookFriends: undefined,
  editorBarVisible: true,
  toolbarVisible: true,
  settingsPanelVisible: true,
  hasUnsavedChanges: false,
  toolSettings: {},
  editorSettings: {},
  tempQuestions: {},
  tempAnswers: {},
  history: [],
  historyIndex: -1,
  historyBase: null,
  historyActions: [],
  magneticSnapping: true,
  qnaActiveSection: 'question',
  stylePainterActive: false,
  copiedStyle: null,
  hoveredElementId: null,
  selectedTemplate: null,
  availableTemplates: pageTemplates,
  colorPalettes: colorPalettes,
  wizardTemplateSelection: {
    selectedTemplateId: null,
    selectedPaletteId: null,
    templateCustomizations: undefined
  },
  pageColorOverrides: {},
  canvasBackgroundImage: null,
  canvasBackgroundPattern: null,
  wizardSetupApplied: false,
  pagePagination: undefined,
  pagePreviewCache: {},
  pagePreviewVersions: {},
  modifiedPageIds: new Set<number>(),
  pageNumberingPreview: null,
};

const BASE_HISTORY_LIMIT = 20;
const PAGE_CHUNK_SIZE = 20;

type PagePaginationState = {
  totalPages: number;
  pageSize: number;
  loadedPages: Record<number, true>;
};

function getHistoryLimitForBook(book: Book | null | undefined): number {
  // Fixed limit of 20 snapshots for all books
  return 20;
}

// Function to enforce theme stroke width boundaries
function enforceThemeBoundaries(updates: Partial<CanvasElement>, oldElement: CanvasElement): Partial<CanvasElement> {
  // No conversion needed - keep common values everywhere
  // Conversion happens only during rendering in themes.ts
  return updates;
}

interface SaveHistoryOptions {
  affectedPageIndexes?: number[];
  cloneEntireBook?: boolean;
  command?: HistoryCommand;
}

function getAllPageIndexes(state: EditorState): number[] {
  return state.currentBook ? state.currentBook.pages.map((_, index) => index) : [];
}

function isLayoutProtectedPage(page: Page | undefined, pageIndex: number): boolean {
  if (!page) return false;
  const pageNumber = typeof page.pageNumber === 'number' && !Number.isNaN(page.pageNumber)
    ? page.pageNumber
    : pageIndex + 1;
  return pageNumber === 1 || pageNumber === 2;
}

function collectPageCacheIds(book: Book | null | undefined): number[] {
  if (!book || !book.pages) return [];
  return book.pages
    .map((page, index) => {
      return getPagePreviewCacheId(page, index + 1);
    })
    .filter((id) => typeof id === 'number' && !Number.isNaN(id));
}

export function getPagePreviewCacheId(page: Page | undefined | null, fallbackValue?: number): number | null {
  if (!page) return fallbackValue ?? null;
  if (typeof page.id === 'number' && !Number.isNaN(page.id)) {
    return page.id;
  }
  if (typeof page.database_id === 'number' && !Number.isNaN(page.database_id)) {
    return page.database_id;
  }
  if (typeof page.pageNumber === 'number' && !Number.isNaN(page.pageNumber)) {
    return page.pageNumber;
  }
  if (typeof fallbackValue === 'number' && !Number.isNaN(fallbackValue)) {
    return fallbackValue;
  }
  return null;
}

function withPreviewInvalidation(state: EditorState, pageIds?: number[]): EditorState {
  const ids = pageIds && pageIds.length ? pageIds : collectPageCacheIds(state.currentBook);
  return invalidatePagePreviews(state, ids);
}

function markPageAsModified(state: EditorState, pageId: number | null | undefined): EditorState {
  if (!pageId || typeof pageId !== 'number' || Number.isNaN(pageId)) {
    return state;
  }
  const newModifiedIds = new Set(state.modifiedPageIds);
  newModifiedIds.add(pageId);
  return { ...state, modifiedPageIds: newModifiedIds };
}

function markPageIndexAsModified(state: EditorState, pageIndex: number): EditorState {
  if (!state.currentBook || pageIndex < 0 || pageIndex >= state.currentBook.pages.length) {
    return state;
  }
  const page = state.currentBook.pages[pageIndex];
  const pageId = getPagePreviewCacheId(page, pageIndex + 1);
  return markPageAsModified(state, pageId);
}

function markAllPagesAsModified(state: EditorState): EditorState {
  if (!state.currentBook) {
    return state;
  }
  const newModifiedIds = new Set(state.modifiedPageIds);
  state.currentBook.pages.forEach((page, index) => {
    const pageId = getPagePreviewCacheId(page, index + 1);
    if (pageId !== null) {
      newModifiedIds.add(pageId);
    }
  });
  return { ...state, modifiedPageIds: newModifiedIds };
}

function createPlaceholderPage(pageNumber: number): Page {
  return {
    id: -pageNumber,
    pageNumber,
    elements: [],
    isPlaceholder: true,
    layoutTemplateId: undefined,
    themeId: undefined,
    colorPaletteId: undefined,
  };
}

function ensurePageArrayLength(pages: Page[], totalPages: number): Page[] {
  const pageMap = new Map<number, Page>();
  pages.forEach((page, index) => {
    const number = page.pageNumber ?? index + 1;
    pageMap.set(number, page);
  });

  const result: Page[] = [];
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const existing = pageMap.get(pageNumber);
    if (existing) {
      result.push(existing);
    } else {
      result.push(createPlaceholderPage(pageNumber));
    }
  }
  return result;
}

type PageNormalizationOptions = {
  book: Book;
  bookThemeId: string | null;
  bookColorPaletteId: string | null;
  effectiveBookPaletteId: string | null;
  bookPalette: ColorPalette | null;
  pageIndexOffset?: number;
};

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, any> = {};
    Object.keys(value).forEach((key) => {
      result[key] = cloneValue((value as any)[key]);
    });
    return result as T;
  }
  return value;
}

function mergeElementDefaults<T extends Record<string, any>>(
  target: T | undefined,
  defaults: Partial<T> | undefined
): T {
  const base: Record<string, any> = target ? { ...target } : {};
  if (!defaults) {
    return base as T;
  }

  Object.keys(defaults).forEach((key) => {
    const defaultValue = (defaults as any)[key];
    if (defaultValue === undefined) {
      return;
    }
    const existingValue = base[key];
    if (existingValue === undefined) {
      base[key] = cloneValue(defaultValue);
    } else if (isPlainObject(defaultValue) && isPlainObject(existingValue)) {
      base[key] = mergeElementDefaults(existingValue, defaultValue);
    }
  });

  return base as T;
}

function normalizeApiPages(rawPages: any[], options: PageNormalizationOptions): Page[] {
  const {
    book,
    bookThemeId,
    bookColorPaletteId,
    effectiveBookPaletteId,
    bookPalette,
    pageIndexOffset = 0
  } = options;

  return (rawPages ?? []).map((page: any, index: number) => {
    const fallbackNumber = pageIndexOffset + index + 1;
    const pageNumber = page.pageNumber ?? page.page_number ?? fallbackNumber;
    const resolvedPageType = page.pageType ?? page.page_type ?? 'content';
    const resolvedPagePairId = page.pagePairId ?? page.page_pair_id ?? undefined;
    const resolvedIsSpecial = page.isSpecialPage ?? page.is_special_page ?? (resolvedPageType !== 'content');
    const resolvedIsLocked = page.isLocked ?? page.is_locked ?? false;
    const resolvedIsPrintableValue = page.isPrintable ?? page.is_printable;
    const resolvedIsPrintable = resolvedIsPrintableValue === undefined ? true : resolvedIsPrintableValue;
    const resolvedLayoutVariation = page.layoutVariation ?? page.layout_variation ?? 'normal';
    const resolvedBackgroundVariation = page.backgroundVariation ?? page.background_variation ?? 'normal';
    const resolvedBackgroundTransform =
      page.backgroundTransform ??
      parseJsonField<Page['backgroundTransform']>(page.background_transform) ??
      undefined;

    const hasThemeIdOwnProperty = Object.prototype.hasOwnProperty.call(page, 'themeId');
    const pageThemeId = page.themeId;
    const pageInheritsTheme = !hasThemeIdOwnProperty || pageThemeId === undefined || pageThemeId === null;

    const isInnerFrontOrBack = resolvedPageType === 'inner-front' || resolvedPageType === 'inner-back';

    let resolvedBackground = page.background;
    const isCustomImageBackground =
      page.background?.type === 'image' &&
      !page.background?.backgroundImageTemplateId &&
      page.background?.value;
    
    // Check if background was explicitly set by user (not inherited from theme)
    // If page has explicit themeId, it means user set it, so preserve the background
    // Also check if background type is pattern or color (user might have changed from image to pattern)
    const hasExplicitBackground = !pageInheritsTheme || 
      (page.background && (
        page.background.type === 'pattern' ||
        (page.background.type === 'color' && page.background.value !== undefined) ||
        isCustomImageBackground
      ));

    if (isInnerFrontOrBack) {
      resolvedBackground = null;
    } else if (pageInheritsTheme && bookThemeId && !hasExplicitBackground) {
      const theme = getGlobalTheme(bookThemeId);
      if (theme) {
        let effectivePaletteId: string | null = null;
        if (page.colorPaletteId === null) {
          // Page uses Theme's Default Palette - use theme's palette
          effectivePaletteId = getThemePaletteId(bookThemeId);
        } else {
          // Page has explicit palette - use it
          effectivePaletteId = page.colorPaletteId;
        }
        const pagePalette = effectivePaletteId ? colorPalettes.find((p) => p.id === effectivePaletteId) : null;
        const pageColors = getThemePageBackgroundColors(bookThemeId, pagePalette || bookPalette || undefined);
        const backgroundOpacity = theme.pageSettings.backgroundOpacity ?? page.background?.opacity ?? 1;

        const backgroundImageConfig = theme.pageSettings.backgroundImage;
        if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
          const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
            imageSize: backgroundImageConfig.size,
            imageRepeat: backgroundImageConfig.repeat,
            imagePosition: backgroundImageConfig.position,
            imageWidth: backgroundImageConfig.width,
            opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
            backgroundColor: pageColors.backgroundColor
          });

          if (imageBackground) {
            resolvedBackground = {
              ...imageBackground,
              pageTheme: bookThemeId
            };
          }
        } else if (theme.pageSettings.backgroundPattern?.enabled) {
          resolvedBackground = {
            type: 'pattern',
            value: theme.pageSettings.backgroundPattern.style,
            opacity: backgroundOpacity,
            pageTheme: bookThemeId,
            patternSize: theme.pageSettings.backgroundPattern.size,
            patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
            patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity,
            patternForegroundColor: pageColors.backgroundColor,
            patternBackgroundColor: pageColors.patternBackgroundColor
          };
        } else {
          resolvedBackground = {
            type: 'color',
            value: pageColors.backgroundColor,
            opacity: backgroundOpacity,
            pageTheme: bookThemeId
          };
        }
      }
    } else if (isCustomImageBackground && pageInheritsTheme) {
      resolvedBackground = {
        ...page.background,
        pageTheme: bookThemeId || page.background?.pageTheme
      };
    }

    let resolvedElements = page.elements || [];
    if (pageInheritsTheme && bookThemeId && resolvedElements.length > 0) {
      const theme = getGlobalTheme(bookThemeId);
      if (theme) {
        let pageEffectivePaletteId: string | null = null;
        if (page.colorPaletteId === null) {
          // Page uses Theme's Default Palette - use theme's palette
          pageEffectivePaletteId = getThemePaletteId(bookThemeId);
        } else {
          // Page has explicit palette - use it
          pageEffectivePaletteId = page.colorPaletteId;
        }

        const pageLayoutTemplateId = page.layoutTemplateId || book.layoutTemplateId || null;
        const bookLayoutTemplateId = book.layoutTemplateId || null;

        resolvedElements = resolvedElements.map((element: any) => {
          const toolType = element.textType || element.type;
          const activeTheme = bookThemeId || 'default';
          const effectivePaletteId = pageEffectivePaletteId;
          const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType as any, effectivePaletteId);

          const preservedRotation = typeof element.rotation === 'number' ? element.rotation : 0;
          const isShape = element.type !== 'text' && element.type !== 'image' && !element.textType;
          const preservedScaleX = isShape && typeof element.scaleX === 'number' ? element.scaleX : undefined;
          const preservedScaleY = isShape && typeof element.scaleY === 'number' ? element.scaleY : undefined;
          // Preserve questionId and answerId from element
          const preservedQuestionId = element.questionId;
          const preservedAnswerId = element.answerId;
          // CRITICAL: Preserve width and height explicitly to prevent them from being overwritten by defaults
          const preservedWidth = typeof element.width === 'number' ? element.width : undefined;
          const preservedHeight = typeof element.height === 'number' ? element.height : undefined;
          
          const mergedElement = mergeElementDefaults(element, themeDefaults);
          
          
          const updatedElement = {
            ...mergedElement,
            theme: bookThemeId,
            rotation: preservedRotation,
            ...(preservedWidth !== undefined ? { width: preservedWidth } : {}),
            ...(preservedHeight !== undefined ? { height: preservedHeight } : {}),
            ...(preservedScaleX !== undefined ? { scaleX: preservedScaleX } : {}),
            ...(preservedScaleY !== undefined ? { scaleY: preservedScaleY } : {}),
            ...(preservedQuestionId !== undefined ? { questionId: preservedQuestionId } : {}),
            ...(preservedAnswerId !== undefined ? { answerId: preservedAnswerId } : {})
          };
          
          return updatedElement;
        });
      }
    }

    return {
      ...page,
      id: page.id ?? page.database_id ?? pageNumber,
      pageNumber,
      database_id: page.id ?? page.database_id,
      isPlaceholder: false,
      background: resolvedBackground,
      elements: resolvedElements,
      pageType: resolvedPageType,
      pagePairId: resolvedPagePairId,
      isSpecialPage: resolvedIsSpecial,
      isLocked: resolvedIsLocked,
      isPrintable: resolvedIsPrintable,
      layoutVariation: resolvedLayoutVariation,
      backgroundVariation: resolvedBackgroundVariation,
      ...(resolvedBackgroundTransform ? { backgroundTransform: resolvedBackgroundTransform } : {}),
      ...(hasThemeIdOwnProperty && pageThemeId !== undefined && pageThemeId !== null
        ? { themeId: pageThemeId }
        : {})
    };
  });
}
function buildHistorySnapshot(
  state: EditorState,
  previousSnapshot: HistorySnapshot | null,
  options?: SaveHistoryOptions
): HistorySnapshot {
  if (!state.currentBook) {
    return {
      bookMeta: null,
      pageOrder: [],
      pageSnapshots: new Map<PageKey, Page>(),
      activePageIndex: state.activePageIndex,
      selectedElementIds: [...state.selectedElementIds],
      toolSettings: cloneData(state.toolSettings),
      editorSettings: cloneData(state.editorSettings),
      pagePagination: state.pagePagination
        ? {
            ...state.pagePagination,
            loadedPages: { ...state.pagePagination.loadedPages }
          }
        : undefined,
      pageAssignments: cloneData(state.pageAssignments)
    };
  }

  const currentPages = state.currentBook.pages || [];
  const shouldCloneAll = options?.cloneEntireBook || !previousSnapshot;
  const defaultIndexes: number[] =
    state.activePageIndex >= 0 && state.activePageIndex < currentPages.length
      ? [state.activePageIndex]
      : [];
  const indexesToClone = shouldCloneAll
    ? currentPages.map((_, index) => index)
    : Array.from(new Set((options?.affectedPageIndexes ?? defaultIndexes).filter((index) => index >= 0)));

  const pageOrder: PageKey[] = currentPages.map((page, index) => getPageKey(page, index));
  const pageSnapshots = previousSnapshot ? new Map(previousSnapshot.pageSnapshots) : new Map<PageKey, Page>();

  if (!shouldCloneAll && previousSnapshot) {
    const existingKeys = new Set(pageOrder);
    previousSnapshot.pageSnapshots.forEach((_value, key) => {
      if (!existingKeys.has(key) && pageSnapshots.has(key)) {
        pageSnapshots.delete(key);
      }
    });
  }

  indexesToClone.forEach((index) => {
    if (index < 0 || index >= currentPages.length) {
      return;
    }
    const page = currentPages[index];
    const key = getPageKey(page, index);
    pageSnapshots.set(key, clonePage(page));
  });

  if (shouldCloneAll) {
    currentPages.forEach((page, index) => {
      const key = getPageKey(page, index);
      if (!pageSnapshots.has(key)) {
        pageSnapshots.set(key, clonePage(page));
      }
    });
  }

  return {
    bookMeta: extractBookMetadata(state.currentBook),
    pageOrder,
    pageSnapshots,
    activePageIndex: state.activePageIndex,
    selectedElementIds: [...state.selectedElementIds],
    toolSettings: cloneData(state.toolSettings),
    editorSettings: cloneData(state.editorSettings),
    pagePagination: state.pagePagination
      ? {
          ...state.pagePagination,
          loadedPages: { ...state.pagePagination.loadedPages }
        }
      : undefined,
    pageAssignments: cloneData(state.pageAssignments)
  };
}

function applySnapshotToDraft(draft: HistorySnapshot, snapshot: HistorySnapshot): void {
  draft.bookMeta = snapshot.bookMeta;
  draft.pageOrder = snapshot.pageOrder;
  draft.pageSnapshots = snapshot.pageSnapshots;
  draft.activePageIndex = snapshot.activePageIndex;
  draft.selectedElementIds = snapshot.selectedElementIds;
  draft.toolSettings = snapshot.toolSettings;
  draft.editorSettings = snapshot.editorSettings;
  draft.pagePagination = snapshot.pagePagination;
  draft.pageAssignments = snapshot.pageAssignments;
}

function getSnapshotFromHistory(
  historyBase: HistorySnapshot | null,
  history: HistoryEntry[],
  index: number
): HistorySnapshot | null {
  if (!historyBase || index < 0 || history.length === 0) {
    return null;
  }

  let snapshot = historyBase;
  const maxIndex = Math.min(index, history.length - 1);
  for (let i = 1; i <= maxIndex; i += 1) {
    snapshot = applyPatches(snapshot, history[i].patches) as HistorySnapshot;
  }
  return snapshot;
}

function getAllSnapshotsFromHistory(
  historyBase: HistorySnapshot | null,
  history: HistoryEntry[]
): HistorySnapshot[] {
  if (!historyBase || history.length === 0) {
    return [];
  }

  const snapshots: HistorySnapshot[] = [];
  let snapshot = historyBase;
  snapshots.push(snapshot);
  for (let i = 1; i < history.length; i += 1) {
    snapshot = applyPatches(snapshot, history[i].patches) as HistorySnapshot;
    snapshots.push(snapshot);
  }
  return snapshots;
}

function rebuildHistoryFromSnapshots(
  snapshots: HistorySnapshot[],
  previousEntries: HistoryEntry[]
): { historyBase: HistorySnapshot | null; history: HistoryEntry[] } {
  if (!snapshots.length) {
    return { historyBase: null, history: [] };
  }

  const rebuiltEntries: HistoryEntry[] = snapshots.map((_snapshot, index) => {
    if (index === 0) {
      return {
        patches: [],
        inversePatches: [],
        command: previousEntries[index]?.command,
        timestamp: previousEntries[index]?.timestamp
      };
    }

    const [_, patches, inversePatches] = produceWithPatches(
      snapshots[index - 1],
      (draft) => {
        applySnapshotToDraft(draft as HistorySnapshot, snapshots[index]);
      }
    );

    return {
      patches,
      inversePatches,
      command: previousEntries[index]?.command,
      timestamp: previousEntries[index]?.timestamp
    };
  });

  return { historyBase: snapshots[0], history: rebuiltEntries };
}

function saveToHistory(state: EditorState, actionName: string, options?: SaveHistoryOptions): EditorState {
  if (!state.currentBook) return state;

  const previousSnapshot = getSnapshotFromHistory(state.historyBase, state.history, state.historyIndex);
  const newSnapshot = buildHistorySnapshot(state, previousSnapshot, options);
  const historyLimit = getHistoryLimitForBook(state.currentBook);
  const actionTimestamp = Date.now();

  if (!previousSnapshot || !state.historyBase || state.history.length === 0) {
    const initialEntry: HistoryEntry = {
      patches: [],
      inversePatches: [],
      command: options?.command,
      timestamp: actionTimestamp
    };

    return {
      ...state,
      historyBase: newSnapshot,
      history: [initialEntry],
      historyIndex: 0,
      historyActions: [actionName]
    };
  }

  const [_, patches, inversePatches] = produceWithPatches(previousSnapshot, (draft) => {
    applySnapshotToDraft(draft as HistorySnapshot, newSnapshot);
  });

  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({ patches, inversePatches, command: options?.command, timestamp: actionTimestamp });

  let nextHistoryBase = state.historyBase;
  while (newHistory.length > historyLimit && nextHistoryBase) {
    newHistory.shift();
    if (newHistory.length > 0) {
      nextHistoryBase = applyPatches(nextHistoryBase, newHistory[0].patches) as HistorySnapshot;
      newHistory[0] = {
        ...newHistory[0],
        patches: [],
        inversePatches: []
      };
    }
  }

  const newHistoryActions = state.historyActions.slice(0, state.historyIndex + 1);
  newHistoryActions.push(actionName);

  while (newHistoryActions.length > historyLimit) {
    newHistoryActions.shift();
  }

  return {
    ...state,
    historyBase: nextHistoryBase,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    historyActions: newHistoryActions
  };
}

function invalidatePagePreviews(state: EditorState, pageIds: number[]): EditorState {
  if (!pageIds.length) {
    return state;
  }

  let cacheChanged = false;
  let versionChanged = false;
  const newCache = { ...state.pagePreviewCache };
  const newVersions = { ...state.pagePreviewVersions };

  pageIds.forEach((pageId) => {
    if (pageId == null) {
      return;
    }
    if (newCache[pageId]) {
      delete newCache[pageId];
      cacheChanged = true;
    }
    newVersions[pageId] = (newVersions[pageId] || 0) + 1;
    versionChanged = true;
  });

  if (!cacheChanged && !versionChanged) {
    return state;
  }

  return {
    ...state,
    pagePreviewCache: newCache,
    pagePreviewVersions: newVersions,
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_BOOK': {
      const previewVersions: Record<number, number> = action.payload
        ? action.payload.pages.reduce((acc, page, index) => {
            if (page.isPlaceholder) {
              return acc;
            }
            const cacheId = getPagePreviewCacheId(page, index + 1);
            if (cacheId != null) {
              acc[cacheId] = (state.pagePreviewVersions[cacheId] || 0) + 1;
            }
            return acc;
          }, {} as Record<number, number>)
        : {};
      const bookState = {
        ...state,
        currentBook: action.payload,
        activePageIndex: 0,
        pagePreviewCache: {},
        pagePreviewVersions: previewVersions,
        pagePagination: action.pagination,
        modifiedPageIds: new Set<number>(), // Reset modified pages when loading a new book
      };
      if (action.payload) {
        const loadSnapshot = buildHistorySnapshot(bookState, null, { cloneEntireBook: true });
        return {
          ...bookState,
          historyBase: loadSnapshot,
          history: [{ patches: [], inversePatches: [], command: 'INITIAL', timestamp: Date.now() }],
          historyIndex: 0,
          historyActions: ['Load Book']
        };
      }
      return {
        ...bookState,
        historyBase: null,
        history: [],
        historyIndex: -1,
        historyActions: []
      };
    }
    
    case 'SET_ACTIVE_PAGE':
      const activePageState = { ...state, activePageIndex: action.payload, selectedElementIds: [] };
      // Auto-set pan tool for authors on non-assigned pages
      if (activePageState.userRole === 'author' && !activePageState.assignedPages.includes(action.payload + 1)) {
        activePageState.activeTool = 'pan';
      }
      // Auto-set select tool for authors on assigned pages
      else if (activePageState.userRole === 'author' && activePageState.assignedPages.includes(action.payload + 1)) {
        activePageState.activeTool = 'select';
      }
      return activePageState;
    
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };
    
    case 'SET_SELECTED_ELEMENTS':
      // Preserve selectedGroupedElement if the group is still selected
      const preserveGroupedElement = state.selectedGroupedElement && 
        action.payload.includes(state.selectedGroupedElement.groupId);
      return { 
        ...state, 
        selectedElementIds: action.payload, 
        selectedGroupedElement: preserveGroupedElement ? state.selectedGroupedElement : undefined 
      };
    
    case 'SELECT_GROUPED_ELEMENT':
      return { 
        ...state, 
        selectedElementIds: [action.payload.groupId],
        selectedGroupedElement: action.payload
      };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_USER_ROLE':
      const roleState = { ...state, userRole: action.payload.role, assignedPages: action.payload.assignedPages };
      // Auto-set pan tool for authors on non-assigned pages
      if (roleState.userRole === 'author' && !roleState.assignedPages.includes(roleState.activePageIndex + 1)) {
        roleState.activeTool = 'pan';
      }
      return roleState;
    
    case 'SET_USER_PERMISSIONS':
      return { ...state, pageAccessLevel: action.payload.pageAccessLevel, editorInteractionLevel: action.payload.editorInteractionLevel };
    
    case 'ADD_ELEMENT':
      if (!state.currentBook || !state.currentBook.pages[state.activePageIndex]) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      // Check if author is assigned to current page
      if (state.userRole === 'author' && !state.assignedPages.includes(state.activePageIndex + 1)) return state;
      const savedState = action.skipHistory
        ? state
        : saveToHistory(state, `Add ${action.payload.type}`, {
            affectedPageIndexes: [state.activePageIndex]
          });
      
      // Apply current tool settings as defaults (which include palette colors)
      const toolType = action.payload.textType || action.payload.type;
      const toolSettings = savedState.toolSettings?.[toolType] || {};
      let elementWithDefaults = { ...toolSettings, ...action.payload };
      
      // Assign UUID to question elements
      if (elementWithDefaults.textType === 'question' && !elementWithDefaults.questionId) {
        elementWithDefaults.questionId = uuidv4();
      }
      
      
      const newBook = {
        ...savedState.currentBook!,
        pages: savedState.currentBook!.pages.map((page, index) => 
          index === savedState.activePageIndex 
            ? { ...page, elements: [...page.elements, elementWithDefaults] }
            : page
        )
      };
      const newState = { 
        ...savedState, 
        currentBook: newBook, 
        selectedElementIds: [action.payload.id], 
        hasUnsavedChanges: true 
      };
      const targetPage = newBook.pages[savedState.activePageIndex];
      const stateWithInvalidation = invalidatePagePreviews(newState, targetPage ? [targetPage.id] : []);
      return markPageIndexAsModified(stateWithInvalidation, savedState.activePageIndex);
    
    case 'UPDATE_ELEMENT':
      if (!state.currentBook) return state;
      // Block for answer_only users (except for answer elements)
      if (state.editorInteractionLevel === 'answer_only') {
        const element = state.currentBook.pages[state.activePageIndex]?.elements.find(el => el.id === action.payload.id);
        if (!element || element.textType !== 'answer') return state;
      }
      // Check if author is assigned to current page
      if (state.userRole === 'author' && !state.assignedPages.includes(state.activePageIndex + 1)) return state;
      const updatedBook = { ...state.currentBook };
      const page = updatedBook.pages[state.activePageIndex];
      const elementIndex = page.elements.findIndex(el => el.id === action.payload.id);
      if (elementIndex !== -1) {
        const oldElement = page.elements[elementIndex];
        const enforcedUpdates = enforceThemeBoundaries(action.payload.updates, oldElement);
        page.elements[elementIndex] = { ...oldElement, ...enforcedUpdates };
      }
      const updatedState = { ...state, currentBook: updatedBook, hasUnsavedChanges: true };
      const pageId = updatedBook.pages[state.activePageIndex]?.id;
      const updateStateWithInvalidation = invalidatePagePreviews(updatedState, pageId ? [pageId] : []);
      return markPageIndexAsModified(updateStateWithInvalidation, state.activePageIndex);
    
    case 'UPDATE_ELEMENT_PRESERVE_SELECTION':
      if (!state.currentBook) return state;
      const updatedBookPreserve = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => {
          if (index === state.activePageIndex) {
            const elementIndex = page.elements.findIndex(el => el.id === action.payload.id);
            if (elementIndex !== -1) {
              const oldElement = page.elements[elementIndex];
              const enforcedUpdates = enforceThemeBoundaries(action.payload.updates, oldElement);
              
              // Deep merge nested objects like questionSettings and answerSettings
              const mergedUpdates = { ...enforcedUpdates };
              if (enforcedUpdates.questionSettings) {
                mergedUpdates.questionSettings = {
                  ...oldElement.questionSettings,
                  ...enforcedUpdates.questionSettings
                };
              }
              if (enforcedUpdates.answerSettings) {
                mergedUpdates.answerSettings = {
                  ...oldElement.answerSettings,
                  ...enforcedUpdates.answerSettings
                };
              }
              if (enforcedUpdates.textSettings) {
                mergedUpdates.textSettings = {
                  ...oldElement.textSettings,
                  ...enforcedUpdates.textSettings
                };
              }
              
              // Check if this is a color update and mark as override
              const colorProperties = ['stroke', 'fill', 'fontColor', 'borderColor', 'backgroundColor'];
              const colorOverrides = { ...oldElement.colorOverrides };
              
              // Also check nested color properties in questionSettings and answerSettings
              if (mergedUpdates.questionSettings) {
                if (mergedUpdates.questionSettings.fontColor !== undefined && 
                    mergedUpdates.questionSettings.fontColor !== oldElement.questionSettings?.fontColor) {
                  colorOverrides['questionSettings.fontColor'] = true;
                }
                if (mergedUpdates.questionSettings.borderColor !== undefined && 
                    mergedUpdates.questionSettings.borderColor !== oldElement.questionSettings?.borderColor) {
                  colorOverrides['questionSettings.borderColor'] = true;
                }
                if (mergedUpdates.questionSettings.backgroundColor !== undefined && 
                    mergedUpdates.questionSettings.backgroundColor !== oldElement.questionSettings?.backgroundColor) {
                  colorOverrides['questionSettings.backgroundColor'] = true;
                }
              }
              if (mergedUpdates.answerSettings) {
                if (mergedUpdates.answerSettings.fontColor !== undefined && 
                    mergedUpdates.answerSettings.fontColor !== oldElement.answerSettings?.fontColor) {
                  colorOverrides['answerSettings.fontColor'] = true;
                }
                if (mergedUpdates.answerSettings.borderColor !== undefined && 
                    mergedUpdates.answerSettings.borderColor !== oldElement.answerSettings?.borderColor) {
                  colorOverrides['answerSettings.borderColor'] = true;
                }
                if (mergedUpdates.answerSettings.backgroundColor !== undefined && 
                    mergedUpdates.answerSettings.backgroundColor !== oldElement.answerSettings?.backgroundColor) {
                  colorOverrides['answerSettings.backgroundColor'] = true;
                }
              }
              
              colorProperties.forEach(prop => {
                if (mergedUpdates[prop] !== undefined && mergedUpdates[prop] !== oldElement[prop]) {
                  colorOverrides[prop] = true;
                }
              });
              
              return {
                ...page,
                elements: page.elements.map((el, elIndex) =>
                  elIndex === elementIndex ? { ...oldElement, ...mergedUpdates, colorOverrides } : el
                )
              };
            }
          }
          return page;
        })
      };
      const stateAfterUpdate = { ...state, currentBook: updatedBookPreserve, hasUnsavedChanges: true };
      const updatedPageId = updatedBookPreserve.pages[state.activePageIndex]?.id;
      const preserveStateWithInvalidation = invalidatePagePreviews(stateAfterUpdate, updatedPageId ? [updatedPageId] : []);
      return markPageIndexAsModified(preserveStateWithInvalidation, state.activePageIndex);
    
    case 'UPDATE_GROUPED_ELEMENT':
      if (!state.currentBook) return state;
      const updatedBookGrouped = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => {
          if (index === state.activePageIndex) {
            return {
              ...page,
              elements: page.elements.map(el => {
                if (el.id === action.payload.groupId && el.groupedElements) {
                  return {
                    ...el,
                    groupedElements: el.groupedElements.map(groupedEl => 
                      groupedEl.id === action.payload.elementId
                        ? { ...groupedEl, ...action.payload.updates }
                        : groupedEl
                    )
                  };
                }
                return el;
              })
            };
          }
          return page;
        })
      };
      const stateAfterGrouped = { ...state, currentBook: updatedBookGrouped, hasUnsavedChanges: true };
      const groupedPageId = updatedBookGrouped.pages[state.activePageIndex]?.id;
      const groupedStateWithInvalidation = invalidatePagePreviews(stateAfterGrouped, groupedPageId ? [groupedPageId] : []);
      return markPageIndexAsModified(groupedStateWithInvalidation, state.activePageIndex);
    
    case 'UPDATE_ELEMENT_ALL_PAGES':
      if (!state.currentBook) return state;
      const updatedBookAllPages = { ...state.currentBook };
      const affectedAllPages: number[] = [];
      updatedBookAllPages.pages.forEach(page => {
        const elementIndex = page.elements.findIndex(el => el.id === action.payload.id);
        if (elementIndex !== -1) {
          const oldElementAllPages = page.elements[elementIndex];
          const enforcedUpdatesAllPages = enforceThemeBoundaries(action.payload.updates, oldElementAllPages);
          page.elements[elementIndex] = { ...oldElementAllPages, ...enforcedUpdatesAllPages };
          affectedAllPages.push(page.id);
        }
      });
      const stateAfterAllPages = { ...state, currentBook: updatedBookAllPages, hasUnsavedChanges: true };
      const allPagesStateWithInvalidation = invalidatePagePreviews(stateAfterAllPages, affectedAllPages);
      // Mark all affected pages as modified
      let finalState = allPagesStateWithInvalidation;
      updatedBookAllPages.pages.forEach((page, index) => {
        if (affectedAllPages.includes(page.id)) {
          finalState = markPageIndexAsModified(finalState, index);
        }
      });
      return finalState;
    
    // Canvas Batching Cases for transform operations (drag, resize, rotate)
    case 'START_CANVAS_BATCH': {
      // Initialize a batch for canvas operations
      // This prevents individual updates from creating history entries
      if (state.canvasBatchActive) {
        return state;
      }
      return {
        ...state,
        canvasBatchActive: true,
        canvasBatchCommand: action.payload.command,
        canvasPendingUpdates: new Map(),
        canvasBatchAffectedPageIndexes: new Set([state.activePageIndex])
      };
    }
    
    case 'BATCH_UPDATE_ELEMENT': {
      // Collect updates during batch without applying to history
      if (!state.canvasBatchActive || !state.currentBook) return state;
      
      const pendingUpdates = new Map(state.canvasPendingUpdates);
      const elementId = action.payload.id;
      const element = state.currentBook.pages[state.activePageIndex]?.elements.find(el => el.id === elementId);
      
      if (!element) return state;
      
      // Merge with existing pending updates for this element
      const existingUpdates = pendingUpdates.get(elementId) || {};
      const mergedUpdates = { ...existingUpdates, ...action.payload.updates };
      pendingUpdates.set(elementId, mergedUpdates);
      
      // Apply updates to current state for real-time visual feedback
      const updatedBook = { ...state.currentBook };
      const pageIndex = state.activePageIndex;
      const page = updatedBook.pages[pageIndex];
      const elementIndex = page.elements.findIndex(el => el.id === elementId);
      
      if (elementIndex !== -1) {
        const oldElement = page.elements[elementIndex];
        const enforcedUpdates = enforceThemeBoundaries(mergedUpdates, oldElement);
        page.elements[elementIndex] = { ...oldElement, ...enforcedUpdates };

      }
      
      const updatedState = { ...state, currentBook: updatedBook, hasUnsavedChanges: true };
      const pageId = updatedBook.pages[pageIndex]?.id;
      const stateWithInvalidation = invalidatePagePreviews(updatedState, pageId ? [pageId] : []);
      
      return {
        ...markPageIndexAsModified(stateWithInvalidation, pageIndex),
        canvasPendingUpdates: pendingUpdates
      };
    }
    
    case 'END_CANVAS_BATCH': {
      // Apply all batched updates and save to history as a single snapshot
      if (!state.canvasBatchActive || !state.currentBook) {
        return {
          ...state,
          canvasBatchActive: false,
          canvasBatchCommand: null,
          canvasPendingUpdates: new Map(),
          canvasBatchAffectedPageIndexes: new Set()
        };
      }

      // Log element state before saving
      state.canvasPendingUpdates.forEach((updates, elementId) => {
        const element = state.currentBook?.pages[state.activePageIndex]?.elements.find(el => el.id === elementId);
      });
      
      // Current state already has updates applied (from BATCH_UPDATE_ELEMENT)
      // Just save to history with the batched command
      const affectedPageIndexes = Array.from(state.canvasBatchAffectedPageIndexes);
      const historyState = saveToHistory(state, action.payload.actionName, {
        affectedPageIndexes,
        command: state.canvasBatchCommand || 'INITIAL'
      });

      return {
        ...historyState,
        canvasBatchActive: false,
        canvasBatchCommand: null,
        canvasPendingUpdates: new Map(),
        canvasBatchAffectedPageIndexes: new Set()
      };
    }
    
    case 'DELETE_ELEMENT':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      // Check if author is assigned to current page
      if (state.userRole === 'author' && !state.assignedPages.includes(state.activePageIndex + 1)) return state;
      const savedDeleteState = action.skipHistory
        ? state
        : saveToHistory(state, 'Delete Element', {
            affectedPageIndexes: [state.activePageIndex]
          });
      
      // Find the element being deleted to check if it's a question
      const elementToDelete = savedDeleteState.currentBook!.pages[savedDeleteState.activePageIndex].elements
        .find(el => el.id === action.payload);
      
      const filteredBook = { ...savedDeleteState.currentBook! };
      filteredBook.pages[savedDeleteState.activePageIndex].elements = 
        filteredBook.pages[savedDeleteState.activePageIndex].elements.filter(el => el.id !== action.payload);
      
      let deleteState = { 
        ...savedDeleteState, 
        currentBook: filteredBook,
        selectedElementIds: savedDeleteState.selectedElementIds.filter(id => id !== action.payload),
        hasUnsavedChanges: true
      };
      
      const deletePageId = filteredBook.pages[savedDeleteState.activePageIndex]?.id;
      const deleteStateWithInvalidation = invalidatePagePreviews(deleteState, deletePageId ? [deletePageId] : []);
      return markPageIndexAsModified(deleteStateWithInvalidation, savedDeleteState.activePageIndex);
    
    case 'ADD_PAGE':
      if (!state.currentBook || state.userRole === 'author') return state;
      const savedAddPageState = saveToHistory(state, 'Add Spread', {
        cloneEntireBook: true,
        command: 'ADD_PAGE_PAIR'
      });
      const book = savedAddPageState.currentBook!;
      
      // Get book-level settings
      const bookThemeId = book.themeId || book.bookTheme || 'default';
      const bookLayoutTemplateId = book.layoutTemplateId || null;
      const bookColorPaletteId = book.colorPaletteId || null;
      
      // Initialize page background with book theme if available
      let initialBackground: PageBackground = {
        type: 'color',
        value: '#ffffff',
        opacity: 1
      };
      
      // Apply book theme to background if set
      if (bookThemeId && bookThemeId !== 'default') {
        const theme = getGlobalTheme(bookThemeId);
        if (theme) {
          // Get page background colors from palette, not from themes.json
          const pageColors = getThemePageBackgroundColors(bookThemeId, bookColorPaletteId);
          
          const backgroundOpacity = theme.pageSettings.backgroundOpacity || 1;
          const backgroundImageConfig = theme.pageSettings.backgroundImage;
          let appliedBackgroundImage = false;

          if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
            const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
              imageSize: backgroundImageConfig.size,
              imageRepeat: backgroundImageConfig.repeat,
              imagePosition: backgroundImageConfig.position,
              imageWidth: backgroundImageConfig.width,
              opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
              backgroundColor: pageColors.backgroundColor
            });

            if (imageBackground) {
              initialBackground = {
                ...imageBackground,
                pageTheme: bookThemeId
              };
              appliedBackgroundImage = true;
            }
          }

          if (!appliedBackgroundImage) {
            if (theme.pageSettings.backgroundPattern?.enabled) {
              initialBackground = {
                type: 'pattern',
                value: theme.pageSettings.backgroundPattern.style,
                opacity: backgroundOpacity,
                pageTheme: bookThemeId,
                patternSize: theme.pageSettings.backgroundPattern.size,
                patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                patternForegroundColor: pageColors.backgroundColor,
                patternBackgroundColor: pageColors.patternBackgroundColor,
                patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
              };
            } else {
              initialBackground = {
                type: 'color',
                value: pageColors.backgroundColor,
                opacity: backgroundOpacity,
                pageTheme: bookThemeId
              };
            }
          }
        }
      }
      
      const basePageId = Date.now();
      const canvasSize = calculatePageDimensions(book.pageSize || 'A4', book.orientation || 'portrait');
      const spreadPlan = buildSpreadPlanForBook(book, canvasSize);
      
      const themeContextBook: Book = {
        ...book,
        themeId: bookThemeId !== 'default' ? bookThemeId : book.themeId,
        bookTheme: bookThemeId !== 'default' ? bookThemeId : book.bookTheme,
        colorPaletteId: bookColorPaletteId || book.colorPaletteId,
        layoutTemplateId: bookLayoutTemplateId || book.layoutTemplateId
      } as Book;
      
      // Prepare tool settings for the new page (clone existing to avoid mutation)
      const toolSettingsForNewPage: Record<string, any> = savedAddPageState.toolSettings
        ? { ...savedAddPageState.toolSettings }
        : {};
      const hadInitialToolSettings = Object.keys(toolSettingsForNewPage).length > 0;
      
      // Determine palette to use for tool defaults
      let paletteToUse: ColorPalette | null = null;
      if (bookColorPaletteId) {
        paletteToUse = colorPalettes.find(p => p.id === bookColorPaletteId) || null;
      }
      
      if (paletteToUse) {
        const toolUpdates = {
          brush: { strokeColor: paletteToUse.colors.primary },
          line: { strokeColor: paletteToUse.colors.primary },
          rect: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          circle: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          triangle: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          polygon: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          heart: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          star: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          'speech-bubble': { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          dog: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          cat: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          smiley: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          text: { fontColor: paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.surface || paletteToUse.colors.background },
          question: { fontColor: paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.surface || paletteToUse.colors.background },
          answer: { fontColor: paletteToUse.colors.accent || paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.background },
        };
        Object.entries(toolUpdates).forEach(([tool, settings]) => {
          toolSettingsForNewPage[tool] = { ...(toolSettingsForNewPage[tool] || {}), ...settings };
        });
      } else if (!hadInitialToolSettings) {
        // Fallback to theme-based defaults if no book palette
        const toolUpdates: Record<string, any> = {};
        
        // Get theme defaults for each tool type
        const toolTypes = ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna'];
        toolTypes.forEach(toolType => {
          const activeTheme = bookThemeId !== 'default' ? bookThemeId : 'default';
          const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType as any, undefined);
          
          if (toolType === 'brush' || toolType === 'line') {
            toolUpdates[toolType] = { 
              strokeColor: themeDefaults.stroke || '#1f2937',
              strokeWidth: themeDefaults.strokeWidth || 2
            };
          } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(toolType)) {
            toolUpdates[toolType] = {
              strokeColor: themeDefaults.stroke || '#1f2937',
              fillColor: themeDefaults.fill && themeDefaults.fill !== 'transparent' ? themeDefaults.fill : undefined,
              strokeWidth: themeDefaults.strokeWidth || 2
            };
          } else {
            // Text elements
            toolUpdates[toolType] = {
              fontColor: themeDefaults.fontColor || themeDefaults.font?.fontColor || '#1f2937',
              borderColor: themeDefaults.borderColor || themeDefaults.border?.borderColor || '#9ca3af',
              backgroundColor: themeDefaults.backgroundColor || themeDefaults.background?.backgroundColor || '#FFFFFF'
            };
          }
        });
        Object.entries(toolUpdates).forEach(([tool, settings]) => {
          toolSettingsForNewPage[tool] = { ...(toolSettingsForNewPage[tool] || {}), ...settings };
        });
      }
      
      // Update new page with elements from layout template
      const newPageWithLayout: Page = {
        ...newTemplatePage,
        elements: pageElements
      };
      
      // Temporary pairId - will be recalculated by recalculatePagePairIds after insertion
      const pairId = 'temp';
      const leftPageId = basePageId;
      const rightPageId = basePageId + 1;

      const createPageFromPlan = (plan: SpreadPlanPage, pageId: number): Page => {
        const baseElements = applyVariationToElements(plan.template, plan.variation, canvasSize, plan.seed);
        const basePage: Page = {
          id: pageId,
          pageNumber: 0,
          elements: baseElements,
          background: clonePageBackground(initialBackground),
          database_id: undefined,
          layoutTemplateId: plan.template?.id ?? book.layoutTemplateId ?? undefined,
          colorPaletteId: undefined,
          pageType: 'content',
          isSpecialPage: false,
          isLocked: false,
          isPrintable: true,
          pagePairId: pairId,
          layoutVariation: plan.variation,
          backgroundVariation: plan.background.variation,
          backgroundTransform: plan.background.transform
        };
        return applyThemeAndPaletteToPage(basePage, themeContextBook, toolSettingsForNewPage);
      };

      const leftPage = createPageFromPlan(spreadPlan.left, leftPageId);
      const rightPage = createPageFromPlan(spreadPlan.right, rightPageId);
      const insertBeforeLastPage = book.pages.findIndex((page) => page.pageType === 'last-page');
      const insertIndex = insertBeforeLastPage >= 0 ? insertBeforeLastPage : book.pages.length;
      const updatedPages = [...book.pages];
      updatedPages.splice(insertIndex, 0, leftPage, rightPage);
      const renumberedPages = updatedPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
      
      const updatedPageAssignments: Record<number, any> = {};
      Object.entries(savedAddPageState.pageAssignments).forEach(([pageNumStr, assignment]) => {
        const pageNum = parseInt(pageNumStr, 10);
        if (Number.isNaN(pageNum)) return;
        if (pageNum >= insertIndex + 1) {
          updatedPageAssignments[pageNum + 2] = assignment;
        } else {
          updatedPageAssignments[pageNum] = assignment;
        }
      });
      updatedPageAssignments[insertIndex + 1] = null;
      updatedPageAssignments[insertIndex + 2] = null;
      
      const addPageState = {
        ...savedAddPageState,
        toolSettings: toolSettingsForNewPage,
        currentBook: {
          ...book,
          pages: renumberedPages
        },
        pageAssignments: updatedPageAssignments,
        activePageIndex: insertIndex,
        hasUnsavedChanges: true
      };
      const addPageStateWithInvalidation = invalidatePagePreviews(addPageState, [leftPageId, rightPageId]);
      let finalAddState = addPageStateWithInvalidation;
      finalAddState = markPageIndexAsModified(finalAddState, insertIndex);
      finalAddState = markPageIndexAsModified(
        finalAddState,
        Math.min(insertIndex + 1, finalAddState.currentBook!.pages.length - 1)
      );
      return saveToHistory(finalAddState, 'Add Spread', {
        affectedPageIndexes: [insertIndex, Math.min(insertIndex + 1, finalAddState.currentBook!.pages.length - 1)],
        command: 'ADD_PAGE_PAIR'
      });

    case 'ADD_PAGE_PAIR_AT_INDEX': {
      if (!state.currentBook || state.userRole === 'author') return state;
      const { insertionIndex } = action.payload;
      const savedAddPageState = state;
      const book = state.currentBook!;

      // Get book-level settings
      const bookThemeId = book.themeId || book.bookTheme || 'default';
      const bookLayoutTemplateId = book.layoutTemplateId || null;
      const bookColorPaletteId = book.colorPaletteId || null;

      // Initialize page background with book theme if available
      let initialBackground: PageBackground = {
        type: 'color',
        value: '#ffffff',
        opacity: 1
      };

      // Apply book theme to background if set
      if (bookThemeId && bookThemeId !== 'default') {
        const theme = getGlobalTheme(bookThemeId);
        if (theme) {
          // Get page background colors from palette, not from themes.json
          const pageColors = getThemePageBackgroundColors(bookThemeId, bookColorPaletteId);

          const backgroundOpacity = theme.pageSettings.backgroundOpacity || 1;
          const backgroundImageConfig = theme.pageSettings.backgroundImage;
          let appliedBackgroundImage = false;

          if (backgroundImageConfig && backgroundImageConfig.enabled) {
            initialBackground = {
              type: 'image',
              value: backgroundImageConfig.src,
              opacity: backgroundOpacity,
              imageSize: backgroundImageConfig.size || 'cover',
              imageRepeat: backgroundImageConfig.repeat || false,
              imagePosition: backgroundImageConfig.position || 'center-middle',
              imageContainWidthPercent: backgroundImageConfig.containWidthPercent || 100,
              backgroundImageTemplateId: backgroundImageConfig.templateId
            };
            appliedBackgroundImage = true;
          }

          if (!appliedBackgroundImage) {
            initialBackground = {
              type: 'color',
              value: pageColors.background || '#ffffff',
              opacity: backgroundOpacity
            };
          }

          // Add ruled lines if theme has them
          if (theme.pageSettings.ruledLines?.enabled) {
            initialBackground.ruledLines = theme.pageSettings.ruledLines;
          }
        }
      }

      const basePageId = Date.now();
      const canvasSize = calculatePageDimensions(book.pageSize || 'A4', book.orientation || 'portrait');
      const spreadPlan = buildSpreadPlanForBook(book, canvasSize);

      const themeContextBook: Book = {
        ...book,
        themeId: bookThemeId !== 'default' ? bookThemeId : book.themeId,
        bookTheme: bookThemeId !== 'default' ? bookThemeId : book.bookTheme,
        colorPaletteId: bookColorPaletteId || book.colorPaletteId,
        layoutTemplateId: bookLayoutTemplateId || book.layoutTemplateId
      } as Book;

      // Prepare tool settings for the new page (clone existing to avoid mutation)
      const toolSettingsForNewPage: Record<string, any> = savedAddPageState.toolSettings
        ? { ...savedAddPageState.toolSettings }
        : {};
      const hadInitialToolSettings = Object.keys(toolSettingsForNewPage).length > 0;

      // Determine palette to use for tool defaults
      let paletteToUse: ColorPalette | null = null;
      if (bookColorPaletteId) {
        paletteToUse = colorPalettes.find(p => p.id === bookColorPaletteId) || null;
      }

      if (paletteToUse) {
        const toolUpdates = {
          brush: { strokeColor: paletteToUse.colors.primary },
          line: { strokeColor: paletteToUse.colors.primary },
          rect: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          circle: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          triangle: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          polygon: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          heart: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          star: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          'speech-bubble': { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          dog: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          cat: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          smiley: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          text: { fontColor: paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.surface || paletteToUse.colors.background },
          question: { fontColor: paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.surface || paletteToUse.colors.background },
          answer: { fontColor: paletteToUse.colors.accent || paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.background },
        };
        Object.entries(toolUpdates).forEach(([tool, settings]) => {
          toolSettingsForNewPage[tool] = { ...(toolSettingsForNewPage[tool] || {}), ...settings };
        });
      } else if (!hadInitialToolSettings) {
        // Fallback to theme-based defaults if no book palette
        const toolUpdates: Record<string, any> = {};

        if (bookThemeId && bookThemeId !== 'default') {
          const theme = getGlobalTheme(bookThemeId);
          if (theme) {
            // Apply theme-based tool defaults
            const themeTools = theme.toolSettings || {};
            Object.entries(themeTools).forEach(([tool, settings]) => {
              toolSettingsForNewPage[tool] = { ...(toolSettingsForNewPage[tool] || {}), ...settings };
            });
          }
        }
      }

      // Update new page with elements from layout template
      const newTemplatePage: Page = {
        id: basePageId + 2,
        pageNumber: 0,
        elements: [],
        background: clonePageBackground(initialBackground),
        database_id: undefined,
        layoutTemplateId: book.layoutTemplateId ?? undefined,
        colorPaletteId: undefined,
        pageType: 'content',
        isSpecialPage: false,
        isLocked: false,
        isPrintable: true,
        pagePairId: '',
        layoutVariation: 'normal',
        backgroundVariation: 'normal',
        backgroundTransform: undefined
      };

      const pageElements = applyVariationToElements(
        spreadPlan.left.template,
        spreadPlan.left.variation,
        canvasSize,
        spreadPlan.left.seed
      );
      const newPageWithLayout: Page = {
        ...newTemplatePage,
        elements: pageElements
      };

      // Temporary pairId - will be recalculated by recalculatePagePairIds after insertion
      const pairId = 'temp';
      const leftPageId = basePageId;
      const rightPageId = basePageId + 1;

      const createPageFromPlan = (plan: SpreadPlanPage, pageId: number): Page => {
        const baseElements = applyVariationToElements(plan.template, plan.variation, canvasSize, plan.seed);
        const basePage: Page = {
          id: pageId,
          pageNumber: 0,
          elements: baseElements,
          background: clonePageBackground(initialBackground),
          database_id: undefined,
          layoutTemplateId: plan.template?.id ?? book.layoutTemplateId ?? undefined,
          colorPaletteId: undefined,
          pageType: 'content',
          isSpecialPage: false,
          isLocked: false,
          isPrintable: true,
          pagePairId: pairId,
          layoutVariation: plan.variation,
          backgroundVariation: plan.background.variation,
          backgroundTransform: plan.background.transform
        };
        return applyThemeAndPaletteToPage(basePage, themeContextBook, toolSettingsForNewPage);
      };

      const leftPage = createPageFromPlan(spreadPlan.left, leftPageId);
      const rightPage = createPageFromPlan(spreadPlan.right, rightPageId);

      // Use the specified insertionIndex instead of calculating it
      const insertIndex = Math.max(0, Math.min(insertionIndex, book.pages.length));

      const updatedPages = [...book.pages];
      updatedPages.splice(insertIndex, 0, leftPage, rightPage);
      const renumberedPages = updatedPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
      // Recalculate all pagePairIds after renumbering
      const pagesWithCorrectPairIds = recalculatePagePairIds(renumberedPages);

      const updatedPageAssignments: Record<number, any> = {};
      Object.entries(savedAddPageState.pageAssignments).forEach(([pageNumStr, assignment]) => {
        const pageNum = parseInt(pageNumStr, 10);
        if (Number.isNaN(pageNum)) return;
        if (pageNum >= insertIndex + 1) {
          updatedPageAssignments[pageNum + 2] = assignment;
        } else {
          updatedPageAssignments[pageNum] = assignment;
        }
      });
      updatedPageAssignments[insertIndex + 1] = null;
      updatedPageAssignments[insertIndex + 2] = null;

      // Update pagination state to reflect the new total pages
      const updatedPagination = savedAddPageState.pagePagination
        ? {
            ...savedAddPageState.pagePagination,
            totalPages: pagesWithCorrectPairIds.length,
            loadedPages: {
              ...savedAddPageState.pagePagination.loadedPages,
              // Mark the new pages as loaded
              [insertIndex]: true,
              [insertIndex + 1]: true,
            },
          }
        : {
            totalPages: pagesWithCorrectPairIds.length,
            pageSize: PAGE_CHUNK_SIZE,
            loadedPages: { [insertIndex]: true, [insertIndex + 1]: true },
          };

      const addPageState = {
        ...savedAddPageState,
        toolSettings: toolSettingsForNewPage,
        currentBook: {
          ...book,
          pages: renumberedPages
        },
        pageAssignments: updatedPageAssignments,
        pagePagination: updatedPagination,
        activePageIndex: insertIndex,
        hasUnsavedChanges: true
      };
      const addPageStateWithInvalidation = invalidatePagePreviews(addPageState, [leftPageId, rightPageId]);
      let finalAddState = addPageStateWithInvalidation;
      // Mark new pages as modified
      finalAddState = markPageIndexAsModified(finalAddState, insertIndex);
      finalAddState = markPageIndexAsModified(
        finalAddState,
        Math.min(insertIndex + 1, finalAddState.currentBook!.pages.length - 1)
      );
      // Mark all shifted pages as modified (all pages after the inserted pair)
      // These pages have new pageNumber values and need to be saved
      for (let i = insertIndex + 2; i < finalAddState.currentBook!.pages.length; i++) {
        finalAddState = markPageIndexAsModified(finalAddState, i);
      }
      const historyState = saveToHistory(finalAddState, 'Add Spread', {
        cloneEntireBook: true,
        affectedPageIndexes: [insertIndex, Math.min(insertIndex + 1, finalAddState.currentBook!.pages.length - 1)],
        command: 'ADD_PAGE_PAIR'
      });
      return { ...historyState, hasUnsavedChanges: true };
    }

    case 'ADD_EMPTY_PAGE_PAIR_AT_INDEX': {
      if (!state.currentBook || state.userRole === 'author') return state;
      const { insertionIndex } = action.payload;
      const savedAddPageState = state;
      const book = state.currentBook!;

      // Get book-level settings
      const bookThemeId = book.themeId || book.bookTheme || 'default';
      const bookColorPaletteId = book.colorPaletteId || null;

      // Initialize page background with book theme if available
      let initialBackground: PageBackground = {
        type: 'color',
        value: '#ffffff',
        opacity: 1
      };

      // Apply book theme to background if set
      if (bookThemeId && bookThemeId !== 'default') {
        const theme = getGlobalTheme(bookThemeId);
        if (theme) {
          const pageColors = getThemePageBackgroundColors(bookThemeId, bookColorPaletteId);

          const backgroundOpacity = theme.pageSettings.backgroundOpacity || 1;
          const backgroundImageConfig = theme.pageSettings.backgroundImage;
          let appliedBackgroundImage = false;

          if (backgroundImageConfig && backgroundImageConfig.enabled) {
            const backgroundImages = state.backgroundImages || [];
            const backgroundImage = backgroundImages.find(img => img.id === backgroundImageConfig.imageId);
            if (backgroundImage) {
              initialBackground = {
                type: 'image',
                value: backgroundImage.url,
                opacity: backgroundOpacity,
                scale: backgroundImageConfig.scale || 1,
                position: backgroundImageConfig.position || 'center'
              };
              appliedBackgroundImage = true;
            }
          }

          if (!appliedBackgroundImage && pageColors.background) {
            initialBackground = {
              type: 'color',
              value: pageColors.background,
              opacity: backgroundOpacity
            };
          }
        }
      }

      // Prepare tool settings for the new page (clone existing to avoid mutation)
      const toolSettingsForNewPage: Record<string, any> = savedAddPageState.toolSettings
        ? { ...savedAddPageState.toolSettings }
        : {};
      const hadInitialToolSettings = Object.keys(toolSettingsForNewPage).length > 0;

      // Determine palette to use for tool defaults
      let paletteToUse: ColorPalette | null = null;
      if (bookColorPaletteId) {
        paletteToUse = colorPalettes.find(p => p.id === bookColorPaletteId) || null;
      }

      if (paletteToUse) {
        const toolUpdates = {
          brush: { strokeColor: paletteToUse.colors.primary },
          line: { strokeColor: paletteToUse.colors.primary },
          rect: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          circle: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          triangle: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          polygon: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          heart: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          star: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          'speech-bubble': { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          dog: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          cat: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          smiley: { strokeColor: paletteToUse.colors.primary, fillColor: paletteToUse.colors.surface || paletteToUse.colors.accent },
          text: { fontColor: paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.surface || paletteToUse.colors.background },
          question: { fontColor: paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.surface || paletteToUse.colors.background },
          answer: { fontColor: paletteToUse.colors.accent || paletteToUse.colors.text || paletteToUse.colors.primary, borderColor: paletteToUse.colors.primary, backgroundColor: paletteToUse.colors.background },
        };
        Object.entries(toolUpdates).forEach(([tool, settings]) => {
          toolSettingsForNewPage[tool] = { ...(toolSettingsForNewPage[tool] || {}), ...settings };
        });
      } else if (!hadInitialToolSettings) {
        // Fallback to theme-based defaults if no book palette
        const toolUpdates: Record<string, any> = {};

        if (bookThemeId && bookThemeId !== 'default') {
          const theme = getGlobalTheme(bookThemeId);
          if (theme) {
            const themeTools = theme.toolSettings || {};
            Object.entries(themeTools).forEach(([tool, settings]) => {
              toolUpdates[tool] = { ...settings };
            });
          }
        }
        Object.entries(toolUpdates).forEach(([tool, settings]) => {
          toolSettingsForNewPage[tool] = { ...(toolSettingsForNewPage[tool] || {}), ...settings };
        });
      }

      const insertIndex = Math.min(insertionIndex, book.pages.length);

      // Generate unique IDs for the new pages
      const basePageId = Date.now();
      // Temporary pairId - will be recalculated by recalculatePagePairIds after insertion
      const pairId = 'temp';
      const leftPageId = basePageId;
      const rightPageId = basePageId + 1;

      // Create empty pages without template elements
      const leftPage: Page = {
        id: leftPageId,
        pageNumber: 0, // Will be set by renumbering
        elements: [], // Empty - no template elements
        background: clonePageBackground(initialBackground),
        database_id: undefined,
        layoutTemplateId: undefined, // No layout template for empty pages
        colorPaletteId: undefined,
        pageType: 'content',
        isSpecialPage: false,
        isLocked: false,
        isPrintable: true,
        pagePairId: pairId,
        layoutVariation: 'normal',
        backgroundVariation: 'normal',
        backgroundTransform: undefined
      };

      const rightPage: Page = {
        id: rightPageId,
        pageNumber: 0, // Will be set by renumbering
        elements: [], // Empty - no template elements
        background: clonePageBackground(initialBackground),
        database_id: undefined,
        layoutTemplateId: undefined, // No layout template for empty pages
        colorPaletteId: undefined,
        pageType: 'content',
        isSpecialPage: false,
        isLocked: false,
        isPrintable: true,
        pagePairId: pairId,
        layoutVariation: 'normal',
        backgroundVariation: 'normal',
        backgroundTransform: undefined
      };

      // Apply theme and palette to pages
      const themedLeftPage = applyThemeAndPaletteToPage(leftPage, book, toolSettingsForNewPage);
      const themedRightPage = applyThemeAndPaletteToPage(rightPage, book, toolSettingsForNewPage);

      // Insert the pages at the specified index
      const updatedPages = [...book.pages];
      updatedPages.splice(insertIndex, 0, themedLeftPage, themedRightPage);

      // Renumber pages
      const renumberedPages = updatedPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
      // Recalculate all pagePairIds after renumbering
      const pagesWithCorrectPairIds = recalculatePagePairIds(renumberedPages);
      const updatedPageAssignments = { ...savedAddPageState.pageAssignments };
      Object.entries(updatedPageAssignments).forEach(([pageNum, assignment]) => {
        const pageNumber = parseInt(pageNum);
        if (pageNumber >= insertIndex) {
          delete updatedPageAssignments[pageNum];
          updatedPageAssignments[pageNumber + 2] = assignment;
        }
      });
      updatedPageAssignments[insertIndex] = null;
      updatedPageAssignments[insertIndex + 1] = null;

      // Update pagination state to reflect the new total pages
      const updatedPagination = savedAddPageState.pagePagination
        ? {
            ...savedAddPageState.pagePagination,
            totalPages: pagesWithCorrectPairIds.length,
            loadedPages: {
              ...savedAddPageState.pagePagination.loadedPages,
              // Mark the new pages as loaded
              [insertIndex]: true,
              [insertIndex + 1]: true,
            },
          }
        : {
            totalPages: pagesWithCorrectPairIds.length,
            pageSize: PAGE_CHUNK_SIZE,
            loadedPages: { [insertIndex]: true, [insertIndex + 1]: true },
          };

      const addPageState = {
        ...savedAddPageState,
        toolSettings: toolSettingsForNewPage,
        currentBook: {
          ...book,
          pages: pagesWithCorrectPairIds
        },
        pageAssignments: updatedPageAssignments,
        pagePagination: updatedPagination,
        activePageIndex: insertIndex,
        hasUnsavedChanges: true
      };
      const addPageStateWithInvalidation = invalidatePagePreviews(addPageState, [leftPageId, rightPageId]);
      let finalAddState = addPageStateWithInvalidation;
      // Mark new pages as modified
      finalAddState = markPageIndexAsModified(finalAddState, insertIndex);
      finalAddState = markPageIndexAsModified(
        finalAddState,
        Math.min(insertIndex + 1, finalAddState.currentBook!.pages.length - 1)
      );
      // Mark all shifted pages as modified (all pages after the inserted pair)
      // These pages have new pageNumber values and need to be saved
      for (let i = insertIndex + 2; i < finalAddState.currentBook!.pages.length; i++) {
        finalAddState = markPageIndexAsModified(finalAddState, i);
      }
      return saveToHistory(finalAddState, 'Add Empty Spread', {
        cloneEntireBook: true,
        affectedPageIndexes: [insertIndex, Math.min(insertIndex + 1, finalAddState.currentBook!.pages.length - 1)],
        command: 'ADD_PAGE_PAIR'
      });
    }

    case 'DELETE_PAGE': {
      if (!state.currentBook || state.userRole === 'author') return state;
      if (state.currentBook.pages.length <= 2) return state;
      const bounds = getPairBounds(state.currentBook.pages, action.payload);
      const pairPages = state.currentBook.pages.slice(bounds.start, bounds.end + 1);
      if (!pairPages.length || pairPages.some((page) => page.isSpecialPage || page.isLocked || page.isPrintable === false)) {
        return state;
      }
      const savedDeletePageState = saveToHistory(state, 'Delete Spread', {
        cloneEntireBook: true,
        command: 'DELETE_PAGE'
      });
      const cacheWithoutPage = { ...savedDeletePageState.pagePreviewCache };
      const versionsWithoutPage = { ...savedDeletePageState.pagePreviewVersions };
      pairPages.forEach((page) => {
        if (page) {
          delete cacheWithoutPage[page.id];
          delete versionsWithoutPage[page.id];
        }
      });
      const pagesAfterDelete = savedDeletePageState.currentBook!.pages.filter(
        (_, index) => index < bounds.start || index > bounds.end
      );
      const renumberedPages = pagesAfterDelete.map((page, index) => ({ ...page, pageNumber: index + 1 }));
      // Recalculate all pagePairIds after renumbering
      const pagesWithCorrectPairIds = recalculatePagePairIds(renumberedPages);
      const updatedPagination = savedDeletePageState.pagePagination
        ? {
            ...savedDeletePageState.pagePagination,
            totalPages: pagesWithCorrectPairIds.length,
            loadedPages: Object.fromEntries(
              Object.entries(savedDeletePageState.pagePagination.loadedPages)
                .map(([indexStr, loaded]) => {
                  const index = Number(indexStr);
                  if (Number.isNaN(index) || !loaded) {
                    return null;
                  }
                  if (index < bounds.start) {
                    return [index, true];
                  }
                  if (index > bounds.end) {
                    return [index - pairPages.length, true];
                  }
                  return null;
                })
                .filter((entry): entry is [number, boolean] => Boolean(entry))
            )
          }
        : {
            totalPages: pagesWithCorrectPairIds.length,
            pageSize: PAGE_CHUNK_SIZE,
            loadedPages: {}
          };
      const updatedPageAssignmentsAfterDelete: Record<number, any> = {};
      Object.entries(savedDeletePageState.pageAssignments).forEach(([pageNumStr, user]) => {
        const pageNum = parseInt(pageNumStr, 10);
        if (Number.isNaN(pageNum)) return;
        if (pageNum > bounds.end + 1) {
          updatedPageAssignmentsAfterDelete[pageNum - pairPages.length] = user;
        } else if (pageNum < bounds.start + 1) {
          updatedPageAssignmentsAfterDelete[pageNum] = user;
        }
      });
      const newActiveIndex = Math.max(0, Math.min(bounds.start - 1, renumberedPages.length - 1));
      const deletePageState = {
        ...savedDeletePageState,
        currentBook: {
          ...savedDeletePageState.currentBook!,
          pages: pagesWithCorrectPairIds
        },
        activePageIndex: newActiveIndex,
        selectedElementIds: [],
        hasUnsavedChanges: true,
        pagePreviewCache: cacheWithoutPage,
        pagePreviewVersions: versionsWithoutPage,
        pageAssignments: updatedPageAssignmentsAfterDelete,
        pagePagination: updatedPagination
      };
      let finalDeleteState = deletePageState;
      for (let i = bounds.start; i < pagesWithCorrectPairIds.length; i++) {
        finalDeleteState = markPageIndexAsModified(finalDeleteState, i);
      }
      return saveToHistory(finalDeleteState, 'Delete Spread', {
        cloneEntireBook: true,
        command: 'DELETE_PAGE'
      });
    }
    
    case 'DUPLICATE_PAGE': {
      if (!state.currentBook || state.userRole === 'author') return state;
      const bounds = getPairBounds(state.currentBook.pages, action.payload);
      const pairPages = state.currentBook.pages.slice(bounds.start, bounds.end + 1);
      if (!pairPages.length || pairPages.some((page) => page.isSpecialPage || page.isLocked)) {
        return state;
      }
      const savedDuplicateState = saveToHistory(state, 'Duplicate Spread', {
        cloneEntireBook: true,
        command: 'DUPLICATE_PAGE'
      });
      const insertIndex = bounds.end + 1;
      // Temporary pairId - will be recalculated by recalculatePagePairIds after insertion
      const pairId = 'temp';
      const timestamp = Date.now();
      const duplicatedPages = pairPages.map((page, offset) => ({
        ...page,
        id: timestamp + offset,
        elements: cloneCanvasElements(page.elements),
        background: clonePageBackground(page.background),
        database_id: undefined,
        isSpecialPage: false,
        isLocked: false,
        pagePairId: pairId
      }));
      const pagesWithDuplicate = [...savedDuplicateState.currentBook!.pages];
      pagesWithDuplicate.splice(insertIndex, 0, ...duplicatedPages);
      const renumberedPages = pagesWithDuplicate.map((page, index) => ({ ...page, pageNumber: index + 1 }));
      // Recalculate all pagePairIds after renumbering
      const pagesWithCorrectPairIds = recalculatePagePairIds(renumberedPages);
      
      const updatedPageAssignments = { ...savedDuplicateState.pageAssignments };
      const shiftAmount = duplicatedPages.length;
      const insertPosition = insertIndex + 1;
      const pageNumbers = Object.keys(updatedPageAssignments)
        .map((n) => parseInt(n, 10))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => b - a);
      pageNumbers.forEach((pageNumber) => {
        if (pageNumber >= insertPosition) {
          const user = updatedPageAssignments[pageNumber];
          delete updatedPageAssignments[pageNumber];
          updatedPageAssignments[pageNumber + shiftAmount] = user;
        }
      });
      for (let i = 0; i < shiftAmount; i++) {
        updatedPageAssignments[insertPosition + i] = null;
      }
      const updatedPagination = savedDuplicateState.pagePagination
        ? {
            ...savedDuplicateState.pagePagination,
            totalPages: pagesWithCorrectPairIds.length,
            loadedPages: {
              ...savedDuplicateState.pagePagination.loadedPages
            }
          }
        : savedDuplicateState.pagePagination;
      
      const stateAfterDuplicate = {
        ...savedDuplicateState,
        currentBook: {
          ...savedDuplicateState.currentBook!,
          pages: pagesWithCorrectPairIds
        },
        pageAssignments: updatedPageAssignments,
        pagePagination: updatedPagination,
        activePageIndex: insertIndex,
        hasUnsavedChanges: true
      };
      const duplicateStateWithInvalidation = invalidatePagePreviews(
        stateAfterDuplicate,
        duplicatedPages.map((page) => page.id)
      );
      let finalDuplicateState = duplicateStateWithInvalidation;
      for (let i = insertIndex; i < insertIndex + duplicatedPages.length; i++) {
        finalDuplicateState = markPageIndexAsModified(finalDuplicateState, i);
      }
      return saveToHistory(finalDuplicateState, 'Duplicate Spread', {
        affectedPageIndexes: Array.from({ length: duplicatedPages.length }, (_, i) => insertIndex + i),
        command: 'DUPLICATE_PAGE'
      });
    }
    
    case 'CREATE_PREVIEW_PAGE':
      if (!state.currentBook) return state;
      // Don't save to history for preview pages
      const pageToPreview = state.currentBook.pages[action.payload];
      if (!pageToPreview) return state;
      
      // Remove any existing preview pages first
      const pagesWithoutPreview = state.currentBook.pages.filter(p => !p.isPreview);
      
      // Create preview page as duplicate
      const previewPage: Page = {
        id: Date.now() + 1000000, // High ID to avoid conflicts
        pageNumber: 9999, // High page number so it's at the end
        elements: pageToPreview.elements.map(el => ({ ...el, id: uuidv4() })),
        background: pageToPreview.background ? { ...pageToPreview.background } : undefined,
        database_id: undefined,
        layoutTemplateId: pageToPreview.layoutTemplateId,
        themeId: pageToPreview.themeId,
        colorPaletteId: pageToPreview.colorPaletteId,
        isPreview: true
      };
      
      return {
        ...state,
        currentBook: {
          ...state.currentBook,
          pages: [...pagesWithoutPreview, previewPage]
        },
        hasUnsavedChanges: false // Preview pages don't mark as unsaved
      };
    
    case 'DELETE_PREVIEW_PAGE':
      if (!state.currentBook) return state;
      // Remove all preview pages
      const pagesWithoutPreview2 = state.currentBook.pages.filter(p => !p.isPreview);
      
      // If we're currently on a preview page, go back to first page
      const currentPage = state.currentBook.pages[state.activePageIndex];
      const newActivePageIndex = currentPage?.isPreview 
        ? Math.min(state.activePageIndex, pagesWithoutPreview2.length - 1)
        : state.activePageIndex;
      
      return {
        ...state,
        currentBook: {
          ...state.currentBook,
          pages: pagesWithoutPreview2
        },
        activePageIndex: Math.max(0, newActivePageIndex),
        hasUnsavedChanges: false // Preview deletion doesn't mark as unsaved
      };
    
    case 'TOGGLE_EDITOR_BAR':
      return { ...state, editorBarVisible: !state.editorBarVisible };
    
    case 'TOGGLE_TOOLBAR':
      return { ...state, toolbarVisible: !state.toolbarVisible };
    
    case 'TOGGLE_SETTINGS_PANEL':
      return { ...state, settingsPanelVisible: !state.settingsPanelVisible };
    
    case 'MARK_SAVED':
      return { ...state, hasUnsavedChanges: false };
    
    case 'UPDATE_TOOL_SETTINGS':
      const savedToolState = saveToHistory(state, 'Update Tool Settings', {
        affectedPageIndexes: []
      });
      return {
        ...savedToolState,
        toolSettings: {
          ...savedToolState.toolSettings,
          [action.payload.tool]: {
            ...savedToolState.toolSettings[action.payload.tool],
            ...action.payload.settings
          }
        }
      };
    
    case 'SET_EDITOR_SETTINGS':
      // Merge with existing editorSettings to preserve local changes (like lockElements)
      // Local editor settings take precedence over server settings
      return {
        ...state,
        editorSettings: {
          ...action.payload,
          // Preserve local editor category settings (like lockElements) if they exist
          editor: {
            ...(action.payload.editor || {}),
            ...(state.editorSettings?.editor || {})
          }
        }
      };
    
    case 'UPDATE_EDITOR_SETTINGS':
      // Don't save to history for editor settings (like tool settings)
      return {
        ...state,
        editorSettings: {
          ...state.editorSettings,
          [action.payload.category]: {
            ...(state.editorSettings[action.payload.category] || {}),
            ...action.payload.settings
          }
        }
      };
    
    case 'UPDATE_TEMP_QUESTION':
      // Preserve existing poolId if not provided in payload
      const existingData = state.tempQuestions[action.payload.questionId];
      let existingPoolId = null;
      
      // Try to extract existing poolId
      if (existingData) {
        try {
          const parsed = JSON.parse(existingData);
          existingPoolId = parsed.poolId || null;
        } catch {
          // Not JSON, no poolId
        }
      }
      
      // Use provided poolId or preserve existing one
      const finalPoolId = action.payload.questionPoolId !== undefined ? action.payload.questionPoolId : existingPoolId;
      
      const questionValue = finalPoolId
        ? JSON.stringify({ text: action.payload.text, poolId: finalPoolId })
        : action.payload.text;
      
      return {
        ...state,
        tempQuestions: {
          ...state.tempQuestions,
          [action.payload.questionId]: questionValue
        },
        hasUnsavedChanges: true
      };
    
    case 'DELETE_TEMP_QUESTION':
      const newTempQuestions = { ...state.tempQuestions };
      const newTempAnswers = { ...state.tempAnswers };
      delete newTempQuestions[action.payload.questionId];
      delete newTempAnswers[action.payload.questionId];
      
      // Reset textboxes that reference this question
      let bookWithResetTextboxes = state.currentBook;
      if (bookWithResetTextboxes) {
        bookWithResetTextboxes = {
          ...bookWithResetTextboxes,
          pages: bookWithResetTextboxes.pages.map(page => ({
            ...page,
            elements: page.elements.map(element => {
              if (element.questionId === action.payload.questionId) {
                return { ...element, questionId: undefined, text: '', formattedText: '' };
              }
              return element;
            })
          }))
        };
      }
      
      return {
        ...state,
        currentBook: bookWithResetTextboxes,
        tempQuestions: newTempQuestions,
        tempAnswers: newTempAnswers,
        hasUnsavedChanges: true
      };
    
    case 'UPDATE_TEMP_ANSWER':
      const userId = action.payload.userId || state.user?.id;
      if (!userId) return state;
      const answerId = action.payload.answerId || uuidv4();
      return {
        ...state,
        tempAnswers: {
          ...state.tempAnswers,
          [action.payload.questionId]: {
            ...state.tempAnswers[action.payload.questionId],
            [userId]: { text: action.payload.text, answerId }
          }
        },
        hasUnsavedChanges: true
      };
    

    
    case 'CLEAR_TEMP_DATA':
      return {
        ...state,
        tempQuestions: {},
        tempAnswers: {}
      };
    
    case 'UNDO':
      if (state.historyIndex > 0 && state.historyBase) {
        const targetSnapshot = getSnapshotFromHistory(state.historyBase, state.history, state.historyIndex - 1);
        if (!targetSnapshot) return state;
        const restoredBook = rebuildBookFromSnapshot(targetSnapshot) ?? state.currentBook;
        const restoredAssignments = targetSnapshot.pageAssignments ?? state.pageAssignments;
        return {
          ...state,
          currentBook: restoredBook,
          activePageIndex: targetSnapshot.activePageIndex,
          selectedElementIds: targetSnapshot.selectedElementIds,
          toolSettings: targetSnapshot.toolSettings,
          editorSettings: targetSnapshot.editorSettings,
          pagePagination: targetSnapshot.pagePagination,
          pageAssignments: restoredAssignments,
          historyIndex: state.historyIndex - 1,
          hasUnsavedChanges: true
        };
      }
      return state;
    
    case 'REDO':
      if (state.historyIndex < state.history.length - 1 && state.historyBase) {
        const targetSnapshot = getSnapshotFromHistory(state.historyBase, state.history, state.historyIndex + 1);
        if (!targetSnapshot) return state;
        const restoredBook = rebuildBookFromSnapshot(targetSnapshot) ?? state.currentBook;
        const restoredAssignments = targetSnapshot.pageAssignments ?? state.pageAssignments;
        return {
          ...state,
          currentBook: restoredBook,
          activePageIndex: targetSnapshot.activePageIndex,
          selectedElementIds: targetSnapshot.selectedElementIds,
          toolSettings: targetSnapshot.toolSettings,
          editorSettings: targetSnapshot.editorSettings,
          pagePagination: targetSnapshot.pagePagination,
          pageAssignments: restoredAssignments,
          historyIndex: state.historyIndex + 1,
          hasUnsavedChanges: true
        };
      }
      return state;
    
    case 'GO_TO_HISTORY_STEP':
      if (action.payload >= 0 && action.payload < state.history.length && state.historyBase) {
        const targetSnapshot = getSnapshotFromHistory(state.historyBase, state.history, action.payload);
        if (!targetSnapshot) return state;
        const restoredBook = rebuildBookFromSnapshot(targetSnapshot) ?? state.currentBook;
        const restoredAssignments = targetSnapshot.pageAssignments ?? state.pageAssignments;
        return {
          ...state,
          currentBook: restoredBook,
          activePageIndex: targetSnapshot.activePageIndex,
          selectedElementIds: targetSnapshot.selectedElementIds,
          toolSettings: targetSnapshot.toolSettings,
          editorSettings: targetSnapshot.editorSettings,
          pagePagination: targetSnapshot.pagePagination,
          pageAssignments: restoredAssignments,
          historyIndex: action.payload,
          hasUnsavedChanges: true
        };
      }
      return state;
    
    case 'SAVE_TO_HISTORY':
      const historyState = saveToHistory(state, action.payload, { cloneEntireBook: true });
      // Ensure hasUnsavedChanges is set to true when saving to history
      // This ensures that changes (like theme/layout/palette) are marked as unsaved
      return { ...historyState, hasUnsavedChanges: true };
    
    case 'UPDATE_PAGE_NUMBERS':
      if (!state.currentBook) return state;
      const bookWithUpdatedPages = { ...state.currentBook };
      bookWithUpdatedPages.pages = bookWithUpdatedPages.pages.map(page => {
        const update = action.payload.find(u => u.pageId === page.id);
        return update ? { ...page, pageNumber: update.newPageNumber } : page;
      });
      return { ...state, currentBook: bookWithUpdatedPages };
    
    case 'SET_PAGE_ASSIGNMENTS':
      if (state.historyIndex >= 0 && state.historyBase && state.history.length > 0) {
        const snapshots = getAllSnapshotsFromHistory(state.historyBase, state.history);
        if (!snapshots[state.historyIndex]) {
          return { ...state, pageAssignments: action.payload, hasUnsavedChanges: true };
        }
        const updatedSnapshot = {
          ...snapshots[state.historyIndex],
          pageAssignments: cloneData(action.payload)
        };
        const updatedSnapshots = snapshots.map((snapshot, index) =>
          index === state.historyIndex ? updatedSnapshot : snapshot
        );
        const rebuiltHistory = rebuildHistoryFromSnapshots(updatedSnapshots, state.history);
        return {
          ...state,
          historyBase: rebuiltHistory.historyBase,
          history: rebuiltHistory.history,
          pageAssignments: action.payload,
          hasUnsavedChanges: true
        };
      }
      return { ...state, pageAssignments: action.payload, hasUnsavedChanges: true };

    case 'UPDATE_PAGE_ASSIGNMENTS': {
      const updatedState = {
        ...state,
        pageAssignments: action.payload.assignments,
        hasUnsavedChanges: true
      };
      if (action.payload.skipHistory) {
        return updatedState;
      }
      return saveToHistory(updatedState, action.payload.actionName ?? 'Update Page Assignments');
    }
    
    case 'SET_BOOK_FRIENDS':
      return { ...state, bookFriends: action.payload, hasUnsavedChanges: true };
    
    case 'UPDATE_PAGE_BACKGROUND':
      if (!state.currentBook) return state;
      // Don't save to history if this is part of a theme/palette application sequence
      // History is already saved by SET_BOOK_THEME/SET_PAGE_THEME/APPLY_COLOR_PALETTE
      const savedBgState = action.payload.skipHistory
        ? state
        : saveToHistory(state, 'Update Page Background', {
            affectedPageIndexes: [action.payload.pageIndex]
          });
      const updatedBookBg = { ...savedBgState.currentBook! };
      const backgroundPage = updatedBookBg.pages[action.payload.pageIndex];
      if (backgroundPage) {
        backgroundPage.background = action.payload.background;
      }
      const stateWithChanges = { ...savedBgState, currentBook: updatedBookBg, hasUnsavedChanges: true };
      return markPageIndexAsModified(stateWithChanges, action.payload.pageIndex);
    
    case 'SET_BOOK_THEME':
      if (!state.currentBook) return state;
      const theme = getGlobalTheme(action.payload);
      const themeName = theme?.name || action.payload;
      const savedBookThemeState = action.skipHistory
        ? state
        : saveToHistory(state, `Apply Theme "${themeName}" to Book`, { 
            cloneEntireBook: true,
            command: 'CHANGE_THEME'
          });
      
      // CRITICAL: Create a deep copy of the book to avoid reference issues
      // We need to create a new book object with a new pages array
      // This ensures that mutations to bookWithNewTheme.pages don't affect savedBookThemeState.currentBook.pages
      const originalBook = savedBookThemeState.currentBook!;
      
      // Get book color palette (or theme's default palette if book.colorPaletteId is null)
      const currentBookColorPaletteId = originalBook.colorPaletteId || null;
      const currentBookThemePaletteId = !currentBookColorPaletteId ? getThemePaletteId(action.payload) : null;
      const currentBookLayoutTemplateId = originalBook.layoutTemplateId;
      
      // Update all pages that inherit the book theme (background, themeId, and elements)
      // IMPORTANT: Do this in ONE pass to avoid any issues with themeId being restored
    let bookUpdatedPages: Page[] = [];
      if (theme) {
        bookUpdatedPages = originalBook.pages.map((page, pageIndex) => {
          // Check if page has themeId property (not just if it's truthy)
          const hasThemeIdProperty = 'themeId' in page;
          const hasThemeIdOwnProperty = Object.prototype.hasOwnProperty.call(page, 'themeId');
          const themeIdValue = page.themeId;
          const bookThemeId = action.payload;
          
          // CRITICAL: Determine if page has a custom theme that should be preserved
          // A page has a custom theme if:
          // 1. themeId exists as an own property
          // 2. themeId has a value (not undefined/null)
          // 3. themeId is DIFFERENT from the new book theme
          // 
          // IMPORTANT: If page.themeId matches the new bookThemeId, we remove it (inheritance)
          // This ensures that when book theme changes to match a page's explicit theme,
          // the page switches to inheritance (shows "Book Theme")
          const pageHasCustomTheme = hasThemeIdOwnProperty && 
                                     themeIdValue !== undefined && 
                                     themeIdValue !== null &&
                                     themeIdValue !== bookThemeId; // Only preserve if different from new book theme
          
          // If page has custom theme (different from new book theme), don't change it
          if (pageHasCustomTheme) {
            return page;
          }
          
          // Page either has no themeId or themeId matches new book theme
          // In both cases, ensure page inherits book theme (remove themeId if it exists)
          // Create a new page object WITHOUT themeId by destructuring it out
          // This ensures themeId is completely removed from the object, not just set to undefined
          const { themeId: _removedThemeId, ...pageWithoutThemeId } = page;
          
          // Get effective palette for page background
          let effectivePaletteId: string | null = null;
          if (page.colorPaletteId === null) {
            // Page uses Theme's Default Palette - use new theme's palette
            effectivePaletteId = getThemePaletteId(action.payload);
          } else {
            // Page has explicit palette - use it
            effectivePaletteId = page.colorPaletteId;
          }
          const paletteOverride = effectivePaletteId ? colorPalettes.find(p => p.id === effectivePaletteId) : null;
          const pageColors = getThemePageBackgroundColors(action.payload, paletteOverride || undefined);
          const backgroundOpacity = theme.pageSettings.backgroundOpacity ?? page.background?.opacity ?? 1;
          
          // Update background with new theme colors
          // Note: background.pageTheme is set to the book theme, but this is just for reference
          // The actual page theme is determined by page.themeId (which is now undefined)
          const backgroundImageConfig = theme.pageSettings.backgroundImage;
          
          // Check if old background is a custom image (not from theme template)
          // Custom images should be preserved, theme images should be replaced
          const isCustomImageBackground = page.background?.type === 'image' && 
                                        !page.background?.backgroundImageTemplateId &&
                                        page.background?.value;
          
          let newBackground: PageBackground | null = null;
          
          // Only replace background if it's not a custom image, or if new theme has a background image
          if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
            // Ensure position and width are passed correctly (even if undefined, they will use template defaults)
            const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
              imageSize: backgroundImageConfig.size,
              imageRepeat: backgroundImageConfig.repeat,
              imagePosition: backgroundImageConfig.position, // Pass directly - will use template default if undefined
              imageWidth: backgroundImageConfig.width, // Pass directly - will use template default if undefined
              opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
              backgroundColor: pageColors.backgroundColor
            });
            
            if (imageBackground) {
              newBackground = {
                ...imageBackground,
                pageTheme: action.payload
              };
            }
          } else if (theme.pageSettings.backgroundPattern?.enabled) {
            newBackground = {
              type: 'pattern',
              value: theme.pageSettings.backgroundPattern.style,
              opacity: backgroundOpacity,
              pageTheme: action.payload,
              patternSize: theme.pageSettings.backgroundPattern.size,
              patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
              patternForegroundColor: pageColors.backgroundColor,
              patternBackgroundColor: pageColors.patternBackgroundColor,
              patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
            };
          } else {
            // New theme has no background image or pattern - use color background
            // CRITICAL: Always set newBackground, even if old background was an image
            // This ensures theme background images are removed when switching to a theme without images
            newBackground = {
              type: 'color',
              value: pageColors.backgroundColor,
              opacity: backgroundOpacity,
              pageTheme: action.payload
            };
          }
          
          // Preserve custom image backgrounds (user-uploaded, not from theme template)
          // Only if new theme doesn't have a background image
          if (isCustomImageBackground && !(backgroundImageConfig?.enabled && backgroundImageConfig.templateId)) {
            // Keep custom image but update pageTheme for palette resolution
            newBackground = {
              ...page.background,
              pageTheme: action.payload
            };
          }
          
          // Apply theme and palette to elements
          // First apply theme to elements, then apply palette colors using APPLY_COLOR_PALETTE logic
          const pageLayoutTemplateId = page.layoutTemplateId;
          const bookThemePaletteIdForElements = !currentBookColorPaletteId ? getThemePaletteId(action.payload) : null;
          const effectiveBookColorPaletteId = currentBookColorPaletteId || bookThemePaletteIdForElements;
          
          // First update elements with theme defaults
          let updatedElements = page.elements.map(element => {
            const toolType = element.textType || element.type;
            const activeTheme = action.payload || 'default';
            const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType as any, effectiveBookColorPaletteId);
            
            return {
              ...element,
              ...themeDefaults,
              theme: action.payload
            };
          });
          
          // Then apply palette colors if palette exists (using same logic as APPLY_COLOR_PALETTE)
          const effectivePaletteForElement = effectivePaletteId ? colorPalettes.find(p => p.id === effectivePaletteId) : null;
          
          if (effectivePaletteForElement) {
            updatedElements = updatedElements.map((updatedElement, elementIndex) => {
              // Use original element for reference, but apply updates to updatedElement
              const originalElement = page.elements[elementIndex];
              const updates: Partial<CanvasElement> = {};
              
              // Apply palette colors based on element type (same logic as APPLY_COLOR_PALETTE)
              if (updatedElement.type === 'text' || updatedElement.textType) {
                // For qna, font properties are in questionSettings/answerSettings
                if (updatedElement.textType === 'qna') {
                  // Update QnA specific settings - no nested font objects
                  if (updatedElement.questionSettings) {
                    updates.questionSettings = {
                      ...updatedElement.questionSettings,
                      fontColor: effectivePaletteForElement.colors.text
                    };
                  }
                  if (updatedElement.answerSettings) {
                    updates.answerSettings = {
                      ...updatedElement.answerSettings,
                      fontColor: effectivePaletteForElement.colors.text
                    };
                  }
                } else {
                  // For other text elements, update font color in nested font object if it exists
                  if (updatedElement.font) {
                    updates.font = { ...updatedElement.font, fontColor: effectivePaletteForElement.colors.text };
                  }
                }
                
                // Handle free_text elements with textSettings
                if (updatedElement.textType === 'free_text') {
                  const currentBorder = updatedElement.textSettings?.border || {};
                  const currentBackground = updatedElement.textSettings?.background || {};
                  updates.textSettings = {
                    ...updatedElement.textSettings,
                    fontColor: effectivePaletteForElement.colors.text,
                    font: updatedElement.textSettings?.font ? 
                      { ...updatedElement.textSettings.font, fontColor: effectivePaletteForElement.colors.text } : 
                      { fontColor: effectivePaletteForElement.colors.text },
                    border: {
                      ...currentBorder,
                      borderColor: effectivePaletteForElement.colors.primary,
                      enabled: currentBorder.enabled !== undefined ? currentBorder.enabled : true
                    },
                    borderColor: effectivePaletteForElement.colors.primary,
                    background: {
                      ...currentBackground,
                      backgroundColor: effectivePaletteForElement.colors.accent,
                      enabled: currentBackground.enabled !== undefined ? currentBackground.enabled : true
                    },
                    backgroundColor: effectivePaletteForElement.colors.accent
                  };
                }
                
                // Update border colors - create nested objects if they don't exist
                let borderEnabled = updatedElement.border?.enabled !== false;
                let backgroundEnabled = updatedElement.background?.enabled !== false;
                
                if (updatedElement.textType === 'qna') {
                  // Get theme defaults to check if border/background should be enabled
                  const pageTheme = action.payload;
                  const bookTheme = action.payload;
                  
                  const activeTheme = pageTheme || bookTheme || 'default';
                  const themeDefaults = getGlobalThemeDefaults(activeTheme, 'qna', undefined);
                  
                  // Check if border is disabled in theme or element
                  const questionBorderEnabled = originalElement.questionSettings?.border?.enabled ?? 
                                               originalElement.questionSettings?.borderEnabled ?? 
                                               themeDefaults.questionSettings?.border?.enabled ?? 
                                               themeDefaults.questionSettings?.borderEnabled ?? 
                                               true;
                  const answerBorderEnabled = originalElement.answerSettings?.border?.enabled ?? 
                                            originalElement.answerSettings?.borderEnabled ?? 
                                            themeDefaults.answerSettings?.border?.enabled ?? 
                                            themeDefaults.answerSettings?.borderEnabled ?? 
                                            true;
                  borderEnabled = questionBorderEnabled !== false && answerBorderEnabled !== false;
                  
                  // Check if background is disabled in theme or element
                  const questionBackgroundEnabled = originalElement.questionSettings?.background?.enabled ?? 
                                                   originalElement.questionSettings?.backgroundEnabled ?? 
                                                   themeDefaults.questionSettings?.background?.enabled ?? 
                                                   themeDefaults.questionSettings?.backgroundEnabled ?? 
                                                   true;
                  const answerBackgroundEnabled = originalElement.answerSettings?.background?.enabled ?? 
                                                originalElement.answerSettings?.backgroundEnabled ?? 
                                                themeDefaults.answerSettings?.background?.enabled ?? 
                                                themeDefaults.answerSettings?.backgroundEnabled ?? 
                                                true;
                  backgroundEnabled = questionBackgroundEnabled !== false && answerBackgroundEnabled !== false;
                  
                  // Get existing border/background settings or use defaults
                  const existingQuestionBorder = updatedElement.questionSettings?.border || {};
                  const existingAnswerBorder = updatedElement.answerSettings?.border || {};
                  const existingQuestionBackground = updatedElement.questionSettings?.background || {};
                  const existingAnswerBackground = updatedElement.answerSettings?.background || {};
                  
                  // Get border/background values from top-level or fallback to questionSettings/answerSettings
                  const existingBorderWidth = (updatedElement.borderWidth || existingQuestionBorder.borderWidth || existingAnswerBorder.borderWidth) ?? 2;
                  const existingBorderOpacity = updatedElement.borderOpacity ?? existingQuestionBorder.borderOpacity ?? existingAnswerBorder.borderOpacity ?? 1;
                  const existingBackgroundOpacity = updatedElement.backgroundOpacity ?? existingQuestionBackground.backgroundOpacity ?? existingAnswerBackground.backgroundOpacity ?? 0.3;
                  
                  updates.questionSettings = {
                    ...updatedElement.questionSettings,
                    fontColor: effectivePaletteForElement.colors.text,
                    // Only set border.enabled in questionSettings for rendering check
                    border: {
                      ...existingQuestionBorder,
                      enabled: borderEnabled
                    },
                    // Only set background.enabled in questionSettings for rendering check
                    background: {
                      ...existingQuestionBackground,
                      enabled: backgroundEnabled
                    }
                  };
                  updates.answerSettings = {
                    ...updatedElement.answerSettings,
                    fontColor: effectivePaletteForElement.colors.text,
                    // Only set border.enabled in answerSettings for rendering check
                    border: {
                      ...existingAnswerBorder,
                      enabled: borderEnabled
                    },
                    // Only set background.enabled in answerSettings for rendering check
                    background: {
                      ...existingAnswerBackground,
                      enabled: backgroundEnabled
                    }
                  };
                  // Set all border/background properties on top-level (only individual properties, no border/background objects)
                  updates.borderColor = effectivePaletteForElement.colors.primary;
                  updates.borderWidth = existingBorderWidth;
                  updates.borderOpacity = existingBorderOpacity;
                  updates.borderEnabled = borderEnabled;
                  updates.backgroundColor = effectivePaletteForElement.colors.accent;
                  updates.backgroundOpacity = existingBackgroundOpacity;
                  updates.backgroundEnabled = backgroundEnabled;
                }
                
                // Update border/background colors on top-level (only individual properties, no border/background objects)
                // Update font color for all text elements
                if (updatedElement.textType !== 'qna') {
                  updates.fontColor = effectivePaletteForElement.colors.text;
                  updates.fill = effectivePaletteForElement.colors.text;
                  updates.borderColor = effectivePaletteForElement.colors.primary;
                  updates.backgroundColor = effectivePaletteForElement.colors.accent;
                } else {
                  // For qna, only update border/background colors on top-level (font colors are in questionSettings/answerSettings)
                  updates.borderColor = effectivePaletteForElement.colors.primary;
                  updates.backgroundColor = effectivePaletteForElement.colors.accent;
                }
              }
              
              // Apply stroke color to shapes and lines
              if (updatedElement.type === 'line' || updatedElement.type === 'circle' || updatedElement.type === 'rect' || 
                  updatedElement.type === 'heart' || updatedElement.type === 'star' || updatedElement.type === 'triangle' ||
                  updatedElement.type === 'polygon' || updatedElement.type === 'speech-bubble' || updatedElement.type === 'dog' ||
                  updatedElement.type === 'cat' || updatedElement.type === 'smiley' || updatedElement.type === 'brush') {
                updates.stroke = effectivePaletteForElement.colors.primary;
                updates.strokeColor = effectivePaletteForElement.colors.primary;
              }
              
              // Apply fill color to filled shapes - apply even if fill is missing or transparent
              if (updatedElement.type === 'circle' || updatedElement.type === 'rect' || updatedElement.type === 'heart' || 
                  updatedElement.type === 'star' || updatedElement.type === 'triangle' || updatedElement.type === 'polygon' ||
                  updatedElement.type === 'speech-bubble' || updatedElement.type === 'dog' || updatedElement.type === 'cat' ||
                  updatedElement.type === 'smiley') {
                // Only apply fill if element had a fill (not transparent) before
                if (originalElement.fill && originalElement.fill !== 'transparent') {
                  updates.fill = effectivePaletteForElement.colors.accent;
                  updates.fillColor = effectivePaletteForElement.colors.accent;
                }
                // If element doesn't have fill or has transparent, don't change it
              }
              
              return { ...updatedElement, ...updates };
            });
          }
          
          // Return updated page without themeId, with new background and elements
          // CRITICAL: Create final page object with ONLY the properties we want
          // Do NOT use spread operator on pageWithoutThemeId - explicitly construct the object
          // This ensures themeId is never included, even if it somehow exists in pageWithoutThemeId
          // CRITICAL: Always use newBackground if it's set (which it should be, unless custom image is preserved)
          // This ensures theme background images are removed when switching to themes without images
          const backgroundToUse = newBackground || {
            type: 'color',
            value: pageColors.backgroundColor,
            opacity: backgroundOpacity,
            pageTheme: action.payload
          };
          
          // Create final page object by explicitly listing all properties (except themeId)
          // This is the safest way to ensure themeId is never included
          const finalPage: Page = {
            id: pageWithoutThemeId.id,
            pageNumber: pageWithoutThemeId.pageNumber,
            elements: updatedElements,
            background: backgroundToUse,
            database_id: pageWithoutThemeId.database_id,
            layoutTemplateId: pageWithoutThemeId.layoutTemplateId,
            // Explicitly DO NOT include themeId - it should not exist
            colorPaletteId: pageWithoutThemeId.colorPaletteId,
            isPreview: pageWithoutThemeId.isPreview,
            isPlaceholder: pageWithoutThemeId.isPlaceholder
          };
          
          // Verify themeId is not in the final page
          const finalPageHasThemeIdOwnProperty = Object.prototype.hasOwnProperty.call(finalPage, 'themeId');
          
          if (finalPageHasThemeIdOwnProperty) {
            // This should never happen, but if it does, force remove it
            const { themeId: _forceRemove, ...trulyFinalPage } = finalPage as any;
            return trulyFinalPage as Page;
          }
          
          return finalPage;
        });
      } else {
        // No theme - just create a copy of pages without themeId for inheriting pages
        bookUpdatedPages = originalBook.pages.map((page) => {
          // Check if page has themeId as own property
          const hasThemeIdOwnProperty = Object.prototype.hasOwnProperty.call(page, 'themeId');
          const themeIdValue = page.themeId;
          const bookThemeId = action.payload;
          
          // CRITICAL: Determine if page has a custom theme that should be preserved
          // A page has a custom theme if:
          // 1. themeId exists as an own property
          // 2. themeId has a value (not undefined/null)
          // 3. themeId is DIFFERENT from the new book theme
          // 
          // IMPORTANT: If page.themeId matches the new bookThemeId, we remove it (inheritance)
          // This ensures that when book theme changes to match a page's explicit theme,
          // the page switches to inheritance (shows "Book Theme")
          const pageHasCustomTheme = hasThemeIdOwnProperty && 
                                     themeIdValue !== undefined && 
                                     themeIdValue !== null &&
                                     themeIdValue !== bookThemeId; // Only preserve if different from new book theme
          
          if (pageHasCustomTheme) {
            // Page has custom theme (different from new book theme) - keep it as is
            return page;
          }
          
          // Page either has no themeId or themeId matches new book theme
          // In both cases, ensure page inherits book theme (remove themeId if it exists)
          const { themeId: _removedThemeId, ...pageWithoutThemeId } = page;
          return pageWithoutThemeId as Page;
        });
      }
      
      // Create the final book object with updated pages
      // CRITICAL: Ensure pages array is completely new to avoid reference issues
      const finalBookWithNewTheme: Book = {
        ...originalBook,
        bookTheme: action.payload,
        themeId: action.payload, // Also set themeId for consistency
        pages: bookUpdatedPages
      };
      
      // CRITICAL: Create a completely new state object to ensure no reference issues
      // Don't use spread operator on savedBookThemeState - explicitly construct the new state
      const updatedBookThemeState: EditorState = {
        ...savedBookThemeState,
        currentBook: finalBookWithNewTheme,
        hasUnsavedChanges: true
      };
      
      // CRITICAL: Verify that withPreviewInvalidation doesn't mutate the state
      const stateAfterPreviewInvalidation = withPreviewInvalidation(updatedBookThemeState);
      
      return stateAfterPreviewInvalidation;
    
    case 'SET_BOOK_LAYOUT_TEMPLATE':
      if (!state.currentBook) return state;
      const savedBookLayoutState = saveToHistory(state, 'Set Book Layout Template', {
        cloneEntireBook: true,
        command: 'CHANGE_LAYOUT'
      });
      const updatedBookLayoutState = {
        ...savedBookLayoutState,
        currentBook: {
          ...savedBookLayoutState.currentBook!,
          layoutTemplateId: action.payload
        },
        hasUnsavedChanges: true
      };
      return withPreviewInvalidation(updatedBookLayoutState);
    
    case 'SET_BOOK_COLOR_PALETTE':
      if (!state.currentBook) return state;
      // Don't save to history if this is part of a theme application sequence
      // History is already saved by SET_BOOK_THEME/SET_PAGE_THEME
      const palette = action.payload ? colorPalettes.find(p => p.id === action.payload) : null;
      const paletteName = palette?.name || action.payload || 'Default';
      const actionName = action.payload ? `Apply Color Palette "${paletteName}" to Book` : 'Reset Book Color Palette';
      const savedBookPaletteState = action.skipHistory 
        ? state 
        : saveToHistory(state, actionName, { 
            cloneEntireBook: true,
            command: 'CHANGE_PALETTE'
          });
      
      const bookForPalette = savedBookPaletteState.currentBook!;
      const newBookColorPaletteId = action.payload;
      
      // CRITICAL: Update pages that have colorPaletteId matching the new book palette
      // If a page has an explicit colorPaletteId that matches the new book colorPaletteId,
      // remove it (set to null) so the page inherits the book palette (shows "Book Color Palette")
      // This ensures that when book palette changes to match a page's explicit palette,
      // the page switches to inheritance
      const updatedPagesForPalette = bookForPalette.pages.map((page) => {
        const pageColorPaletteId = page.colorPaletteId;
        const pageHasColorPaletteId = pageColorPaletteId !== undefined && pageColorPaletteId !== null;
        
        // If page has explicit colorPaletteId that matches new book palette, remove it (inheritance)
        if (pageHasColorPaletteId && pageColorPaletteId === newBookColorPaletteId) {
          const { colorPaletteId: _removed, ...pageWithoutColorPaletteId } = page;
          return { ...pageWithoutColorPaletteId, colorPaletteId: null } as typeof page;
        }
        
        // Otherwise, keep page as is (either no colorPaletteId or different from new book palette)
        return page;
      });
      
      const updatedBookPaletteState = {
        ...savedBookPaletteState,
        currentBook: {
          ...bookForPalette,
          colorPaletteId: action.payload,
          pages: updatedPagesForPalette
        },
        hasUnsavedChanges: true
      };
      return withPreviewInvalidation(updatedBookPaletteState);
    
    case 'SET_PAGE_THEME':
      if (!state.currentBook) return state;
      const pageTheme = getGlobalTheme(action.payload.themeId);
      const pageThemeName = pageTheme?.name || action.payload.themeId;
      const savedPageThemeState = action.payload.skipHistory
        ? state
        : saveToHistory(state, `Apply Theme "${pageThemeName}" to Page`, {
            affectedPageIndexes: [action.payload.pageIndex],
            command: 'CHANGE_THEME'
          });
      const updatedBookPageTheme = { ...savedPageThemeState.currentBook! };
      const targetPageTheme = updatedBookPageTheme.pages[action.payload.pageIndex];
      const wrapStateWithPageInvalidation = (overrideState: EditorState) => {
        const pageCandidate = overrideState.currentBook?.pages[action.payload.pageIndex];
        const pageId = getPagePreviewCacheId(pageCandidate, action.payload.pageIndex + 1);
        return withPreviewInvalidation(overrideState, pageId != null ? [pageId] : undefined);
      };
      if (targetPageTheme) {
        if (!action.payload.themeId || action.payload.themeId === '__BOOK_THEME__') {
          const bookThemeId = updatedBookPageTheme.bookTheme || updatedBookPageTheme.themeId || 'default';
          const theme = getGlobalTheme(bookThemeId);

          if (theme) {
            // Get page color palette (page.colorPaletteId) or book color palette (book.colorPaletteId)
            // If book.colorPaletteId is null, use theme's default palette
            const pageColorPaletteId = targetPageTheme.colorPaletteId || null;
            const bookColorPaletteId = updatedBookPageTheme.colorPaletteId || null;

            let effectivePaletteId: string | null = null;
            if (pageColorPaletteId === null) {
              // Page uses Theme's Default Palette - use theme's palette
              effectivePaletteId = getThemePaletteId(bookThemeId);
            } else {
              // Page has explicit palette - use it
              effectivePaletteId = pageColorPaletteId;
            }
            const paletteOverride = effectivePaletteId ? colorPalettes.find(p => p.id === effectivePaletteId) : null;
            const pageColors = getThemePageBackgroundColors(bookThemeId, paletteOverride || undefined);
            const backgroundOpacity = theme.pageSettings.backgroundOpacity ?? targetPageTheme.background?.opacity ?? 1;

            const backgroundImageConfig = theme.pageSettings.backgroundImage;
            let appliedBackgroundImage = false;

            if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
              const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
                imageSize: backgroundImageConfig.size,
                imageRepeat: backgroundImageConfig.repeat,
                imagePosition: backgroundImageConfig.position, // CRITICAL: Pass position from theme
                imageWidth: backgroundImageConfig.width, // CRITICAL: Pass width from theme
                opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
                backgroundColor: pageColors.backgroundColor
              });

              if (imageBackground) {
                targetPageTheme.background = {
                  ...imageBackground,
                  pageTheme: bookThemeId
                };
                appliedBackgroundImage = true;
              }
            }

            if (!appliedBackgroundImage) {
              if (theme.pageSettings.backgroundPattern?.enabled) {
                targetPageTheme.background = {
                  type: 'pattern',
                  value: theme.pageSettings.backgroundPattern.style,
                  opacity: backgroundOpacity,
                  pageTheme: bookThemeId,
                  patternSize: theme.pageSettings.backgroundPattern.size,
                  patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                  patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity,
                  patternForegroundColor: pageColors.backgroundColor,
                  patternBackgroundColor: pageColors.patternBackgroundColor
                };
              } else {
                targetPageTheme.background = {
                  type: 'color',
                  value: pageColors.backgroundColor,
                  opacity: backgroundOpacity,
                  pageTheme: bookThemeId
                };
              }
            }
          } else {
            if (targetPageTheme.background) {
              targetPageTheme.background = {
                ...targetPageTheme.background,
                pageTheme: bookThemeId || null
              };
            }
          }

          delete targetPageTheme.themeId;
          return wrapStateWithPageInvalidation({ ...savedPageThemeState, currentBook: updatedBookPageTheme, hasUnsavedChanges: true });
        }
        if (!action.payload.themeId) {
          delete targetPageTheme.themeId;
          return wrapStateWithPageInvalidation({ ...savedPageThemeState, currentBook: updatedBookPageTheme, hasUnsavedChanges: true });
        }
        const paletteOverrideId = targetPageTheme.colorPaletteId || updatedBookPageTheme.colorPaletteId || null;
        const paletteOverride = paletteOverrideId ? colorPalettes.find(p => p.id === paletteOverrideId) : null;
        const existingBackground = targetPageTheme.background;
        const themeBackgroundPattern = pageTheme?.pageSettings?.backgroundPattern;
        const themeBackgroundOpacity = pageTheme?.pageSettings?.backgroundOpacity ?? existingBackground?.opacity ?? 1;

        const resolvedBaseColor = existingBackground
          ? existingBackground.type === 'pattern'
            ? existingBackground.patternForegroundColor || paletteOverride?.colors.background || '#ffffff'
            : (typeof existingBackground.value === 'string' ? existingBackground.value : paletteOverride?.colors.background || '#ffffff')
          : paletteOverride?.colors.background || '#ffffff';

        const resolvedPatternForeground = existingBackground?.patternForegroundColor
          || paletteOverride?.colors.background
          || resolvedBaseColor;
        const resolvedPatternBackground = existingBackground?.patternBackgroundColor
          || paletteOverride?.colors.primary
          || paletteOverride?.colors.accent
          || resolvedPatternForeground;

        const backgroundImageConfig = pageTheme?.pageSettings?.backgroundImage;
        let appliedBackgroundImage = false;
        if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
          const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
            imageSize: backgroundImageConfig.size,
            imageRepeat: backgroundImageConfig.repeat,
            imagePosition: backgroundImageConfig.position, // CRITICAL: Pass position from theme
            imageWidth: backgroundImageConfig.width, // CRITICAL: Pass width from theme
            opacity: backgroundImageConfig.opacity ?? themeBackgroundOpacity,
            backgroundColor: resolvedBaseColor
          });

          if (imageBackground) {
            targetPageTheme.background = {
              ...imageBackground,
              pageTheme: action.payload.themeId
            };
            appliedBackgroundImage = true;
          }
        }

        // CRITICAL: Determine if page should have themeId set
        // - If themeId === '__BOOK_THEME__': Remove themeId (inheritance)
        // - If themeId is any other value: Always set it (explicit theme selection, even if it matches bookThemeId)
        //   This ensures that when a user explicitly selects a theme (even if same as book), it shows as selected
        //   rather than showing as "Book Theme" (inherited)
        const bookThemeId = updatedBookPageTheme.bookTheme || updatedBookPageTheme.themeId || 'default';
        const shouldSetThemeId = action.payload.themeId !== '__BOOK_THEME__';
        
        if (appliedBackgroundImage) {
          // Wenn die Seite die alte Theme-Palette verwendet hat, auf neue aktualisieren
          const oldThemePaletteId = targetPageTheme.themeId ? getThemePaletteId(targetPageTheme.themeId) : null;
          const newThemePaletteId = getThemePaletteId(action.payload.themeId);
          const wasUsingThemePalette = targetPageTheme.colorPaletteId === oldThemePaletteId;

          if (wasUsingThemePalette && newThemePaletteId) {
            targetPageTheme.colorPaletteId = newThemePaletteId;

            // Da vorher "Theme's Default Palette" aktiv war, Elemente mit neuen Palette-Farben neu einfärben
            const newPalette = colorPalettes.find(p => p.id === newThemePaletteId);
            if (newPalette) {
              targetPageTheme.elements = targetPageTheme.elements.map(element => {
                // Korrekte Element-Typ-Bestimmung
                const elementType = element.textType || element.type;
                const elementColors = getElementPaletteColors(newPalette, elementType);

                const updatedElement: any = { ...element };

                // Nur Farbeigenschaften aktualisieren, andere Theme-Eigenschaften beibehalten
                if (elementType === 'qna') {
                  // QnA spezifische Farben
                  if (element.questionSettings) {
                    updatedElement.questionSettings = {
                      ...element.questionSettings,
                      fontColor: elementColors.qnaQuestionText
                    };
                  }
                  if (element.answerSettings) {
                    updatedElement.answerSettings = {
                      ...element.answerSettings,
                      fontColor: elementColors.qnaAnswerText
                    };
                  }
                  updatedElement.borderColor = elementColors.qnaQuestionBorder;
                  updatedElement.backgroundColor = elementColors.qnaBackground;
                  // Ruled lines für QnA
                  if (element.ruledLinesColor !== undefined) {
                    updatedElement.ruledLinesColor = elementColors.qnaAnswerRuledLines;
                  }
                } else if (elementType === 'free_text') {
                  // Free text spezifische Farben
                  updatedElement.textSettings = {
                    ...element.textSettings,
                    fontColor: elementColors.freeTextText,
                    borderColor: elementColors.freeTextBorder,
                    backgroundColor: elementColors.freeTextBackground,
                    ruledLinesColor: elementColors.freeTextRuledLines
                  };
                } else if (elementType === 'text' || elementType === 'question' || elementType === 'answer') {
                  // Standard-Text Elemente
                  updatedElement.textColor = elementColors.textColor;
                  updatedElement.borderColor = elementColors.borderColor;
                  updatedElement.backgroundColor = elementColors.backgroundColor;
                  updatedElement.ruledLinesColor = elementColors.ruledLinesColor;
                } else if (['brush', 'line'].includes(elementType)) {
                  updatedElement.stroke = elementColors.stroke;
                } else if (['circle', 'rect', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(elementType)) {
                  updatedElement.stroke = elementColors.stroke;
                  // Fill nur aktualisieren wenn Element gefüllt ist
                  if (element.fill && element.fill !== 'transparent') {
                    updatedElement.fill = elementColors.fill;
                  }
                } else if (['image', 'placeholder'].includes(elementType)) {
                  updatedElement.borderColor = elementColors.borderColor;
                  updatedElement.backgroundColor = elementColors.backgroundColor;
                }

                return updatedElement;
              });
            }
          }

          if (shouldSetThemeId) {
            targetPageTheme.themeId = action.payload.themeId;
          } else {
            delete targetPageTheme.themeId;
          }
          return wrapStateWithPageInvalidation({ ...savedPageThemeState, currentBook: updatedBookPageTheme, hasUnsavedChanges: true });
        }

        if (existingBackground?.type === 'image') {
          targetPageTheme.background = {
            ...existingBackground,
            opacity: themeBackgroundOpacity,
            pageTheme: action.payload.themeId
          };
        } else if (themeBackgroundPattern?.enabled) {
          targetPageTheme.background = {
            type: 'pattern',
            value: themeBackgroundPattern.style,
            opacity: themeBackgroundOpacity,
            pageTheme: action.payload.themeId,
            patternSize: themeBackgroundPattern.size,
            patternStrokeWidth: themeBackgroundPattern.strokeWidth,
            patternBackgroundOpacity: themeBackgroundPattern.patternBackgroundOpacity,
            patternForegroundColor: resolvedPatternForeground,
            patternBackgroundColor: resolvedPatternBackground
          };
        } else {
          targetPageTheme.background = {
            type: 'color',
            value: resolvedBaseColor,
            opacity: themeBackgroundOpacity,
            pageTheme: action.payload.themeId
          };
        }

        // Wenn die Seite die alte Theme-Palette verwendet hat, auf neue aktualisieren
        const oldThemePaletteId = targetPageTheme.themeId ? getThemePaletteId(targetPageTheme.themeId) : null;
        const newThemePaletteId = getThemePaletteId(action.payload.themeId);
        const wasUsingThemePalette = targetPageTheme.colorPaletteId === oldThemePaletteId;

        if (wasUsingThemePalette && newThemePaletteId) {
          targetPageTheme.colorPaletteId = newThemePaletteId;

          // Da vorher "Theme's Default Palette" aktiv war, Elemente mit neuen Palette-Farben neu einfärben
          const newPalette = colorPalettes.find(p => p.id === newThemePaletteId);
          if (newPalette) {
            targetPageTheme.elements = targetPageTheme.elements.map(element => {
              // Korrekte Element-Typ-Bestimmung
              const elementType = element.textType || element.type;
              const elementColors = getElementPaletteColors(newPalette, elementType);

              const updatedElement: any = { ...element };

              // Nur Farbeigenschaften aktualisieren, andere Theme-Eigenschaften beibehalten
              if (elementType === 'qna') {
                // QnA spezifische Farben
                if (element.questionSettings) {
                  updatedElement.questionSettings = {
                    ...element.questionSettings,
                    fontColor: elementColors.qnaQuestionText
                  };
                }
                if (element.answerSettings) {
                  updatedElement.answerSettings = {
                    ...element.answerSettings,
                    fontColor: elementColors.qnaAnswerText
                  };
                }
                updatedElement.borderColor = elementColors.qnaQuestionBorder;
                updatedElement.backgroundColor = elementColors.qnaBackground;
                // Ruled lines für QnA
                if (element.ruledLinesColor !== undefined) {
                  updatedElement.ruledLinesColor = elementColors.qnaAnswerRuledLines;
                }
              } else if (elementType === 'free_text') {
                // Free text spezifische Farben
                updatedElement.textSettings = {
                  ...element.textSettings,
                  fontColor: elementColors.freeTextText,
                  borderColor: elementColors.freeTextBorder,
                  backgroundColor: elementColors.freeTextBackground,
                  ruledLinesColor: elementColors.freeTextRuledLines
                };
              } else if (elementType === 'text' || elementType === 'question' || elementType === 'answer') {
                // Standard-Text Elemente
                updatedElement.textColor = elementColors.textColor;
                updatedElement.borderColor = elementColors.borderColor;
                updatedElement.backgroundColor = elementColors.backgroundColor;
                updatedElement.ruledLinesColor = elementColors.ruledLinesColor;
              } else if (['brush', 'line'].includes(elementType)) {
                updatedElement.stroke = elementColors.stroke;
              } else if (['circle', 'rect', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(elementType)) {
                updatedElement.stroke = elementColors.stroke;
                // Fill nur aktualisieren wenn Element gefüllt ist
                if (element.fill && element.fill !== 'transparent') {
                  updatedElement.fill = elementColors.fill;
                }
              } else if (['image', 'placeholder'].includes(elementType)) {
                updatedElement.borderColor = elementColors.borderColor;
                updatedElement.backgroundColor = elementColors.backgroundColor;
              }

              return updatedElement;
            });
          }
        }

        // Set or remove themeId based on whether page should inherit or have explicit theme
        if (shouldSetThemeId) {
          targetPageTheme.themeId = action.payload.themeId;
        } else {
          delete targetPageTheme.themeId;
        }
      }
      return wrapStateWithPageInvalidation({ ...savedPageThemeState, currentBook: updatedBookPageTheme, hasUnsavedChanges: true });
    
    case 'SET_PAGE_LAYOUT_TEMPLATE':
      if (!state.currentBook) return state;
      const savedPageLayoutState = saveToHistory(state, 'Set Page Layout Template', {
        affectedPageIndexes: [action.payload.pageIndex],
        command: 'CHANGE_LAYOUT'
      });
      const updatedBookPageLayout = { ...savedPageLayoutState.currentBook! };
      const targetPageLayout = updatedBookPageLayout.pages[action.payload.pageIndex];
      if (targetPageLayout) {
        targetPageLayout.layoutTemplateId = action.payload.layoutTemplateId;
      }
      return withPreviewInvalidation(
        { ...savedPageLayoutState, currentBook: updatedBookPageLayout, hasUnsavedChanges: true },
        [getPagePreviewCacheId(targetPageLayout, action.payload.pageIndex + 1) ?? action.payload.pageIndex + 1]
      );
    
    case 'SET_PAGE_COLOR_PALETTE':
      if (!state.currentBook) return state;
      // Don't save to history if this is part of a theme application sequence
      // History is already saved by SET_BOOK_THEME/SET_PAGE_THEME
      const pagePalette = action.payload.colorPaletteId ? colorPalettes.find(p => p.id === action.payload.colorPaletteId) : null;
      const pagePaletteName = pagePalette?.name || action.payload.colorPaletteId || 'Default';
      const pageActionName = action.payload.colorPaletteId ? `Apply Color Palette "${pagePaletteName}" to Page` : 'Reset Page Color Palette';
      const savedPagePaletteState = action.payload.skipHistory 
        ? state 
        : saveToHistory(state, pageActionName, {
            affectedPageIndexes: [action.payload.pageIndex],
            command: 'CHANGE_PALETTE'
          });
      const updatedBookPagePalette = { ...savedPagePaletteState.currentBook! };
      const targetPagePalette = updatedBookPagePalette.pages[action.payload.pageIndex];
      if (targetPagePalette) {
        targetPagePalette.colorPaletteId = action.payload.colorPaletteId;
      }
      return { ...savedPagePaletteState, currentBook: updatedBookPagePalette, hasUnsavedChanges: true };
    
    case 'APPLY_THEME_TO_ELEMENTS':
      if (!state.currentBook) return state;
      // Don't save to history if this is part of a theme application sequence
      // History is already saved by SET_BOOK_THEME/SET_PAGE_THEME
      const applyTheme = getGlobalTheme(action.payload.themeId);
      const applyThemeName = applyTheme?.name || action.payload.themeId;
      const themeScope = action.payload.applyToAllPages ? 'Book' : 'Page';
      const affectedThemeIndexes = action.payload.applyToAllPages
        ? getAllPageIndexes(state)
        : [action.payload.pageIndex ?? state.activePageIndex];
      const savedApplyThemeState = action.payload.skipHistory 
        ? state 
        : saveToHistory(state, `Apply Theme "${applyThemeName}" to ${themeScope} Elements`, {
            affectedPageIndexes: affectedThemeIndexes,
            cloneEntireBook: Boolean(action.payload.applyToAllPages),
            command: 'CHANGE_THEME'
          });
      const updatedBookApplyTheme = { ...savedApplyThemeState.currentBook! };
      
      const copyColorAndThemeValues = (from: any, to: any) => {
        if (!from || !to || typeof from !== 'object' || typeof to !== 'object') {
          return;
        }

        // Theme properties that should be preserved when applying theme with preserveColors
        // NOTE: Color properties like borderColor, backgroundColor, ruledLinesColor are NOT theme properties
        // Colors are controlled exclusively through Color Palettes, not themes
        const themeProperties = [
          // Font properties
          'fontFamily',
          'textDecoration',
          'fontStyle',
          'fontWeight',
          'fontSize',
          'lineHeight',
          'textAlign',
          'verticalAlign',
          // Border properties (non-color)
          'borderEnabled',
          'borderStyle',
          'borderWidth',
          'borderRadius',
          'borderTheme',
          'borderOpacity',
          // Background properties (non-color)
          'backgroundEnabled',
          'backgroundOpacity',
          // Ruled lines properties (non-color)
          'ruledLines',
          'ruledLinesWidth',
          'ruledLinesTheme',
          'ruledLinesOpacity',
          'ruledLinesTarget'
        ];

        Object.keys(from).forEach((key) => {
          const value = from[key];
          if (value === undefined || value === null) {
            return;
          }

          const lowerKey = key.toLowerCase();
          const isColorKey =
            lowerKey === 'fill' ||
            lowerKey === 'stroke' ||
            lowerKey.endsWith('color') ||
            lowerKey.endsWith('colors') ||
            (lowerKey.includes('color') && !lowerKey.includes('colorstop'));

          // Check if this is a theme property that should NOT be preserved (should come from new theme)
          const isThemeProperty = themeProperties.includes(key);

          // Skip theme properties entirely - they should come from the new theme, not be copied from old element
          if (isThemeProperty) {
            return; // Don't copy theme properties, let them come from the new theme
          }

          // Only preserve colors, NOT theme properties (theme properties should come from new theme)
          if (isColorKey) {
            if (Array.isArray(value)) {
              to[key] = value.map((item: any) => (typeof item === 'object' ? { ...item } : item));
            } else if (typeof value === 'object') {
              if (!to[key] || typeof to[key] !== 'object') {
                to[key] = {};
              }
              copyColorAndThemeValues(value, to[key]);
            } else {
              to[key] = value;
            }
            return;
          }

          // For non-color, non-theme objects, recurse to handle nested colors
          if (typeof value === 'object' && !Array.isArray(value)) {
            if (!to[key] || typeof to[key] !== 'object') {
              to[key] = {};
            }
            copyColorAndThemeValues(value, to[key]);
          }
        });
      };

      const applyThemeToPage = (page: any) => {
        return {
          ...page,
          elements: page.elements.map((element: any) => {
            // Only apply theme to specified element type or all if not specified
            if (action.payload.elementType && element.type !== action.payload.elementType && element.textType !== action.payload.elementType) {
              return element;
            }
            
            const toolType = element.textType || element.type;
            const currentPage = updatedBookApplyTheme.pages.find((_: any, idx: number) => 
              action.payload.applyToAllPages || idx === action.payload.pageIndex
            );
            const pageLayoutTemplateId = currentPage?.layoutTemplateId;
            const bookLayoutTemplateId = updatedBookApplyTheme.layoutTemplateId;
            const pageColorPaletteId = currentPage?.colorPaletteId;
            const bookColorPaletteId = updatedBookApplyTheme.colorPaletteId;
            // If book.colorPaletteId is null, use theme's default palette
            const bookThemeId = updatedBookApplyTheme.bookTheme || updatedBookApplyTheme.themeId || 'default';
            const bookThemePaletteId = !bookColorPaletteId ? getThemePaletteId(bookThemeId) : null;
            const effectiveBookColorPaletteId = bookColorPaletteId || bookThemePaletteId;
            
            const activeTheme = action.payload.themeId || bookThemeId || 'default';

            // Use centralized theme application function
            // When preserveColors is true, don't apply palette colors - only theme defaults
            const paletteIdToUse = action.payload.preserveColors ? undefined : effectiveBookColorPaletteId;
            const updatedElement = applyThemeToElementConsistent(element, activeTheme, paletteIdToUse);

            // Preserve colors and theme properties if requested (for theme-only application)
            if (action.payload.preserveColors) {
              copyColorAndThemeValues(element, updatedElement);
            }

            return updatedElement;
          })
        };
      };
      
      if (action.payload.applyToAllPages) {
        updatedBookApplyTheme.pages = updatedBookApplyTheme.pages.map(applyThemeToPage);
      } else if (action.payload.pageIndex >= 0) {
        const targetPageApplyTheme = updatedBookApplyTheme.pages[action.payload.pageIndex];
        if (targetPageApplyTheme) {
          updatedBookApplyTheme.pages[action.payload.pageIndex] = applyThemeToPage(targetPageApplyTheme);
        }
      }
      
      const themePageIds = affectedThemeIndexes
        .map((index) => getPagePreviewCacheId(updatedBookApplyTheme.pages[index], index + 1))
        .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id));
      return withPreviewInvalidation(
        { ...savedApplyThemeState, currentBook: updatedBookApplyTheme, wizardSetupApplied: true, hasUnsavedChanges: true },
        themePageIds.length ? themePageIds : undefined
      );
    
    case 'UPDATE_BOOK_NAME':
      if (!state.currentBook) return state;
      return {
        ...state,
        currentBook: {
          ...state.currentBook,
          name: action.payload
        },
        hasUnsavedChanges: true
      };

    case 'UPDATE_PAGE_NUMBERING': {
      if (!state.currentBook) return state;
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedState = saveToHistory(state, 'Page Numbering', { cloneEntireBook: true });
      const book = savedState.currentBook!;
      const { enabled, settings } = action.payload;
      const canvasSize = calculatePageDimensions(book.pageSize || 'A4', book.orientation || 'portrait');
      const totalPages = book.pages.length;

      const updatedPages = book.pages.map((page, index) => {
        const pageNumber = index + 1;
        const isSpecial = pageNumber === 1 || pageNumber === 2 || pageNumber === 3 || pageNumber === totalPages;
        if (isSpecial) return page;

        const elements = page.elements || [];
        const existingPageNumberEl = elements.find((el: CanvasElement) => el.isPageNumber);

        if (!enabled) {
          return { ...page, elements: elements.filter((el: CanvasElement) => !el.isPageNumber) };
        }

        const contentPageNumber = book.pages
          .slice(0, index)
          .filter((_, i) => {
            const pn = i + 1;
            return pn !== 1 && pn !== 2 && pn !== 3 && pn !== totalPages;
          }).length + 1;

        const updates = {
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          fontBold: settings.fontBold,
          fontItalic: settings.fontItalic,
          fontColor: settings.fontColor,
          fontOpacity: settings.fontOpacity,
        };

        if (existingPageNumberEl) {
          return {
            ...page,
            elements: elements.map((el: CanvasElement) =>
              el.isPageNumber ? { ...el, ...updates, text: String(contentPageNumber) } : el
            ),
          };
        }

        const newEl = createPageNumberElement(contentPageNumber, canvasSize.width, canvasSize.height, settings);
        return { ...page, elements: [...elements, newEl] };
      });

      const updatedBook = { ...book, pages: updatedPages };
      const affectedIndexes = updatedPages.map((_, i) => i);
      return invalidatePagePreviews(
        { ...savedState, currentBook: updatedBook, hasUnsavedChanges: true, pageNumberingPreview: null },
        affectedIndexes
      );
    }

    case 'SET_PAGE_NUMBERING_PREVIEW':
      return { ...state, pageNumberingPreview: action.payload };

    case 'CLEAR_PAGE_NUMBERING_PREVIEW':
      return { ...state, pageNumberingPreview: null };
    
    case 'UPDATE_BOOK_SETTINGS':
      if (!state.currentBook) return state;
      const savedBookSettingsState = saveToHistory(state, 'Update Book Settings', {
        cloneEntireBook: true,
        command: 'INITIAL'
      });
      return withPreviewInvalidation({
        ...savedBookSettingsState,
        currentBook: {
          ...savedBookSettingsState.currentBook!,
          pageSize: action.payload.pageSize,
          orientation: action.payload.orientation
        },
        hasUnsavedChanges: true
      });
    
    case 'SET_HOVERED_ELEMENT':
      return { ...state, hoveredElementId: action.payload };
    
    case 'REORDER_PAGES': {
      if (!state.currentBook || state.userRole === 'author') return state;
      const savedReorderState = saveToHistory(state, 'Reorder Pages', {
        cloneEntireBook: true,
        command: 'INITIAL'
      });
      const { fromIndex, toIndex } = action.payload;
      const { start: fromStart, end: fromEnd } = getPairBounds(savedReorderState.currentBook!.pages, fromIndex);
      const movingPages = savedReorderState.currentBook!.pages.slice(fromStart, fromEnd + 1);
      if (!movingPages.length || movingPages.some((page) => page.isSpecialPage || page.isLocked)) {
        return state;
      }
      let targetIndex = toIndex;
      if (targetIndex > fromStart) {
        targetIndex -= movingPages.length;
      }
      targetIndex = Math.max(0, Math.min(savedReorderState.currentBook!.pages.length - movingPages.length, targetIndex));
      const remainingPages = savedReorderState.currentBook!.pages.filter(
        (_, index) => index < fromStart || index > fromEnd
      );
      remainingPages.splice(targetIndex, 0, ...movingPages);
      const reorderedPagesWithNumbers = remainingPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
      // Recalculate all pagePairIds after reordering
      const pagesWithCorrectPairIds = recalculatePagePairIds(reorderedPagesWithNumbers);
      
      const newPageAssignments: Record<number, any> = {};
      pagesWithCorrectPairIds.forEach((page, newIndex) => {
        const originalIndex = savedReorderState.currentBook!.pages.findIndex((p) => p.id === page.id);
        const oldAssignment = savedReorderState.pageAssignments[originalIndex + 1];
        if (oldAssignment !== undefined) {
          newPageAssignments[newIndex + 1] = oldAssignment;
        }
      });
      const activePageId = savedReorderState.currentBook!.pages[savedReorderState.activePageIndex]?.id;
      const newActiveIndex = activePageId
        ? pagesWithCorrectPairIds.findIndex((page) => page.id === activePageId)
        : savedReorderState.activePageIndex;
      
      const reorderState = withPreviewInvalidation(
        {
          ...savedReorderState,
          currentBook: {
            ...savedReorderState.currentBook!,
            pages: pagesWithCorrectPairIds
          },
          pageAssignments: newPageAssignments,
          activePageIndex: newActiveIndex,
          hasUnsavedChanges: true
        }
      );
      
      const minIndex = Math.min(fromStart, targetIndex);
      const maxIndex = Math.max(fromEnd, targetIndex + movingPages.length - 1);
      let finalReorderState = reorderState;
      for (let i = minIndex; i <= maxIndex; i++) {
        finalReorderState = markPageIndexAsModified(finalReorderState, i);
      }
      return finalReorderState;
    }
    
    case 'REORDER_PAGES_TO_ORDER': {
      if (!state.currentBook || state.userRole === 'author') return state;
      const savedState = saveToHistory(state, 'Reorder Pages', {
        cloneEntireBook: true,
        command: 'INITIAL'
      });
      const { pageOrder } = action.payload;
      const pages = savedState.currentBook!.pages;
      if (!pageOrder?.length || pageOrder.length !== pages.length) return state;
      const pageByNumber = new Map(pages.map((p) => [p.pageNumber ?? 0, p]));
      const reorderedPages = pageOrder
        .map((pnum) => pageByNumber.get(pnum))
        .filter((p): p is NonNullable<typeof p> => p != null);
      if (reorderedPages.length !== pages.length) return state;
      const renumberedPages = reorderedPages.map((p, index) => ({ ...p, pageNumber: index + 1 }));
      const pagesWithCorrectPairIds = recalculatePagePairIds(renumberedPages);
      const newPageAssignments: Record<number, unknown> = {};
      pageOrder.forEach((oldPageNumber, newIndex) => {
        const oldAssignment = savedState.pageAssignments?.[oldPageNumber];
        if (oldAssignment !== undefined) {
          newPageAssignments[newIndex + 1] = oldAssignment;
        }
      });
      const activePageId = pages[savedState.activePageIndex ?? 0]?.id;
      const newActiveIndex = activePageId
        ? pagesWithCorrectPairIds.findIndex((p) => p.id === activePageId)
        : savedState.activePageIndex;
      const reorderState = withPreviewInvalidation({
        ...savedState,
        currentBook: {
          ...savedState.currentBook!,
          pages: pagesWithCorrectPairIds
        },
        pageAssignments: newPageAssignments,
        activePageIndex: newActiveIndex >= 0 ? newActiveIndex : savedState.activePageIndex,
        hasUnsavedChanges: true
      });
      return markAllPagesAsModified(reorderState);
    }
    
    case 'MOVE_ELEMENT_TO_FRONT':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedFrontState = saveToHistory(state, 'Move to Front', {
        affectedPageIndexes: [state.activePageIndex]
      });
      const bookFront = { ...savedFrontState.currentBook! };
      const pageFront = bookFront.pages[savedFrontState.activePageIndex];
      const elementIndexFront = pageFront.elements.findIndex(el => el.id === action.payload);
      if (elementIndexFront !== -1) {
        const element = pageFront.elements.splice(elementIndexFront, 1)[0];
        pageFront.elements.push(element);
      }
      return { ...savedFrontState, currentBook: bookFront, hasUnsavedChanges: true };
    
    case 'MOVE_ELEMENT_TO_BACK':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedBackState = saveToHistory(state, 'Move to Back', {
        affectedPageIndexes: [state.activePageIndex]
      });
      const bookBack = { ...savedBackState.currentBook! };
      const pageBack = bookBack.pages[savedBackState.activePageIndex];
      const elementIndexBack = pageBack.elements.findIndex(el => el.id === action.payload);
      if (elementIndexBack !== -1) {
        const element = pageBack.elements.splice(elementIndexBack, 1)[0];
        pageBack.elements.unshift(element);
      }
      return { ...savedBackState, currentBook: bookBack, hasUnsavedChanges: true };
    
    case 'MOVE_ELEMENT_UP':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedUpState = saveToHistory(state, 'Move Up', {
        affectedPageIndexes: [state.activePageIndex]
      });
      const bookUp = { ...savedUpState.currentBook! };
      const pageUp = bookUp.pages[savedUpState.activePageIndex];
      const elementIndexUp = pageUp.elements.findIndex(el => el.id === action.payload);
      if (elementIndexUp !== -1 && elementIndexUp < pageUp.elements.length - 1) {
        const element = pageUp.elements[elementIndexUp];
        pageUp.elements[elementIndexUp] = pageUp.elements[elementIndexUp + 1];
        pageUp.elements[elementIndexUp + 1] = element;
      }
      return { ...savedUpState, currentBook: bookUp, hasUnsavedChanges: true };
    
    case 'MOVE_ELEMENT_DOWN':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedDownState = saveToHistory(state, 'Move Down', {
        affectedPageIndexes: [state.activePageIndex]
      });
      const bookDown = { ...savedDownState.currentBook! };
      const pageDown = bookDown.pages[savedDownState.activePageIndex];
      const elementIndexDown = pageDown.elements.findIndex(el => el.id === action.payload);
      if (elementIndexDown > 0) {
        const element = pageDown.elements[elementIndexDown];
        pageDown.elements[elementIndexDown] = pageDown.elements[elementIndexDown - 1];
        pageDown.elements[elementIndexDown - 1] = element;
      }
      return { ...savedDownState, currentBook: bookDown, hasUnsavedChanges: true };
    
    case 'TOGGLE_MAGNETIC_SNAPPING':
      return { ...state, magneticSnapping: !state.magneticSnapping };
    
    case 'SET_QNA_ACTIVE_SECTION':
      return { ...state, qnaActiveSection: action.payload };
    
    case 'TOGGLE_STYLE_PAINTER':
      if (!state.currentBook || state.selectedElementIds.length !== 1) return state;
      
      if (!state.stylePainterActive) {
        // Activate style painter and copy style from selected element
        const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements
          .find(el => el.id === state.selectedElementIds[0]);
        
        if (!selectedElement) return state;
        
        // Copy all style-related properties
        const copiedStyle: Partial<CanvasElement> = {
          fontSize: selectedElement.fontSize,
          fontFamily: selectedElement.fontFamily,
          fontStyle: selectedElement.fontStyle,
          fontColor: selectedElement.fontColor,
          backgroundColor: selectedElement.backgroundColor,
          backgroundOpacity: selectedElement.backgroundOpacity,
          borderWidth: selectedElement.borderWidth,
          borderColor: selectedElement.borderColor,
          padding: selectedElement.padding,
          align: selectedElement.format?.textAlign ?? selectedElement.align,
          paragraphSpacing: selectedElement.paragraphSpacing,
          lineHeight: selectedElement.lineHeight,
          stroke: selectedElement.stroke,
          strokeWidth: selectedElement.strokeWidth,
          borderOpacity: selectedElement.borderOpacity,
          fill: selectedElement.fill,
          opacity: selectedElement.opacity,
          theme: selectedElement.theme,
          roughness: selectedElement.roughness,
          // Copy all nested style objects
          font: selectedElement.font ? { ...selectedElement.font } : undefined,
          format: selectedElement.format ? { ...selectedElement.format } : undefined,
          background: selectedElement.background ? { ...selectedElement.background } : undefined,
          border: selectedElement.border ? { ...selectedElement.border } : undefined,
          ruledLines: selectedElement.ruledLines ? { ...selectedElement.ruledLines } : undefined,
          ruledLinesWidth: selectedElement.ruledLinesWidth,
          ruledLinesColor: selectedElement.ruledLinesColor,
          ruledLinesTheme: selectedElement.ruledLinesTheme,
          // QnA specific styles
          questionSettings: selectedElement.questionSettings ? { ...selectedElement.questionSettings } : undefined,
          answerSettings: selectedElement.answerSettings ? { ...selectedElement.answerSettings } : undefined,
          qnaIndividualSettings: selectedElement.qnaIndividualSettings,
          // Free text specific styles
          textSettings: selectedElement.textSettings ? { ...selectedElement.textSettings } : undefined
        };
        
        return {
          ...state,
          stylePainterActive: true,
          copiedStyle
        };
      } else {
        // Deactivate style painter
        return {
          ...state,
          stylePainterActive: false,
          copiedStyle: null
        };
      }
    
    case 'APPLY_COPIED_STYLE':
      if (!state.currentBook || !state.stylePainterActive || !state.copiedStyle) return state;
      
      const targetElement = state.currentBook.pages[state.activePageIndex]?.elements
        .find(el => el.id === action.payload);
      
      if (!targetElement) return state;
      
      const savedStyleState = saveToHistory(state, 'Apply Style', {
        affectedPageIndexes: [state.activePageIndex]
      });
      
      // Apply copied style to target element
      const updatedBookStyle = { ...savedStyleState.currentBook! };
      const pageStyle = updatedBookStyle.pages[savedStyleState.activePageIndex];
      const targetElementIndex = pageStyle.elements.findIndex(el => el.id === action.payload);
      
      if (targetElementIndex !== -1) {
        // Filter out undefined values and apply style
        const styleToApply = Object.fromEntries(
          Object.entries(savedStyleState.copiedStyle!).filter(([_, value]) => value !== undefined)
        );
        
        // Convert questionSettings/answerSettings to textSettings for free_text elements
        const targetElementType = targetElement.textType || targetElement.type;
        if (targetElementType === 'free_text' && (styleToApply.questionSettings || styleToApply.answerSettings)) {
          // Convert QnA settings to free text settings
          const qnaSettings = styleToApply.questionSettings || styleToApply.answerSettings;
          if (qnaSettings) {
            styleToApply.textSettings = {
              ...(targetElement.textSettings || {}),
              fontSize: qnaSettings.fontSize || targetElement.textSettings?.fontSize,
              fontFamily: qnaSettings.fontFamily || targetElement.textSettings?.fontFamily,
              fontColor: qnaSettings.fontColor || targetElement.textSettings?.fontColor,
              fontOpacity: qnaSettings.fontOpacity ?? targetElement.textSettings?.fontOpacity,
              fontBold: qnaSettings.fontBold ?? targetElement.textSettings?.fontBold,
              fontItalic: qnaSettings.fontItalic ?? targetElement.textSettings?.fontItalic,
              border: qnaSettings.border || targetElement.textSettings?.border,
              borderWidth: qnaSettings.borderWidth || targetElement.textSettings?.borderWidth,
              borderColor: qnaSettings.borderColor || targetElement.textSettings?.borderColor,
              borderOpacity: qnaSettings.borderOpacity ?? targetElement.textSettings?.borderOpacity,
              borderTheme: qnaSettings.borderTheme || targetElement.textSettings?.borderTheme,
              background: qnaSettings.background || targetElement.textSettings?.background,
              backgroundColor: qnaSettings.backgroundColor || targetElement.textSettings?.backgroundColor,
              backgroundOpacity: qnaSettings.backgroundOpacity ?? targetElement.textSettings?.backgroundOpacity,
              align: qnaSettings.align || targetElement.textSettings?.align,
              paragraphSpacing: qnaSettings.paragraphSpacing || targetElement.textSettings?.paragraphSpacing,
              padding: qnaSettings.padding || targetElement.textSettings?.padding
            };
            // Remove questionSettings/answerSettings as they don't apply to free_text
            delete styleToApply.questionSettings;
            delete styleToApply.answerSettings;
          }
        }
        
        // Convert textSettings to questionSettings/answerSettings for qna elements
        // Shared properties are set on top-level, only font properties go to questionSettings/answerSettings
        if (targetElementType === 'qna' && styleToApply.textSettings) {
          const textSettings = styleToApply.textSettings;
          if (!styleToApply.questionSettings) {
            styleToApply.questionSettings = {
              ...(targetElement.questionSettings || {}),
              // Only font properties in questionSettings
              fontSize: textSettings.fontSize || targetElement.questionSettings?.fontSize,
              fontFamily: textSettings.fontFamily || targetElement.questionSettings?.fontFamily,
              fontColor: textSettings.fontColor || targetElement.questionSettings?.fontColor,
              fontOpacity: textSettings.fontOpacity ?? targetElement.questionSettings?.fontOpacity,
              fontBold: textSettings.fontBold ?? targetElement.questionSettings?.fontBold,
              fontItalic: textSettings.fontItalic ?? targetElement.questionSettings?.fontItalic,
              // Keep border.enabled and background.enabled for rendering check
              border: textSettings.border || targetElement.questionSettings?.border,
              background: textSettings.background || targetElement.questionSettings?.background
            };
          }
          if (!styleToApply.answerSettings) {
            styleToApply.answerSettings = {
              ...(targetElement.answerSettings || {}),
              // Only font properties in answerSettings
              fontSize: textSettings.fontSize || targetElement.answerSettings?.fontSize,
              fontFamily: textSettings.fontFamily || targetElement.answerSettings?.fontFamily,
              fontColor: textSettings.fontColor || targetElement.answerSettings?.fontColor,
              fontOpacity: textSettings.fontOpacity ?? targetElement.answerSettings?.fontOpacity,
              fontBold: textSettings.fontBold ?? targetElement.answerSettings?.fontBold,
              fontItalic: textSettings.fontItalic ?? targetElement.answerSettings?.fontItalic,
              // Keep border.enabled and background.enabled for rendering check
              border: textSettings.border || targetElement.answerSettings?.border,
              background: textSettings.background || targetElement.answerSettings?.background
            };
          }
          // Set shared properties on top-level
          if (textSettings.borderWidth !== undefined) styleToApply.borderWidth = textSettings.borderWidth || targetElement.borderWidth;
          if (textSettings.borderColor !== undefined) styleToApply.borderColor = textSettings.borderColor || targetElement.borderColor;
          if (textSettings.borderOpacity !== undefined) styleToApply.borderOpacity = textSettings.borderOpacity ?? targetElement.borderOpacity;
          if (textSettings.borderTheme !== undefined) styleToApply.borderTheme = textSettings.borderTheme || targetElement.borderTheme;
          if (textSettings.backgroundColor !== undefined) styleToApply.backgroundColor = textSettings.backgroundColor || targetElement.backgroundColor;
          if (textSettings.backgroundOpacity !== undefined) styleToApply.backgroundOpacity = textSettings.backgroundOpacity ?? targetElement.backgroundOpacity;
          if (textSettings.ruledLines !== undefined) styleToApply.ruledLines = textSettings.ruledLines || targetElement.ruledLines;
          if (textSettings.ruledLinesWidth !== undefined) styleToApply.ruledLinesWidth = textSettings.ruledLinesWidth || targetElement.ruledLinesWidth;
          if (textSettings.ruledLinesColor !== undefined) styleToApply.ruledLinesColor = textSettings.ruledLinesColor || targetElement.ruledLinesColor;
          if (textSettings.ruledLinesOpacity !== undefined) styleToApply.ruledLinesOpacity = textSettings.ruledLinesOpacity ?? targetElement.ruledLinesOpacity;
          if (textSettings.ruledLinesTheme !== undefined) styleToApply.ruledLinesTheme = textSettings.ruledLinesTheme || targetElement.ruledLinesTheme;
          // Remove textSettings as it doesn't apply to qna
          delete styleToApply.textSettings;
        }
        
        pageStyle.elements[targetElementIndex] = {
          ...pageStyle.elements[targetElementIndex],
          ...styleToApply
        };
      }
      
      // Deactivate style painter after applying
      return {
        ...savedStyleState,
        currentBook: updatedBookStyle,
        stylePainterActive: false,
        copiedStyle: null,
        hasUnsavedChanges: true
      };
    
    case 'SET_SELECTED_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    
    case 'LOAD_TEMPLATES':
      return { ...state, availableTemplates: action.payload };
    
    case 'LOAD_COLOR_PALETTES':
      return { ...state, colorPalettes: action.payload };
    
    case 'APPLY_TEMPLATE_TO_PAGE':
      if (!state.currentBook) return state;
      const { pageIndex, template, skipHistory: applyTemplateSkipHistory } = action.payload as any;
      const targetTemplateIndex = typeof pageIndex === 'number' ? pageIndex : state.activePageIndex;
      const targetPageTemplateOriginal = state.currentBook.pages[targetTemplateIndex];
      if (!targetPageTemplateOriginal || isLayoutProtectedPage(targetPageTemplateOriginal, targetTemplateIndex)) {
        return state;
      }
      const savedTemplateState = applyTemplateSkipHistory
        ? state
        : saveToHistory(state, 'Apply Template', {
            affectedPageIndexes: [targetTemplateIndex]
          });
      const updatedBookTemplate = { ...savedTemplateState.currentBook! };
      const targetPageTemplate = updatedBookTemplate.pages[targetTemplateIndex];
      
      if (targetPageTemplate) {
        // Berechne Canvas-Größe für diese Seite
        const pageSize = updatedBookTemplate.pageSize || 'A4';
        const orientation = updatedBookTemplate.orientation || 'portrait';
        const canvasSize = calculatePageDimensions(pageSize, orientation);
        
        // Layout templates no longer have background or theme - these are managed by themes.json and color-palettes.json
        // Page background will be set from the active theme/palette when the template is applied
        
        // Convert template to canvas elements (mit Canvas-Größe für Skalierung)
        const newElements = convertTemplateToElements(template, canvasSize);
        
        // Add elements to page (replace existing elements)
        targetPageTemplate.elements = newElements;
      }
      
      const templatePage = updatedBookTemplate.pages[targetTemplateIndex];
      const templatePageId = getPagePreviewCacheId(templatePage, targetTemplateIndex + 1);
      return withPreviewInvalidation(
        { 
          ...savedTemplateState, 
          currentBook: updatedBookTemplate, 
          selectedTemplate: template,
          wizardSetupApplied: true,
          hasUnsavedChanges: true 
        },
        templatePageId != null ? [templatePageId] : undefined
      );
    
    case 'APPLY_TEMPLATE':
      if (!state.currentBook) return state;
      const { template: applyTemplate, pageIndex: applyPageIndex, applyToAllPages, skipHistory } = action.payload as any;
      if (!applyToAllPages) {
        const targetIndex = applyPageIndex ?? state.activePageIndex;
        const targetPage = state.currentBook.pages[targetIndex];
        if (!targetPage || isLayoutProtectedPage(targetPage, targetIndex)) {
          return state;
        }
      }
      const affectedApplyIndexes = applyToAllPages ? getAllPageIndexes(state) : [applyPageIndex ?? state.activePageIndex];
      const baseState = skipHistory
        ? state
        : saveToHistory(state, 'Apply Template', {
            affectedPageIndexes: affectedApplyIndexes,
            cloneEntireBook: Boolean(applyToAllPages)
          });
      const updatedBookApplyTemplate = { ...baseState.currentBook! };
      
      if (applyToAllPages) {
        // Apply to all pages except protected ones
        updatedBookApplyTemplate.pages = updatedBookApplyTemplate.pages.map((page, index) => {
          if (isLayoutProtectedPage(page, index)) {
            return page;
          }
          const newElements = convertTemplateToElements(applyTemplate);
          return {
            ...page,
            elements: newElements,
            background: {
              type: applyTemplate.background.type,
              value: applyTemplate.background.value,
              opacity: 1,
              pageTheme: applyTemplate.theme
            }
          };
        });
      } else {
        // Apply to specific page
        const targetIndex = applyPageIndex ?? baseState.activePageIndex;
        const targetPageApplyTemplate = updatedBookApplyTemplate.pages[targetIndex];
        
        if (targetPageApplyTemplate) {
          const newElements = convertTemplateToElements(applyTemplate);
          targetPageApplyTemplate.elements = newElements;
          targetPageApplyTemplate.background = {
            type: applyTemplate.background.type,
            value: applyTemplate.background.value,
            opacity: 1,
            pageTheme: applyTemplate.theme
          };
        }
      }
      
      const affectedApplyPageIds = affectedApplyIndexes
        .map((index) => getPagePreviewCacheId(updatedBookApplyTemplate.pages[index], index + 1))
        .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id));
      return withPreviewInvalidation(
        { 
          ...baseState, 
          currentBook: updatedBookApplyTemplate, 
          selectedTemplate: applyTemplate,
          wizardSetupApplied: true,
          hasUnsavedChanges: true 
        },
        affectedApplyPageIds.length ? affectedApplyPageIds : undefined
      );
    
    case 'APPLY_LAYOUT_TEMPLATE':
      if (!state.currentBook) return state;
      const { template: layoutTemplate, pageIndex: layoutPageIndex, applyToAllPages: layoutApplyToAll, skipHistory: layoutSkipHistory } = action.payload;
      if (!layoutApplyToAll) {
        const targetIndex = layoutPageIndex ?? state.activePageIndex;
        const targetPage = state.currentBook.pages[targetIndex];
        if (!targetPage || isLayoutProtectedPage(targetPage, targetIndex)) {
          return state;
        }
      }
      const affectedLayoutIndexes = layoutApplyToAll ? getAllPageIndexes(state) : [layoutPageIndex ?? state.activePageIndex];
      const savedLayoutState = layoutSkipHistory
        ? state
        : saveToHistory(state, 'Apply Layout Template', {
            affectedPageIndexes: affectedLayoutIndexes,
            cloneEntireBook: Boolean(layoutApplyToAll)
          });
      const updatedBookLayout = { ...savedLayoutState.currentBook! };
      
      const applyLayoutToPage = (page: Page, pageIdx: number) => {
        if (isLayoutProtectedPage(page, pageIdx)) {
          return page;
        }
        // Berechne Canvas-Größe für diese Seite
        const pageSize = updatedBookLayout.pageSize || 'A4';
        const orientation = updatedBookLayout.orientation || 'portrait';
        const canvasSize = calculatePageDimensions(pageSize, orientation);
        
        // Validate template compatibility
        const validation = validateTemplateCompatibility(layoutTemplate, page.elements);
        
        // Apply layout with content preservation (mit neuen Skalierungs-Parametern)
        const newElements = applyLayoutTemplateWithPreservation(
          page.elements, 
          layoutTemplate,
          canvasSize,
          pageSize,
          orientation,
          page,        // Pass page for theme/palette detection
          updatedBookLayout  // Pass book for theme/palette detection
        );
        
        // Set themeId on page if layout has a theme, so new textboxes use correct theme defaults
        const updatedPage: Page = {
          ...page,
          elements: newElements,
          background: {
            ...page.background,
            pageTheme: layoutTemplate.theme
          }
        };
        
        // If layout has a theme, set it on the page so new textboxes use correct theme defaults
        if (layoutTemplate.theme) {
          updatedPage.themeId = layoutTemplate.theme;
        }
        
        return updatedPage;
      };
      
      if (layoutApplyToAll) {
        updatedBookLayout.pages = updatedBookLayout.pages.map(applyLayoutToPage);
      } else {
        const targetIndex = layoutPageIndex ?? savedLayoutState.activePageIndex;
        updatedBookLayout.pages[targetIndex] = applyLayoutToPage(updatedBookLayout.pages[targetIndex], targetIndex);
      }
      
      const layoutPageIds = affectedLayoutIndexes
        .map((index) => getPagePreviewCacheId(updatedBookLayout.pages[index], index + 1))
        .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id));
      return withPreviewInvalidation(
        { 
          ...savedLayoutState, 
          currentBook: updatedBookLayout, 
          hasUnsavedChanges: true 
        },
        layoutPageIds.length ? layoutPageIds : undefined
      );
    
    case 'APPLY_THEME_ONLY':
      if (!state.currentBook) return state;
      const { themeId: themeOnlyId, pageIndex: themePageIndex, applyToAllPages: themeApplyToAll } = action.payload;
      const affectedThemeOnlyIndexes = themeApplyToAll ? getAllPageIndexes(state) : [themePageIndex ?? state.activePageIndex];
      const savedThemeOnlyState = saveToHistory(state, 'Apply Theme', {
        affectedPageIndexes: affectedThemeOnlyIndexes,
        cloneEntireBook: Boolean(themeApplyToAll)
      });
      const updatedBookThemeOnly = { ...savedThemeOnlyState.currentBook! };
      
      const applyThemeOnlyToPage = (page: Page) => {
        const theme = getGlobalTheme(themeOnlyId);
        if (!theme) return page;
        
        let paletteOverrideId: string | null = null;
        if (page.colorPaletteId === null) {
          // Page uses Theme's Default Palette - use theme's palette
          paletteOverrideId = getThemePaletteId(themeOnlyId);
        } else {
          // Page has explicit palette - use it
          paletteOverrideId = page.colorPaletteId;
        }
        const paletteOverride = paletteOverrideId ? colorPalettes.find(p => p.id === paletteOverrideId) : null;
        const existingBackground = page.background;
        const backgroundOpacity = theme.pageSettings.backgroundOpacity || existingBackground?.opacity || 1;
        
        const resolvedBaseColor = existingBackground
          ? existingBackground.type === 'pattern'
            ? existingBackground.patternForegroundColor || paletteOverride?.colors.background || '#ffffff'
            : (typeof existingBackground.value === 'string' ? existingBackground.value : paletteOverride?.colors.background || '#ffffff')
          : paletteOverride?.colors.background || '#ffffff';
        
        const resolvedPatternForeground = existingBackground?.patternForegroundColor
          || paletteOverride?.colors.background
          || resolvedBaseColor;
        const resolvedPatternBackground = existingBackground?.patternBackgroundColor
          || paletteOverride?.colors.primary
          || paletteOverride?.colors.accent
          || resolvedPatternForeground;
        
        return {
          ...page,
          background: existingBackground?.type === 'image'
            ? {
                ...existingBackground,
                opacity: backgroundOpacity,
                pageTheme: themeOnlyId
              }
            : theme.pageSettings.backgroundPattern?.enabled
              ? {
                  type: 'pattern',
                  value: theme.pageSettings.backgroundPattern.style,
                  opacity: backgroundOpacity,
                  pageTheme: themeOnlyId,
                  patternSize: theme.pageSettings.backgroundPattern.size,
                  patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                  patternForegroundColor: resolvedPatternForeground,
                  patternBackgroundColor: resolvedPatternBackground,
                  patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
                }
              : {
                  type: 'color',
                  value: resolvedBaseColor,
                  opacity: backgroundOpacity,
                  pageTheme: themeOnlyId
                },
          elements: page.elements.map(element => {
            // Use centralized theme application function with palette
            return applyThemeToElementConsistent(element, themeOnlyId, paletteOverride?.id);
          })
        };
      };
      
      if (themeApplyToAll) {
        updatedBookThemeOnly.pages = updatedBookThemeOnly.pages.map(applyThemeOnlyToPage);
      } else {
        const targetIndex = themePageIndex ?? savedThemeOnlyState.activePageIndex;
        updatedBookThemeOnly.pages[targetIndex] = applyThemeOnlyToPage(updatedBookThemeOnly.pages[targetIndex]);
      }
      
      const themeOnlyPageIds = affectedThemeOnlyIndexes
        .map((index) => getPagePreviewCacheId(updatedBookThemeOnly.pages[index], index + 1))
        .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id));
      return withPreviewInvalidation(
        { 
          ...savedThemeOnlyState, 
          currentBook: updatedBookThemeOnly, 
          hasUnsavedChanges: true 
        },
        themeOnlyPageIds.length ? themeOnlyPageIds : undefined
      );
    
    case 'APPLY_COMPLETE_TEMPLATE':
      if (!state.currentBook) return state;
      const { layoutId, themeId: completeThemeId, paletteId, scope } = action.payload;
      const affectedCompleteIndexes = scope === 'entire-book' ? getAllPageIndexes(state) : [state.activePageIndex];
      const savedCompleteState = saveToHistory(state, 'Apply Complete Template', {
        affectedPageIndexes: affectedCompleteIndexes,
        cloneEntireBook: scope === 'entire-book',
        command: 'APPLY_TEMPLATE'
      });
      
      let completeTemplateState = savedCompleteState;
      
      // Apply layout template if provided
      if (layoutId) {
        const layoutTemplateToApply = pageTemplates.find(t => t.id === layoutId);
        if (layoutTemplateToApply) {
          completeTemplateState = editorReducer(completeTemplateState, {
            type: 'APPLY_LAYOUT_TEMPLATE',
            payload: {
              template: layoutTemplateToApply,
              applyToAllPages: scope === 'entire-book'
            }
          });
        }
      }
      
      // Apply theme if provided - this should update page theme and apply to all elements
      if (completeThemeId) {
        // First set the page/book theme
        if (scope === 'entire-book') {
          completeTemplateState = { 
            ...completeTemplateState, 
            currentBook: { 
              ...completeTemplateState.currentBook!, 
              bookTheme: completeThemeId 
            } 
          };
        } else {
          const updatedBook = { ...completeTemplateState.currentBook! };
          const targetPage = updatedBook.pages[completeTemplateState.activePageIndex];
          if (targetPage) {
            if (!targetPage.background) {
              targetPage.background = { type: 'color', value: '#ffffff', opacity: 1 };
            }
            targetPage.background.pageTheme = completeThemeId;
          }
          completeTemplateState = { ...completeTemplateState, currentBook: updatedBook };
        }
        
        // Then apply theme to elements
        completeTemplateState = editorReducer(completeTemplateState, {
          type: 'APPLY_THEME_TO_ELEMENTS',
          payload: {
            themeId: completeThemeId,
            pageIndex: scope === 'entire-book' ? -1 : completeTemplateState.activePageIndex,
            applyToAllPages: scope === 'entire-book'
          }
        });
      }
      
      // Apply color palette if provided
      if (paletteId) {
        const paletteToApply = colorPalettes.find(p => p.id === paletteId);
        if (paletteToApply) {
          completeTemplateState = editorReducer(completeTemplateState, {
            type: 'APPLY_COLOR_PALETTE',
            payload: {
              palette: paletteToApply,
              applyToAllPages: scope === 'entire-book'
            }
          });
        }
      }
      
      return completeTemplateState;
    
    case 'SET_WIZARD_TEMPLATE_SELECTION':
      return { ...state, wizardTemplateSelection: action.payload };
    
    case 'MARK_COLOR_OVERRIDE':
      if (!state.currentBook) return state;
      const updatedBookOverride = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => {
          if (index === state.activePageIndex) {
            return {
              ...page,
              elements: page.elements.map(element => {
                if (action.payload.elementIds.includes(element.id)) {
                  const colorOverrides = { ...element.colorOverrides };
                  colorOverrides[action.payload.colorProperty] = true;
                  return { ...element, colorOverrides };
                }
                return element;
              })
            };
          }
          return page;
        })
      };
      return { ...state, currentBook: updatedBookOverride, hasUnsavedChanges: true };
    
    case 'RESET_COLOR_OVERRIDES':
      if (!state.currentBook) return state;
      const updatedBookReset = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => {
          // If pageIndex is specified in payload, only process that page; otherwise use activePageIndex
          const targetPageIndex = action.payload.pageIndex !== undefined ? action.payload.pageIndex : state.activePageIndex;
          if (index === targetPageIndex) {
            return {
              ...page,
              elements: page.elements.map(element => {
                if (action.payload.elementIds.includes(element.id)) {
                  const colorOverrides = { ...element.colorOverrides };
                  if (action.payload.colorProperties) {
                    action.payload.colorProperties.forEach(prop => {
                      delete colorOverrides[prop];
                    });
                  } else {
                    // Reset all overrides
                    Object.keys(colorOverrides).forEach(key => {
                      delete colorOverrides[key];
                    });
                  }
                  return { ...element, colorOverrides };
                }
                return element;
              })
            };
          }
          return page;
        })
      };
      return { ...state, currentBook: updatedBookReset, hasUnsavedChanges: true };
    
    case 'APPLY_COLOR_PALETTE':
      if (!state.currentBook) return state;
      const { palette: appliedPalette, pageIndex: palettePageIndex, applyToAllPages: paletteApplyToAll, skipHistory: paletteSkipHistory } = action.payload;
      const paletteScope = paletteApplyToAll ? 'Book' : 'Page';
      const affectedPaletteIndexes = paletteApplyToAll ? getAllPageIndexes(state) : [palettePageIndex ?? state.activePageIndex];
      const savedApplyPaletteState = paletteSkipHistory
        ? state
        : saveToHistory(state, `Apply Color Palette "${appliedPalette.name}" to ${paletteScope}`, {
            affectedPageIndexes: affectedPaletteIndexes,
            cloneEntireBook: Boolean(paletteApplyToAll),
            command: 'CHANGE_PALETTE'
          });
      const updatedBookApplyPalette = { ...savedApplyPaletteState.currentBook! };
      // Create palette color getters using centralized function
      const getPaletteColors = (elementType: string) => getElementPaletteColors(appliedPalette, elementType);
      
      const applyPaletteToPage = (page: Page, pageIndex?: number) => {
        if (paletteApplyToAll && page.colorPaletteId) {
          return page;
        }
        // Preserve background type and update only color values
        const currentBackground = page.background || { type: 'color' as const, value: '#ffffff' };
        let updatedBackground: typeof currentBackground;
        
        if (currentBackground.type === 'color') {
          updatedBackground = {
            ...currentBackground,
            value: getPalettePartColor(appliedPalette, 'pageBackground', 'background', appliedPalette.colors.background)
          };
        } else if (currentBackground.type === 'pattern') {
          // For pattern backgrounds:
          // patternBackgroundColor = color of the pattern itself (dots, lines) - update from palette
          // patternForegroundColor = color of the space between patterns - update from palette
          updatedBackground = {
            ...currentBackground,
            patternBackgroundColor: getPalettePartColor(appliedPalette, 'pagePattern', 'primary', appliedPalette.colors.primary),
            patternForegroundColor: getPalettePartColor(appliedPalette, 'pageBackground', 'background', appliedPalette.colors.background)
          };
        } else {
          // For 'image' type, preserve everything - color palette doesn't affect image backgrounds
          updatedBackground = currentBackground;
        }
        
        return {
          ...page,
          background: updatedBackground,
          elements: page.elements.map(element => {
            const updates: Partial<CanvasElement> = {};
            
            // Apply palette colors only - do NOT modify border/background enabled states, widths, or opacities
            // These properties should only be changed when applying themes, not color palettes
            if (element.type === 'text' || element.textType) {
              if (element.textType === 'qna') {
                // Update QnA colors only - preserve all other properties
                const qnaColors = getPaletteColors('qna');
                // Only update colors in questionSettings/answerSettings - preserve all other properties
                updates.questionSettings = {
                  ...element.questionSettings,
                  fontColor: qnaColors.qnaQuestionText,
                  font: { ...element.questionSettings?.font, fontColor: qnaColors.qnaQuestionText }
                };
                updates.answerSettings = {
                  ...element.answerSettings,
                  fontColor: qnaColors.qnaAnswerText,
                  font: { ...element.answerSettings?.font, fontColor: qnaColors.qnaAnswerText }
                };
                // Only update color properties on top-level - preserve all other properties
                updates.borderColor = qnaColors.qnaBorder;
                updates.backgroundColor = qnaColors.qnaBackground;
                if (element.ruledLinesColor !== undefined) {
                  updates.ruledLinesColor = qnaColors.qnaAnswerRuledLines;
                }
              } else if (element.textType === 'free_text') {
                // Handle free_text elements - update colors only, preserve enabled states
                const freeTextColors = getPaletteColors('free_text');
                const currentBorder = element.textSettings?.border || {};
                const currentBackground = element.textSettings?.background || {};
                updates.textSettings = {
                  ...element.textSettings,
                  fontColor: freeTextColors.freeTextText,
                  font: element.textSettings?.font ?
                    { ...element.textSettings.font, fontColor: freeTextColors.freeTextText } :
                    { fontColor: freeTextColors.freeTextText },
                  border: {
                    ...currentBorder,
                    borderColor: freeTextColors.freeTextBorder
                    // Do NOT set enabled - preserve existing value
                  },
                  borderColor: freeTextColors.freeTextBorder,
                  background: {
                    ...currentBackground,
                    backgroundColor: freeTextColors.freeTextBackground
                    // Do NOT set enabled - preserve existing value
                  },
                  backgroundColor: freeTextColors.freeTextBackground,
                  ruledLines: element.textSettings?.ruledLines ? {
                    ...element.textSettings.ruledLines,
                    lineColor: freeTextColors.freeTextRuledLines
                  } : undefined,
                  ruledLinesColor: freeTextColors.freeTextRuledLines
                };
              } else {
                // For other text elements, update colors only - preserve all other properties
                const textColors = getPaletteColors('text');
                if (element.font) {
                  updates.font = { ...element.font, fontColor: textColors.textColor };
                }
                // Update color properties on top-level - preserve enabled states, widths, opacities
                updates.fontColor = textColors.textColor;
                updates.fill = textColors.textColor;
                updates.borderColor = textColors.borderColor;
                updates.backgroundColor = textColors.backgroundColor;
              }
            }
            
            // Apply stroke color to shapes and lines
            if (element.type === 'line' || element.type === 'circle' || element.type === 'rect' ||
                element.type === 'heart' || element.type === 'star' || element.type === 'triangle' ||
                element.type === 'polygon' || element.type === 'speech-bubble' || element.type === 'dog' ||
                element.type === 'cat' || element.type === 'smiley' || element.type === 'brush') {
              const elementColors = getPaletteColors('shape');
              updates.stroke = elementColors.stroke || elementColors.primary;

              // Apply fill color to filled shapes - apply even if fill is missing or transparent
              // This ensures palette colors are applied during reset
              if (element.type === 'circle' || element.type === 'rect' || element.type === 'heart' ||
                  element.type === 'star' || element.type === 'triangle' || element.type === 'polygon' ||
                  element.type === 'speech-bubble' || element.type === 'dog' || element.type === 'cat' ||
                  element.type === 'smiley') {
                // Only apply fill if element had a fill (not transparent) before
                // But during reset, we want to apply palette colors
                if (element.fill && element.fill !== 'transparent') {
                  updates.fill = elementColors.fill || elementColors.surface;
                }
                // If element doesn't have fill or has transparent, don't change it
                // (respects the element's original fill state)
              }
            }
            
            return { ...element, ...updates };
          })
        };
      };
      
      if (paletteApplyToAll) {
        updatedBookApplyPalette.pages = updatedBookApplyPalette.pages.map((page, index) =>
          applyPaletteToPage(page, index)
        );
      } else {
        const targetIndex = palettePageIndex ?? savedApplyPaletteState.activePageIndex;
        updatedBookApplyPalette.pages[targetIndex] = applyPaletteToPage(
          updatedBookApplyPalette.pages[targetIndex],
          targetIndex
        );
      }
      
      return { 
        ...savedApplyPaletteState, 
        currentBook: updatedBookApplyPalette, 
        wizardSetupApplied: true, 
        hasUnsavedChanges: true 
      };
    
    case 'SET_PAGE_PAGINATION':
      return { ...state, pagePagination: action.payload };

    case 'MERGE_BOOK_PAGES': {
      if (!state.currentBook) return state;

      const incomingPages = action.payload.pages ?? [];
      if (incomingPages.length === 0) {
        return state;
      }

      const basePagination = action.payload.pagination ?? state.pagePagination;
      // Use pagination.totalPages from API if available (most accurate from database)
      // Otherwise preserve existing totalPages, or calculate from max page number
      const totalPagesFromPagination = action.payload.pagination?.totalPages ?? basePagination?.totalPages;
      const maxPageNumberFromIncoming = incomingPages.reduce((max, page) => {
        const pageNum = page.pageNumber ?? 0;
        return Math.max(max, pageNum);
      }, 0);
      const maxPageNumberFromExisting = state.currentBook.pages.reduce((max, page) => {
        const pageNum = page.pageNumber ?? 0;
        return Math.max(max, pageNum);
      }, 0);
      const totalPages = totalPagesFromPagination ?? Math.max(maxPageNumberFromExisting, maxPageNumberFromIncoming, state.currentBook.pages.length);

      let updatedPages = state.currentBook.pages.slice();
      if (totalPages > updatedPages.length) {
        updatedPages = ensurePageArrayLength(updatedPages, totalPages);
      }

      const updatedCacheIds: number[] = [];
      const loadedRecords: Record<number, true> = { ...(basePagination?.loadedPages ?? {}) };

      incomingPages.forEach((incomingPage, index) => {
        const pageNumber = incomingPage.pageNumber ?? index + 1;
        const pageIndex = Math.max(0, pageNumber - 1);

        if (pageIndex >= updatedPages.length) {
          updatedPages = ensurePageArrayLength(updatedPages, pageIndex + 1);
        }

        const normalizedPage: Page = {
          ...incomingPage,
          pageNumber,
          database_id: incomingPage.database_id ?? incomingPage.id,
          isPlaceholder: false,
        };

        updatedPages[pageIndex] = normalizedPage;

        if (pageNumber > 0) {
          loadedRecords[pageNumber] = true;
        }

        const cacheId = getPagePreviewCacheId(normalizedPage, pageNumber);
        if (cacheId != null) {
          updatedCacheIds.push(cacheId);
        }
      });

      // Always preserve paginationState if it exists, or create it if we have totalPages
      // This ensures the page explorer always shows the correct total count
      const nextPagination: PagePaginationState | undefined = basePagination || totalPagesFromPagination
        ? {
            totalPages: totalPagesFromPagination ?? basePagination?.totalPages ?? totalPages,
            pageSize:
              action.payload.pagination?.pageSize ??
              basePagination?.pageSize ??
              PAGE_CHUNK_SIZE,
            loadedPages: loadedRecords,
          }
        : (totalPages > state.currentBook.pages.length
            ? {
                totalPages,
                pageSize: PAGE_CHUNK_SIZE,
                loadedPages: loadedRecords,
              }
            : undefined);

      const mergedState = {
        ...state,
        currentBook: {
          ...state.currentBook,
          pages: updatedPages,
        },
        pagePagination: nextPagination,
      };

      return invalidatePagePreviews(mergedState, updatedCacheIds);
    }

    case 'SET_PAGE_PREVIEW': {
      const { pageId, dataUrl, version } = action.payload;
      const existingEntry = state.pagePreviewCache[pageId];
      const cacheUnchanged = existingEntry && existingEntry.dataUrl === dataUrl && existingEntry.version === version;
      const versionUnchanged = state.pagePreviewVersions[pageId] === version;
      if (cacheUnchanged && versionUnchanged) {
        return state;
      }
      return {
        ...state,
        pagePreviewCache: {
          ...state.pagePreviewCache,
          [pageId]: { dataUrl, version }
        },
        pagePreviewVersions: {
          ...state.pagePreviewVersions,
          [pageId]: version
        }
      };
    }
    
    case 'MARK_WIZARD_SETUP_APPLIED':
      return { ...state, wizardSetupApplied: true };
    
    case 'CLEAR_MODIFIED_PAGES':
      return { ...state, modifiedPageIds: new Set<number>() };
    
    case 'RESTORE_PAGE_STATE':
      if (!state.currentBook) return state;
      const updatedBookRestore = { ...state.currentBook };
      updatedBookRestore.pages[action.payload.pageIndex] = cloneData(action.payload.pageState);
      return { ...state, currentBook: updatedBookRestore };
    
    case 'RESTORE_ELEMENT_STATE':
      if (!state.currentBook) return state;
      const updatedBookRestoreElement = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => {
          if (index === state.activePageIndex) {
            return {
              ...page,
              elements: page.elements.map(el => 
                el.id === action.payload.elementId ? cloneData(action.payload.elementState) : el
              )
            };
          }
          return page;
        })
      };
      return { ...state, currentBook: updatedBookRestoreElement };
    
    default:
      return state;
  }
}

export const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  saveBook: () => Promise<void>;
  loadBook: (bookId: number) => Promise<void>;
  applyTemplateToPage: (template: PageTemplate, pageIndex?: number) => void;
  applyCompleteTemplate: (layoutId?: string, themeId?: string, paletteId?: string, scope?: 'current-page' | 'entire-book') => void;
  getWizardTemplateSelection: () => WizardTemplateSelection;
  setWizardTemplateSelection: (selection: WizardTemplateSelection) => void;
  getQuestionText: (questionId: string) => string;
  getAnswerText: (questionId: string, userId?: number) => string;
  updateTempQuestion: (questionId: string, text: string) => void;
  updateTempAnswer: (questionId: string, text: string, userId?: number) => void;
  undo: () => void;
  redo: () => void;
  goToHistoryStep: (step: number) => void;
  getHistoryActions: () => string[];
  refreshPageAssignments: () => Promise<void>;
  getQuestionAssignmentsForUser: (userId: number) => Set<string>;
  isQuestionAvailableForUser: (questionId: string, userId: number) => boolean;
  checkUserQuestionConflicts: (userId: number, pageNumber: number) => { questionId: string; questionText: string; pageNumbers: number[] }[];
  validateQuestionSelection: (questionId: string, currentPageNumber: number) => { valid: boolean; reason?: string };
  canAccessEditor: () => boolean;
  canEditCanvas: () => boolean;
  canEditSettings: () => boolean;
  getVisiblePages: () => Page[];
  getVisiblePageNumbers: () => number[];
  ensurePagesLoaded: (startIndex: number, endIndex: number) => Promise<void>;
  pageMetadata: Record<number, PageMetadata>;
  getPageMetadata: (pageNumber: number) => PageMetadata | undefined;
  canUseTool: (toolId: string) => boolean;
  canCreateElementType: (textType: string) => boolean;
  canDeleteElementType: (textType: string) => boolean;
  canViewPageSettings: () => boolean;
  canEditBookSettings: () => boolean;
} | undefined>(undefined);

export const useEditor = () => {
  const context = useContext(EditorContext);
  const ability = useAbility();
  if (!context) {
    // Check if we're in a React Fast Refresh scenario
    // During hot reload, components may render before providers are ready
    if (import.meta.env.DEV) {
      // In development, return a safe fallback instead of crashing
      // This prevents the app from breaking during hot reload
      
      // Return a minimal safe fallback that matches the context interface
      return {
        state: initialState,
        dispatch: () => {},
        saveBook: async () => {},
        loadBook: async () => {},
        applyTemplateToPage: () => {},
        applyCompleteTemplate: () => {},
        getWizardTemplateSelection: () => ({
          selectedTemplateId: null,
          selectedPaletteId: null,
          templateCustomizations: undefined
        }),
        setWizardTemplateSelection: () => {},
        getQuestionText: () => '',
        getAnswerText: () => '',
        updateTempQuestion: () => {},
        updateTempAnswer: () => {},
        undo: () => {},
        redo: () => {},
        goToHistoryStep: () => {},
        getHistoryActions: () => [],
        refreshPageAssignments: async () => {},
        getQuestionAssignmentsForUser: () => new Set<string>(),
        isQuestionAvailableForUser: () => true,
        checkUserQuestionConflicts: () => [] as { questionId: string; questionText: string; pageNumbers: number[] }[],
        validateQuestionSelection: () => ({ valid: true }),
        canAccessEditor: () => false,
        canEditCanvas: () => false,
        canEditSettings: () => false,
        getVisiblePages: () => [],
        getVisiblePageNumbers: () => [],
        ensurePagesLoaded: async () => {},
        pageMetadata: {},
        getPageMetadata: () => undefined,
        canEditCurrentPage: () => false,
        canUseTools: () => false,
        canViewToolSettings: () => false,
        canEditElement: () => false,
        canCreateElement: () => false,
        canDeleteElement: () => false,
        canUseTool: () => false,
        canCreateElementType: () => false,
        canDeleteElementType: () => false,
        canViewPageSettings: () => false,
        canEditBookSettings: () => false,
      };
    }
    // In production, still throw to catch actual bugs
    throw new Error('useEditor must be used within an EditorProvider');
  }

  const getCurrentPageAbilityData = () => {
    const currentBook = context.state.currentBook;
    if (!currentBook) return null;
    const page = currentBook.pages[context.state.activePageIndex];
    if (!page) return null;
    const assignedUser = context.state.pageAssignments?.[page.pageNumber] ?? null;
    let assignedUserId = typeof assignedUser?.id === 'number' ? assignedUser.id : null;
    if (!assignedUserId && context.state.userRole === 'author' && context.state.user?.id) {
      if (context.state.assignedPages?.includes(page.pageNumber)) {
        assignedUserId = context.state.user.id;
      }
    }
    return { assignedUserId };
  };

  const canEditCurrentPage = () => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('edit', subject('Page', pageData));
  };

  const canUseTools = () => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('use', subject('Tool', { page: pageData }));
  };

  const canViewToolSettings = () => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('view', subject('ToolSettings', { page: pageData }));
  };

  const canEditElement = (element?: { textType?: string | null }) => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    if (element?.textType === 'answer') {
      return ability.can('edit', subject('Answer', { page: pageData }));
    }
    return ability.can('edit', subject('Element', { page: pageData }));
  };

  const canCreateElement = () => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('create', subject('Element', { page: pageData }));
  };

  const canDeleteElement = () => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('delete', subject('Element', { page: pageData }));
  };

  const canUseTool = (toolId: string) => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('use', subject('Tool', { page: pageData, toolId }));
  };

  const canCreateElementType = (textType: string) => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('create', subject('Element', { page: pageData, textType }));
  };

  const canDeleteElementType = (textType: string) => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('delete', subject('Element', { page: pageData, textType }));
  };

  const canViewPageSettings = () => {
    const pageData = getCurrentPageAbilityData();
    if (!pageData) return false;
    return ability.can('view', subject('PageSettings', { page: pageData }));
  };

  const canEditBookSettings = () => ability.can('edit', subject('BookSettings', {}));

  return {
    ...context,
    canEditCurrentPage,
    canUseTools,
    canViewToolSettings,
    canEditElement,
    canCreateElement,
    canDeleteElement,
    canUseTool,
    canCreateElementType,
    canDeleteElementType,
    canViewPageSettings,
    canEditBookSettings
  };
};

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const { user } = useAuth();
  const previewSignaturesRef = useRef<Record<number, string>>({});
  const generatingPreviewsRef = useRef<Set<number>>(new Set());
  const previousBookIdRef = useRef<number | string | null>(null);
  const loadingPageChunksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_USER', payload: { id: user.id, role: user.role } });
    }
  }, [user]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__editorDebug = () => ({
      userRole: state.userRole,
      pageAccessLevel: state.pageAccessLevel,
      editorInteractionLevel: state.editorInteractionLevel,
      userId: state.user?.id ?? null,
      assignedPages: state.assignedPages,
      activePageIndex: state.activePageIndex,
      currentPageNumber: state.currentBook?.pages[state.activePageIndex]?.pageNumber ?? null,
      pageAssignment: state.currentBook?.pages[state.activePageIndex]?.pageNumber
        ? state.pageAssignments?.[state.currentBook.pages[state.activePageIndex].pageNumber] ?? null
        : null
    });
    return () => {
      (window as any).__editorDebug = undefined;
    };
  }, [
    state.userRole,
    state.pageAccessLevel,
    state.editorInteractionLevel,
    state.user?.id,
    state.assignedPages,
    state.activePageIndex,
    state.currentBook?.pages,
    state.pageAssignments
  ]);

  // Feature flag to disable preview generation (Phase 2 optimization)
  // Preview generation is no longer used in the UI, only causes memory overhead
  const ENABLE_PREVIEW_GENERATION = false;

  useEffect(() => {
    if (!ENABLE_PREVIEW_GENERATION) {
      return;
    }

    if (!state.currentBook) {
      previewSignaturesRef.current = {};
      generatingPreviewsRef.current.clear();
      previousBookIdRef.current = null;
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const currentBookId = state.currentBook.id;
    if (previousBookIdRef.current !== currentBookId) {
      previewSignaturesRef.current = {};
      generatingPreviewsRef.current.clear();
      previousBookIdRef.current = currentBookId;
    }

    const pages = state.currentBook.pages.filter((page) => !page.isPreview && !page.isPlaceholder);
    const tasks: Array<{ page: Page; cacheId: number; signature: string; version: number }> = [];

    pages.forEach((page, index) => {
      const cacheId = getPagePreviewCacheId(page, index + 1);
      if (cacheId == null) {
        return;
      }

      const signature = JSON.stringify({
        id: cacheId,
        elements: page.elements.map((el) => ({
          id: el.id,
          type: el.type,
          textType: el.textType,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          fill: el.fill,
          stroke: el.stroke,
          fontSize: el.fontSize,
          fontColor: el.fontColor,
          backgroundColor: el.backgroundColor,
          questionId: el.questionId,
        })),
        background: page.background,
        layoutTemplateId: page.layoutTemplateId,
        themeId: page.themeId,
        colorPaletteId: page.colorPaletteId,
      });

      const cached = state.pagePreviewCache[cacheId];
      const targetVersion = state.pagePreviewVersions[cacheId] ?? (cached?.version ?? 0);

      let versionToUse = targetVersion;
      let requiresRender = false;

      if (!cached) {
        versionToUse = targetVersion || 1;
        requiresRender = true;
      } else if (cached.version !== targetVersion) {
        versionToUse = targetVersion;
        requiresRender = true;
      }

      if (!requiresRender && previewSignaturesRef.current[cacheId] !== signature) {
        versionToUse = (cached?.version ?? 0) + 1;
        requiresRender = true;
      }

      if (requiresRender && !generatingPreviewsRef.current.has(cacheId)) {
        tasks.push({ page, cacheId, signature, version: versionToUse });
      }
    });

    if (!tasks.length) {
      return;
    }

    // Memory optimization: Reduce parallel preview generation from 4 to 2
    // This reduces memory pressure while still maintaining reasonable preview generation speed
    const limitedTasks = tasks.slice(0, 2);

    let cancelled = false;

    const runGeneration = async () => {
      for (const task of limitedTasks) {
        if (cancelled) {
          break;
        }

        generatingPreviewsRef.current.add(task.cacheId);

        try {
          const start = typeof performance !== 'undefined' ? performance.now() : 0;
          const dataUrl = await generatePagePreview({
            page: task.page,
            book: state.currentBook!,
            previewWidth: 200,
            previewHeight: 280,
          });
          const duration = typeof performance !== 'undefined' ? performance.now() - start : null;

          if (!cancelled) {
            previewSignaturesRef.current[task.cacheId] = task.signature;
            dispatch({
              type: 'SET_PAGE_PREVIEW',
              payload: { pageId: task.cacheId, dataUrl, version: task.version },
            });
            if (duration != null) {
              window.dispatchEvent(
                new CustomEvent('pagePreview:generated', {
                  detail: {
                    pageId: task.cacheId,
                    duration,
                    timestamp: Date.now(),
                  },
                }),
              );
            }
          }
        } catch (error) {
          if (!cancelled) {
            previewSignaturesRef.current[task.cacheId] = task.signature;
            dispatch({
              type: 'SET_PAGE_PREVIEW',
              payload: { pageId: task.cacheId, dataUrl: null, version: task.version },
            });
          }
        } finally {
          generatingPreviewsRef.current.delete(task.cacheId);
        }
      }
    };

    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const schedule = () => {
      const win = window as any;

      if (typeof win.requestIdleCallback === 'function') {
        idleHandle = win.requestIdleCallback(() => {
          runGeneration();
        });
      } else {
        timeoutHandle = window.setTimeout(() => {
          runGeneration();
        }, 0);
      }
    };

    schedule();

    return () => {
      cancelled = true;
      const win = window as any;
      if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [ENABLE_PREVIEW_GENERATION, ENABLE_PREVIEW_GENERATION ? state.currentBook : null, ENABLE_PREVIEW_GENERATION ? state.pagePreviewVersions : null, ENABLE_PREVIEW_GENERATION ? state.pagePreviewCache : null]);

  const derivedPageMetadata = useMemo(() => {
    const pages = state.currentBook?.pages ?? [];
    const totalPages = state.pagePagination?.totalPages ?? pages.length;
    if (!pages.length && !totalPages) {
      return {};
    }
    return buildPageMetadataMap(pages, totalPages);
  }, [state.currentBook?.pages, state.pagePagination?.totalPages]);

  const getPageMetadata = useCallback(
    (pageNumber: number) => {
      const entry = derivedPageMetadata[pageNumber];
      if (entry) {
        return entry;
      }
      const totalPages = state.pagePagination?.totalPages ?? state.currentBook?.pages.length ?? 0;
      if (!totalPages) {
        return undefined;
      }
      const page =
        state.currentBook?.pages.find((p) => p.pageNumber === pageNumber) ??
        undefined;
      return computePageMetadataEntry(pageNumber, totalPages, page);
    },
    [derivedPageMetadata, state.pagePagination?.totalPages, state.currentBook?.pages]
  );

  const saveBook = async () => {
    if (!state.currentBook) return;
    
    // Prevent concurrent saves
    if (saveBook.isRunning) {
      return;
    }
    
    saveBook.isRunning = true;
    
    try {

      
      // Save questions and answers to database
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      // Save questions first (skip for authors and answer_only users)
      if (user?.role !== 'author' && state.userRole !== 'author' && state.editorInteractionLevel !== 'answer_only') {
        for (const [questionId, questionData] of Object.entries(state.tempQuestions)) {
          if (questionData && questionData.trim()) {
            try {
              // Parse question data (might be JSON with poolId or plain text)
              let questionText = questionData;
              let questionPoolId = null;
              try {
                const parsed = JSON.parse(questionData);
                if (parsed.text) {
                  questionText = parsed.text;
                  questionPoolId = parsed.poolId || null;
                }
              } catch {
                // Not JSON, use as plain text
              }
              
              const response = await fetch(`${apiUrl}/questions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  id: questionId,
                  bookId: state.currentBook.id,
                  questionText: questionText,
                  questionPoolId: questionPoolId
                })
              });
              
              if (!response.ok) {
                await response.text();
              }
            } catch (error) {
              // Failed to save question
            }
          }
        }
      }
      
      // Save answers
      for (const [questionId, userAnswers] of Object.entries(state.tempAnswers)) {
        for (const [userId, answerData] of Object.entries(userAnswers)) {
          if (answerData.text && answerData.text.trim()) {
            try {
              const response = await fetch(`${apiUrl}/answers`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  id: answerData.answerId,
                  questionId: questionId,
                  answerText: answerData.text,
                  userId: parseInt(userId)
                })
              });
              
              if (!response.ok) {
                await response.text();
              }
            } catch (error) {
              // Failed to save answer
            }
          }
        }
      }

      
      // For answer_only users, only save answers - no book/page updates
      if (state.editorInteractionLevel === 'answer_only') {
        dispatch({ type: 'MARK_SAVED' });
        return;
      }
      
      // For authors, only save assigned pages and answers
      if ((user?.role === 'author' || state.userRole === 'author') && state.assignedPages.length > 0) {
        const assignedPages = state.currentBook.pages.filter((_, index) => 
          state.assignedPages.includes(index + 1)
        );
        
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}/author-save`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pages: assignedPages.map(page => ({
              ...page,
              elements: page.elements
            }))
          })
        });
        
        if (!response.ok) throw new Error('Failed to save book');
        
        dispatch({ type: 'MARK_SAVED' });
        return;
      } else {
        // For publishers/owners - save only modified pages
        // Filter pages to only include modified ones or new pages (without database_id)
        const modifiedPages = state.currentBook.pages.filter((page, index) => {
          // Always include new pages (without database_id) - they need to be saved
          if (!page.database_id && (!page.id || page.id < 0)) {
            return true;
          }
          const pageId = getPagePreviewCacheId(page, index + 1);
          return pageId !== null && state.modifiedPageIds.has(pageId);
        });
        
        // If no pages are modified, still send book metadata update
        const bookPayload = {
          ...state.currentBook,
          // Include book settings (pageSize, orientation) from state
          pageSize: state.currentBook.pageSize,
          orientation: state.currentBook.orientation,
          pages: modifiedPages.length > 0 ? modifiedPages : state.currentBook.pages,
          onlyModifiedPages: modifiedPages.length > 0 && modifiedPages.length < state.currentBook.pages.length // Flag to indicate partial save
        };

        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bookPayload)
        });

        if (!response.ok) throw new Error('Failed to save book');

        // Clear modified pages after successful save
        dispatch({ type: 'CLEAR_MODIFIED_PAGES' });
      }
      
      // Save page assignments if any exist (publishers only)
      if (user?.role !== 'author' && state.userRole !== 'author' && Object.keys(state.pageAssignments).length > 0) {
        const assignments = Object.entries(state.pageAssignments)
          .filter(([_, assignedUser]) => assignedUser !== null)
          .map(([pageNumber, assignedUser]) => ({
            pageNumber: parseInt(pageNumber),
            userId: assignedUser?.id || null
          }));
        

        
        const assignmentResponse = await fetch(`${apiUrl}/page-assignments/book/${state.currentBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ assignments })
        });
        
        if (!assignmentResponse.ok) {
          throw new Error('Failed to save page assignments');
        }
      }
      
      // Save book friends and permissions (publishers only)
      
      if (user?.role !== 'author' && state.userRole !== 'author' && state.bookFriends && state.bookFriends.length > 0) {
        // First, add any new friends to the book
        for (const friend of state.bookFriends) {
          try {
            const addResponse = await fetch(`${apiUrl}/books/${state.currentBook.id}/friends`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                friendId: friend.id,
                book_role: friend.book_role || 'author',
                page_access_level: friend.pageAccessLevel || 'own_page',
                editor_interaction_level: friend.editorInteractionLevel || 'full_edit'
              })
            });
            
            if (!addResponse.ok && addResponse.status !== 409) { // 409 = already exists
              throw new Error(`Failed to add friend ${friend.id}`);
            }
          } catch (error) {
            // Ignore errors for existing friends
          }
        }
        
        // Then update permissions for all friends
        const friendsWithPermissions = state.bookFriends.map(friend => ({
          user_id: friend.id,
          role: friend.role,
          book_role: friend.book_role || 'author',
          page_access_level: friend.pageAccessLevel || 'own_page',
          editor_interaction_level: friend.editorInteractionLevel || 'full_edit'
        }));
        

        
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}/friends/bulk-update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ friends: friendsWithPermissions })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save book friends permissions');
        }
      }
      

      
      // Log theme structure for copying to global-themes.ts
      logThemeStructure(state.currentBook);
      
      // Don't clear temp data after save - keep it for display
      dispatch({ type: 'MARK_SAVED' });
    } catch (error) {
      throw error;
    } finally {
      saveBook.isRunning = false;
    }
  };

  const loadBook = useCallback(async (bookId: number) => {
    try {
      const { book, questions, answers, userRole, pageAssignments, pagination } = await apiService.loadBook(bookId);

      // Get book theme and palette for inheritance
      const bookThemeId = book.bookTheme || book.themeId || 'default';
      const bookColorPaletteId = book.colorPaletteId || null;
      const bookThemePaletteId = !bookColorPaletteId ? getThemePaletteId(bookThemeId) : null;
      const effectiveBookPaletteId = bookColorPaletteId || bookThemePaletteId;
      const bookPalette = effectiveBookPaletteId ? colorPalettes.find(p => p.id === effectiveBookPaletteId) : null;
      
      const normalizedLoadedPages = normalizeApiPages(book.pages ?? [], {
        book,
        bookThemeId,
        bookColorPaletteId,
        effectiveBookPaletteId,
        bookPalette
      });
      const totalPagesHint = book.totalPages ?? pagination?.totalPages ?? 0;
      const hasCompleteBook = totalPagesHint > 0 && normalizedLoadedPages.length >= totalPagesHint;
      const structuredPages = hasCompleteBook
        ? ensureSpecialPages(normalizedLoadedPages)
        : normalizedLoadedPages;
      const structuredCount = structuredPages.length;
      const maxPageNumber = structuredPages.reduce((max, page) => {
        const pageNum = page.pageNumber ?? 0;
        return Math.max(max, pageNum);
      }, 0);
      const totalPages =
        book.totalPages ??
        pagination?.totalPages ??
        Math.max(maxPageNumber, structuredCount);
      const pagesWithPlaceholders =
        totalPages > structuredCount
          ? ensurePageArrayLength(structuredPages, totalPages)
          : structuredPages;

      const loadedRecords = structuredPages.reduce<Record<number, true>>((acc, page) => {
        if (page.pageNumber) {
          acc[page.pageNumber] = true;
        }
        return acc;
      }, {});

      // Always set paginationState if totalPages is known (from pagination or calculated),
      // even if pagination is null. This ensures that the page explorer shows all pages, not just the loaded ones.
      const paginationState: PagePaginationState | undefined = (book.totalPages || pagination)
        ? {
            totalPages,
            pageSize: pagination?.limit || PAGE_CHUNK_SIZE,
            loadedPages: loadedRecords
          }
        : (totalPages > structuredCount || maxPageNumber > structuredCount
            ? {
                totalPages,
                pageSize: PAGE_CHUNK_SIZE,
                loadedPages: loadedRecords
              }
            : undefined);
      
      // Store questions and answers in temp storage using UUID keys
      questions.forEach(q => {
        dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: q.id, text: q.question_text, questionPoolId: q.question_pool_id } });
      });
      
      answers.forEach(a => {
        dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId: a.question_id, text: a.answer_text, userId: a.user_id, answerId: a.id } });
      });
      
      // Create a map of questionId to display_order for setting questionOrder on elements
      const questionOrderMap = new Map<string, number>();
      questions.forEach((q: any) => {
        if (q.id && (q.display_order !== null && q.display_order !== undefined)) {
          questionOrderMap.set(q.id, q.display_order);
        }
      });
      
      // Set questionOrder on qna elements based on display_order
      // This must happen BEFORE the log, so the log shows the updated values
      if (questionOrderMap.size > 0) {
        pagesWithPlaceholders.forEach((page, pageIndex) => {
          page.elements.forEach((element) => {
            if (element.textType === 'qna' && element.questionId) {
              const displayOrder = questionOrderMap.get(element.questionId);
              if (displayOrder !== undefined) {
                // Always update questionOrder, even if it's the same value
                element.questionOrder = displayOrder;
              }
            }
          });
        });
      }
      
      // Load editor settings and book friends
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      try {
        const settingsResponse = await fetch(`${apiUrl}/editor-settings/${bookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (settingsResponse.ok) {
          const editorSettings = await settingsResponse.json();
          // Store editor settings in state
          dispatch({ type: 'SET_EDITOR_SETTINGS', payload: editorSettings });
          // Apply editor settings to tool settings for backward compatibility
          if (editorSettings.favoriteColors?.strokeColors) {
            dispatch({ 
              type: 'UPDATE_TOOL_SETTINGS', 
              payload: { 
                tool: 'favoriteColors', 
                settings: { strokeColors: editorSettings.favoriteColors.strokeColors } 
              } 
            });
          }
        }
      } catch (settingsError) {
        // Failed to load editor settings
      }
      
      // Load book friends
      try {
        const friendsResponse = await fetch(`${apiUrl}/books/${bookId}/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (friendsResponse.ok) {
          const bookFriends = await friendsResponse.json();

          dispatch({ type: 'SET_BOOK_FRIENDS', payload: bookFriends });
        }
      } catch (friendsError) {
        // Failed to load book friends
      }
      
      // Map database IDs to pages
      const bookWithDatabaseIds = {
        ...book,
        pages: pagesWithPlaceholders
      };
      
      // Set questionOrder on elements (already done above, but ensure it's applied)
      // The questionOrder is set in the loop above, so no additional logging needed
      
      dispatch({ type: 'SET_BOOK', payload: bookWithDatabaseIds, pagination: paginationState });
      
      if (userRole) {
        dispatch({ type: 'SET_USER_ROLE', payload: { role: userRole.role, assignedPages: userRole.assignedPages || [] } });
 
        dispatch({ type: 'SET_USER_PERMISSIONS', payload: { 
          pageAccessLevel: userRole.page_access_level || 'all_pages', 
          editorInteractionLevel: userRole.editor_interaction_level || 'full_edit_with_settings' 
        } });
      } else {
        // Default permissions for book owner (no specific role returned)
        dispatch({ type: 'SET_USER_PERMISSIONS', payload: { 
          pageAccessLevel: 'all_pages', 
          editorInteractionLevel: 'full_edit_with_settings' 
        } });
      }
      
      // Load page assignments - use pageNumber as key for consistency
      const pageAssignmentsMap = {};
      pageAssignments.forEach(assignment => {
        pageAssignmentsMap[assignment.page_number] = {
          id: assignment.user_id,
          name: assignment.name,
          email: assignment.email,
          role: assignment.role
        };
      });
      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: pageAssignmentsMap });
      

    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const getQuestionText = (questionId: string): string => {
    // Check temporary storage first, then fallback to canvas elements
    if (state.tempQuestions[questionId]) {
      const questionData = state.tempQuestions[questionId];
      // Parse if JSON (contains poolId), otherwise return as-is
      try {
        const parsed = JSON.parse(questionData);
        if (parsed && typeof parsed === 'object' && parsed.text) {
          return parsed.text;
        }
        return questionData;
      } catch {
        return questionData;
      }
    }
    
    // Find question text from canvas elements
    for (const page of state.currentBook?.pages || []) {
      for (const element of page.elements) {
        if (element.textType === 'question' && element.questionId === questionId) {
          return element.text || '';
        }
      }
    }
    
    return '';
  };
  
  const getAnswerText = (questionId: string, userId?: number): string => {
    if (!userId) return '';
    
    // Check temporary storage first
    if (state.tempAnswers[questionId]?.[userId]) {
      return state.tempAnswers[questionId][userId].text;
    }
    
    return '';
  };
  
  const updateTempQuestion = (questionId: string, text: string) => {
    dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text } });
  };
  
  const updateTempAnswer = (questionId: string, text: string, userId?: number) => {
    dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId, text, userId } });
  };
  
  const undo = () => {
    dispatch({ type: 'UNDO' });
  };
  
  const redo = () => {
    dispatch({ type: 'REDO' });
  };
  
  const goToHistoryStep = (step: number) => {
    dispatch({ type: 'GO_TO_HISTORY_STEP', payload: step });
  };
  
  const getHistoryActions = () => {
    return state.historyActions;
  };
  
  const getQuestionAssignmentsForUser = (userId: number): Set<string> => {
    if (!state.currentBook) return new Set();
    
    // Get all pages assigned to this user
    const userPages = Object.entries(state.pageAssignments)
      .filter(([_, user]) => user?.id === userId)
      .map(([pageNum, _]) => parseInt(pageNum));
    
    // Get all questions on those pages (including qna)
    const assignedQuestions = new Set<string>();
    state.currentBook.pages.forEach(page => {
      if (userPages.includes(page.pageNumber)) {
        page.elements.forEach(element => {
          if ((element.textType === 'question' || element.textType === 'qna') && element.questionId) {
            assignedQuestions.add(element.questionId);
          }
        });
      }
    });
    
    return assignedQuestions;
  };
  
  const checkUserQuestionConflicts = (userId: number, pageNumber: number): { questionId: string; questionText: string; pageNumbers: number[] }[] => {
    if (!state.currentBook) return [];
    
    // Map to store conflicts: questionId -> { questionText, pageNumbers }
    const conflictsMap = new Map<string, { questionText: string; pageNumbers: Set<number> }>();
    
    // Get questions on the target page
    const targetPage = state.currentBook.pages.find(p => p.pageNumber === pageNumber);
    if (!targetPage) return [];
    
    // Get all questions on the target page (including qna)
    const targetQuestions = new Set<string>();
    targetPage.elements.forEach(element => {
      if ((element.textType === 'question' || element.textType === 'qna') && element.questionId) {
        targetQuestions.add(element.questionId);
        // Initialize conflict entry for this question
        if (!conflictsMap.has(element.questionId)) {
          conflictsMap.set(element.questionId, {
            questionText: getQuestionText(element.questionId) || 'Unknown question',
            pageNumbers: new Set<number>()
          });
        }
      }
    });
    
    // Check if any of these questions already exist on pages assigned to this user
    for (const page of state.currentBook.pages) {
      if (page.pageNumber !== pageNumber) {
        const assignedUser = state.pageAssignments[page.pageNumber];
        if (assignedUser && assignedUser.id === userId) {
          page.elements.forEach(element => {
            if ((element.textType === 'question' || element.textType === 'qna') && element.questionId && targetQuestions.has(element.questionId)) {
              // Add this page number to the conflict for this question
              const conflict = conflictsMap.get(element.questionId);
              if (conflict) {
                conflict.pageNumbers.add(page.pageNumber);
              }
            }
          });
        }
      }
    }
    
    // Convert map to array, filtering out questions with no conflicts
    const conflicts: { questionId: string; questionText: string; pageNumbers: number[] }[] = [];
    conflictsMap.forEach((conflict, questionId) => {
      if (conflict.pageNumbers.size > 0) {
        conflicts.push({
          questionId,
          questionText: conflict.questionText,
          pageNumbers: Array.from(conflict.pageNumbers).sort((a, b) => a - b)
        });
      }
    });
    
    return conflicts;
  };
  
  const isQuestionAvailableForUser = (questionId: string, userId: number): boolean => {
    if (!state.currentBook) return false;
    
    // Get all pages assigned to this user
    const userPages = Object.entries(state.pageAssignments)
      .filter(([_, user]) => user?.id === userId)
      .map(([pageNum, _]) => parseInt(pageNum));
    
    // Check if question exists on any of these pages (including qna)
    for (const page of state.currentBook.pages) {
      if (userPages.includes(page.pageNumber)) {
        const hasQuestion = page.elements.some(el => 
          (el.textType === 'question' || el.textType === 'qna') && el.questionId === questionId
        );
        if (hasQuestion) {
          return false; // Question already exists on a page assigned to this user
        }
      }
    }
    
    return true;
  };
  
  const refreshPageAssignments = useCallback(async () => {
    if (!state.currentBook) return;
    
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Fetch updated user role and page assignments
      const roleResponse = await fetch(`${apiUrl}/books/${state.currentBook.id}/user-role`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        dispatch({ type: 'SET_USER_ROLE', payload: { role: roleData.role, assignedPages: roleData.assignedPages || [] } });
      }
    } catch (error) {
      // Error refreshing page assignments
    }
  }, [state.currentBook]);

  const ensurePagesLoaded = useCallback(async (startIndex: number, endIndex: number) => {
    if (!state.currentBook) return;
    const totalPages = state.pagePagination?.totalPages ?? state.currentBook.pages.length;
    if (totalPages === 0) return;

    const safeStart = Math.max(0, Math.min(startIndex, totalPages - 1));
    const safeEnd = Math.max(safeStart + 1, Math.min(endIndex, totalPages));

    const candidatePages = state.currentBook.pages.slice(safeStart, safeEnd);
    const placeholders = candidatePages
      .map((page, offset) => ({ page, index: safeStart + offset }))
      .filter((item) => item.page?.isPlaceholder);

    if (!placeholders.length) {
      return;
    }

    const chunkSize = state.pagePagination?.pageSize ?? PAGE_CHUNK_SIZE;
    const minPageNumber = Math.min(
      ...placeholders.map((item) => item.page?.pageNumber ?? item.index + 1)
    );
    const chunkStart = Math.max(0, Math.floor((minPageNumber - 1) / chunkSize) * chunkSize);
    const chunkKey = `${chunkStart}-${chunkSize}`;

    if (loadingPageChunksRef.current.has(chunkKey)) {
      return;
    }

    loadingPageChunksRef.current.add(chunkKey);
    try {
      const currentBook = state.currentBook;
      if (!currentBook) {
        return;
      }
      const currentBookThemeId = currentBook.themeId || currentBook.bookTheme || null;
      const currentBookColorPaletteId = currentBook.colorPaletteId || null;
      const currentBookThemePaletteId = !currentBookColorPaletteId && currentBookThemeId
        ? getThemePaletteId(currentBookThemeId)
        : null;
      const currentEffectivePaletteId = currentBook.colorPaletteId || currentBookThemePaletteId || null;
      const currentBookPalette = currentEffectivePaletteId
        ? colorPalettes.find((p) => p.id === currentEffectivePaletteId) || null
        : null;

      const { book: partialBook, pagination } = await apiService.loadBook(state.currentBook.id, {
        pageOffset: chunkStart,
        pageLimit: chunkSize,
        pagesOnly: true
      });

      const rawPages = Array.isArray(partialBook.pages) ? partialBook.pages : [];
      if (!rawPages.length) {
        return;
      }

      const chunkPages: Page[] = normalizeApiPages(rawPages, {
        book: currentBook,
        bookThemeId: currentBookThemeId,
        bookColorPaletteId: currentBookColorPaletteId,
        effectiveBookPaletteId: currentEffectivePaletteId,
        bookPalette: currentBookPalette,
        pageIndexOffset: chunkStart
      });

      const chunkLoadedRecord = chunkPages.reduce<Record<number, true>>((acc, page) => {
        if (page.pageNumber) {
          acc[page.pageNumber] = true;
        }
        return acc;
      }, {});

      const mergedPagination = state.pagePagination
        ? {
            totalPages: Math.max(
              state.pagePagination.totalPages,
              pagination?.totalPages ?? 0,
              chunkStart + chunkPages.length
            ),
            pageSize: pagination?.limit || state.pagePagination.pageSize || chunkSize,
            loadedPages: {
              ...state.pagePagination.loadedPages,
              ...chunkLoadedRecord
            }
          }
        : pagination
          ? {
              totalPages: pagination.totalPages ?? chunkPages.length,
              pageSize: pagination.limit || chunkSize,
              loadedPages: chunkLoadedRecord
            }
          : undefined;

      dispatch({
        type: 'MERGE_BOOK_PAGES',
        payload: {
          pages: chunkPages,
          pagination: mergedPagination
        }
      });
    } finally {
      loadingPageChunksRef.current.delete(chunkKey);
    }
  }, [state.currentBook, state.pagePagination]);

  const canAccessEditor = () => {
    return state.editorInteractionLevel !== 'no_access';
  };
  
  const canEditCanvas = () => {
    return state.editorInteractionLevel === 'full_edit' || state.editorInteractionLevel === 'full_edit_with_settings';
  };
  
  const canEditSettings = () => {
    return state.editorInteractionLevel === 'full_edit_with_settings';
  };
  
  const getVisiblePages = () => {
    if (!state.currentBook) return [];
    
    // Filter out preview pages
    const nonPreviewPages = state.currentBook.pages.filter(p => !p.isPreview);
    
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // Show only assigned pages in correct order
      return nonPreviewPages
        .filter((_, index) => state.assignedPages.includes(index + 1))
        .sort((a, b) => a.pageNumber - b.pageNumber);
    }
    
    // Show all pages for 'all_pages' or when no restrictions
    return nonPreviewPages;
  };
  
  const getVisiblePageNumbers = () => {
    if (!state.currentBook) return [];
    
    // Filter out preview pages
    const nonPreviewPages = state.currentBook.pages.filter(p => !p.isPreview);
    
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // Return only assigned page numbers in sorted order
      return [...state.assignedPages].sort((a, b) => a - b);
    }
    
    // Return all page numbers (excluding preview pages)
    return nonPreviewPages.map((_, index) => index + 1);
  };
  
  const applyTemplateToPage = (template: PageTemplate, pageIndex?: number) => {
    const targetPageIndex = pageIndex ?? state.activePageIndex;
    dispatch({ 
      type: 'APPLY_TEMPLATE_TO_PAGE', 
      payload: { pageIndex: targetPageIndex, template } 
    });
  };
  
  const getWizardTemplateSelection = (): WizardTemplateSelection => {
    return state.wizardTemplateSelection;
  };
  
  const setWizardTemplateSelection = (selection: WizardTemplateSelection) => {
    dispatch({ type: 'SET_WIZARD_TEMPLATE_SELECTION', payload: selection });
  };
  
  const applyCompleteTemplate = (
    layoutId?: string, 
    themeId?: string, 
    paletteId?: string, 
    scope: 'current-page' | 'entire-book' = 'current-page'
  ) => {
    dispatch({ 
      type: 'APPLY_COMPLETE_TEMPLATE', 
      payload: { layoutId, themeId, paletteId, scope } 
    });
  };
  
  const validateQuestionSelection = (questionId: string, currentPageNumber: number): { valid: boolean; reason?: string } => {
    if (!state.currentBook) return { valid: false, reason: 'No book loaded' };
    
    const assignedUser = state.pageAssignments[currentPageNumber];
    const currentPage = state.currentBook.pages.find(p => p.pageNumber === currentPageNumber);
    
    if (!assignedUser) {
      // No user assigned, only check if question already exists on current page
      if (currentPage) {
        const hasQuestion = currentPage.elements.some(el => 
          (el.textType === 'question' || el.textType === 'qna') && el.questionId === questionId
        );
        if (hasQuestion) {
          return { valid: false, reason: 'This question already exists on this page.' };
        }
      }
      return { valid: true };
    }
    
    // Check if this question is already used by this user on another page (including qna)
    const isAvailable = isQuestionAvailableForUser(questionId, assignedUser.id);
    if (!isAvailable) {
      return { 
        valid: false, 
        reason: `This question is already assigned to ${assignedUser.name} on another page.` 
      };
    }
    
    return { valid: true };
  };

  return (
    <EditorContext.Provider value={{ 
      state, 
      dispatch, 
      saveBook, 
      loadBook, 
      getQuestionText, 
      getAnswerText, 
      updateTempQuestion, 
      updateTempAnswer,
      undo,
      redo,
      goToHistoryStep,
      getHistoryActions,
      refreshPageAssignments,
      getQuestionAssignmentsForUser,
      isQuestionAvailableForUser,
      checkUserQuestionConflicts,
      validateQuestionSelection,
      canAccessEditor,
      canEditCanvas,
      canEditSettings,
      getVisiblePages,
      getVisiblePageNumbers,
      ensurePagesLoaded,
      pageMetadata: derivedPageMetadata,
      getPageMetadata,
      applyTemplateToPage,
      applyCompleteTemplate,
      getWizardTemplateSelection,
      setWizardTemplateSelection
    }}>
      {children}
    </EditorContext.Provider>
  );
};

// Helper functions
export const createSampleBook = (id: number = 1): Book => ({
  id,
  name: 'Sample Book',
  pageSize: 'A4',
  orientation: 'portrait',
  pages: [{
    id: 1,
    pageNumber: 1,
    elements: [
      {
        id: uuidv4(),
        type: 'placeholder',
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        fill: '#e5e7eb',
        stroke: '#9ca3af'
      },
      {
        id: uuidv4(),
        type: 'placeholder',
        x: 300,
        y: 200,
        width: 120,
        height: 80,
        fill: '#ddd6fe',
        stroke: '#8b5cf6'
      }
    ]
  }]
});

function applyThemeAndPaletteToElement(
  element: CanvasElement,
  options: {
    pageThemeId?: string;
    bookThemeId?: string;
    pageLayoutTemplateId?: string | null;
    bookLayoutTemplateId?: string | null;
    pagePaletteId?: string | null;
    bookPaletteId?: string | null;
    toolSettings?: Record<string, any>;
  }
): CanvasElement {
  const { pageThemeId, bookThemeId, pageLayoutTemplateId, bookLayoutTemplateId, pagePaletteId, bookPaletteId, toolSettings } = options;
  const activeThemeId = pageThemeId || bookThemeId;
  const toolType = element.textType || element.type;

  const activeTheme = pageThemeId || bookThemeId || 'default';
  const effectivePaletteId = pagePaletteId || bookPaletteId;
  const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType as any, effectivePaletteId);

  const updatedElement: any = {
    ...element,
    ...themeDefaults,
    theme: activeThemeId || element.theme,
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
    points: element.points,
    layoutVariant: element.layoutVariant
  };

  if (element.textType === 'free_text' && themeDefaults.textSettings) {
    updatedElement.textSettings = {
      ...(element.textSettings || {}),
      ...themeDefaults.textSettings
    };
  }

  if (element.textType === 'qna') {
    // getToolDefaults already cleans shared properties from questionSettings/answerSettings
    // Only font properties and border.enabled/background.enabled remain in themeDefaults.questionSettings/answerSettings
    if (themeDefaults.questionSettings || element.questionSettings) {
      // Extract only font properties and border.enabled/background.enabled from element.questionSettings
      const elementQuestionSettings = element.questionSettings || {};
      const cleanedElementQuestionSettings: any = {};
      
      // Font properties
      if (elementQuestionSettings.fontSize !== undefined) cleanedElementQuestionSettings.fontSize = elementQuestionSettings.fontSize;
      if (elementQuestionSettings.fontFamily !== undefined) cleanedElementQuestionSettings.fontFamily = elementQuestionSettings.fontFamily;
      if (elementQuestionSettings.fontBold !== undefined) cleanedElementQuestionSettings.fontBold = elementQuestionSettings.fontBold;
      if (elementQuestionSettings.fontItalic !== undefined) cleanedElementQuestionSettings.fontItalic = elementQuestionSettings.fontItalic;
      if (elementQuestionSettings.fontColor !== undefined) cleanedElementQuestionSettings.fontColor = elementQuestionSettings.fontColor;
      if (elementQuestionSettings.fontOpacity !== undefined) cleanedElementQuestionSettings.fontOpacity = elementQuestionSettings.fontOpacity;
      // Font properties are now only directly in questionSettings, no nested font object
      
      // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
      // Don't set border.enabled or background.enabled in questionSettings/answerSettings
      
      updatedElement.questionSettings = {
        ...cleanedElementQuestionSettings,
        ...(themeDefaults.questionSettings || {})
      };
    }
    if (themeDefaults.answerSettings || element.answerSettings) {
      // Extract only font properties, border.enabled/background.enabled from element.answerSettings
      const elementAnswerSettings = element.answerSettings || {};
      const cleanedElementAnswerSettings: any = {};
      
      // Font properties
      if (elementAnswerSettings.fontSize !== undefined) cleanedElementAnswerSettings.fontSize = elementAnswerSettings.fontSize;
      if (elementAnswerSettings.fontFamily !== undefined) cleanedElementAnswerSettings.fontFamily = elementAnswerSettings.fontFamily;
      if (elementAnswerSettings.fontBold !== undefined) cleanedElementAnswerSettings.fontBold = elementAnswerSettings.fontBold;
      if (elementAnswerSettings.fontItalic !== undefined) cleanedElementAnswerSettings.fontItalic = elementAnswerSettings.fontItalic;
      if (elementAnswerSettings.fontColor !== undefined) cleanedElementAnswerSettings.fontColor = elementAnswerSettings.fontColor;
      if (elementAnswerSettings.fontOpacity !== undefined) cleanedElementAnswerSettings.fontOpacity = elementAnswerSettings.fontOpacity;
      // Font properties are now only directly in answerSettings, no nested font object
      
      // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
      // Don't set border.enabled or background.enabled in questionSettings/answerSettings
      
      // Ruled lines are now only on element level, not in answerSettings
      
      updatedElement.answerSettings = {
        ...cleanedElementAnswerSettings,
        ...(themeDefaults.answerSettings || {})
      };
    }
    // Apply qnaIndividualSettings from theme defaults if available
    if (themeDefaults.qnaIndividualSettings !== undefined) {
      updatedElement.qnaIndividualSettings = themeDefaults.qnaIndividualSettings;
    }
  }

  return updatedElement;
}

function applyThemeAndPaletteToPage(
  page: Page,
  book: Book,
  toolSettings: Record<string, any>
): Page {
  const pageThemeId = page.themeId || page.background?.pageTheme || book.themeId || book.bookTheme || undefined;
  const bookThemeId = book.themeId || book.bookTheme || undefined;
  const bookColorPaletteId = book.colorPaletteId || null;
  const bookThemePaletteId = !bookColorPaletteId ? getThemePaletteId(bookThemeId || 'default') : null;
  const bookPaletteId = bookColorPaletteId || bookThemePaletteId || undefined;

  let effectivePaletteId: string | undefined = undefined;
  if (page.colorPaletteId === null) {
    // Page uses Theme's Default Palette - use theme's palette
    effectivePaletteId = getThemePaletteId(pageThemeId || bookThemeId || 'default');
  } else {
    // Page has explicit palette - use it
    effectivePaletteId = page.colorPaletteId || undefined;
  }
  const pagePaletteId = effectivePaletteId;
  const pageLayoutTemplateId = page.layoutTemplateId || book.layoutTemplateId || null;
  const bookLayoutTemplateId = book.layoutTemplateId || null;

  const palette = pagePaletteId ? colorPalettes.find(p => p.id === pagePaletteId) : undefined;
  let updatedBackground = page.background;
  if (palette && page.background) {
    const pageBgColor = getPalettePartColor(palette, 'pageBackground', 'background', palette.colors.background) || palette.colors.background;
    const patternForeground = getPalettePartColor(palette, 'pagePattern', 'primary', palette.colors.primary) || palette.colors.primary;
    const patternBackground = getPalettePartColor(palette, 'pageBackground', 'background', palette.colors.background) || palette.colors.background;
    if (page.background.type === 'color') {
      updatedBackground = {
        ...page.background,
        value: pageBgColor
      };
    } else if (page.background.type === 'pattern') {
      updatedBackground = {
        ...page.background,
        patternBackgroundColor: patternForeground,
        patternForegroundColor: patternBackground
      };
    }
  }

  const updatedElements = page.elements.map(element =>
    applyThemeAndPaletteToElement(element, {
      pageThemeId,
      bookThemeId,
      pageLayoutTemplateId,
      bookLayoutTemplateId,
      pagePaletteId,
      bookPaletteId,
      toolSettings
    })
  );

  return {
    ...page,
    background: updatedBackground,
    elements: updatedElements
  };
}