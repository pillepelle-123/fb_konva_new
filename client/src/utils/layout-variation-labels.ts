const LAYOUT_VARIATION_LABELS = {
  mirrored: 'Mirrored layout',
  randomized: 'Remixed layout'
} as const;

const BACKGROUND_VARIATION_LABELS = {
  mirrored: 'Mirrored background',
  randomized: 'Remixed background'
} as const;

type LayoutVariationKey = keyof typeof LAYOUT_VARIATION_LABELS;
type BackgroundVariationKey = keyof typeof BACKGROUND_VARIATION_LABELS;

export function getLayoutVariationLabel(variation?: string | null) {
  if (!variation || variation === 'normal') {
    return null;
  }
  return (
    LAYOUT_VARIATION_LABELS[variation as LayoutVariationKey] ??
    `Layout: ${variation}`
  );
}

export function getBackgroundVariationLabel(variation?: string | null) {
  if (!variation || variation === 'normal') {
    return null;
  }
  return (
    BACKGROUND_VARIATION_LABELS[variation as BackgroundVariationKey] ??
    `Background: ${variation}`
  );
}

export { LAYOUT_VARIATION_LABELS, BACKGROUND_VARIATION_LABELS };

