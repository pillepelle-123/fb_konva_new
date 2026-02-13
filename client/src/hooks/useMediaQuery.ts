import { useState, useEffect } from 'react';

/**
 * Hook to match a media query. Tailwind md breakpoint = 768px.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Tailwind md breakpoint: min-width 768px */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
