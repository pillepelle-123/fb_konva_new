export interface Pattern {
  id: string;
  name: string;
  svg: string;
}

export const PATTERNS: Pattern[] = [
  {
    id: 'dots',
    name: 'Dots',
    svg: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.3"/>
    </svg>`
  },
  {
    id: 'grid',
    name: 'Grid',
    svg: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2"/>
    </svg>`
  },
  {
    id: 'diagonal',
    name: 'Diagonal Lines',
    svg: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 20 L 20 0" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    </svg>`
  },
  {
    id: 'cross',
    name: 'Cross Hatch',
    svg: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 20 L 20 0 M 0 0 L 20 20" stroke="currentColor" stroke-width="1" opacity="0.2"/>
    </svg>`
  },
  {
    id: 'waves',
    name: 'Waves',
    svg: `<svg width="40" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 10 Q 10 0 20 10 T 40 10" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
    </svg>`
  },
  {
    id: 'hexagon',
    name: 'Hexagons',
    svg: `<svg width="30" height="26" xmlns="http://www.w3.org/2000/svg">
      <polygon points="15,2 25,8 25,18 15,24 5,18 5,8" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    </svg>`
  }
];

export const createPatternDataUrl = (pattern: Pattern, color: string = '#000000', backgroundColor: string = 'transparent'): string => {
  const svgWithColor = pattern.svg.replace(/currentColor/g, color);
  const svgWithBackground = backgroundColor !== 'transparent' 
    ? svgWithColor.replace('<svg', `<svg style="background-color: ${backgroundColor}"`)
    : svgWithColor;
  const encodedSvg = encodeURIComponent(svgWithBackground);
  return `data:image/svg+xml,${encodedSvg}`;
};