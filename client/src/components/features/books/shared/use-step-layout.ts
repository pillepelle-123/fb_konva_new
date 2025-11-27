import { STEP_LAYOUTS, type StepLayoutConfig } from './step-layouts';

export function useStepLayout(stepId: string): StepLayoutConfig {
  const config = STEP_LAYOUTS[stepId];
  
  if (!config) {
    return {
      containerCount: 1,
      gridColumns: { mobile: 1, desktop: 1 },
      containerVariants: ['default'],
      containerPadding: ['md']
    };
  }
  
  return config;
}

