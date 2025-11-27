export type ContainerVariant = 'default' | 'muted' | 'card';
export type PaddingSize = 'sm' | 'md' | 'lg';
export type GridColumns = number | [number, number] | [number, number, number] | [number, number, [number, number, number]];

export type StepLayoutConfig = {
  containerCount: number;
  gridColumns: {
    mobile: 1;
    tablet?: number;
    desktop: GridColumns;
  };
  containerVariants?: ContainerVariant[];
  containerPadding?: PaddingSize[];
};

export const STEP_LAYOUTS: Record<string, StepLayoutConfig> = {
  // Creation steps
  'assisted-layout-pair': {
    containerCount: 3,
    gridColumns: {
      mobile: 1,
      desktop: [2, 2, 1] as [number, number, number]
    },
    containerVariants: ['default', 'default', 'muted'],
  },
  'assisted-layout-single': {
    containerCount: 2,
    gridColumns: {
      mobile: 1,
      desktop: [2, 1] as [number, number]
    },
    containerVariants: ['default', 'muted'],
  },
  'layout-variation': {
    containerCount: 4,
    gridColumns: {
      mobile: 1,
      desktop: 2
    },
  },
  'start-mode': {
    containerCount: 3,
    gridColumns: {
      mobile: 1,
      tablet: 3,
      desktop: 3
    },
  },
  'friends': {
    containerCount: 3,
    gridColumns: {
      mobile: 1,
      desktop: 1
    },
    containerVariants: ['default', 'muted', 'card'],
  },
  'confirmation': {
    containerCount: 1,
    gridColumns: {
      mobile: 1,
      desktop: 1
    },
    containerVariants: ['muted'],
  },
  
  // Create steps
  'team': {
    containerCount: 2,
    gridColumns: {
      mobile: 1,
      desktop: [320, 'auto'] as [number, string] as any // Custom width for first column
    },
    containerVariants: ['default', 'default'],
  },
};

