import Image, { getCrop } from './image';
import type { CanvasItemProps } from './base-canvas-item';

/**
 * Wrapper-Komponente für Sticker-Elemente.
 * Setzt Sticker-spezifische Defaults und delegiert das Rendering an die Image-Komponente.
 * 
 * Diese Komponente trennt die Sticker-Logik von der Image-Logik, ohne den bewährten
 * Renderpfad zu ändern. Alle Bildlade-, Crop- und Transform-Logik wird von Image übernommen.
 */
export default function Sticker(props: CanvasItemProps) {
  const { element } = props;
  
  // Stelle sicher, dass Sticker-Elemente den richtigen Typ haben
  if (element.type !== 'sticker') {
    // Fallback: Wenn das Element kein Sticker ist, rendere es trotzdem als Image
    // Dies kann passieren, wenn die Komponente fälschlicherweise für andere Typen verwendet wird
    return <Image {...props} />;
  }
  
  // Setze Sticker-spezifische Defaults
  const stickerElement = {
    ...element,
    // Sticker verwenden standardmäßig center-middle für das Image-Clipping
    imageClipPosition: element.imageClipPosition ?? 'center-middle',
  };
  
  // Rendere mit angepasstem Element - alle anderen Props bleiben unverändert
  return <Image {...props} element={stickerElement} />;
}

// Re-export getCrop für externe Verwendung (z.B. pdf-renderer.tsx)
export { getCrop };

