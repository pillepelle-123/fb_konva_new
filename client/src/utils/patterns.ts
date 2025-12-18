import { PATTERNS as SHARED_PATTERNS } from '../../../shared/utils/constants';

export interface Pattern {
  id: string;
  name: string;
  svg: string;
}

// SVG definitions for client-side rendering (not in shared constants)
const PATTERN_SVGS: Record<string, string> = {
  dots: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.3"/>
  </svg>`,
  grid: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2"/>
  </svg>`,
  diagonal: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M 0 20 L 20 0" stroke="currentColor" stroke-width="1" opacity="0.3"/>
  </svg>`,
  cross: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M 0 20 L 20 0 M 0 0 L 20 20" stroke="currentColor" stroke-width="1" opacity="0.2"/>
  </svg>`,
  waves: `<svg width="40" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M 0 10 Q 10 0 20 10 T 40 10" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
  </svg>`,
  hexagon: `<svg width="30" height="26" xmlns="http://www.w3.org/2000/svg">
    <polygon points="15,2 25,8 25,18 15,24 5,18 5,8" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
  </svg>`
};

// Combine shared PATTERNS with SVG definitions
export const PATTERNS: Pattern[] = SHARED_PATTERNS.map(p => ({
  ...p,
  svg: PATTERN_SVGS[p.id] || ''
}));

export const createPatternDataUrl = (pattern: Pattern, color: string = '#000000', backgroundColor: string = 'transparent'): string => {
  const svgWithColor = pattern.svg.replace(/currentColor/g, color);
  const svgWithBackground = backgroundColor !== 'transparent' 
    ? svgWithColor.replace('<svg', `<svg style="background-color: ${backgroundColor}"`)
    : svgWithColor;
  const encodedSvg = encodeURIComponent(svgWithBackground);
  return `data:image/svg+xml,${encodedSvg}`;
};
