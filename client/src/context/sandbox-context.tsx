import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { PaletteColorSlot } from '../utils/sandbox-utils';
import { DEFAULT_SANDBOX_COLORS } from '../utils/sandbox-utils';

export const isSandboxMode = true;

export const PAGE_PART_NAMES = ['pageBackground', 'pagePattern'] as const;
export type PagePartName = (typeof PAGE_PART_NAMES)[number];

interface SandboxState {
  sandboxColors: Record<PaletteColorSlot, string>;
  sandboxColorSlotOpen: PaletteColorSlot | null;
  partSlotOverrides: Record<string, Record<string, PaletteColorSlot>>;
  pageSlotOverrides: Partial<Record<PagePartName, PaletteColorSlot>>;
  currentSandboxPageId: number | null;
  currentSandboxPageName: string | null;
}

type SandboxAction =
  | { type: 'SET_SANDBOX_COLOR'; payload: { slot: PaletteColorSlot; color: string } }
  | { type: 'SET_SANDBOX_COLORS'; payload: Record<PaletteColorSlot, string> }
  | { type: 'SET_SANDBOX_COLOR_SLOT_OPEN'; payload: PaletteColorSlot | null }
  | {
      type: 'SET_PART_SLOT_OVERRIDE';
      payload: {
        elementId: string;
        partName: string;
        slot: PaletteColorSlot;
      };
    }
  | {
      type: 'CLEAR_PART_SLOT_OVERRIDES';
      payload: { elementId: string };
    }
  | {
      type: 'SET_PAGE_SLOT_OVERRIDE';
      payload: { partName: PagePartName; slot: PaletteColorSlot };
    }
  | {
      type: 'LOAD_SANDBOX_STATE';
      payload: {
        sandboxColors: Record<PaletteColorSlot, string>;
        partSlotOverrides: Record<string, Record<string, PaletteColorSlot>>;
        pageSlotOverrides: Partial<Record<PagePartName, PaletteColorSlot>>;
      };
    }
  | {
      type: 'SET_CURRENT_SANDBOX_PAGE';
      payload: { id: number; name: string } | null;
    };

const initialState: SandboxState = {
  sandboxColors: { ...DEFAULT_SANDBOX_COLORS },
  sandboxColorSlotOpen: null,
  partSlotOverrides: {},
  pageSlotOverrides: {},
  currentSandboxPageId: null,
  currentSandboxPageName: null,
};

function sandboxReducer(state: SandboxState, action: SandboxAction): SandboxState {
  switch (action.type) {
    case 'SET_SANDBOX_COLOR':
      return {
        ...state,
        sandboxColors: {
          ...state.sandboxColors,
          [action.payload.slot]: action.payload.color,
        },
      };
    case 'SET_SANDBOX_COLORS':
      return {
        ...state,
        sandboxColors: { ...action.payload },
      };
    case 'SET_SANDBOX_COLOR_SLOT_OPEN':
      return {
        ...state,
        sandboxColorSlotOpen: action.payload,
      };
    case 'SET_PART_SLOT_OVERRIDE': {
      const { elementId, partName, slot } = action.payload;
      const existing = state.partSlotOverrides[elementId] || {};
      return {
        ...state,
        partSlotOverrides: {
          ...state.partSlotOverrides,
          [elementId]: {
            ...existing,
            [partName]: slot,
          },
        },
      };
    }
    case 'CLEAR_PART_SLOT_OVERRIDES': {
      const { elementId } = action.payload;
      const next = { ...state.partSlotOverrides };
      delete next[elementId];
      return { ...state, partSlotOverrides: next };
    }
    case 'SET_PAGE_SLOT_OVERRIDE': {
      const { partName, slot } = action.payload;
      return {
        ...state,
        pageSlotOverrides: {
          ...state.pageSlotOverrides,
          [partName]: slot,
        },
      };
    }
    case 'LOAD_SANDBOX_STATE': {
      const { sandboxColors, partSlotOverrides, pageSlotOverrides } = action.payload;
      return {
        ...state,
        sandboxColors: sandboxColors ?? state.sandboxColors,
        partSlotOverrides: partSlotOverrides ?? {},
        pageSlotOverrides: pageSlotOverrides ?? {},
      };
    }
    case 'SET_CURRENT_SANDBOX_PAGE': {
      const payload = action.payload;
      return {
        ...state,
        currentSandboxPageId: payload?.id ?? null,
        currentSandboxPageName: payload?.name ?? null,
      };
    }
    default:
      return state;
  }
}

export interface SandboxContextValue {
  state: SandboxState;
  setSandboxColor: (slot: PaletteColorSlot, color: string) => void;
  setSandboxColorSlotOpen: (slot: PaletteColorSlot | null) => void;
  setPartSlotOverride: (elementId: string, partName: string, slot: PaletteColorSlot) => void;
  setPageSlotOverride: (partName: PagePartName, slot: PaletteColorSlot) => void;
  getPartSlot: (elementId: string, partName: string) => PaletteColorSlot | undefined;
  getPageSlot: (partName: PagePartName) => PaletteColorSlot | undefined;
  getColorForSlot: (slot: PaletteColorSlot) => string;
  loadSandboxState: (payload: {
    sandboxColors: Record<PaletteColorSlot, string>;
    partSlotOverrides: Record<string, Record<string, PaletteColorSlot>>;
    pageSlotOverrides: Partial<Record<PagePartName, PaletteColorSlot>>;
  }) => void;
  setCurrentSandboxPage: (payload: { id: number; name: string } | null) => void;
}

const SandboxContext = createContext<SandboxContextValue | undefined>(undefined);

export function SandboxProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sandboxReducer, initialState);

  const setSandboxColor = useCallback((slot: PaletteColorSlot, color: string) => {
    dispatch({ type: 'SET_SANDBOX_COLOR', payload: { slot, color } });
  }, []);

  const setSandboxColorSlotOpen = useCallback((slot: PaletteColorSlot | null) => {
    dispatch({ type: 'SET_SANDBOX_COLOR_SLOT_OPEN', payload: slot });
  }, []);

  const setPartSlotOverride = useCallback(
    (elementId: string, partName: string, slot: PaletteColorSlot) => {
      dispatch({
        type: 'SET_PART_SLOT_OVERRIDE',
        payload: { elementId, partName, slot },
      });
    },
    []
  );

  const setPageSlotOverride = useCallback(
    (partName: PagePartName, slot: PaletteColorSlot) => {
      dispatch({
        type: 'SET_PAGE_SLOT_OVERRIDE',
        payload: { partName, slot },
      });
    },
    []
  );

  const getPartSlot = useCallback(
    (elementId: string, partName: string): PaletteColorSlot | undefined => {
      return state.partSlotOverrides[elementId]?.[partName];
    },
    [state.partSlotOverrides]
  );

  const getPageSlot = useCallback(
    (partName: PagePartName): PaletteColorSlot | undefined => {
      return state.pageSlotOverrides[partName];
    },
    [state.pageSlotOverrides]
  );

  const getColorForSlot = useCallback(
    (slot: PaletteColorSlot): string => {
      return state.sandboxColors[slot] ?? DEFAULT_SANDBOX_COLORS[slot];
    },
    [state.sandboxColors]
  );

  const loadSandboxState = useCallback(
    (payload: {
      sandboxColors: Record<PaletteColorSlot, string>;
      partSlotOverrides: Record<string, Record<string, PaletteColorSlot>>;
      pageSlotOverrides: Partial<Record<PagePartName, PaletteColorSlot>>;
    }) => {
      dispatch({ type: 'LOAD_SANDBOX_STATE', payload });
    },
    []
  );

  const setCurrentSandboxPage = useCallback(
    (payload: { id: number; name: string } | null) => {
      dispatch({ type: 'SET_CURRENT_SANDBOX_PAGE', payload });
    },
    []
  );

  const value: SandboxContextValue = {
    state,
    setSandboxColor,
    setSandboxColorSlotOpen,
    setPartSlotOverride,
    setPageSlotOverride,
    getPartSlot,
    getPageSlot,
    getColorForSlot,
    loadSandboxState,
    setCurrentSandboxPage,
  };

  return (
    <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>
  );
}

export function useSandbox(): SandboxContextValue {
  const context = useContext(SandboxContext);
  if (context === undefined) {
    throw new Error('useSandbox must be used within a SandboxProvider');
  }
  return context;
}

export function useSandboxOptional(): SandboxContextValue | undefined {
  return useContext(SandboxContext);
}
