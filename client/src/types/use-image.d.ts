declare module 'use-image' {
  export default function useImage(
    url: string,
    crossOrigin?: string,
    referrerPolicy?: string,
  ): [HTMLImageElement | undefined, 'loading' | 'loaded' | 'failed'];
}